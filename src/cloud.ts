import {SharedRepository} from './shared-repository.ts';
const env=(import.meta as ImportMeta & {env:Record<string,string|undefined>}).env;
const url=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_ANON_KEY;
if(Boolean(url)!==Boolean(key))throw Error('Configure both Supabase URL and public key.');
export const cloud=url&&key?new SharedRepository(url,key):null;
