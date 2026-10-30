import {emptyData,validateBackup,type Data} from './core.ts';
import {compactAudit} from './audit.ts';
export interface Repository { load():Data; save(data:Data):void }
export class BrowserRepository implements Repository {
 private storage:Pick<Storage,'getItem'|'setItem'>;private key:string;
 constructor(storage:Pick<Storage,'getItem'|'setItem'>=localStorage,key='flight-reconciler-v1'){this.storage=storage;this.key=key;}
 load(){const raw=this.storage.getItem(this.key);if(!raw)return emptyData();return compactAudit(validateBackup(JSON.parse(raw)));}
 save(data:Data){this.storage.setItem(this.key,JSON.stringify(validateBackup(compactAudit(data))));}
}
