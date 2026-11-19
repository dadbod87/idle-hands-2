/** An independent browser study without game services or saved state. */
import {resolve} from 'node:path';
import {build} from 'vite';

export async function createSnackOfferStudy(output = 'test-results/browser/snack-offer-study') {
 const root = resolve('tools/snack-offer-study');
 const outDir = resolve(output);
 await build({configFile:false,root,base:'./',publicDir:false,logLevel:'error',
  build:{outDir,emptyOutDir:true,assetsInlineLimit:10_000}});
 return outDir;
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
 console.log(await createSnackOfferStudy(process.argv[2]));
}
