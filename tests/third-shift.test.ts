import {test} from 'node:test';import assert from 'node:assert/strict';
import {emptyData,emptyLog,parseTime,total,validateBackup} from '../src/core.ts';
import {runningTotals} from '../src/running-total.ts';
test('third shift sums once, preserves blank vs zero, and survives backups',()=>{
 const log={...emptyLog(),method:'shifts' as const,total:parseTime('99:00'),shifts:{day:parseTime('01:00'),night:parseTime('00:30'),third:parseTime('00:15')}};
 assert.equal(total(log),105);assert.equal(total({...log,shifts:{day:null,night:null,third:null}}),null);assert.equal(total({...log,shifts:{day:null,night:null,third:parseTime('00:00')}}),0);
 const data=emptyData();const aircraft={id:'a',tail:'NTEST',manual:null,digital:null,totalTime:{date:'2026-10-29',time:parseTime('100:00')!}};data.aircraft=[aircraft];data.days=[{aircraftId:'a',date:'2026-10-30',manual:log,digital:emptyLog()}];
 const restored=validateBackup(JSON.parse(JSON.stringify(data)));assert.equal(total(restored.days[0].manual),105);assert.equal(runningTotals(restored.days,aircraft,['2026-10-30']).get('2026-10-30'),6105);
 const legacy=structuredClone(data);delete legacy.days[0].manual.shifts.third;assert.equal(total(validateBackup(legacy).days[0].manual),90);
 const invalid=structuredClone(data);invalid.days[0].manual.shifts.third={minutes:-1,raw:'bad',mode:'hm'};assert.throws(()=>validateBackup(invalid));
});
