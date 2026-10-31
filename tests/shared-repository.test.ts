import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,emptyLog,parseTime} from '../src/core.ts';
import {SharedRepository,splitProfiles} from '../src/shared-repository.ts';
const profile=()=>{const d=emptyData();d.aircraft=[{id:'a',tail:'N467P',manual:null,digital:null,totalTime:{date:'2026-10-27',time:parseTime('11546:53')!}}];d.days=[{aircraftId:'a',date:'2025-01-01',estimatedDate:true,manual:{...emptyLog(),total:parseTime('01:00')},digital:emptyLog()}];return d;};
test('shared profiles preserve checkpoints and estimated dates while excluding unrelated aircraft',()=>{
 const d=profile();d.aircraft.push({id:'b',tail:'N999X',manual:null,digital:null});
 const split=splitProfiles(d);assert.equal(split.get('b')!.days.length,0);assert.equal(split.get('a')!.days[0].estimatedDate,true);assert.equal(split.get('a')!.aircraft[0].totalTime!.time.minutes,692813);
});
test('saving a changed profile submits its loaded revision and updates it after success',async()=>{
 const d=profile(),calls:{name:string;body:any}[]=[];
 const request=(async(url:any,options:any)=>{const name=String(url).split('/').at(-1)!;const body=JSON.parse(options.body);calls.push({name,body});return new Response(JSON.stringify(name.endsWith('profiles')?[{id:'a',revision:7,payload:d}]:[{id:'a',revision:body.changes[0].expected_revision+1}]),{status:200});}) as typeof fetch;
 const repo=new SharedRepository('https://example.supabase.co','sb_publishable_example',request);const before=await repo.load();const next=structuredClone(before);next.days[0].manual.total=parseTime('02:00');await repo.save(before,next);assert.equal(calls[1].body.changes[0].expected_revision,7);
 const after=structuredClone(next);after.days[0].manual.total=parseTime('03:00');await repo.save(next,after);assert.equal(calls[2].body.changes[0].expected_revision,8);
});
test('conflicts are visible and cannot be retried silently with a newer revision',async()=>{
 const d=profile();const request=(async(url:any)=>new Response(JSON.stringify(String(url).endsWith('profiles')?[{id:'a',revision:1,payload:d}]:{code:'40001'}),{status:String(url).endsWith('profiles')?200:409})) as typeof fetch;
 const repo=new SharedRepository('https://example.supabase.co','key',request);const before=await repo.load(),next=structuredClone(before);next.days[0].manual.total=parseTime('02:00');await assert.rejects(repo.save(before,next),/Another user updated/);
 await assert.rejects(repo.save(before,emptyData()),/cannot be removed/);
});
