import {emptyData,validateBackup,type Data} from './core.ts';

type Profile = {id:string;revision:number;payload:Data};
export function splitProfiles(data:Data):Map<string,Data>{
 const valid=validateBackup(data);
 return new Map(valid.aircraft.map(aircraft=>[aircraft.id,{...valid,demo:false,aircraft:[aircraft],days:valid.days.filter(day=>day.aircraftId===aircraft.id),reviews:Object.fromEntries(Object.entries(valid.reviews).filter(([key])=>key.startsWith(aircraft.id+'/'))),audit:[]} ]));
}
export class SharedRepository {
 private revisions=new Map<string,number>();
 private loaded=new Map<string,Data>();
 private url:string;private key:string;private request:typeof fetch;
 constructor(url:string,key:string,request:typeof fetch=fetch){this.url=url;this.key=key;this.request=request.bind(globalThis);}
 private async rpc(name:string,body:unknown){
  const response=await this.request(`${this.url.replace(/\/$/,'')}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:this.key,'Content-Type':'application/json',...(this.key.startsWith('eyJ')?{Authorization:`Bearer ${this.key}`}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  if(!response.ok){const detail=await response.json().catch(()=>({}));if(detail.code==='40001')throw Error('Another user updated this aircraft. Download your unsaved backup, then reload before editing again.');throw Error(detail.message||`Shared storage request failed (${response.status}).`);}
  return response.json();
 }
 async load():Promise<Data>{
  const rows=await this.rpc('flight_reconciler_profiles',{}) as Profile[];
  const result=emptyData();const revisions=new Map<string,number>();
  for(const row of rows){const d=validateBackup(row.payload);if(d.aircraft.length!==1||d.aircraft[0].id!==row.id)throw Error('Invalid shared aircraft profile.');result.aircraft.push(...d.aircraft);result.days.push(...d.days);Object.assign(result.reviews,d.reviews);revisions.set(row.id,row.revision);}
  this.revisions=revisions;this.loaded=splitProfiles(result);return validateBackup(result);
 }
 async save(before:Data,after:Data):Promise<void>{
  const old=splitProfiles(before),next=splitProfiles(after);
  if([...old.keys()].some(id=>!next.has(id)))throw Error('Shared aircraft cannot be removed by restoring a backup.');
  const changes=[...next].filter(([id,payload])=>JSON.stringify(old.get(id))!==JSON.stringify(payload)).map(([id,payload])=>({id,expected_revision:this.revisions.get(id)??0,payload}));
  if(!changes.length)return;
  for(const change of changes)if(JSON.stringify(old.get(change.id))!==JSON.stringify(this.loaded.get(change.id)))throw Error('Another user updated this aircraft. Download your unsaved backup, then reload before editing again.');
  const result=await this.rpc('flight_reconciler_save',{changes}) as {id:string;revision:number}[];
  for(const row of result){this.revisions.set(row.id,row.revision);this.loaded.set(row.id,next.get(row.id)!);}
 }
}

