import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname} from 'node:path';
import {LOOKS} from './opening.mjs';

const prefix = '/tools/lodging-study/';
const studyFiles = ['index.html', 'opening.css', 'screen.mjs', 'opening.mjs', 'rented-room.svg', 'boarding-front.svg'];
const paths = new Map(studyFiles.map(file => [prefix + file, new URL(file, import.meta.url)]));
paths.set(prefix, paths.get(prefix + 'index.html'));
for (const look of LOOKS) {
 const path = 'public/art/variety/resident-' + look + '.svg';
 paths.set('/' + path, new URL('../../' + path, import.meta.url));
}
const media = {'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
 '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml'};

createServer(async (request, reply) => {
 const file = paths.get(request.url);
 if (request.method !== 'GET' || !file) {
  reply.writeHead(404).end();
  return;
 }
 try {
  const data = await readFile(file);
  reply.writeHead(200, {'Content-Type': media[extname(file.pathname)], 'Cache-Control': 'no-store'});
  reply.end(data);
 } catch {
  reply.writeHead(500).end();
 }
}).listen(4293, '127.0.0.1');
