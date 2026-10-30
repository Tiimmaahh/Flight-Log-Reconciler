import type {Data,Audit} from './core.ts';
function changedRows(before:unknown[],after:unknown[]){
 const key=(x:unknown)=>{const r=x as Record<string,unknown>;return r.aircraftId?`${r.aircraftId}/${r.date}`:String(r.id);};
 const a=new Map(before.map(x=>[key(x),x]));const b=new Map(after.map(x=>[key(x),x]));
 const keys=[...new Set([...a.keys(),...b.keys()])].filter(k=>JSON.stringify(a.get(k))!==JSON.stringify(b.get(k)));
 return {before:keys.map(k=>({key:k,value:a.get(k)??null})),after:keys.map(k=>({key:k,value:b.get(k)??null}))};
}
export function auditChange(before:Data,after:Data):Pick<Audit,'before'|'after'>{
 const b:Record<string,unknown>={},a:Record<string,unknown>={};
 for(const k of ['days','aircraft'] as const){const delta=changedRows(before[k],after[k]);if(delta.before.length){b[k]=delta.before;a[k]=delta.after;}}
 for(const k of ['reviews'] as const){const keys=new Set([...Object.keys(before[k]),...Object.keys(after[k])]);for(const id of keys)if(JSON.stringify(before[k][id])!==JSON.stringify(after[k][id])){(b[k]??= {} as Record<string,unknown>);(a[k]??={} as Record<string,unknown>);(b[k] as Record<string,unknown>)[id]=before[k][id]??null;(a[k] as Record<string,unknown>)[id]=after[k][id]??null;}}
 for(const k of ['tolerance','demo'] as const)if(before[k]!==after[k]){b[k]=before[k];a[k]=after[k];}
 return {before:b,after:a};
}
export function compactAudit(data:Data):Data{
 return {...data,audit:data.audit.map(event=>Array.isArray(event.before)&&Array.isArray(event.after)&&[...event.before,...event.after].every(x=>x&&typeof x==='object'&&('id'in x||'aircraftId'in x))?{...event,...changedRows(event.before,event.after)}:event)};
}
