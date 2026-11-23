const PLOT_ID=/^[1-9][0-9]{0,17}$/;

export function savedHomeKey(owner:string) {return 'ih2:saved-homes:v1:'+owner;}

export function readSavedHomes(raw:string|null):string[] {
 if(raw===null)return [];
 const value:unknown=JSON.parse(raw);
 if(!Array.isArray(value)||value.some(id=>typeof id!=='string'||!PLOT_ID.test(id)))throw new Error('Saved addresses could not be read.');
 return [...new Set(value)];
}

export function changeSavedHome(addresses:string[],plotId:string,saved:boolean):string[] {
 if(!PLOT_ID.test(plotId))throw new Error('The address is no longer available.');
 if(!saved)return addresses.filter(id=>id!==plotId);
 return addresses.includes(plotId)?addresses:[plotId,...addresses];
}
