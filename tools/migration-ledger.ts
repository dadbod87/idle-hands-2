import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';

export async function expectedMigrationLedger() {
 const directory=new URL('../supabase/migrations/',import.meta.url);
 const files=(await readdir(directory)).filter(name=>/^\d+_.+\.sql$/.test(name)).sort();
 return Promise.all(files.map(async version=>{
  const source=await readFile(new URL(version,directory));
  return {version,checksum:createHash('sha256').update(source).digest('hex')};
 }));
}
