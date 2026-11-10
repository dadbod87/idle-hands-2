import {defineConfig} from 'vite';
const proxy={'/api/town':{target:'http://127.0.0.1:'+(process.env.IH2_API_PORT??'4186'),changeOrigin:false}};
export default defineConfig({server:{proxy},preview:{proxy}});
