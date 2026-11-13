import type{Page}from'@playwright/test';
/** Old route tests still exercise every destination. Open its new disclosure
 * through real input first; focused menu tests separately verify the closed UX. */
export async function revealPlace(page:Page,selector:string){
 const target=page.locator(selector);for(const detail of await target.locator('xpath=ancestor::details').all())if(!await detail.evaluate(el=>(el as HTMLDetailsElement).open)){const summary=detail.locator(':scope > summary');if(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches))await summary.tap();else await summary.click();}return target;
}
