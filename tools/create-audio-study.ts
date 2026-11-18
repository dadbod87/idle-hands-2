/** Reproducible original study only. Never imported by the game/server build. */
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {stripTypeScriptTypes} from 'node:module';
import {THEMES,ACCENTS,renderTheme,renderAccent,wav,audioMetrics} from '../src/design/audio-sketch.ts';

const DEST='docs/evidence/IH2-129/study';
const SOURCES=['src/design/audio-sketch.ts','src/design/audio-audition.ts','tools/create-audio-study.ts',
  'tools/audio-study-template/index.html','tools/audio-study-template/style.css','tools/audio-study-template/study.js'];
const ART={town:'public/art/variety/building-cafe.svg',woodland:'public/art/original/tree.svg',home:'public/art/housing/porch-house-2.svg'};
const hash=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
function compile(file:string,name:string,names:string[]){
  if(process.version!=='v24.22.2')throw Error('Generate original audio with pinned Node24.22.2.');
  // Only these two reviewed, import-free own modules are eligible for the classic
  // file-openable study. Type erasure is the same pinned native engine as tests.
  const code=stripTypeScriptTypes(readFileSync(file,'utf8'),{mode:'strip'}).replace(/^export (?=(?:const|function|class)\b)/gm,'').split('\n').map(line=>line.trimEnd()).join('\n');
  if(/^(?:import|export)\b/m.test(code)||code.includes('require(')||names.some(n=>!/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)))throw Error('Standalone audio must be an import-free own module.');
  return '/* Original standalone study; generated from '+file+'. */\n(()=>{\n'+code+'\nwindow.'+name+'={'+names.join(',')+'};})();\n';
}
export function audioStudyFiles(){
  const files:Record<string,string|Uint8Array>={},clips:Array<Record<string,unknown>>=[];
  for(const theme of THEMES){
    const samples=renderTheme(theme.id),data=wav(samples);files['audio/'+theme.id+'.wav']=data;
    clips.push({id:theme.id,kind:'original-music',place:theme.place,title:theme.title,bpm:theme.bpm,bars:8,...audioMetrics(samples),bytes:data.length,sha256:hash(data)});
    files['art/'+theme.id+'.svg']=readFileSync(ART[theme.id as keyof typeof ART]);
  }
  for(const accent of ACCENTS){
    const samples=renderAccent(accent.id),data=wav(samples);files['audio/'+accent.id+'.wav']=data;
    clips.push({id:accent.id,kind:'original-accent',name:accent.name,...audioMetrics(samples),bytes:data.length,sha256:hash(data)});
  }
  if(clips.reduce((n,c)=>n+Number(c.bytes),0)>=4_000_000)throw Error('Optional study WAV pack exceeds its declared budget.');
  let html=readFileSync('tools/audio-study-template/index.html','utf8');
  html=html.replace('{{themes}}',THEMES.map(t=>`<button class="theme" data-theme="${t.id}" aria-pressed="${t.id==='town'}"><img src="art/${t.id}.svg" alt=""><span class="place">${t.place}</span><span class="selected-word" aria-hidden="true">SELECTED</span></button>`).join(''));
  html=html.replace('{{accents}}',ACCENTS.map(a=>`<button data-accent="${a.id}">${a.name}</button>`).join(''));
  html=html.replace('{{downloads}}',THEMES.map(t=>`<a href="audio/${t.id}.wav" download>Download ${t.place} demo</a>`).join(''));
  if(html.includes('{{'))throw Error('Unfilled audio study template.');
  files['index.html']=html;files['style.css']=readFileSync('tools/audio-study-template/style.css','utf8');
  files['study.js']=readFileSync('tools/audio-study-template/study.js','utf8');
  files['score.js']=compile('src/design/audio-sketch.ts','IH2Score',['AUDIO_RATE','THEMES','ACCENTS','renderTheme','renderAccent','audioMetrics','wav']);files['audition.js']=compile('src/design/audio-audition.ts','IH2Audition',['AudioAudition']);
  const manifest={status:'Standalone original audition candidate, not loaded by the game',created:'2026-11-18',
    creator:'Codex, for The Patron Group project',authorship:'Independent original notes, score, integer-phase synthesis and seeded noise. No copied melody, recording, sampled instrument or third-party soundfont. No UO/Stones assets imported.',
    rights:'Original project study assets. Existing original project illustrations reused byte-exact; no new third-party asset license or public-domain dedication is implied.',
    externalAssetPurchases:0,runtimeServiceOrTelemetry:false,node:process.version,
    method:'22050Hz mono16-bit WAV; bounded fixed-phase approximate sine harmonics, authored beat/note data, seeded noise, short dry-read room taps, attenuation-only peak limit and zero edges. Numerical checks are not human listening or physical-device evidence.',
    sourceSha256:Object.fromEntries([...SOURCES,...Object.values(ART),'package-lock.json'].map(name=>[name,hash(readFileSync(name))])),
    wavBytes:clips.reduce((n,c)=>n+Number(c.bytes),0),clips,
    files:Object.fromEntries(Object.entries(files).map(([name,data])=>[name,{bytes:typeof data==='string'?Buffer.byteLength(data):data.length,sha256:hash(data)}])),
    playback:'No context or rendering on arrival. Explicit gesture creates one AudioContext with separate music/effect gains. At most one music voice plus one accent and two cached themes. Hidden/mute stop playback; returning waits for Play. No storage/game/API calls.',
    references:['https://help.ea.com/en/articles/security-and-rules/ea-content-policy/','https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices','https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/volume']};
  files['manifest.json']=JSON.stringify(manifest,null,2)+'\n';return files;
}
export function writeAudioStudy(){
  const files=audioStudyFiles();for(const[name,data]of Object.entries(files)){const path=resolve(DEST,name);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,data);}
  return {files:Object.keys(files).length,folder:DEST};
}
export function checkAudioStudy(){
  const files=audioStudyFiles(),errors:string[]=[];
  for(const[name,data]of Object.entries(files)){const path=resolve(DEST,name);if(!existsSync(path)||!readFileSync(path).equals(Buffer.from(data)))errors.push('Missing/stale original audio study: '+name);}
  const walk=(dir:string):string[]=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(dir+'/'+entry.name):[dir+'/'+entry.name]);
  if(existsSync(DEST))for(const path of walk(DEST)){const name=path.slice(DEST.length+1);if(!(name in files))errors.push('Unexpected study file: '+name);}
  return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(process.argv.includes('--check')){const errors=checkAudioStudy();if(errors.length)throw Error(errors.join('\n'));console.log('PASS original audio study regeneration, provenance and bounded optional pack.');}
  else console.log(writeAudioStudy());
}
