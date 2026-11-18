import {test,expect} from '@playwright/test';
import {runPublicRefresh} from '../tools/public-refresh.ts';
// Actual signed synthetic sessions, no intercepted confirmations or trace cookies.
test.use({trace:'off',screenshot:'off'});
test('public refresh smoke: twenty real streams converge after shared changes and replay without duplicate grants',async({browser})=>{
 const u=new URL(process.env.IH2_BROWSER_DATABASE_URL!);expect(u.pathname).toBe('/ih2_browser');u.pathname='/ih2_load';
 const report=await runPublicRefresh({url:u.href,reset:'1',ci:process.env.CI,container:process.env.IH2_PG_CONTAINER,output:'test-results/browser/public-refresh-smoke',mode:'smoke',browser});
 expect(report.completed).toBe(true);expect(report.mode).toBe('smoke');expect(report.fixedObservationMs).toBe(null);
 expect(report.conservation.uniqueReceipts).toBe(15);expect(report.conservation.consumedKits).toBe(3);expect(report.conservation.consumedRadishes).toBe(12);expect(report.conservation.remainingRadishes).toBe(8);
 expect(report.conservation.all17TablesEveryFieldMatchCheckpoint).toBe(true);expect(report.conservation.all9MetadataChecksumsExact).toBe(true);
 expect(report.cleanup.modelsDrained).toBe(true);expect(report.cleanup.child.report.cleanup.activeStreamsAfter).toBe(0);expect(report.cleanup.child.report.cleanup.activeRequestsAfter).toBe(0);
 expect(report.modelTotalsBeforeLifecycle.reduce((n:number,a:any)=>n+a.invalidations,0)+report.nativeTotalsBeforeLifecycle.reduce((n:number,a:any)=>n+a.invalidations,0)).toBe(285);
 expect(report.replays).toHaveLength(15);expect(report.errors).toEqual([]);
});
