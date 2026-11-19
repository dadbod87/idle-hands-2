import {orchardRoutes,rules,simulateWeek,worldDistance} from './model.ts';
import {COMMONS_STOPS} from '../../src/game/town-expansion.ts';
const origin=COMMONS_STOPS.find(stop=>stop.id==='commons-orchard')!.point;
console.log(JSON.stringify({
 classification:'Design model only. No tool edits game state, saves, clocks or server.',
 rules,
 routes:orchardRoutes().map(route=>({id:route.id,feet:route.feet,outboundTiles:worldDistance([origin,...route.outward]),returnTiles:worldDistance([route.feet,...route.back])})),
 schedules:[8,12,24].flatMap(visit=>[6,8,12].flatMap(regrow=>[false,true].map(taste=>simulateWeek(visit,regrow,taste)))),
},null,2));
