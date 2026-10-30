export type Source = 'manual' | 'digital';
export type TimeValue = { minutes: number; raw: string; mode: 'hm' | 'decimal' };
export type Flight = { id: string; time: TimeValue | null; flightId: string; departure: string; origin: string; destination: string; pilot: string; tail: string; notes: string };
export type Log = { method: 'total' | 'flights' | 'shifts'; shifts?: {day:TimeValue|null;night:TimeValue|null}; total: TimeValue | null; flights: Flight[]; complete: boolean; cumulative: TimeValue | null; reference: string; notes: string };
export type Day = { aircraftId: string; date: string; manual: Log; digital: Log; estimatedDate?: boolean };
export type Baseline = { date: string; time: TimeValue };
export type Aircraft = { id: string; tail: string; totalTime?: { date: string; time: TimeValue }; manual: Baseline | null; digital: Baseline | null };
export type Review = { fingerprint: string; status: string; note: string; proposed: string; correction: string; explanation: string; history: { at: string; text: string }[] };
export type Audit = { id: string; at: string; action: string; before: unknown; after: unknown };
export type Data = { schema: 1; demo: boolean; aircraft: Aircraft[]; days: Day[]; reviews: Record<string, Review>; tolerance: number; audit: Audit[] };
export type Issue = { id: string; aircraftId: string; date: string; type: string; explanation: string; manual: number | null; digital: number | null; difference: number | null; fingerprint: string };
export const uid = () => crypto.randomUUID();
export const emptyLog = (): Log => ({method:'total',total:null,flights:[],complete:false,cumulative:null,reference:'',notes:''});
export const emptyData = (): Data => ({schema:1,demo:false,aircraft:[],days:[],reviews:{},tolerance:0,audit:[]});
export function parseTime(raw: string, mode: 'hm'|'decimal' = 'hm'): TimeValue | null {
  const s=raw.trim(); if(!s)return null;
  if(mode==='hm'&&/^[0-5]?\d$/.test(s))return {minutes:Number(s),raw,mode};
  let minutes: number;
  if(mode==='hm') {
    const match=/^(\d{1,8})(?::([0-5]\d)| +([0-5]?\d))$/.exec(s);
    if(!match)throw Error('Use 0–59 for minutes, or H:MM / H MM, for example 36, 1:20 or 1 20.');
    minutes=Number(match[1])*60+Number(match[2]??match[3]);
  }
  else { if(!/^\d+(\.\d+)?$/.test(s))throw Error('Use nonnegative decimal hours, for example 1.5.'); minutes=Math.floor(Number(s)*60+0.5000000001); }
  if(!Number.isSafeInteger(minutes)||minutes>6000000000)throw Error('Time is too large.');
  return {minutes,raw,mode};
}
export function fmt(n: number | null | undefined): string { if(n==null)return '—'; const a=Math.abs(n); return `${n<0?'−':''}${Math.floor(a/60).toString().padStart(2,'0')}:${(a%60).toString().padStart(2,'0')}`; }
export const signed = (n: number | null) => n==null?'—':`${n>0?'+':''}${fmt(n)}`;
export function total(l: Log): number | null {
 if(l.method==='total')return l.total?.minutes??null;
 const values=l.method==='shifts'?[l.shifts?.day??null,l.shifts?.night??null]:l.flights.map(f=>f.time);
 const entered=values.filter((v):v is TimeValue=>v!==null);
 return entered.length?entered.reduce((s,v)=>s+v.minutes,0):l.complete?0:null;
}
export function comparable(d: Day) { return d.manual.complete&&d.digital.complete&&total(d.manual)!=null&&total(d.digital)!=null; }
export function dayStatus(d: Day, tolerance: number): string { const m=total(d.manual),g=total(d.digital); if(m==null&&g==null)return 'Not entered'; if(m==null||g==null)return 'Missing source'; if(!comparable(d))return 'Provisional'; const diff=Math.abs(g!-m!); return diff===0?'Matched daily totals':diff<=tolerance?'Within tolerance':'Difference'; }
export function datesBetween(start: string,end: string): string[] { const out:string[]=[]; const x=new Date(start+'T12:00:00Z'); while(x.toISOString().slice(0,10)<=end&&out.length<100000){out.push(x.toISOString().slice(0,10));x.setUTCDate(x.getUTCDate()+1);} return out; }
export function expected(data: Data, aircraftId: string, source: Source, date: string): {minutes:number|null; gaps:number; baseline:Baseline|null} {
 const a=data.aircraft.find(a=>a.id===aircraftId); const b=a?.[source]??null; if(!b||b.date>date)return {minutes:null,gaps:0,baseline:b};
 const days=data.days.filter(d=>d.aircraftId===aircraftId&&d.date>=b.date&&d.date<=date); let sum=b.time.minutes;
 for(const d of days)sum+=total(d[source])??0;
 const complete=new Set(days.filter(d=>d[source].complete&&total(d[source])!=null).map(d=>d.date));
 const gaps=datesBetween(b.date,date).filter(d=>!complete.has(d)).length;
 return {minutes:sum,gaps,baseline:b};
}
export function issues(data:Data):Issue[] {
 const out:Issue[]=[];
 for(const d of data.days){const m=total(d.manual),g=total(d.digital); const aircraft=data.aircraft.find(a=>a.id===d.aircraftId)!;
 const add=(type:string,explanation:string,suffix='')=>{const id=`${d.aircraftId}/${d.date}/${type}/${suffix}`; const fingerprint=JSON.stringify([d,aircraft,data.tolerance,type,explanation]);out.push({id,aircraftId:d.aircraftId,date:d.date,type,explanation,manual:m,digital:g,difference:m==null||g==null?null:g-m,fingerprint});};
 if(m==null||g==null){ if(m!=null||g!=null)add('Missing source',m==null?'Digital entries have no manual counterpart. Check the paper record and assigned tail; this does not prove a wrong tail number.':'Manual entries have no digital counterpart. Check for an omitted digital flight.'); }
 else if(Math.abs(g-m)>data.tolerance)add('Daily difference',`Digital minus manual is ${signed(g-m)}. ${comparable(d)?'Both sources are complete.':'Comparison is provisional until both sources are complete.'}`);
 else if(!comparable(d))add('Incomplete day','Both sources contain time, but at least one source has not been marked complete.');
 for(const s of ['manual','digital'] as Source[]){const l=d[s]; const sum=l.flights.reduce((a,f)=>a+(f.time?.minutes??0),0);
 if(l.method!=='shifts'&&l.total&&l.flights.some(f=>f.time!==null)&&sum!==l.total.minutes)add('Daily arithmetic',`${s}: reported daily total ${fmt(l.total.minutes)} versus flight details ${fmt(sum)}; difference ${signed(l.total.minutes-sum)}. The selected ${l.method==='total'?'daily total':'flight details'} method is counted once.`,s);
 if(l.cumulative){const e=expected(data,d.aircraftId,s,d.date); if(e.minutes==null)add('Baseline needed',`${s}: recorded cumulative ${fmt(l.cumulative.minutes)} cannot be checked without an effective opening balance.`,s);
 else if(e.minutes!==l.cumulative.minutes)add('Cumulative arithmetic',`${s}: expected ${fmt(e.minutes)}, recorded ${fmt(l.cumulative.minutes)}, recorded minus expected ${signed(l.cumulative.minutes-e.minutes)}.${e.gaps?` Provisional: ${e.gaps} incomplete days since baseline.`:''}`,s);}
 l.flights.forEach((f,i)=>{if(f.tail&&f.tail.trim().toUpperCase()!==aircraft.tail.toUpperCase())add('Tail conflict',`${s} flight ${f.flightId||i+1} explicitly states ${f.tail}; selected aircraft is ${aircraft.tail}.`,s+f.id);
 const prior=l.flights.slice(0,i).find(p=>(f.flightId&&p.flightId===f.flightId)||(f.departure&&f.origin&&f.destination&&p.departure===f.departure&&p.origin===f.origin&&p.destination===f.destination&&p.time!==null&&f.time!==null&&p.time.minutes===f.time.minutes));
 if(prior)add('Possible duplicate',`${s}: repeated flight reference or matching departure/route/time. This is a suspicion requiring source review, not confirmed duplication.`,s+f.id); }); }
 // Individual identity checks require detail-based records with IDs on both sides.
 if(d.manual.method==='flights'&&d.digital.method==='flights'&&d.manual.flights.length&&d.digital.flights.length){
 for(const s of ['manual','digital'] as Source[]){const other=d[s==='manual'?'digital':'manual'];for(const f of d[s].flights){if(f.flightId&&!other.flights.some(o=>o.flightId===f.flightId))add('Unmatched flight',`${s} flight ${f.flightId} has no matching ID in the other source. Check identity and assigned tail; daily totals alone cannot verify identities.`,s+f.id);}}
 const missing=[...d.manual.flights,...d.digital.flights].some(f=>!f.flightId);if(missing)add('Ambiguous flights','Flight details lack consistent IDs. Daily totals can be compared; individual identities require review.');
 }
 }
 return out.sort((a,b)=>b.date.localeCompare(a.date));
}
export function reviewStatus(i:Issue,data:Data):string {const r=data.reviews[i.id];return !r?'Open':r.fingerprint!==i.fingerprint?'Stale · reopened':r.status;}
export function monthSummary(data:Data,id:string,month:string){const ds=data.days.filter(d=>d.aircraftId===id&&d.date.startsWith(month));const sum=(s:Source)=>{const v=ds.map(d=>total(d[s])).filter((n):n is number=>n!==null);return v.length?v.reduce((a,b)=>a+b,0):null;}; const m=sum('manual'),g=sum('digital');const [y,mo]=month.split('-').map(Number);const count=new Date(y,mo,0).getDate();const complete=ds.filter(d=>comparable(d)).length===count;const is=issues(data).filter(i=>i.aircraftId===id&&i.date.startsWith(month)&&reviewStatus(i,data)!=='Resolved');return {manual:m,digital:g,difference:m==null||g==null?null:g-m,complete,days:ds.length,unresolved:is.length};}
export function validDate(x:unknown):x is string {if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;const n=new Date(x+'T12:00:00Z');return !isNaN(+n)&&n.toISOString().slice(0,10)===x;}
export function validateBackup(value:unknown):Data {
 const fail=()=>{throw Error('Invalid or unsupported backup. No data was changed.');};
 if(!value||typeof value!=='object')return fail();const d=value as Data;
 if(d.schema!==1||typeof d.demo!=='boolean'||!Array.isArray(d.aircraft)||!Array.isArray(d.days)||!Array.isArray(d.audit)||!d.reviews||typeof d.reviews!=='object'||!Number.isInteger(d.tolerance)||d.tolerance<0||d.tolerance>1440)return fail();
 const str=(s:unknown)=>typeof s==='string'&&s.length<100000;const tv=(v:TimeValue|null)=>v===null||(v&&Number.isSafeInteger(v.minutes)&&v.minutes>=0&&v.minutes<=6000000000&&str(v.raw)&&['hm','decimal'].includes(v.mode)&&parseTime(v.raw,v.mode)?.minutes===v.minutes);
 for(const a of d.aircraft)if(a.totalTime&&(!validDate(a.totalTime.date)||!a.totalTime.time||!tv(a.totalTime.time)))return fail();
 for(const day of d.days)if(!day||(day.estimatedDate!==undefined&&typeof day.estimatedDate!=='boolean'))return fail();
 const ids=new Set<string>();for(const a of d.aircraft){if(!a||!str(a.id)||ids.has(a.id)||!a.id||!str(a.tail)||!a.tail.trim())return fail();ids.add(a.id);for(const s of ['manual','digital'] as Source[])if(a[s]!==null&&(!a[s]||!validDate(a[s]!.date)||!a[s]!.time||!tv(a[s]!.time)))return fail();}
 const keys=new Set<string>();for(const day of d.days){const k=day.aircraftId+'/'+day.date;if(!ids.has(day.aircraftId)||!validDate(day.date)||keys.has(k))return fail();keys.add(k);for(const s of ['manual','digital'] as Source[]){const l=day[s];if(!l||!['total','flights','shifts'].includes(l.method)||typeof l.complete!=='boolean'||!tv(l.total)||!tv(l.cumulative)||(l.shifts!==undefined&&(!l.shifts||!tv(l.shifts.day)||!tv(l.shifts.night)))||(l.method==='shifts'&&!l.shifts)||!str(l.notes)||!str(l.reference)||!Array.isArray(l.flights))return fail();const flights=new Set();for(const f of l.flights){if(!f||!str(f.id)||flights.has(f.id)||!tv(f.time)||!['flightId','departure','origin','destination','pilot','tail','notes'].every(k=>str(f[k as keyof Flight])))return fail();flights.add(f.id);}if(l.complete&&total(l)===null)return fail();}}
 for(const r of Object.values(d.reviews))if(!r||!['fingerprint','status','note','proposed','correction','explanation'].every(k=>str(r[k as keyof Review]))||!Array.isArray(r.history)||!r.history.every(h=>str(h.at)&&str(h.text)))return fail();
 if(!d.audit.every(a=>a&&str(a.id)&&str(a.at)&&str(a.action)&&'before'in a&&'after'in a))return fail();return structuredClone(d);
}
export function demoData():Data {const d=emptyData();d.demo=true;const id='demo-aircraft';const t=(v:string)=>parseTime(v)!;d.aircraft=[{id,tail:'N467P',manual:{date:'2026-10-01',time:t('11500:30')},digital:{date:'2026-10-01',time:t('11500:30')}}]; const mk=(date:string,m:string|null,g:string|null,complete=true):Day=>({aircraftId:id,date,manual:{...emptyLog(),total:m===null?null:t(m),complete:complete&&m!==null},digital:{...emptyLog(),total:g===null?null:t(g),complete:complete&&g!==null}});
 d.days=[mk('2026-10-01','00:00','00:00'),mk('2026-10-02','00:18','00:18'),mk('2026-10-03','00:00','00:00'),mk('2026-10-04','00:36','00:36'),mk('2026-10-05','00:57','00:57'),mk('2026-10-06','02:02','02:02'),mk('2026-10-07','01:20','01:20'),mk('2026-10-08','00:45','00:45',false),mk('2026-10-09',null,'00:44')];
 d.days[6].manual.cumulative=t('11506:03');d.days[5].digital.method='flights';d.days[5].digital.total=null;d.days[5].digital.flights=['00:55','00:23','00:44'].map((v,i)=>({id:'demo-'+i,time:t(v),flightId:'',departure:'',origin:'',destination:'',pilot:'',tail:'',notes:''}));return d; }
