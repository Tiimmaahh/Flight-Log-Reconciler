import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyLog,parseTime,type Day,type Aircraft} from '../src/core.ts';
import {runningTotals} from '../src/running-total.ts';
const day=(date:string,hours:string,aircraftId='a'):Day=>({aircraftId,date,manual:{...emptyLog(),total:parseTime(hours)},digital:{...emptyLog(),total:parseTime('99:00')}});
const aircraft:Aircraft={id:'a',tail:'NTEST',manual:null,digital:null,totalTime:{date:'2026-10-27',time:parseTime('11546:53')!}};
test('running totals work backward and forward from the inclusive checkpoint across years',()=>{
 const days=[day('2026-10-26','01:00'),day('2026-10-27','02:00'),day('2026-11-01','00:30'),day('2027-01-01','01:15'),day('2027-01-01','99:00','b')];
 const dates=['2026-10-25','2026-10-26','2026-10-27','2026-10-28','2026-11-01','2027-01-01'];
 assert.deepEqual([...runningTotals(days,aircraft,dates).values()],[692633,692693,692813,692813,692843,692918]);
 const edited=days.map(d=>d.date==='2026-11-01'?day(d.date,'01:00'):d);
 assert.equal(runningTotals(edited,aircraft,['2027-01-01']).get('2027-01-01'),692948);
});
test('opening hours add both shifts once and blank days carry without Journey Log hours',()=>{
 const opening={...aircraft,totalTime:{date:'2026-12-31',time:parseTime('100:00')!}};
 const shifts={...day('2027-01-01','99:00'),manual:{...emptyLog(),method:'shifts' as const,shifts:{day:parseTime('01:00'),night:parseTime('00:30')}}};
 assert.deepEqual([...runningTotals([shifts,day('2027-01-02','')],opening,['2027-01-01','2027-01-02']).values()],[6090,6090]);
 assert.deepEqual([...runningTotals([day('2027-01-02','00:00')],{...aircraft,totalTime:undefined},['2027-01-01','2027-01-02']).values()],[null,0]);
});
