import{localDatabaseUrl}from'../server/db.ts';
/** A persistent fictional tour is a separate namespace, never the user's practice town. */
export function neighborhoodTourUrl(value:string){localDatabaseUrl(value);const parsed=new URL(value);if(parsed.pathname!=='/ih2_neighborhood_tour')throw new Error('Town tour requires only the dedicated ih2_neighborhood_tour database.');return parsed;}
