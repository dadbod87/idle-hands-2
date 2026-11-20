import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {homeInterior,homeInteriorPath,homeDisplays,furnishingCopies,furnishingIcon} from '../src/game/home-identity.ts';
import {createWorkshop,PROP_IDS} from '../src/game/live-workshop.ts';
import {emptyWorkroom} from '../src/game/live-home-layout.ts';

test('confirmed housing plans choose their original matched interiors',()=>{
 assert.equal(homeInterior(1,'pocket-cottage-1'),'cottage-starter-interior');
 assert.equal(homeInterior(2,'pocket-cottage-2'),'cottage-expanded-interior');
 for(const id of [null,undefined,'porch-house-1','unknown']){
  assert.equal(homeInterior(1,id),'home-starter-interior');assert.equal(homeInterior(2,id),'home-expanded-interior');
 }
 assert.equal(homeInterior(2,'pocket-cottage-1'),'home-expanded-interior');
 assert.equal(homeInterior(2,'garden-studio-2'),'garden-studio-interior');
 assert.equal(homeInterior(2,'workshop-lodge-2'),'workshop-lodge-interior');
 assert.equal(homeInterior(1,'workshop-lodge-2'),'home-starter-interior');
 assert.equal(homeInterior(1,'garden-studio-2'),'home-starter-interior');
 assert.equal(homeInteriorPath(homeInterior(2,'garden-studio-2')),'/art/interiors/garden-studio-interior.svg');
 assert.equal(homeInteriorPath(homeInterior(1,null)),'/art/homes/home-starter-interior.svg');
});

test('public displays expose placed items only, with stable positions and no private stock input',()=>{
 const w=createWorkshop(1000),layout={level:2 as const,placements:{...w.placements,'north-west':'easel' as const},workroomPlacements:{...emptyWorkroom(),'workroom-south':'teapot' as const}};
 const before=structuredClone(layout),items=homeDisplays(layout);
 assert.deepEqual(items.map(i=>i.prop),['easel','teapot']);assert.match(items[0].story,/pine/);assert.match(items[1].story,/does not make food/);assert.deepEqual(layout,before);
 assert.equal(homeDisplays({...layout,level:1,workroomPlacements:emptyWorkroom()}).length,1);
});

test('every owned furnishing preview resolves to actual original artwork, including the cafe keepsake',()=>{
 for(const prop of PROP_IDS)for(const motif of ['leaf','sun','moth'])assert.match(readFileSync('public'+furnishingIcon(prop,motif),'utf8'),/<svg/);
 assert.equal(furnishingIcon('teapot'),'/art/cafe/teapot-icon.svg');
});

test('copy facts conserve allocations across Bag, indoors, yard and rental and explain the next move',()=>{
 const w=createWorkshop(1000);w.owned.planter=4;w.placements['north-west']='planter';
 const home={level:1 as const,placements:{...createWorkshop(1000).placements,'north-middle':'planter' as const},workroomPlacements:emptyWorkroom(),yard:{'front-left':'planter' as const}};
 const before=structuredClone({w,home});assert.deepEqual(furnishingCopies(w,home,'planter'),{available:1,indoor:1,yard:1,rental:1,text:'1 in Bag · 1 indoors · 1 in yard · 1 in rental.'});
 w.owned.planter=3;assert.match(furnishingCopies(w,home,'planter').text,/moves one from another home nook/);
 home.placements['north-middle']=null as any;assert.match(furnishingCopies({...w,owned:{...w.owned,planter:2}},home,'planter').text,/moves one from your yard/);
 assert.deepEqual(before.w.placements,w.placements);assert.deepEqual(w.job,before.w.job);
});

test('cottage art preserves bed and doorway geometry and contains no fake floor obstacle or remote media',()=>{
 for(const tier of ['starter','expanded']){
  const old=readFileSync(`public/art/homes/home-${tier}-interior.svg`,'utf8');
  const svg=readFileSync(`public/art/interiors/cottage-${tier}-interior.svg`,'utf8');
  assert.equal(svg.match(/viewBox="[^"]+"/)?.[0],old.match(/viewBox="[^"]+"/)?.[0]);
  for(const geometry of ['x="64" y="64" width="128" height="96"','x="256" y="416" width="96" height="64"'])assert.ok(svg.includes(geometry));
  assert.match(svg,/Painted cottage leaf motif/);assert.doesNotMatch(svg,/<script|<foreignObject|href="https?:/);
 }
});

test('the Garden Studio keeps expanded-home bed and door geometry with original flat sunroom art',()=>{
 const source=readFileSync('public/art/homes/home-expanded-interior.svg','utf8');
 const svg=readFileSync('public/art/interiors/garden-studio-interior.svg','utf8');
 assert.equal(svg.match(/viewBox="[^"]+"/)?.[0],source.match(/viewBox="[^"]+"/)?.[0]);
 for(const geometry of ['x="64" y="64" width="128" height="96"','x="256" y="416" width="96" height="64"'])assert.ok(svg.includes(geometry));
 assert.match(svg,/THE SUNROOM/);
 assert.match(svg,/sunroom-tiles/);
 assert.doesNotMatch(svg,/<script|<foreignObject|href="https?:/);
});


test('the Workshop Lodge has a distinct walkable drafting wing within the original expanded footprint',()=>{
 const source=readFileSync('public/art/homes/home-expanded-interior.svg','utf8');
 const svg=readFileSync('public'+homeInteriorPath(homeInterior(2,'workshop-lodge-2')),'utf8');
 assert.equal(svg.match(/viewBox="[^"]+"/)?.[0],source.match(/viewBox="[^"]+"/)?.[0]);
 for(const geometry of ['x="64" y="64" width="128" height="96"','x="256" y="416" width="96" height="64"'])assert.ok(svg.includes(geometry));
 assert.match(svg,/DRAFTING WING/);
 assert.match(svg,/drafting-boards/);
 assert.doesNotMatch(svg,/<script|<foreignObject|href="https?:/);
});
