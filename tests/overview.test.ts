import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyLog,parseTime,type Day} from '../src/core.ts';
import {overviewSummary,monthComparison,yearAnalysis,analysisDelta,yearCards,overviewCardYear} from '../src/overview.ts';
const day=(date:string,time:string,id='a'):Day=>({aircraftId:id,date,manual:{...emptyLog(),total:parseTime(time)},digital:{...emptyLog(),total:parseTime('99:00')}});
test('aircraft total uses the inclusive checkpoint then adds only subsequent flight hours',()=>{
 const days=[day('2026-10-27','02:00'),day('2026-10-28','01:00'),day('2027-01-01','00:30')];
 const checkpoint={date:'2026-10-27',time:parseTime('11546:53')!};
 assert.equal(yearCards(days,'a',2026,checkpoint).allTimeTotal,692813+60);
 assert.equal(yearCards(days,'a',2027,checkpoint).allTimeTotal,692813+90);
 assert.equal(yearCards(days,'a',2025,checkpoint).allTimeTotal,null);
 assert.equal(yearCards(days,'a',2026,checkpoint).yearTotal,180);
});
test('estimated months retain totals but do not affect card, table or matched-month averages',()=>{
 const days=[{...day('2025-01-01','100:00'),estimatedDate:true},day('2025-01-02','02:00'),day('2025-10-01','01:00'),day('2026-01-01','03:00'),day('2026-10-01','02:00')];
 assert.deepEqual(yearCards(days,'a',2025),{allTimeTotal:6180,yearTotal:6180,dailyAverage:60,monthlyAverage:60});
 const s=overviewSummary(days,'a',2026);
 assert.equal(yearAnalysis(s.months,2025,undefined,s.excludedMonths).average,60);
 assert.equal(analysisDelta(s.months,2026,s.excludedMonths).average,60);
 const only=[{...day('2025-01-01','100:00'),estimatedDate:true}];
 assert.deepEqual(yearCards(only,'a',2025),{allTimeTotal:6000,yearTotal:6000,dailyAverage:null,monthlyAverage:null});
});
test('year cards distinguish all-time total, entered-day average, entered-month average and actual annual total',()=>{
 const days=[day('2025-10-01','01:00'),day('2026-01-01','02:00'),day('2026-01-02','00:00'),day('2026-02-01','01:00'),day('2026-02-02',''),day('2027-01-01','05:00'),day('2026-01-01','09:00','b')];
 assert.deepEqual(yearCards(days,'a',2026),{allTimeTotal:240,yearTotal:180,dailyAverage:60,monthlyAverage:90});
 assert.deepEqual(yearCards(days,'a',2025),{allTimeTotal:60,yearTotal:60,dailyAverage:60,monthlyAverage:60});
 assert.deepEqual(yearCards(days,'a',2024),{allTimeTotal:null,yearTotal:null,dailyAverage:null,monthlyAverage:null});
});
test('Overview uses Log book, isolates aircraft and excludes missing periods from averages',()=>{
 const result=overviewSummary([day('2025-10-01','01:00'),day('2026-10-01','02:00'),day('2026-10-02','00:30'),day('2026-11-01','00:00'),day('2026-12-01',''),day('2026-10-01','09:00','b')],'a',2026);
 assert.equal(result.total,210);assert.equal(result.monthCount,3);assert.equal(result.yearCount,2);assert.equal(result.monthlyAverage,70);assert.equal(result.yearlyAverage,105);
 assert.deepEqual(monthComparison(result.months,10,2026),{current:150,previous:60,delta:90});
 assert.equal(monthComparison(result.months,11,2026).delta,null);
});
test('year analysis includes zero months, excludes missing months and computes population variance in hours squared',()=>{
 const months=new Map([['2026-01',60],['2026-02',180],['2026-03',0]]);
 const result=yearAnalysis(months,2026);
 assert.equal(result.total,240);assert.equal(result.average,80);assert.equal(result.count,3);assert.ok(Math.abs(result.variance!-14/9)<1e-10);
 assert.deepEqual(yearAnalysis(months,2025),{total:null,average:null,variance:null,count:0});
 assert.equal(yearAnalysis(months,2026,[1]).variance,null);
});
test('analysis deltas compare the same months across years',()=>{
 const months=new Map([['2026-01',180],['2026-02',300],['2026-03',600],['2025-01',60],['2025-02',60]]);
 assert.deepEqual(analysisDelta(months,2026),{total:360,average:180,variance:1});
 assert.deepEqual(analysisDelta(months,2027),{total:null,average:null,variance:null});
});
test('year columns grow for 2027 and keep prior years with the newest adjacent-year delta',()=>{
 const result=overviewSummary([day('2025-10-01','01:00'),day('2026-10-01','02:00'),day('2027-01-01','00:30')],'a',2026);
 assert.deepEqual(result.years,[2027,2026,2025]);assert.equal(result.comparisonYear,2027);assert.equal(monthComparison(result.months,10,2027).delta,null);
 assert.deepEqual(overviewSummary([],'a',2027).years,[2026,2025]);
 assert.equal(overviewSummary([],'a',2026).monthlyAverage,null);
});
test('future years and cards roll forward only on January entries for this aircraft',()=>{
 assert.deepEqual(overviewSummary([],'a',2026).years,[2026,2025]);
 assert.equal(overviewCardYear([],'a',2027),2026);
 assert.deepEqual(overviewSummary([day('2027-02-01','01:00')],'a',2027).years,[2026,2025]);
 assert.deepEqual(overviewSummary([day('2027-01-01','00:00'),day('2028-01-01','01:00')],'a',2026).years,[2028,2027,2026,2025]);
 assert.equal(overviewCardYear([day('2028-01-01','01:00')],'a',2026),2028);
 assert.equal(overviewCardYear([day('2027-01-01','')],'a',2026),2027); // Journey Log entry counts too.
 const blank=day('2027-01-01','');blank.digital=emptyLog();
 assert.equal(overviewCardYear([blank],'a',2026),2026);
 assert.equal(overviewCardYear([day('2027-02-01','01:00'),day('2027-01-01','01:00','b')],'a',2026),2026);
 assert.equal(overviewCardYear([day('2027-01-01','00:00')],'a',2026),2027);
});

