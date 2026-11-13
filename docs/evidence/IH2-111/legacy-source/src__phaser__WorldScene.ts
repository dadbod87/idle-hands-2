import {ALLOTMENT_LAYERS,ALLOTMENT_BED_FEET,allotmentCamera} from '../art/allotment.ts';
import{RESIDENTIAL_ASSETS,residentialArt,homeExteriorForPlot}from'../art/residential.ts';
import{ResidentialLife,type ChimneyAnchor}from'./ResidentialLife.ts';
import{PARCELS,STREETS,addressForPlot,NEIGHBORHOOD_TREES}from'../game/neighborhood.ts';
import{NEIGHBORHOOD_ASSETS,neighborhoodArt}from'../art/neighborhood.ts';
import {homeSlots,type HomeSlotId} from '../game/home-layout.ts';
import {DEPOT_ASSETS,depotArt} from '../art/depots.ts';
import {settleCarpentry,type CarpentryState,type NoticeboardState} from '../game/carpentry.ts';
import {CARPENTRY_ASSETS,carpentryArt,carpentryActionFrame,type CarpentryAnimation} from '../art/carpentry.ts';
import {SURVEY_IDS,SURVEYS} from '../game/fieldwork.ts';
import {gardenStage,type GardenState} from '../game/garden.ts';
import {GARDEN_ASSETS,gardenArt,gardenActionFrame,type GardenAnimation} from '../art/garden.ts';
import Phaser from 'phaser';
import {TRAIL_ASSETS,TRAIL_ART} from '../art/trail.ts';
import {HOME_ASSETS,HOME_ART,HOME_CATALOG} from '../art/home.ts';
import {TownSky} from './TownSky.ts';
import {type TownClimate} from '../game/town-climate.ts';
import {TOWN_PEOPLE} from '../game/town-people.ts';
import { Session, WALK_SPEED } from '../game/session.ts';
import {movementFrameSteps} from '../game/movement-frame.ts';
import { TILE, worlds } from '../game/world.ts';
import { PLACEMENT_SLOTS, type WorkshopState,type PropId } from '../game/workshop.ts';
import { ORIGINAL_STATIC, ART, facingFor, walkFrame, type Facing } from '../art/kit.ts';
import catalog from '../../public/art/variety/catalog.json';
import {RESIDENT_IDS,TREE_KINDS,BUILDING_KINDS,residentArt,residentFrame,ambientPose,cosmeticStep} from '../art/variety.ts';
type ArtAsset={id:string;width:number;height:number;foot?:{x:number;y:number};occlusion?:{x:number;y:number;width:number;height:number};lightingWindows?:Array<{x:number;y:number;width:number;height:number}>};
const assets=catalog.assets as ArtAsset[];
const art=(id:string)=>{const asset=assets.find(a=>a.id===id);if(!asset)throw new Error('Missing authored art: '+id);return asset;};
export class WorldScene extends Phaser.Scene {
  actor!: Phaser.GameObjects.Image;
  bridgeRestored=false;bridgePhase?:'collecting'|'building'|'open';bridgeReadyAt:number|null=null;homePennantOwned=false;
  private pennantView?:Phaser.GameObjects.Image;
  districtId?:string;private loadedDistrictId?:string;
  private residentialLife?:ResidentialLife;
  private streetPlotKey='';private streetWindows:Array<{x:number;y:number;width:number;height:number}>=[];
  private streetPlots:Array<{id:string;ownerId:string|null;ownerName?:string;level:1|2}>=[];private streetDirty=true;
  private streetViews:Array<{slot:number;plotId:string|null;image:Phaser.GameObjects.Image;boundary:Phaser.GameObjects.Image;label:Phaser.GameObjects.Text}>=[];
  set neighborhoodPlots(value:Array<{id:string;ownerId:string|null;ownerName?:string;level:1|2}>){const key=JSON.stringify(value.map(p=>[p.id,p.ownerId,p.ownerName,p.level]));if(key===this.streetPlotKey)return;this.streetPlotKey=key;this.streetPlots=value;this.streetDirty=true;}
  homePlotId?:string;homeOwnerName='Resident';homeLevel=1;houseLevel=0;
  onSteer?:()=>void;
  private loadedHomePlotId?:string;private houseView?:Phaser.GameObjects.Image;
  residentId='devon';
  showTownfolk=true;
  skyNow:()=>number=Date.now;
  skyFixture:TownClimate|null=null;
  private sky?:TownSky;
  climateState(){return this.sky?.snapshot()??null;}
  // A menu can retain a quiet world frame without accumulating held input or
  // counting its intentional redraw interval as playable-world frame latency.
  private samplePresentationFrames=true;
  resetPresentationFrame(activePlay=true){this.samplePresentationFrames=activePlay;this.keys.clear();this.movementReset=true;this.lastFrame=0;}
  private canopies:Array<{key:string;image:Phaser.GameObjects.Image;phase:number;baseX:number}>=[];
  private townfolk:Array<{id:string;image:Phaser.GameObjects.Image;label:Phaser.GameObjects.Text}>=[];
  private steam?:Phaser.GameObjects.Graphics;
  private steamBaseY=0;
  private ambientMs=0;
  private ambientEnabled=false;
  private gestureOffset=0;
  private reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  residents:Array<{id:string;name:string;room:string;homePlotId?:string;districtId?:string;position:{x:number;y:number}}>=[];
  private residentViews=new Map<string,{image:Phaser.GameObjects.Image;label:Phaser.GameObjects.Text}>();
  private bridgeView?:Phaser.GameObjects.Image;
  decorations?:()=>Partial<Record<HomeSlotId,PropId|null>>;
  letterboxMotif?:()=> 'leaf'|'sun'|'moth'|null;
  gardenState?:()=>GardenState|undefined;
  gardenNow:()=>number=Date.now;
  welcomeCredits?:()=>number;
  private gardenViews:Phaser.GameObjects.Image[]=[];
  private gardenLabels:Phaser.GameObjects.Text[]=[];
  private gardenLabelTargets=['garden-beds','garden-desk','garden-exit'] as const;
  private gardenWelcomeView?:Phaser.GameObjects.Image;
  private gardenKey='';private gardenNextDraw=0;
  private gardenMotion:{action:GardenAnimation;started:number;facing:Facing}|null=null;
  private lastGardenAction:{action:GardenAnimation;renderedFrames:number;frames:number[]}|null=null;
  carpentryState?:()=>CarpentryState|undefined;
  noticeboardState?:()=>NoticeboardState|undefined;
  private pineViews:Array<{station:string;image:Phaser.GameObjects.Image}>=[];
  private rackView?:Phaser.GameObjects.Image;private noticeboardView?:Phaser.GameObjects.Image;
  private carpentryNextDraw=0;private carpentryKey='';private noticeReveal=0;
  private carpentryMotion:{action:CarpentryAnimation;started:number;facing:Facing}|null=null;
  private lastCarpentryAction:{action:CarpentryAnimation;renderedFrames:number;frames:number[]}|null=null;
  private activityLoading=new Set<string>();
  private activityPrefixes=['garden-actions-','saw-equipped-','carpentry-actions-'] as const;
  private parseActivityTexture(key:string){if(!this.activityPrefixes.some(prefix=>key.startsWith(prefix))||!this.textures.exists(key))return;const texture=this.textures.get(key);if(!texture.has('0'))this.textures.addSpriteSheet('',texture,{frameWidth:64,frameHeight:80});}
  private warmActivityArt(){
    const rig=residentArt(this.residentId);let queued=false;
    for(const prefix of this.activityPrefixes){const key=prefix+rig;if(this.textures.exists(key)||this.activityLoading.has(key))continue;this.activityLoading.add(key);this.load.svg(key,'/art/'+(prefix==='garden-actions-'?'garden':'carpentry')+'/'+key+'.svg');queued=true;}
    if(queued&&!this.load.isLoading())this.load.start();
  }
  refreshCarpentry(){this.carpentryKey='';this.carpentryNextDraw=0;}
  playCarpentryAction(action:CarpentryAnimation){if(this.actor?.active){this.gardenMotion=null;this.carpentryMotion={action,started:performance.now(),facing:this.facing};this.lastCarpentryAction={action,renderedFrames:0,frames:[]};}}
  private drawCarpentry(){
    const tick=performance.now();if(tick<this.carpentryNextDraw)return;this.carpentryNextDraw=tick+500;
    const raw=this.carpentryState?.(),now=Math.floor(this.gardenNow()),s=raw?settleCarpentry(raw,Math.max(raw.observedAt,now)):undefined,n=this.noticeboardState?.();
    const stage=s?.job?(s.job.readyAt<=now?'ready':'working'):'empty',phase=n?.phase??'collecting',available=(s?.pine.available??6)>0,key=JSON.stringify([available,stage,phase]);
    if(key!==this.carpentryKey){this.carpentryKey=key;for(const v of this.pineViews)v.image.setTexture('pine-'+v.station+'-'+(available?'available':'exhausted'));this.rackView?.setTexture('finishing-rack-'+stage);if(this.noticeboardView?.texture.key!=='noticeboard-'+phase&&phase==='open')this.noticeReveal=tick;this.noticeboardView?.setTexture('noticeboard-'+phase);}
    if(this.noticeboardView)this.noticeboardView.setAlpha(this.reducedMotion.matches||document.hidden||!this.noticeReveal?1:Math.min(1,.55+(tick-this.noticeReveal)/700));
  }
  refreshGarden(){this.gardenKey='';this.gardenNextDraw=0;}
  playGardenAction(action:GardenAnimation){if(this.room==='garden'&&this.actor?.active){this.carpentryMotion=null;this.gardenMotion={action,started:performance.now(),facing:this.facing};this.lastGardenAction={action,renderedFrames:0,frames:[]};}}
  private depotViews:Array<{resource:string;image:Phaser.GameObjects.Image;label:Phaser.GameObjects.Text}>=[];
  private decorationViews:Phaser.GameObjects.GameObject[]=[];
  private decorationKey='';
  refreshDecorations(){this.decorationKey='';}
  private facing: Facing = 'south';
  private travelled = 0;
  private frame = 0;
  private occluders: {image:Phaser.GameObjects.Image;x:number;y:number;width:number;height:number}[] = [];
  private keys = new Set<string>();
  private room = '';
  private lastFrame = 0;
  private movementReset=true;
  frameSamples: number[] = [];
  needsFullRate(){return this.keys.size>0||this.session.snapshot().walking||!!this.gardenMotion||!!this.carpentryMotion||this.noticeReveal>0&&performance.now()-this.noticeReveal<800;}
  onFrame?: () => void;
  onWalkFailure?:()=>void;
  movementBudget?:()=>number;
  onMovement?:(distance:number)=>void;
  private drawGarden(){
    if(this.room!=='garden'&&this.room!=='square')return;
    const tick=performance.now();if(tick<this.gardenNextDraw)return;this.gardenNextDraw=tick+500;
    const state=this.gardenState?.(),now=Math.floor(this.gardenNow());
    const stages=this.room==='garden'&&state?state.beds.map(b=>b?'garden-'+b.crop+'-'+gardenStage(b,now):'garden-bed-empty'):[];
    const credits=Math.max(0,Math.min(6,this.welcomeCredits?.()??0)),key=JSON.stringify([stages,credits]);if(key===this.gardenKey)return;this.gardenKey=key;
    if(this.room==='garden'){for(const v of this.gardenViews)v.destroy();this.gardenViews=[];for(const [i,texture]of stages.entries()){const meta=gardenArt(texture),p=ALLOTMENT_BED_FEET[i];this.gardenViews.push(this.add.image(p.x,p.y,texture).setOrigin(meta.foot!.x/meta.width,meta.foot!.y/meta.height).setDepth(p.y));}}
    this.gardenWelcomeView?.setTexture(credits>=6?'garden-welcome-open':'garden-welcome-collecting');
  }
  constructor(public session: Session) { super('world'); }
  private bridgeTexture(){return this.bridgeRestored||this.bridgePhase==='open'?TRAIL_ART.bridge.open:this.bridgePhase==='building'?(this.bridgeReadyAt!==null&&this.skyNow()>=this.bridgeReadyAt?TRAIL_ART.bridge.ready:TRAIL_ART.bridge.building):TRAIL_ART.bridge.collecting;}
  preload() {
    for(const key of DEPOT_ASSETS)this.load.svg(key,`/art/depots/${key}.svg`);
    for(const motif of ['leaf','sun','moth'])this.load.svg('letterbox-'+motif+'-closed','/art/commission/letterbox-'+motif+'-closed.svg');
    // Peer sprites use the four ordinary rigs. Activity/equipment sheets belong
    // only to self; avoid rasterizing nine unused sheets on every fresh visit.
    const rig=residentArt(this.residentId);
    for(const key of CARPENTRY_ASSETS)if(!/^(saw-equipped-|carpentry-actions-)/.test(key)||key.endsWith('-'+rig)){if(/^(saw-equipped-|carpentry-actions-)/.test(key))this.activityLoading.add(key);this.load.svg(key,'/art/carpentry/'+key+'.svg');}
    for(const key of ALLOTMENT_LAYERS)this.load.svg(key,`/art/allotment/${key}.svg`);
    for(const key of GARDEN_ASSETS)if(!key.startsWith('garden-actions-')||key.endsWith('-'+rig)){if(key.startsWith('garden-actions-'))this.activityLoading.add(key);this.load.svg(key,'/art/garden/'+key+'.svg');}
    for(const key of TRAIL_ASSETS)this.load.svg(key,'/art/trail/'+key+'.svg');
    for(const key of HOME_ASSETS)this.load.svg(key,'/art/homes/'+key+'.svg');
    for(const asset of RESIDENTIAL_ASSETS)this.load.svg(asset.id,'/art/residential/'+asset.file);
    for(const asset of NEIGHBORHOOD_ASSETS)this.load.svg(asset.id,'/art/neighborhood/'+asset.file);
    for (const key of ORIGINAL_STATIC) if(!['ground-square','workshop','cafe','tree'].includes(key))this.load.svg(key, `/art/original/${key}.svg`);
    const keys=['ground-square',...BUILDING_KINDS.map(k=>'building-'+k),...TREE_KINDS.flatMap(k=>['tree-'+k+'-trunk','tree-'+k+'-canopy']),...RESIDENT_IDS.map(k=>'resident-'+k)];
    for(const key of keys)this.load.svg('variety-'+key,`/art/variety/${key}.svg`);
  }
  create() {
    this.depotViews=[];
    this.pineViews=[];this.rackView=undefined;this.noticeboardView=undefined;this.carpentryMotion=null;this.lastCarpentryAction=null;this.carpentryKey='';this.carpentryNextDraw=0;this.noticeReveal=0;
    this.gardenViews=[];this.gardenLabels=[];this.gardenKey='';this.gardenNextDraw=0;this.gardenMotion=null;this.lastGardenAction=null;this.gardenWelcomeView=undefined;
    this.movementReset=true;
    this.room = this.session.room;this.loadedHomePlotId=this.homePlotId;this.loadedDistrictId=this.districtId;this.streetViews=[];this.streetDirty=true;this.residentialLife=undefined;this.houseView=undefined;this.pennantView=undefined;
    this.canopies=[];this.townfolk=[];this.steam=undefined;this.ambientMs=0;
    for(const id of RESIDENT_IDS){const texture=this.textures.get('variety-resident-'+id);if(!texture.has('0'))this.textures.addSpriteSheet('',texture,{frameWidth:64,frameHeight:80});}
    for(const id of RESIDENT_IDS)for(const prefix of this.activityPrefixes)this.parseActivityTexture(prefix+id);
    const activityLoaded=(key:string)=>{this.activityLoading.delete(key);this.parseActivityTexture(key);};
    // A failed asset keeps its attempt marker until scene restart; never retry
    // a missing file on every frame or block progress/input on artwork.
    this.load.on('filecomplete',activityLoaded);
    this.events.once('shutdown',()=>{this.load.off('filecomplete',activityLoaded);this.activityLoading.clear();});
    this.decorationKey=''; this.decorationViews=[];this.residentViews=new Map();this.bridgeView=undefined;
    this.occluders = [];
    this.frame = 0; this.facing = 'south'; this.travelled = 0;
    const w = worlds[this.session.room];
    const litWindows:Array<{x:number;y:number;width:number;height:number}>=[];
    const image=(key:string,x:number,y:number,depth:number)=>this.add.image(x,y,key).setOrigin(0).setDepth(depth);
    image(this.room==='neighborhood'?'neighborhood-ground':this.room==='square'?'variety-ground-square':this.room==='garden'?'garden-ground':this.room==='trail'?TRAIL_ART.ground:this.room==='home'?HOME_ART.starterInterior:this.room==='home-expanded'?HOME_ART.expandedInterior:'ground-workshop',0,0,-1000);
    const label=(x:number,y:number,value:string)=>this.add.text(x*TILE,y*TILE,value,{fontFamily:'Georgia,serif',fontSize:13,color:'#343c36',backgroundColor:'#f3e6c5',padding:{x:9,y:5}}).setOrigin(.5).setDepth(y*TILE);
    if(this.room==='square') {
      for(const [key,x,y,labelText]of [['garden-gate',17.5,36.5,'Allotment'],['garden-registry',20.5,36.5,'Displays'],['garden-field',12.5,37.5,'Field clippings'],['garden-stake-forked',11.5,26.5,'Forked stake'],['garden-stake-striped',18.5,39.5,'Marked stake'],['garden-stake-notched',35.5,39.5,'Notched stake']] as const){const meta=gardenArt(key),foot=meta.foot!;this.add.image(x*TILE,y*TILE,key).setOrigin(foot.x/meta.width,foot.y/meta.height).setDepth(y*TILE);label(x,y+.55,labelText);}
      for(const stop of worlds.square.stops.filter(s=>s.id.startsWith('pine-'))){const station=stop.id.slice(5),meta=carpentryArt('pine-'+station+'-available'),foot=meta.foot!,px=(stop.point.x+.5)*TILE,py=(stop.point.y+.5)*TILE;const view=this.add.image(px,py,meta.id).setOrigin(foot.x/meta.width,foot.y/meta.height).setDepth(py);this.pineViews.push({station,image:view});this.occluders.push({image:view,x:px-meta.width/2,y:py,width:meta.width,height:meta.height-12});label(stop.point.x+.5,stop.point.y+1.1,'Pine deadfall');}
      const desk=worlds.square.stops.find(s=>s.id==='carpentry-desk')!,dx=(desk.point.x+.5)*TILE,dy=(desk.point.y+.5)*TILE;this.add.image(dx,dy,'carpentry-attendant').setOrigin(ART.actorAnchor.x,ART.actorAnchor.y).setScale(.9).setDepth(dy);label(desk.point.x+.5,desk.point.y+1.1,'Nella · carpentry');
      const notice=carpentryArt('noticeboard-collecting');this.noticeboardView=this.add.image(dx+96,dy,notice.id).setOrigin(notice.foot!.x/notice.width,notice.foot!.y/notice.height).setDepth(dy);label(desk.point.x+3.5,desk.point.y+1.1,'Noticeboard');
      const welcome=gardenArt('garden-welcome-collecting');this.gardenWelcomeView=this.add.image(24.5*TILE,36.5*TILE,welcome.id).setOrigin(welcome.foot!.x/welcome.width,welcome.foot!.y/welcome.height).setDepth(36.5*TILE);label(24.5,37.1,'Welcome bed');
      for(const [key,x] of [['workshop',17],['cafe',28]] as const){
        const meta=art('building-'+key),foot=meta.foot!,left=x*TILE-8,top=22*TILE-foot.y;
        const building=image('variety-building-'+key,left,top,22*TILE);
        for(const box of meta.lightingWindows??[])litWindows.push({...box,x:left+box.x,y:top+box.y});
        const bounds=meta.occlusion??{x:0,y:foot.y-180,width:meta.width,height:180};
        this.occluders.push({image:building,x:left+bounds.x,y:top+bounds.y+bounds.height,width:bounds.width,height:bounds.height});
        if(key==='cafe'){this.steam=this.add.graphics().setPosition(left+162.5,top+9).setDepth(22*TILE+1);this.steamBaseY=top+9;this.steam.fillStyle(0xf8f1df).fillEllipse(0,0,13,19).fillEllipse(-5,-12,17,16).fillEllipse(2,-25,20,14);}
      }
      for(const [resource,x,name] of [['scrap',21,'Scrap'],['timber',23,'Timber'],['supplies',25,'Supplies']] as const){
        const meta=depotArt(resource),prop=this.add.image((x+.5)*TILE,29*TILE,meta.id).setOrigin(meta.foot.x/meta.width,meta.foot.y/meta.height).setDepth(29*TILE);
        const plate=this.add.text((x+.5)*TILE,27.8*TILE,name,{fontFamily:'Georgia',fontSize:11,color:'#202f28',backgroundColor:'#f8f1df',padding:{x:3,y:3}}).setOrigin(.5).setDepth(30*TILE);
        this.depotViews.push({resource,image:prop,label:plate});
      }
      const gateArt=gardenArt('garden-gate');this.add.image(42.5*TILE,32*TILE,gateArt.id).setOrigin(gateArt.foot!.x/gateArt.width,gateArt.foot!.y/gateArt.height).setDepth(32*TILE);label(42.5,33,'Homes & neighbors');
      image('home-plot',27*TILE-8,30*TILE-8,35*TILE);
      this.houseView=image('housing-registry',30.5*TILE-HOME_ART.exteriorFoot.x,36*TILE-HOME_ART.exteriorFoot.y,36*TILE);this.occluders.push({image:this.houseView,x:30.5*TILE-HOME_ART.exteriorFoot.x,y:36*TILE,width:208,height:240});
      const registry=neighborhoodArt('housing-registry');for(const box of registry.lightingWindows??[])litWindows.push({...box,x:30.5*TILE-104+box.x,y:36*TILE-240+box.y});
      this.bridgeView=image(this.bridgeTexture(),26*TILE-TRAIL_ART.bridge.foot.x,12.75*TILE-TRAIL_ART.bridge.foot.y,12.7*TILE);
      label(24.5,13.7,'!  Bridge committee');
      const plantings=[[17,26,'oak'],[34,26,'birch'],[14,17,'fruit'],[37,19,'oak'],[13,30,'birch'],[37,33,'fruit']] as const;
      for(const [index,[x,y,kind]] of plantings.entries()){
        const meta=art('tree-'+kind+'-canopy'),foot=meta.foot!,footX=(x+1)*TILE,footY=(y+2)*TILE+4;
        for(const layer of ['trunk','canopy']){const tree=this.add.image(footX,footY,'variety-tree-'+kind+'-'+layer).setOrigin(foot.x/meta.width,foot.y/meta.height).setDepth(footY+(layer==='canopy'?.1:0));
         if(layer==='canopy'){this.canopies.push({key:kind,image:tree,phase:index*1.7,baseX:footX});const bounds=meta.occlusion??{x:4,y:0,width:meta.width-8,height:foot.y};this.occluders.push({image:tree,x:footX-foot.x+bounds.x,y:footY-foot.y+bounds.y+bounds.height,width:bounds.width,height:bounds.height});}}
      }
      for(const id of SURVEY_IDS){const point=SURVEYS[id].point;label(point.x+.5,point.y+.8,'Sketch study');}
      if(this.showTownfolk)for(const person of TOWN_PEOPLE){const py=(person.point.y+.5)*TILE,px=(person.point.x+.5)*TILE;const view=this.add.image(px,py,'variety-resident-'+person.rig,0).setOrigin(ART.actorAnchor.x,ART.actorAnchor.y).setScale(ART.actorScale).setDepth(py);const tag=this.add.text(px,py-62,person.name+' · '+person.role.split(' · ')[0],{fontFamily:'Georgia',fontSize:11,color:'#343c36',backgroundColor:'#f8f1df',padding:{x:3,y:2}}).setOrigin(.5,1).setDepth(py+1);this.townfolk.push({id:person.id,image:view,label:tag});}
    } else if(this.room==='neighborhood') {
      this.residentialLife=new ResidentialLife(this);
      for(const [x,y,variant]of [[3,12,'daisies'],[61,20,'lavender'],[5,60,'lavender'],[48,60,'daisies']]as const){const meta=residentialArt('residential-verge-'+variant);this.add.image(x*TILE,y*TILE,meta.id).setOrigin(meta.foot.x/meta.width,meta.foot.y/meta.height).setDepth(-900);}
      for(const p of PARCELS){const x=p.foot.x*TILE,y=p.foot.y*TILE;const boundary=this.add.image(x,y,'home-site-boundary').setOrigin(.5,240/248).setDepth(y-.2).setVisible(false);const home=this.add.image(x,y,'future-home-site').setOrigin(.5,240/248).setDepth(y);this.occluders.push({image:home,x:x-104,y,width:208,height:240});const tag=this.add.text(x,(p.front.y+1.1)*TILE,'',{fontFamily:'Georgia',fontSize:12,color:'#253c34',backgroundColor:'#f8f1df',padding:{x:5,y:4},align:'center',wordWrap:{width:210}}).setOrigin(.5,0).setDepth(y+2);this.streetViews.push({slot:p.slot,plotId:null,image:home,boundary,label:tag});}
      for(const[row,street]of STREETS.entries())label(31.5,18+row*13,street);
      const sign=gardenArt('garden-registry');this.add.image(30*TILE,4.8*TILE,sign.id).setOrigin(sign.foot!.x/sign.width,sign.foot!.y/sign.height).setDepth(4.8*TILE);label(29.5,5.25,'Street directory');label(31.5,1.1,'Town square ↑');
      for(const[index,[x,y,kind]]of NEIGHBORHOOD_TREES.entries()){const meta=art('tree-'+kind+'-canopy'),foot=meta.foot!;for(const layer of['trunk','canopy']){const view=this.add.image(x*TILE,y*TILE,'variety-tree-'+kind+'-'+layer).setOrigin(foot.x/meta.width,foot.y/meta.height).setDepth(y*TILE+(layer==='canopy'?.1:0));if(layer==='canopy'){this.canopies.push({key:kind,image:view,phase:index*1.7,baseX:x*TILE});this.occluders.push({image:view,x:x*TILE-50,y:y*TILE,width:100,height:105});}}}
      this.drawNeighborhood();
    } else if(this.room==='garden') {
      image('study-meadow-detail',0,0,-990);
      for(const [i,p] of ALLOTMENT_BED_FEET.entries())this.add.image(p.x,p.y,ALLOTMENT_LAYERS[i]).setOrigin(.5,1).setDepth(-980);
      const meta=gardenArt('garden-attendant');this.add.image(5.5*TILE,14.1*TILE,meta.id).setOrigin(meta.foot!.x/meta.width,meta.foot!.y/meta.height).setScale(.9).setDepth(14.1*TILE);
      this.gardenLabels.push(label(13,12.55,'Your three beds'),label(5.5,14.9375,'Attendant'),label(9.5,16.6,'Square ↓'));
      for(const text of this.gardenLabels)text.setFontSize(12).setPadding(4,3,4,3);
    } else if(this.room==='trail') {
      for(const [index,planting] of TRAIL_ART.treePlacements.entries()){const kind=planting.kind,meta=art('tree-'+kind+'-canopy'),foot=meta.foot!,footX=(planting.tileX+1)*TILE,footY=(planting.tileY+2)*TILE;for(const layer of ['trunk','canopy']){const tree=this.add.image(footX,footY,'variety-tree-'+kind+'-'+layer).setOrigin(foot.x/meta.width,foot.y/meta.height).setDepth(footY+(layer==='canopy'?.1:0));if(layer==='canopy'){this.canopies.push({key:kind,image:tree,phase:index*1.7,baseX:footX});const bounds=meta.occlusion??{x:4,y:0,width:meta.width-8,height:foot.y};this.occluders.push({image:tree,x:footX-foot.x+bounds.x,y:footY-foot.y+bounds.y+bounds.height,width:bounds.width,height:bounds.height});}}}
      for(const meta of Object.values(TRAIL_ART.landmarks)){const x=(meta.point.x+.5)*TILE,y=meta.point.y*TILE;this.add.image(x,y,meta.key).setOrigin(meta.foot.x/meta.width,meta.foot.y/meta.height).setDepth(y);label(meta.point.x+.5,meta.point.y+1.1,'Field note');}
      label(9.5,24.4,'Town square ↓');
    } else if(this.room.startsWith('home')) {
      const key=this.room==='home'?HOME_ART.starterInterior:HOME_ART.expandedInterior;const meta=HOME_CATALOG.assets.find(asset=>asset.id===key);for(const box of meta?.lightingWindows??[])litWindows.push(box);
      label(9,1.4,this.homeOwnerName+'’s '+(this.room==='home'?'home':'home · workroom added'));
      label(9.5,14,this.districtId?'Street ↓':'Square ↓');
      this.pennantView=this.add.image(15*TILE,5.5*TILE,TRAIL_ART.pennant.world).setOrigin(TRAIL_ART.pennant.foot.x/TRAIL_ART.pennant.width,TRAIL_ART.pennant.foot.y/TRAIL_ART.pennant.height).setDepth(2*TILE).setVisible(this.homePennantOwned);
    } else {
      image('bench',3*TILE,3*TILE,5*TILE).setDisplaySize(5*TILE,3*TILE);
      const rack=carpentryArt('finishing-rack-empty');this.rackView=this.add.image(12.5*TILE,6*TILE,rack.id).setOrigin(rack.foot!.x/rack.width,rack.foot!.y/rack.height).setDepth(6*TILE);label(12.5,6.9,'Pine finishing rack');
      image('crates',3*TILE,8*TILE,10*TILE);
      label(9,1.8,'Your workshop');
      label(9,7.6,'Great things take time.');
      label(9,8.5,'This bench is extremely optimistic.');
      this.add.rectangle(9.5*TILE,14*TILE,3*TILE,2*TILE,0x8c7757).setStrokeStyle(2,0x343c36).setDepth(0);
      label(9.5,14,'Square ↓');
    }
    this.actor=this.add.image(0,0,'variety-resident-'+residentArt(this.residentId),0).setOrigin(ART.actorAnchor.x,ART.actorAnchor.y).setScale(ART.actorScale);
    this.cameras.main.setBackgroundColor(this.room === 'square' ? '#aebc92' : this.room==='trail'?'#87966f':'#c5b28d');
    this.cameras.main.setBounds(0, 0, w.width * TILE, w.height * TILE);
    // Small interiors and the bounded trail stay centred on large screens; phones retain follow-and-pan.
    const roomBounds=(size?:{width:number;height:number})=>{
      const camera=this.cameras.main,width=size?.width??this.scale.gameSize.width,height=size?.height??this.scale.gameSize.height;
      if(this.room==='garden'){
        const layout=allotmentCamera(width,height),bounds=layout.bounds;
        camera.setZoom(layout.zoom).setFollowOffset(layout.followX,layout.followY).setBounds(bounds.x,bounds.y,bounds.width,bounds.height);
        for(const text of this.gardenLabels)text.setScale(1/layout.zoom);
        return;
      }
      camera.setZoom(1).setFollowOffset(0,0);
      if(this.room==='square')return;
      const worldWidth=w.width*TILE,worldHeight=w.height*TILE;
      camera.setBounds(-Math.max(0,(width-worldWidth)/2),-Math.max(0,(height-worldHeight)/2),Math.max(width,worldWidth),Math.max(height,worldHeight));
    };
    roomBounds();this.scale.on(Phaser.Scale.Events.RESIZE,roomBounds);this.events.once('shutdown',()=>this.scale.off(Phaser.Scale.Events.RESIZE,roomBounds));
    this.cameras.main.startFollow(this.actor, true, 1, 1);roomBounds();
    this.sky=new TownSky(this,this.room==='neighborhood'?this.streetWindows:litWindows);this.sky.update(this.skyNow(),0,this.room==='workshop'||this.room.startsWith('home'),!document.hidden&&!this.reducedMotion.matches,this.skyFixture);
    const onDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('button,input,select,dialog,[data-ui-scroll]')) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(key)) {if(!this.session.locked)this.onSteer?.(); this.keys.add(key); e.preventDefault(); }
    };
    const onUp = (e: KeyboardEvent) => this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    const clear = () => { this.gardenMotion=null;this.carpentryMotion=null;this.noticeReveal=0;this.noticeboardView?.setAlpha(1);this.movementReset=true;this.keys.clear(); this.session.stop();this.updateAmbient(0); };
    const readingFocus=(event:FocusEvent)=>{if(event.target instanceof HTMLElement&&event.target.closest('[data-ui-scroll]')){this.keys.clear();this.movementReset=true;}};
    document.addEventListener('focusin',readingFocus);
    const motionChanged=()=>this.updateAmbient(0);this.reducedMotion.addEventListener('change',motionChanged);
    document.addEventListener('keydown', onDown); document.addEventListener('keyup', onUp);
    window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // Phaser also receives window-level mouse events from HTML controls.
      if(p.downElement!==this.game.canvas)return;
      const pos = this.cameras.main.getWorldPoint(p.x, p.y);
      const to = { x: pos.x / TILE - .5, y: pos.y / TILE - .5 };
      if(!this.session.locked){
        this.onSteer?.();
        const label=this.room==='garden'?this.gardenLabels.findIndex(text=>this.gardenLabelHit(text).contains(pos.x,pos.y)):-1;
        // Caption taps use the same approach/arrival validation as a body tap.
        // They never open a panel or authorize a command from a distance.
        const accepted=label>=0?this.session.approach(this.gardenLabelTargets[label]):this.session.point(to);
        if(!accepted)this.onWalkFailure?.();
      }
    });
    this.events.once('shutdown', () => { this.reducedMotion.removeEventListener('change',motionChanged);document.removeEventListener('focusin',readingFocus);document.removeEventListener('keydown', onDown); document.removeEventListener('keyup', onUp); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear); });
  }
  private gardenLabelHit(text:Phaser.GameObjects.Text){
    const b=text.getBounds(),minimum=44/this.cameras.main.zoom;
    return new Phaser.Geom.Rectangle(b.centerX-Math.max(b.width,minimum)/2,b.centerY-Math.max(b.height,minimum)/2,Math.max(b.width,minimum),Math.max(b.height,minimum));
  }
  private drawNeighborhood(){
    if(this.room!=='neighborhood'||!this.streetDirty)return;this.streetDirty=false;this.streetWindows=[];
    const chimneys:ChimneyAnchor[]=[];
    for(const view of this.streetViews){
      const parcel=PARCELS[view.slot-1],plot=this.streetPlots.find(p=>{const a=addressForPlot(p.id);return a.block===this.districtId&&a.slot===view.slot;});
      view.plotId=plot?.id??null;view.boundary.setVisible(!!plot);
      if(plot){const meta=homeExteriorForPlot(plot.id,plot.level),left=parcel.foot.x*TILE-meta.foot.x,top=parcel.foot.y*TILE-meta.foot.y;
        view.image.setTexture(meta.id);for(const box of meta.lightingWindows)this.streetWindows.push({...box,x:left+box.x,y:top+box.y});
        chimneys.push({plotId:plot.id,slot:view.slot,x:left+meta.chimney.x,y:top+meta.chimney.y,depth:parcel.foot.y*TILE+.15});
      }else view.image.setTexture('future-home-site');
      const owner=plot?.ownerName??'Resident';view.label.setText(parcel.number+' '+parcel.street+'\n'+(plot?(owner.length>22?owner.slice(0,21)+'…':owner):'Future home site'));
    }
    this.residentialLife?.replace(chimneys);this.sky?.setWindows(this.streetWindows);
  }
  visualState(){const camera=this.cameras.main;return {camera:{zoom:camera.zoom,scrollX:camera.scrollX,scrollY:camera.scrollY,worldView:{x:camera.worldView.x,y:camera.worldView.y,width:camera.worldView.width,height:camera.worldView.height},matrix:Array.from(camera.matrixCombined.matrix).slice(0,6)},neighborhood:{districtId:this.districtId??null,life:this.residentialLife?.snapshot()??null,windows:this.streetWindows.map(w=>({...w})),sites:this.streetViews.map(v=>({slot:v.slot,plotId:v.plotId,texture:v.image.texture.key,label:v.label.text,bounds:v.image.getBounds(),labelBounds:v.label.getBounds()}))},depots:this.depotViews.map(d=>({resource:d.resource,key:d.image.texture.key,depth:d.image.depth,bounds:d.image.getBounds(),labelBounds:d.label.getBounds(),label:d.label.text})),letterboxes:this.decorationViews.filter((v):v is Phaser.GameObjects.Image=>v instanceof Phaser.GameObjects.Image&&v.texture.key.startsWith('letterbox-')).map(v=>v.texture.key),carpentry:{pineTextures:this.pineViews.map(v=>v.image.texture.key),rackTexture:this.rackView?.texture.key??null,noticeboardTexture:this.noticeboardView?.texture.key??null,equipped:this.carpentryState?.()?.saw.equipped??false,lastAction:this.lastCarpentryAction,action:this.carpentryMotion?.action??null},garden:{room:this.room,lastAction:this.lastGardenAction,bedTextures:this.gardenViews.map(v=>v.texture.key),bedFeet:this.gardenViews.map(v=>({x:v.x,y:v.y})),labels:this.gardenLabels.map((v,i)=>({text:v.text,target:this.gardenLabelTargets[i],bounds:v.getBounds(),hitBounds:this.gardenLabelHit(v)})),action:this.gardenMotion?.action??null,actorTexture:this.actor?.texture.key??null,welcomeTexture:this.gardenWelcomeView?.texture.key??null},bridge:{phase:this.bridgePhase??(this.bridgeRestored?'open':'collecting'),texture:this.bridgeView?.texture.key??null,readyAt:this.bridgeReadyAt},home:{pennantVisible:this.pennantView?.visible??false,pennantTexture:this.pennantView?.texture.key??null,pennantPosition:this.pennantView?{x:this.pennantView.x,y:this.pennantView.y}:null,room:this.room,plotId:this.loadedHomePlotId??null,ownerName:this.homeOwnerName,level:this.homeLevel,decorations:this.room.startsWith('home')&&this.decorations?this.decorations():null,interiorTexture:this.room==='home'?HOME_ART.starterInterior:this.room==='home-expanded'?HOME_ART.expandedInterior:null},facing:this.facing,frame:this.frame,anchor:ART.actorAnchor,scale:ART.actorScale,variety:{actorId:residentArt(this.residentId),actorTexture:this.actor?.texture?.key??null,actorFrame:this.actor?.frame?.name??null,actorSize:{width:this.actor?.width??0,height:this.actor?.height??0},residentFramesReady:!!this.actor&&RESIDENT_IDS.every(id=>this.textures.get('variety-resident-'+id).has('27')),treeKinds:(this.room==='square'||this.room==='neighborhood')?[...TREE_KINDS]:[],buildingKinds:this.room==='square'?[...BUILDING_KINDS]:[],ambient:{enabled:this.ambientEnabled,canopies:this.canopies.map(c=>({key:c.key,rotation:c.image.rotation,offsetX:c.image.x-c.baseX})),steam:{alpha:this.steam?.alpha??0,y:this.steam?this.steam.y-this.steamBaseY:0},gestureOffset:this.gestureOffset}}};}
  private updateAmbient(delta:number){
    this.ambientEnabled=!document.hidden&&!this.reducedMotion.matches;
    this.sky?.motion(0,this.ambientEnabled);
    if(this.ambientEnabled)this.ambientMs+=cosmeticStep(delta);
    this.residentialLife?.update(this.ambientMs,this.ambientEnabled&&this.room==='neighborhood');
    const camera=this.cameras.main,visible=(x:number,y:number)=>x>camera.worldView.left-120&&x<camera.worldView.right+120&&y>camera.worldView.top-160&&y<camera.worldView.bottom+120;
    // Keep canopy quads axis-aligned: software rendering clipped rotated SVG quads in CI.
    for(const canopy of this.canopies){const pose=ambientPose(this.ambientMs,this.ambientEnabled&&visible(canopy.baseX,canopy.image.y),canopy.phase);canopy.image.setRotation(0).setX(canopy.baseX+pose.canopyX);}
    const pose=ambientPose(this.ambientMs,this.ambientEnabled);this.gestureOffset=pose.gesture;
    if(this.steam){const active=this.ambientEnabled&&visible(this.steam.x,this.steamBaseY);this.steam.setAlpha(active?pose.steamAlpha:0).setY(this.steamBaseY+(active?pose.steamY:0));}
    for(const [index,person] of this.townfolk.entries()){const p=ambientPose(this.ambientMs,this.ambientEnabled&&visible(person.image.x,person.image.y),index*1.7);person.image.setScale(ART.actorScale,ART.actorScale+p.gesture*.004);const d=Math.hypot(person.image.x-this.actor.x,person.image.y-this.actor.y);person.label.setVisible(d<125);}
  }
  update(time: number, delta: number) {
    if (this.room !== this.session.room||(this.room==='neighborhood'&&this.loadedDistrictId!==this.districtId)||(this.room.startsWith('home')&&this.loadedHomePlotId!==this.homePlotId)) { this.scene.restart(); return; }
    const pressed = (...keys: string[]) => keys.some(key => this.keys.has(key));
    const direction = {
      x: Number(pressed('ArrowRight', 'd')) - Number(pressed('ArrowLeft', 'a')),
      y: Number(pressed('ArrowDown', 's')) - Number(pressed('ArrowUp', 'w'))
    };
    if (this.session.locked) this.keys.clear();
    const before={...this.session.position};
    // Phaser smooths/replaces delayed deltas; visible walking follows bounded real elapsed time.
    // Reuse the existing <=50ms collision-safe domain steps, never offline catch-up.
    for(const step of movementFrameSteps(this.game.loop.rawDelta,!document.hidden,this.movementReset)){
      const budget=this.movementBudget?.()??Infinity;
      const allowedMs=budget>0.00001?Math.min(step,budget/WALK_SPEED*1000):0;
      const prior={...this.session.position};this.session.tick(allowedMs,direction);
      this.onMovement?.(Math.hypot(this.session.position.x-prior.x,this.session.position.y-prior.y));
    }
    this.movementReset=document.hidden;
    const dx=this.session.position.x-before.x,dy=this.session.position.y-before.y;
    const moving=Math.hypot(dx,dy)>.00001;
    if(moving)this.travelled+=Math.hypot(dx,dy)*TILE;
    this.facing=facingFor(dx,dy,this.facing);
    const reduced=this.reducedMotion.matches;
    this.frame=walkFrame(this.travelled,moving,reduced);
    if(moving||document.hidden||this.gardenMotion&&performance.now()-this.gardenMotion.started>260)this.gardenMotion=null;
    const gardenMotion=this.gardenMotion;
    if(gardenMotion&&this.lastGardenAction){const frame=gardenActionFrame(gardenMotion.facing,gardenMotion.action,performance.now()-gardenMotion.started,reduced);this.lastGardenAction.renderedFrames++;if(!this.lastGardenAction.frames.includes(frame))this.lastGardenAction.frames.push(frame);}
    if(moving||document.hidden||this.carpentryMotion&&performance.now()-this.carpentryMotion.started>760)this.carpentryMotion=null;
    const motion=this.carpentryMotion,saw=this.carpentryState?.()?.saw.equipped;
    if(motion&&this.lastCarpentryAction){const frame=carpentryActionFrame(motion.facing,motion.action,performance.now()-motion.started,reduced);this.lastCarpentryAction.renderedFrames++;if(!this.lastCarpentryAction.frames.includes(frame))this.lastCarpentryAction.frames.push(frame);}
    const texture=motion?'carpentry-actions-':gardenMotion?'garden-actions-':saw?'saw-equipped-':'variety-resident-';
    this.warmActivityArt();
    const desiredKey=texture+residentArt(this.residentId),available=this.textures.exists(desiredKey),actorKey=available?desiredKey:'variety-resident-'+residentArt(this.residentId);
    const actorFrame=available&&motion?carpentryActionFrame(motion.facing,motion.action,performance.now()-motion.started,reduced):available&&gardenMotion?gardenActionFrame(gardenMotion.facing,gardenMotion.action,performance.now()-gardenMotion.started,reduced):residentFrame(this.facing,this.frame);
    if(this.actor.texture.key!==actorKey||String(this.actor.frame.name)!==String(actorFrame))this.actor.setTexture(actorKey,actorFrame);
    const x=(this.session.position.x+.5)*TILE,y=(this.session.position.y+.5)*TILE;
    this.actor.setPosition(x,y).setDepth(y);
    this.drawGarden();this.drawCarpentry();
    this.updateAmbient(delta);
    this.sky?.update(this.skyNow(),delta,this.room==='workshop'||this.room.startsWith('home'),this.ambientEnabled,this.skyFixture);
    for(const item of this.occluders){const hidden=x>item.x&&x<item.x+item.width&&y<item.y&&y>item.y-item.height;item.image.setAlpha(hidden?.55:1);}
    if (this.samplePresentationFrames && this.lastFrame && !document.hidden) { this.frameSamples.push(time - this.lastFrame); if (this.frameSamples.length > 600) this.frameSamples.shift(); }
    this.lastFrame = this.samplePresentationFrames?time:0;
    if((this.room==='workshop'||this.room.startsWith('home'))&&this.decorations){
      const placements=this.decorations(),selectedMotif=this.letterboxMotif?.(),motif=selectedMotif??'leaf',key=JSON.stringify([placements,selectedMotif]);
      if(key!==this.decorationKey){
        this.decorationKey=key;for(const view of this.decorationViews)view.destroy();this.decorationViews=[];
        for(const slot of this.room.startsWith('home')?homeSlots(this.homeLevel):PLACEMENT_SLOTS){const prop=placements[slot.id];if(!prop||prop==='letterbox'&&this.room.startsWith('home')&&selectedMotif===null)continue;const x=(slot.x+.5)*TILE,y=(slot.y+.5)*TILE;
          const meta=HOME_ART.furniture[prop],view=this.add.image(x,y,prop==='letterbox'?'letterbox-'+motif+'-closed':meta.world).setOrigin(meta.foot.x/meta.width,meta.foot.y/meta.height).setDepth(prop==='rug'?-2:y);this.decorationViews.push(view);
        }
      }
    }
    if(this.houseView)this.houseView.setVisible(true);this.drawNeighborhood();
    if(this.bridgeView)this.bridgeView.setTexture(this.bridgeTexture());if(this.pennantView)this.pennantView.setVisible(this.homePennantOwned);
    const peers=this.residents.filter(r=>r.room===this.room&&(!this.room.startsWith('home')||r.homePlotId===this.homePlotId)&&(this.room!=='neighborhood'||r.districtId===this.districtId)&&Number.isFinite(r.position.x)&&Number.isFinite(r.position.y));
    for(const[id,view]of this.residentViews)if(!peers.some(p=>p.id===id)){view.image.destroy();view.label.destroy();this.residentViews.delete(id);}
    for(const peer of peers){let view=this.residentViews.get(peer.id);if(!view){view={image:this.add.image(0,0,'variety-resident-'+residentArt(peer.id),0).setOrigin(ART.actorAnchor.x,ART.actorAnchor.y).setScale(ART.actorScale),label:this.add.text(0,0,peer.name,{fontFamily:'Georgia',fontSize:12,color:'#253c34',backgroundColor:'#f8f1df',padding:{x:4,y:3}}).setOrigin(.5,1)};this.residentViews.set(peer.id,view);}const px=(peer.position.x+.5)*TILE,py=(peer.position.y+.5)*TILE;view.image.setPosition(px,py).setDepth(py);view.label.setPosition(px,py-63).setDepth(py+1);}
    this.onFrame?.();
  }
}
