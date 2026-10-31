import {test} from 'node:test';import assert from 'node:assert/strict';
import {applyJourneyImport,type JourneyImport} from '../src/journey-import.ts';
import {emptyData,emptyLog,parseTime,total,validateBackup} from '../src/core.ts';
test('optional dual import initializes three shifts only on imported dates, even on repeat Journey Log imports',()=>{
 const data=emptyData();data.aircraft=[{id:'a',tail:'NTEST',manual:null,digital:null}];
 const source:JourneyImport={filename:'seed.xlsx',records:[{tail:'NTEST',date:'2026-10-01',flightId:'JL1',time:parseTime('01:00')!,station:'BASE',amendment:0},{tail:'NTEST',date:'2026-10-01',flightId:'JL2',time:parseTime('00:30')!,station:'BASE',amendment:0},{tail:'NTEST',date:'2026-10-02',flightId:'JL3',time:parseTime('00:00')!,station:'BASE',amendment:0}]};
 data.days=[{aircraftId:'a',date:'2026-10-01',manual:{...emptyLog(),total:parseTime('09:00'),notes:'Keep notes'},digital:emptyLog()},{aircraftId:'a',date:'2026-10-03',manual:{...emptyLog(),total:parseTime('05:00')},digital:emptyLog()}];
 applyJourneyImport(data,source,'a');assert.equal(total(data.days[0].manual),540);assert.equal(total(data.days.find(d=>d.date==='2026-10-02')!.manual),null);
 applyJourneyImport(data,source,'a',true);const first=data.days[0];assert.equal(total(first.manual),90);assert.equal(first.manual.shifts?.day?.minutes,90);assert.equal(first.manual.shifts?.night?.minutes,0);assert.equal(first.manual.shifts?.third?.minutes,0);assert.equal(first.manual.notes,'Keep notes');assert.equal(total(data.days.find(d=>d.date==='2026-10-02')!.manual),0);assert.equal(total(data.days[1].manual),300);
 assert.equal(validateBackup(data).days[0].digital.flights.length,2);const snapshot=JSON.stringify(data);applyJourneyImport(data,source,'a',true);assert.equal(JSON.stringify(data),snapshot);
});
