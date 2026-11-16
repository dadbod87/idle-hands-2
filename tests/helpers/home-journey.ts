import{expect,type Page}from'@playwright/test';
const scene=(p:Page)=>p.evaluate(()=>(window as any).__pilot.snapshot());
export async function exitHomeToSquare(p:Page){for(const [stop,room]of[['home-door','neighborhood'],['neighborhood-exit','square']]as const){await p.locator('#places').click();await p.locator('[data-destination="'+stop+'"]').click();await expect.poll(async()=>(await scene(p)).nearby,{timeout:process.env.CI?40000:15000}).toBe(stop);await p.locator('#interact').click();await expect.poll(async()=>(await scene(p)).room).toBe(room);}}
