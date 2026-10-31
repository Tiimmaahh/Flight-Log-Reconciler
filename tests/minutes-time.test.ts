import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseTime,fmt} from '../src/core.ts';

test('bare numbers from 0 through 59 are minutes and retain raw input',()=>{
 for(let minutes=0;minutes<60;minutes++){
  for(const raw of [String(minutes),String(minutes).padStart(2,'0'),` ${minutes} `]){
   const value=parseTime(raw)!;
   assert.equal(value.minutes,minutes);
   assert.equal(value.raw,raw);
   assert.equal(fmt(value.minutes),`00:${String(minutes).padStart(2,'0')}`);
  }
 }
 assert.equal(parseTime('36','decimal')!.minutes,2160);
 assert.equal(parseTime('1:20')!.minutes,80);
 assert.equal(parseTime('1 20')!.minutes,80);
 assert.equal(parseTime(''),null);
});
test('bare numbers outside the minute range and ambiguous values are rejected',()=>{
 for(const raw of ['60','99','100','000','-1','1.5','3 60','36m'])assert.throws(()=>parseTime(raw));
});
