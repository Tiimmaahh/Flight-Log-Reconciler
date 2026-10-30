import React,{useState}from'react';
import{type Day,type Log,type Source,type Flight,type TimeValue,total,fmt,signed,uid}from'./core.ts';
import{TimeField}from'./time-field.tsx';
const newFlight=():Flight=>({id:uid(),time:null,flightId:'',departure:'',origin:'',destination:'',pilot:'',tail:'',notes:''});
export function DayRow({day,save}:{day:Day;save:(d:Day)=>void}){
 const[details,setDetails]=useState(false);const[expanded,setExpanded]=useState(false);
 const m=total(day.manual),g=total(day.digital);const diff=m===null||g===null?null:g-m;
 const status=m===null&&g===null?'Not entered':m===null?'Needs Log book':g===null?'Needs Journey Log':diff===0?'':'Difference';
 const update=(s:Source,patch:Partial<Log>)=>save({...structuredClone(day),[s]:{...structuredClone(day[s]),...patch,complete:false}});
 const shifts=day.manual.shifts??{day:null,night:null};const legacyManual=day.manual.method!=='shifts'&&m!==null;
 const legacyJourney=day.digital.method==='total'&&day.digital.total!==null;
 const flights=day.digital.method==='flights'?day.digital.flights:[];
 const setShift=(s:'day'|'night',v:TimeValue|null)=>update('manual',{method:'shifts',shifts:{...shifts,[s]:v}});
 const setFlight=(index:number,time:TimeValue|null)=>{const next=structuredClone(flights);if(!next.length)next.push(newFlight());next[index]={...next[index],time};update('digital',{method:'flights',flights:next});};
 const add=()=>{const next=structuredClone(flights);if(!next.length)next.push(newFlight());next.push(newFlight());update('digital',{method:'flights',flights:next});setExpanded(true);};
 return <><tr className={diff?'different-row':''}><td className="day-number">{day.date.slice(8)}<small>{new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'UTC'}).format(new Date(day.date+'T12:00:00Z'))}</small></td>
 <td className="logbook-cell"><div className="logbook-layout"><div className="shift-inputs"><label>Shift 1<TimeField label={`Log book shift 1 ${day.date}`} value={shifts.day} save={v=>setShift('day',v)}/></label><label>Shift 2<TimeField label={`Log book shift 2 ${day.date}`} value={shifts.night} save={v=>setShift('night',v)}/></label></div><div className="logbook-summary">{legacyManual?<small className="legacy-note">Existing daily total: <b>{fmt(m)}</b> (not split). Enter shifts to replace it.</small>:<small className="daily-sum">Day total <b>{fmt(m)}</b></small>}
 {day.manual.method==='shifts'&&(shifts.day===null||shifts.night===null)&&m!==null&&<small>One shift entered · other shift blank</small>}
 </div></div></td>
 <td className="journey-cell"><div className="journey-layout"><div className="journey-first"><TimeField label={`${legacyJourney?'Journey Log daily total':'Journey Log flight 1'} ${day.date}`} value={legacyJourney?day.digital.total:flights[0]?.time??null} save={v=>legacyJourney?update('digital',{total:v}):setFlight(0,v)}/><button className="add-flight" aria-label={`Add Journey Log flight ${day.date}`} title="Add another flight" onClick={add}>＋</button></div><div className="journey-summary">{!legacyJourney&&<small className="daily-sum">Day total <b>{fmt(g)}</b>{flights.some(f=>f.time===null)?<span className="blank-flight-note">Blank fields</span>:null}</small>}{flights.length===1&&flights[0].time!==null&&<small className="flight-count">1 flight</small>}{flights.length>1&&<button className="flight-expander" aria-expanded={expanded} aria-label={`Show additional Journey Log flights ${day.date}`} onClick={()=>setExpanded(!expanded)}>{flights.length} flights</button>}</div></div>
 {legacyJourney&&<small className="legacy-note">Existing daily total. ＋ starts separate flight entries.</small>}

 {expanded&&flights.slice(1).map((f,j)=><div className="additional-flight" key={f.id}><span>Flight {j+2}</span><div><TimeField label={`Journey Log flight ${j+2} ${day.date}`} value={f.time} save={v=>setFlight(j+1,v)}/><button className="remove-flight" aria-label={`Remove Journey Log flight ${j+2} ${day.date}`} onClick={()=>update('digital',{flights:flights.filter(x=>x.id!==f.id)})}>×</button></div></div>)}

 {day.digital.method==='flights'&&day.digital.total&&<small className="legacy-note">Original daily total: {fmt(day.digital.total.minutes)}. Only flight fields are counted.</small>}
 </td>
 <td><div className="difference-summary"><strong className={diff?'different':''}>{signed(diff)}</strong>{status&&<small>{status}</small>}</div></td><td><button className="quiet" aria-expanded={details} aria-label={`Details ${day.date}`} onClick={()=>setDetails(!details)}>{details?'Close':'Notes'}</button></td></tr>
 {details&&<tr className="detail-row"><td colSpan={5}><div className="source-details">{(['manual','digital']as Source[]).map(s=><section key={s}><h3>{s==='manual'?'Log book':'Journey Log'}</h3><label>Reference<input aria-label={`${s==='manual'?'Log book':'Journey Log'} reference ${day.date}`} value={day[s].reference} onChange={e=>update(s,{reference:e.target.value})}/></label><label>Notes<input aria-label={`${s==='manual'?'Log book':'Journey Log'} notes ${day.date}`} value={day[s].notes} onChange={e=>update(s,{notes:e.target.value})}/></label>{day[s].flights.filter(f=>f.notes).map(f=><p className="hint" key={f.id}>{f.notes}</p>)}</section>)}</div></td></tr>}</>;
}
