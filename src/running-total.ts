import {total,type Day,type Aircraft} from './core.ts';

// End-of-day aircraft time, anchored to the inclusive saved checkpoint.
export function runningTotals(days:Day[],aircraft:Aircraft,dates:string[]):Map<string,number|null>{
 const entries=days.filter(d=>d.aircraftId===aircraft.id).map(d=>({date:d.date,minutes:total(d.manual)})).filter((d):d is {date:string;minutes:number}=>d.minutes!==null).sort((a,b)=>a.date.localeCompare(b.date));
 const checkpoint=aircraft.totalTime;
 const throughCheckpoint=checkpoint?entries.filter(d=>d.date<=checkpoint.date).reduce((sum,d)=>sum+d.minutes,0):0;
 const offset=checkpoint?checkpoint.time.minutes-throughCheckpoint:0;
 const result=new Map<string,number|null>();let sum=0,index=0;
 for(const date of [...dates].sort()){
  while(index<entries.length&&entries[index].date<=date){sum+=entries[index].minutes;index++;}
  result.set(date,checkpoint||index>0?offset+sum:null);
 }
 return result;
}
