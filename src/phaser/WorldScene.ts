import {activeWave} from '../game/town-wave.ts';
import {INKWOOD_HOOD,CLERK_CAP,type EarnedHeadwear} from '../game/earned-headwear.ts';
import type {RiverSurvey} from '../game/river-survey.ts';
import { NATURALIST_KEEPSAKE } from '../game/home-keepsake.ts';
import {LODGING_FOOTPRINT,LODGING_FRONT} from '../game/lodging.ts';
import type {Headwear} from '../art/headwear.ts';
import{OUTING_STOPS,type OutingState}from'../game/outing.ts';
import {homeInterior,homeInteriorPath} from '../game/home-identity.ts';
import{yardAnchors,contractPlan,residentialFrame}from'../design/housing-contract.ts';
import {TownCommonsLife} from './TownCommonsLife.ts';
import {commonsFrame,type CommonsSign} from '../art/commons-life.ts';
import {drawTownCommons} from './TownCommons.ts';
import {ORCHARD_STOPS,orchardBranchFromStop,type OrchardPantry} from '../game/orchard.ts';
import {COMMONS_STOPS,COMMONS_TREES,outdoorZoom} from '../game/town-expansion.ts';
import {ALLOTMENT_LAYERS,ALLOTMENT_BED_FEET,allotmentCamera} from '../art/allotment.ts';
import{HOUSING_ASSETS,RESIDENTIAL_ASSETS,residentialArt,homeExteriorForPlot}from'../art/residential.ts';
import{ResidentialLife,type ChimneyAnchor}from'./ResidentialLife.ts';
import{PARCELS,STREETS,addressForPlot,NEIGHBORHOOD_TREES}from'../game/neighborhood.ts';
import{NEIGHBORHOOD_ASSETS,neighborhoodArt}from'../art/neighborhood.ts';
import {homeSlots,type HomeSlotId} from '../game/live-home-layout.ts';
import {DEPOT_ASSETS,depotArt} from '../art/depots.ts';
import {settleCarpentry,type CarpentryState,type NoticeboardState} from '../game/carpentry.ts';
import {carpentryWorldAssets,carpentryArt,carpentryActionFrame,type CarpentryAnimation} from '../art/carpentry.ts';
import {SURVEY_IDS,SURVEYS} from '../game/fieldwork.ts';
import {gardenStage,type GardenState} from '../game/live-garden.ts';
import {gardenWorldAssets} from '../art/garden-world-assets.ts';
import {gardenArt,gardenActionFrame,type GardenAnimation} from '../art/garden.ts';
import Phaser from 'phaser';
import {trailWorldAssets,TRAIL_ART} from '../art/trail.ts';
import {homeWorldAssets,HOME_ART,HOME_CATALOG} from '../art/home.ts';
import {TownSky} from './TownSky.ts';
import {type TownClimate} from '../game/town-climate.ts';
import {TOWN_PEOPLE,type TownPersonId} from '../game/town-people.ts';
import {drawTownResidentProp,townResidentRoutine} from './TownResidentRoutine.ts';
import { Session, WALK_SPEED } from '../game/session.ts';
import {movementFrameSteps} from '../game/movement-frame.ts';
import {ResidentMotion} from '../game/resident-motion.ts';
import { INKWOOD_GLASSHOUSE, INKWOOD_STEWARD, TILE, worlds, clearSegment, type Room } from '../game/world.ts';
import { PLACEMENT_SLOTS, type WorkshopState,type PropId } from '../game/live-workshop.ts';
import { ART, facingFor, walkFrame, type Facing } from '../art/kit.ts';
import catalog from '../../public/art/variety/catalog.json';
import {RESIDENT_IDS,TREE_KINDS,BUILDING_KINDS,residentArt,residentFrame,ambientPose,cosmeticStep} from '../art/variety.ts';
type ArtAsset={id:string;width:number;height:number;foot?:{x:number;y:number};occlusion?:{x:number;y:number;width:number;height:number};lightingWindows?:Array<{x:number;y:number;width:number;height:number}>};
const assets=catalog.assets as ArtAsset[];
const art=(id:string)=>{const asset=assets.find(a=>a.id===id);if(!asset)throw new Error('Missing authored art: '+id);return asset;};
export class WorldScene extends Phaser.Scene {
  outingState?:()=>OutingState;private outingPost?:Phaser.GameObjects.Image;private outingCrossing?:Phaser.GameObjects.Image;private outingKey='';
  refreshOuting(){this.outingKey='';}
  private drawOuting(){const s=this.outingState?.();if(!s||!this.outingPost)return;const key=JSON.stringify([s.revision]);if(key===this.outingKey)return;this.outingKey=key;const stage=s.active?.stage??(s.journal.length?4:0);this.outingPost.setTexture('outing-post-'+(stage>=4?'repaired':stage===3?'pinned':stage>=2?'aligned':'broken'));this.outingCrossing?.setTexture('outing-'+(s.active?.variant??'wind'));}
  actor!: Phaser.GameObjects.Image;
  bridgeRestored=false;bridgePhase?:'collecting'|'building'|'open';bridgeReadyAt:number|null=null;homePennantOwned=false;
  private pennantView?:Phaser.GameObjects.Image;
  private keepsakeView?: Phaser.GameObjects.Container;
  private keepsakeShown = false;
  setHomeKeepsake(shown: boolean) {
    if (shown === this.keepsakeShown) return false;
    this.keepsakeShown = shown;
    this.keepsakeView?.setVisible(shown);
    return true;
  }

  districtId?:string;private loadedDistrictId?:string;
  private residentialLife?:ResidentialLife;
  private streetPlotKey='';private streetWindows:Array<{x:number;y:number;width:number;height:number}>=[];
  private streetPlots:Array<{id:string;ownerId:string|null;ownerName?:string;level:1|2;planId?:string|null;yard?:Record<string,string|null>;letterboxMotif?:string|null}>=[];private streetDirty=true;
  private streetViews:Array<{slot:number;plotId:string|null;image:Phaser.GameObjects.Image;boundary:Phaser.GameObjects.Image;label:Phaser.GameObjects.Text}>=[];
  set neighborhoodPlots(value:Array<{id:string;ownerId:string|null;ownerName?:string;level:1|2;planId?:string|null;yard?:Record<string,string|null>;letterboxMotif?:string|null}>){const key=JSON.stringify(value.map(p=>[p.id,p.ownerId,p.ownerName,p.level,p.planId,p.yard,p.letterboxMotif]));if(key===this.streetPlotKey)return;this.streetPlotKey=key;this.streetPlots=value;this.streetDirty=true;}
  homePlotId?:string;homeOwnerName='Resident';homeLevel=1;houseLevel=0;
  onSteer?:()=>void;
  private loadedHomePlotId?:string;private houseView?:Phaser.GameObjects.Image;
  private loadedInteriorKey='';
  private loadingInteriorKey='';
  private interiorKey(){return homeInterior(this.session.room==='home-expanded'?2:1,this.streetPlots.find(p=>p.id===this.homePlotId)?.planId);}
  residentId='devon';
  showTownfolk=true;
  skyNow:()=>number=Date.now;
  skyFixture:TownClimate|null=null;
  private sky?:TownSky;
  climateState(){return this.sky?.snapshot()??null;}
  // A menu can retain a quiet world frame without accumulating held input or
  // counting its intentional redraw interval as playable-world frame latency.
  private samplePresentationFrames=true;
  private walkMark?: Phaser.GameObjects.Graphics;

  private paintWalkMark() {
    if (!this.walkMark) return;
    const target = this.session.locked || document.hidden ? undefined : this.session.path.at(-1);
    this.walkMark.setVisible(!!target);
    if (target) this.walkMark.setPosition((target.x + .5) * TILE, (target.y + .5) * TILE);
  }
  resetPresentationFrame(activePlay=true){
    this.samplePresentationFrames=activePlay;this.keys.clear();this.movementReset=true;this.lastFrame=0;
    if (!activePlay) { this.walkMark?.setVisible(false); this.orchardMotion=null; }
  }
  private canopyTransformWrites=0;
  private canopies:Array<{key:string;image:Phaser.GameObjects.Image;phase:number;baseX:number}>=[];
  private townfolk:Array<{id:TownPersonId;image:Phaser.GameObjects.Image;label:Phaser.GameObjects.Text;prop:Phaser.GameObjects.Graphics}>=[];
  private steam?:Phaser.GameObjects.Graphics;
  private steamBaseY=0;
  private ambientMs=0;
  private ambientEnabled=false;
  private gestureOffset=0;
  private reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  residents:Array<{id:string;name:string;room:string;homePlotId?:string;districtId?:string;headwear?:EarnedHeadwear;waveUntil?:number;position:{x:number;y:number}}>=[];
  private residentViews=new Map<string,{image:Phaser.GameObjects.Image;label:Phaser.GameObjects.Text;motion:ResidentMotion;headwear?:Phaser.GameObjects.Image}>();
  private visiblePeerWalking=false;
  localWaveUntil=0;
  waveTime=Date.now;
  private localWaveLabel?:Phaser.GameObjects.Text;
  private clearPeerStep=(from:{x:number;y:number},to:{x:number;y:number})=>clearSegment(this.session.room,from,to,this.session.room==='neighborhood'?this.session.geometry:undefined);
  private bridgeView?:Phaser.GameObjects.Image;
  private bridgeRibbon?:Phaser.GameObjects.Graphics;
  private bridgeRibbonLabel?:Phaser.GameObjects.Text;
  private bridgeRevealAt:number|null=null;

  playBridgeCeremony() {
    const ribbon=this.bridgeRibbon;
    if(!ribbon||this.room!==this.session.room||document.hidden||
       !this.cameras.main.worldView.contains(ribbon.x,ribbon.y))return false;
    this.bridgeRevealAt=performance.now();
    this.paintBridgeCeremony();
    return true;
  }

  private clearBridgeCeremony() {
    this.bridgeRevealAt=null;
    this.bridgeRibbon?.setVisible(false);
    this.bridgeRibbonLabel?.setVisible(false);
  }

  private paintBridgeCeremony() {
    if(this.bridgeRevealAt===null||!this.bridgeRibbon||!this.bridgeRibbonLabel)return;
    const age=performance.now()-this.bridgeRevealAt;
    if(age>=1700||document.hidden){this.clearBridgeCeremony();return;}
    const banner=this.bridgeRibbon;
    const motion=!this.reducedMotion.matches&&age<950;
    banner.clear().setVisible(true);
    banner.lineStyle(2,0x3f4b3f).fillStyle(0xf3d68f);
    banner.fillRoundedRect(-48,-11,96,22,5).strokeRoundedRect(-48,-11,96,22,5);
    this.bridgeRibbonLabel.setVisible(true);
    if(motion){
      const progress=age/950;
      const colors=[0xa65c49,0x567e6c,0xe5b55e];
      for(let i=0;i<7;i++){
        const side=i%2?-1:1,x=side*(48+(11+i*3)*progress),y=-7-i*2-18*progress+30*progress*progress;
        banner.fillStyle(colors[i%colors.length],1-progress).fillRect(x,y,3,4);
      }
    }
  }

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
  orchardState?:()=>OrchardPantry|null|undefined;
  orchardNow:()=>number=Date.now;
  private orchardTable?:Phaser.GameObjects.Image;
  private orchardTableLabel?:Phaser.GameObjects.Text;
  private orchardMotion:{started:number;facing:Facing}|null=null;
  private orchardLabels:Array<{stop:typeof ORCHARD_STOPS[number];label:Phaser.GameObjects.Text}>=[];
  private orchardLabelTick=0;
  private paintOrchardTags(){
    if(this.room!=='square'||!this.orchardState)return;
    const state=this.orchardState();
    if(state===undefined){
      if(this.orchardLabels.length){
        for(const item of this.orchardLabels)item.label.destroy();
        this.orchardLabels=[];
        this.orchardTable?.destroy();
        this.orchardTable=undefined;
        this.orchardTableLabel?.destroy();this.orchardTableLabel=undefined;
      }
      return;
    }
    if(!this.orchardLabels.length){
      for(const stop of ORCHARD_STOPS){
        const x=(stop.point.x+.5)*TILE,y=(stop.point.y+1.12)*TILE;
        const label=this.add.text(x,y,stop.name,{fontFamily:'Georgia,serif',fontSize:12,color:'#343c36',
          backgroundColor:'#f3e6c5',padding:{x:5,y:3}}).setOrigin(.5).setDepth(y);
        this.orchardLabels.push({stop,label});
      }
      const stand=COMMONS_STOPS.find(stop=>stop.id==='commons-orchard')!.point;
      const depth=(stand.y+.08)*TILE;
      const x=(stand.x+2.2)*TILE,y=(stand.y+.62)*TILE;
      this.orchardTable=this.add.image(x,depth,'orchard-packing-table').setScale(.72).setOrigin(.5,.93).setDepth(depth);
      this.orchardTableLabel=this.add.text(x,y,'Packing table',{fontFamily:'Georgia,serif',fontSize:12,color:'#343c36',
        backgroundColor:'#f3e6c5',padding:{x:5,y:3}}).setOrigin(.5).setDepth(y);
    }
    const tick=performance.now();
    if(tick<this.orchardLabelTick||!this.closeToOrchard())return;
    this.orchardLabelTick=tick+1000;
    const now=this.orchardNow();
    for(const item of this.orchardLabels){
      const id=orchardBranchFromStop(item.stop.id)!;
      const text=item.stop.name+(state?(state.ripeAt[id]<=now?' · ripe':' · ripening'):'');
      if(item.label.text!==text)item.label.setText(text);
    }
  }
  private closeToOrchard(){
    return this.session.room==='square'&&this.session.position.x>85&&this.session.position.y>25&&
      this.session.position.y<58&&this.orchardState?.()!==undefined;
  }
  playOrchardPick(branch:{x:number;y:number}){
    if(!this.closeToOrchard()||document.hidden||!this.actor?.active)return;
    const feet=this.session.position;
    this.gardenMotion=null;
    this.carpentryMotion=null;
    this.orchardMotion={started:performance.now(),facing:facingFor(branch.x-feet.x,branch.y-feet.y,this.facing)};
  }
  headwear:Headwear|null=null;
  private headwearLayer?:Phaser.GameObjects.Image;
  resting=false;
  private bedPose?:Phaser.GameObjects.Image;
  private bedQuilt?:Phaser.GameObjects.Rectangle;
  private lodgingLabels:Phaser.GameObjects.Text[]=[];
  private lodgingFollow(height:number){return this.resting&&height<300?54:0;}

  private paintHeadwear(current:Headwear|null,layer:Phaser.GameObjects.Image|undefined,x:number,y:number,frame:number){
    if(!current){
      if(layer?.visible)layer.setVisible(false);
      return layer;
    }
    const key='headwear-'+current;
    if(!this.textures.exists(key)){
      if(layer?.visible)layer.setVisible(false);
      if(!this.activityLoading.has(key)){
        this.activityLoading.add(key);
        this.load.svg(key,'/art/headwear/'+current+'.svg');
        if(!this.load.isLoading())this.load.start();
      }
      return layer;
    }
    this.parseActivityTexture(key);
    const image=layer??this.add.image(x,y,key,frame)
      .setOrigin(ART.actorAnchor.x,ART.actorAnchor.y).setScale(ART.actorScale);
    if(image.texture.key!==key||String(image.frame.name)!==String(frame))image.setTexture(key,frame);
    if(image.x!==x||image.y!==y)image.setPosition(x,y);
    if(image.depth!==y+.01)image.setDepth(y+.01);
    if(!image.visible)image.setVisible(true);
    return image;
  }
  private activityLoading=new Set<string>();
  private activityPrefixes=['garden-actions-','saw-equipped-','carpentry-actions-','orchard-picking-'] as const;
  private parseActivityTexture(key:string){if((!key.startsWith('headwear-')&&!this.activityPrefixes.some(prefix=>key.startsWith(prefix)))||!this.textures.exists(key))return;const texture=this.textures.get(key);if(!texture.has('0'))this.textures.addSpriteSheet('',texture,{frameWidth:64,frameHeight:80});}
  private warmActivityArt(){
    const rig=residentArt(this.residentId);let queued=false;
    for(const prefix of this.activityPrefixes){
      if(prefix==='garden-actions-'&&this.room!=='garden')continue;
      if(prefix==='orchard-picking-'&&!this.closeToOrchard())continue;
      const key=prefix+rig;
      if(this.textures.exists(key)||this.activityLoading.has(key))continue;
      this.activityLoading.add(key);
      const file=prefix==='orchard-picking-'?'orchard/'+rig+'-picking':(prefix==='garden-actions-'?'garden':'carpentry')+'/'+key;
      this.load.svg(key,'/art/'+file+'.svg');
      queued=true;
    }
    if(queued&&!this.load.isLoading())this.load.start();
  }
  refreshCarpentry(){this.carpentryKey='';this.carpentryNextDraw=0;}
  playCarpentryAction(action:CarpentryAnimation){if(this.actor?.active){this.gardenMotion=null;this.carpentryMotion={action,started:performance.now(),facing:this.facing};this.lastCarpentryAction={action,renderedFrames:0,frames:[]};}}
  private drawCarpentry(){
    if(!this.pineViews.length&&!this.rackView&&!this.noticeboardView)return;
    const tick=performance.now();if(tick<this.carpentryNextDraw)return;this.carpentryNextDraw=tick+500;
    const raw=this.carpentryState?.(),now=Math.floor(this.gardenNow());
    // The rack reads an immutable deadline. Only the deadfalls need pine settlement.
    const available=!this.pineViews.length||!raw||settleCarpentry(raw,Math.max(raw.observedAt,now)).pine.available>0;
    const job=this.rackView?raw?.job:undefined;
    const stage=job?(job.readyAt<=now?'ready':'working'):'empty';
    const phase=(this.noticeboardView?this.noticeboardState?.()?.phase:undefined)??'collecting';
    const key=JSON.stringify([available,stage,phase]);
    if(key!==this.carpentryKey){this.carpentryKey=key;for(const v of this.pineViews)v.image.setTexture('pine-'+v.station+'-'+(available?'available':'exhausted'));this.rackView?.setTexture('finishing-rack-'+stage);if(this.noticeboardView?.texture.key!=='noticeboard-'+phase&&phase==='open')this.noticeReveal=tick;this.noticeboardView?.setTexture('noticeboard-'+phase);}
    if(this.noticeboardView)this.noticeboardView.setAlpha(this.reducedMotion.matches||document.hidden||!this.noticeReveal?1:Math.min(1,.55+(tick-this.noticeReveal)/700));
  }
  refreshGarden(){this.gardenKey='';this.gardenNextDraw=0;}
  playGardenAction(action:GardenAnimation){if(this.room==='garden'&&this.actor?.active){this.carpentryMotion=null;this.gardenMotion={action,started:performance.now(),facing:this.facing};this.lastGardenAction={action,renderedFrames:0,frames:[]};}}
  ordinaryJob?:()=>WorkshopState['job'];
  private benchPiece?:Phaser.GameObjects.Image;
  private benchCard?:Phaser.GameObjects.Text;
  private benchPhase:'idle'|'working'|'finished'='idle';
  private benchRecipe:NonNullable<WorkshopState['job']>['recipe']|null=null;

  private paintOrdinaryBench() {
    if (!this.benchPiece || !this.benchCard) return;
    const job=this.ordinaryJob?.();
    const recipe=job?.recipe??null;
    const phase=!job?'idle':job.readyAt<=this.gardenNow()?'finished':'working';
    if (phase===this.benchPhase && recipe===this.benchRecipe) return;
    this.benchPhase=phase;
    this.benchRecipe=recipe;
    this.benchCard.setVisible(phase!=='idle');
    this.benchPiece.setVisible(phase!=='idle');
    if (phase==='idle') return;

    this.benchCard.setText(phase==='finished'?'Finished':'In progress');
    if(phase==='working')this.benchPiece.setTexture(HOME_ART.materials.timber).setOrigin(.5,.75).setScale(.54);
    else{
      const art=recipe==='planter'?HOME_ART.furniture.planter:HOME_ART.furniture.crate;
      this.benchPiece.setTexture(art.world).setOrigin(art.foot.x/art.width,art.foot.y/art.height).setScale(.54);
    }
  }
  private surveyLabels:Array<{label:Phaser.GameObjects.Text;x:number;y:number}>=[];
  private depotViews:Array<{resource:string;image:Phaser.GameObjects.Image;label:Phaser.GameObjects.Text}>=[];
  private decorationViews:Phaser.GameObjects.Image[]=[];
  private furnitureOccluders: { image: Phaser.GameObjects.Image; bounds: Phaser.Geom.Rectangle }[]=[];
  private decorationKey='';
  private decorationsDirty=true;
  refreshDecorations(){this.decorationsDirty=true;}

  private updateDecorations(x:number,y:number){
    const home=this.room.startsWith('home');
    if((!home&&this.room!=='workshop')||!this.decorations)return;
    if(this.decorationsDirty){
      this.decorationsDirty=false;
      const placements=this.decorations(),selectedMotif=this.letterboxMotif?.(),motif=selectedMotif??'leaf';
      const key=JSON.stringify([placements,selectedMotif]);
      if(key!==this.decorationKey){
        this.decorationKey=key;
        for(const view of this.decorationViews)view.destroy();
        this.decorationViews=[];
        this.furnitureOccluders=[];
        for(const slot of home?homeSlots(this.homeLevel):PLACEMENT_SLOTS){
          const prop=placements[slot.id];
          if(!prop||prop==='letterbox'&&home&&selectedMotif===null)continue;
          const px=(slot.x+.5)*TILE,py=(slot.y+.5)*TILE;
          const meta=HOME_ART.furniture[prop];
          const view=this.add.image(px,py,prop==='letterbox'?'letterbox-'+motif+'-closed':meta.world)
            .setOrigin(meta.foot.x/meta.width,meta.foot.y/meta.height).setDepth(prop==='rug'?-2:py);
          this.decorationViews.push(view);
          if(prop!=='rug')this.furnitureOccluders.push({image:view,bounds:view.getBounds()});
        }
      }
    }
    for(const {image,bounds} of this.furnitureOccluders){
      // The artwork is foreground only when its foot is ahead of the resident.
      const across=x+13>bounds.left&&x-13<bounds.right;
      const behind=y<image.y&&y>bounds.top;
      const alpha=across&&behind ? 0.5 : 1;
      if(image.alpha!==alpha)image.setAlpha(alpha);
    }
  }
  private facing: Facing = 'south';
  private travelled = 0;
  private frame = 0;
  riverCast:RiverSurvey['cast']=null;
  private commonsLife?:TownCommonsLife;private commonsSigns:CommonsSign[]=[];
  private occluders: {image:Phaser.GameObjects.Image|Phaser.GameObjects.Graphics;x:number;y:number;width:number;height:number}[] = [];
  private keys = new Set<string>();
  private room = '';
  private loadingRoom:Room='square';
  get roomReady(){
    return this.room===this.session.room&&this.scene.isActive()&&this.actor?.active===true;
  }
  private lastFrame = 0;
  private movementReset=true;
  frameSamples: number[] = [];
  needsFullRate(){return this.visiblePeerWalking||(this.bridgeRevealAt!==null&&!this.reducedMotion.matches&&performance.now()-this.bridgeRevealAt<950)||this.keys.size>0||this.session.snapshot().walking||!!this.gardenMotion||!!this.carpentryMotion||!!this.orchardMotion||this.noticeReveal>0&&performance.now()-this.noticeReveal<800;}
  onFrame?: () => void;
  onRoomLoading?: (room:Room) => void;
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
    this.loadingRoom=this.session.room;
    this.onRoomLoading?.(this.loadingRoom);
    this.loadingInteriorKey=this.loadingRoom.startsWith('home')?this.interiorKey():'';
    if(this.loadingInteriorKey){
      // Load the selected plan and its same-size legacy fallback before painting the room.
      const fallback=homeInterior(this.loadingRoom==='home-expanded'?2:1);
      for(const key of new Set([this.loadingInteriorKey,fallback])){
        if(!this.textures.exists(key))this.load.svg(key,homeInteriorPath(key));
      }
    }
    const room=this.loadingRoom,street=room==='neighborhood';
    const home=room.startsWith('home'),furnished=home||room==='workshop';
    if(home)this.load.svg('home-naturalist',NATURALIST_KEEPSAKE.art);
    if(room==='square'){
      for(const id of ['desk','wind','soft-bank','detour','post-broken','post-aligned','post-pinned','post-repaired'])this.load.svg('outing-'+id,'/art/outing/'+id+'.svg');
      for(const key of DEPOT_ASSETS)this.load.svg(key,`/art/depots/${key}.svg`);
      this.load.svg('home-plot','/art/original/home-plot.svg');
    }
    if(room==='workshop')for(const key of ['ground-workshop','bench','crates'])this.load.svg(key,`/art/original/${key}.svg`);
    if(furnished)this.load.svg('home-teapot-world','/art/cafe/teapot-world.svg');
    if(furnished||street)for(const motif of ['leaf','sun','moth'])this.load.svg('letterbox-'+motif+'-closed','/art/commission/letterbox-'+motif+'-closed.svg');
    // Peer sprites use the four ordinary rigs. Activity/equipment sheets belong
    // only to self; avoid rasterizing nine unused sheets on every fresh visit.
    const rig=residentArt(this.residentId);
    if(this.session.hasLodging){
      if(this.session.room==='square')this.load.svg('lodging-boarding-front','/art/lodging/boarding-front.svg');
      if(this.session.room==='lodging')this.load.svg('lodging-rented-room','/art/lodging/rented-room.svg');
    }
    if(this.orchardState)this.load.svg('orchard-packing-table','/art/orchard/packing-table.svg');
    if(this.closeToOrchard()){
      this.activityLoading.add('orchard-picking-'+rig);
      this.load.svg('orchard-picking-'+rig,'/art/orchard/'+rig+'-picking.svg');
    }
    for(const key of carpentryWorldAssets(room,rig)){
      if(this.textures.exists(key))continue;
      if(key.startsWith('saw-equipped-')||key.startsWith('carpentry-actions-'))this.activityLoading.add(key);
      this.load.svg(key,'/art/carpentry/'+key+'.svg');
    }
    if(this.session.room==='garden')for(const key of ALLOTMENT_LAYERS)this.load.svg(key,`/art/allotment/${key}.svg`);
    for(const key of gardenWorldAssets(this.session.room,rig)){
      if(key.startsWith('garden-actions-'))this.activityLoading.add(key);
      this.load.svg(key,'/art/garden/'+key+'.svg');
    }
    if(this.loadingRoom==='trail'&&!this.textures.exists('glasshouse-overgrown'))this.load.svg('glasshouse-overgrown','/art/glasshouse/overgrown.svg');
    if(this.loadingRoom==='trail'&&!this.textures.exists('inkwood-steward'))this.load.svg('inkwood-steward','/art/inkwood/wren.svg');
    for(const key of trailWorldAssets(this.loadingRoom))if(!this.textures.exists(key))this.load.svg(key,'/art/trail/'+key+'.svg');
    for(const key of homeWorldAssets(room)){
      if(!this.textures.exists(key))this.load.svg(key,'/art/homes/'+key+'.svg');
    }
    if(street){
      for(const asset of HOUSING_ASSETS)if(!this.textures.exists(asset.id))this.load.svg(asset.id,'/art/housing/'+asset.file);
      for(const asset of RESIDENTIAL_ASSETS)if(!this.textures.exists(asset.id))this.load.svg(asset.id,'/art/residential/'+asset.file);
    }
    for(const asset of NEIGHBORHOOD_ASSETS){
      const usedHere=asset.id==='housing-registry'?this.loadingRoom==='square':street;
      if(usedHere&&!this.textures.exists(asset.id))this.load.svg(asset.id,'/art/neighborhood/'+asset.file);
    }
    const keys=RESIDENT_IDS.map(k=>'resident-'+k);
    if(room==='square')keys.push('ground-square',...BUILDING_KINDS.map(k=>'building-'+k));
    if(room==='square'||room==='trail'||street)keys.push(...TREE_KINDS.flatMap(k=>['tree-'+k+'-trunk','tree-'+k+'-canopy']));
    for(const key of keys){
      const texture='variety-'+key;
      if(!this.textures.exists(texture))this.load.svg(texture,`/art/variety/${key}.svg`);
    }
  }
  create() {
    if(this.loadingRoom!==this.session.room||(this.loadingRoom.startsWith('home')&&this.loadingInteriorKey!==this.interiorKey())){
      this.room=this.loadingRoom;
      this.scene.restart();
      return;
    }
    this.headwearLayer=undefined;
    this.keepsakeView=undefined;
    this.bedPose=undefined;this.bedQuilt=undefined;this.lodgingLabels=[];
    this.orchardMotion=null;this.orchardLabels=[];this.orchardLabelTick=0;this.orchardTable=undefined;this.orchardTableLabel=undefined;
    this.outingPost=undefined;this.outingCrossing=undefined;this.outingKey='';this.depotViews=[];this.surveyLabels=[];
    this.bridgeRibbon=undefined;this.bridgeRibbonLabel=undefined;this.bridgeRevealAt=null;
    this.pineViews=[];this.rackView=undefined;this.noticeboardView=undefined;this.carpentryMotion=null;this.lastCarpentryAction=null;this.carpentryKey='';this.carpentryNextDraw=0;this.noticeReveal=0;
    this.gardenViews=[];this.gardenLabels=[];this.gardenKey='';this.gardenNextDraw=0;this.gardenMotion=null;this.lastGardenAction=null;this.gardenWelcomeView=undefined;
    this.benchPiece=undefined;this.benchCard=undefined;this.benchPhase='idle';this.benchRecipe=null;
    this.movementReset=true;
    this.room = this.session.room;this.loadedHomePlotId=this.homePlotId;this.loadedDistrictId=this.districtId;this.streetViews=[];this.streetDirty=true;this.residentialLife=undefined;this.houseView=undefined;this.pennantView=undefined;
    this.canopyTransformWrites=0;
    this.canopies=[];this.townfolk=[];this.steam=undefined;this.ambientMs=0;
    for(const id of RESIDENT_IDS){const texture=this.textures.get('variety-resident-'+id);if(!texture.has('0'))this.textures.addSpriteSheet('',texture,{frameWidth:64,frameHeight:80});}
    for(const id of RESIDENT_IDS)for(const prefix of this.activityPrefixes)this.parseActivityTexture(prefix+id);
    const activityLoaded=(key:string)=>{this.activityLoading.delete(key);this.parseActivityTexture(key);};
    // A failed asset keeps its attempt marker until scene restart; never retry
    // a missing file on every frame or block progress/input on artwork.
    this.load.on('filecomplete',activityLoaded);
    this.events.once('shutdown',()=>{this.load.off('filecomplete',activityLoaded);this.activityLoading.clear();});
    this.decorationKey='';
    this.decorationViews=[];
    this.furnitureOccluders=[];
    this.decorationsDirty=true;
    this.residentViews=new Map();this.visiblePeerWalking=false;this.localWaveLabel=undefined;
    this.bridgeView=undefined;
    this.occluders = [];this.commonsLife=undefined;this.commonsSigns=[];
    this.frame = 0; this.facing = 'south'; this.travelled = 0;
    const w = worlds[this.session.room];
    const litWindows:Array<{x:number;y:number;width:number;height:number}>=[];
    const image=(key:string,x:number,y:number,depth:number)=>this.add.image(x,y,key).setOrigin(0).setDepth(depth);
    this.loadedInteriorKey=this.room.startsWith('home')?this.interiorKey():'';
    const homeGround=this.textures.exists(this.loadedInteriorKey)?this.loadedInteriorKey:homeInterior(this.session.room==='home-expanded'?2:1);
    image(this.room==='neighborhood'?'neighborhood-ground':this.room==='square'?'variety-ground-square':this.room==='garden'?'garden-ground':this.room==='lodging'?'lodging-rented-room':this.room==='trail'?TRAIL_ART.ground:this.room.startsWith('home')?homeGround:'ground-workshop',0,0,-1000);
    const label=(x:number,y:number,value:string)=>this.add.text(x*TILE,y*TILE,value,{fontFamily:'Georgia,serif',fontSize:13,color:'#343c36',backgroundColor:'#f3e6c5',padding:{x:9,y:5}}).setOrigin(.5).setDepth(y*TILE);
    if(this.room==='square') {
      this.occluders.push(...drawTownCommons(this,this.commonsSigns));this.commonsLife=new TownCommonsLife(this);
      for(const [key,x,y,labelText]of [['garden-gate',17.5,36.5,'Allotment'],['garden-registry',20.5,36.5,'Displays'],['garden-field',12.5,37.5,'Field clippings'],['garden-stake-forked',11.5,26.5,'Forked stake'],['garden-stake-striped',18.5,39.5,'Marked stake'],['garden-stake-notched',35.5,39.5,'Notched stake']] as const){const meta=gardenArt(key),foot=meta.foot!;this.add.image(x*TILE,y*TILE,key).setOrigin(foot.x/meta.width,foot.y/meta.height).setDepth(y*TILE);label(x,y+.55,labelText);}
      for(const stop of worlds.square.stops.filter(s=>s.id.startsWith('pine-'))){const station=stop.id.slice(5),meta=carpentryArt('pine-'+station+'-available'),foot=meta.foot!,px=(stop.point.x+.5)*TILE,py=(stop.point.y+.5)*TILE;const view=this.add.image(px,py,meta.id).setOrigin(foot.x/meta.width,foot.y/meta.height).setDepth(py);this.pineViews.push({station,image:view});this.occluders.push({image:view,x:px-meta.width/2,y:py,width:meta.width,height:meta.height-12});label(stop.point.x+.5,stop.point.y+1.1,'Pine deadfall');}
      const desk=worlds.square.stops.find(s=>s.id==='carpentry-desk')!,dx=(desk.point.x+.5)*TILE,dy=(desk.point.y+.5)*TILE;this.add.image(dx,dy,'carpentry-attendant').setOrigin(ART.actorAnchor.x,ART.actorAnchor.y).setScale(.9).setDepth(dy);label(desk.point.x+.5,desk.point.y+1.1,'Nella · carpentry');
      const notice=carpentryArt('noticeboard-collecting');this.noticeboardView=this.add.image(dx+96,dy,notice.id).setOrigin(notice.foot!.x/notice.width,notice.foot!.y/notice.height).setDepth(dy);label(desk.point.x+3.5,desk.point.y+1.1,'Noticeboard');
      const welcome=gardenArt('garden-welcome-collecting');this.gardenWelcomeView=this.add.image(24.5*TILE,36.5*TILE,welcome.id).setOrigin(welcome.foot!.x/welcome.width,welcome.foot!.y/welcome.height).setDepth(36.5*TILE);label(24.5,37.1,'Welcome bed');
      for(const stop of OUTING_STOPS){const texture=stop.id==='outing-desk'?'desk':stop.id==='outing-crossing'?'wind':stop.id==='outing-detour'?'detour':'post-broken';const image=this.add.image((stop.point.x+.5)*TILE,(stop.point.y+.5)*TILE,'outing-'+texture).setOrigin(.5,.92).setScale(.8).setDepth((stop.point.y+.5)*TILE);if(stop.id==='outing-post')this.outingPost=image;if(stop.id==='outing-crossing')this.outingCrossing=image;label(stop.point.x+.5,stop.point.y+1.1,stop.name);}
      {
        // A quiet, continuous walking line from the front step to Marlow and the plaza.
        const clerk=TOWN_PEOPLE[0].point;
        const path=[LODGING_FRONT,{x:11.3,y:23.15},{x:14.2,y:24},clerk,{x:19.3,y:24}]
          .map(({x,y})=>new Phaser.Math.Vector2((x+.5)*TILE,(y+.5)*TILE));
        const lane=this.add.graphics().setDepth(-950);
        for(const [width,color] of [[61,0xb3a982],[53,0xdac59b]]){
          lane.lineStyle(width,color).strokePoints(path);
          lane.fillStyle(color);
          for(const point of path)lane.fillCircle(point.x,point.y,width/2);
        }
      }
      if(this.session.hasLodging){
        const [x,y,width,height]=LODGING_FOOTPRINT;
        const left=x*TILE-4,footY=(y+height)*TILE,top=footY-188;
        const boardingHouse=image('lodging-boarding-front',left,top,footY);
        this.occluders.push({image:boardingHouse,x:x*TILE,y:footY,width:width*TILE,height:height*TILE});
        litWindows.push({x:left+22,y:top+105,width:42,height:29},{x:left+124,y:top+105,width:37,height:29});
      }
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
      this.bridgeRibbon=this.add.graphics().setPosition(26*TILE,11.2*TILE).setDepth(13*TILE).setVisible(false);
      this.bridgeRibbonLabel=this.add.text(26*TILE,11.2*TILE,'Inkwood open',{fontFamily:'Georgia,serif',fontSize:13,
        color:'#34443a',fontStyle:'bold'}).setOrigin(.5).setDepth(13*TILE+1).setVisible(false);
      const plantings=[[17,26,'oak'],[34,26,'birch'],[14,17,'fruit'],[37,19,'oak'],[13,30,'birch'],[37,33,'fruit'],...COMMONS_TREES.map(p=>[p.x-1,p.y-2,p.kind] as const)] as const;
      for(const [index,[x,y,kind]] of plantings.entries()){
        const meta=art('tree-'+kind+'-canopy'),foot=meta.foot!,footX=(x+1)*TILE,footY=(y+2)*TILE+4;
        for(const layer of ['trunk','canopy']){const tree=this.add.image(footX,footY,'variety-tree-'+kind+'-'+layer).setOrigin(foot.x/meta.width,foot.y/meta.height).setDepth(footY+(layer==='canopy'?.1:0));
         if(layer==='canopy'){this.canopies.push({key:kind,image:tree,phase:index*1.7,baseX:footX});const bounds=meta.occlusion??{x:4,y:0,width:meta.width-8,height:foot.y};this.occluders.push({image:tree,x:footX-foot.x+bounds.x,y:footY-foot.y+bounds.y+bounds.height,width:bounds.width,height:bounds.height});}}
      }
      for(const id of SURVEY_IDS){
        const {x,y}=SURVEYS[id].point;
        this.surveyLabels.push({label:label(x+.5,y+.8,'Sketch study').setVisible(false),x:(x+.5)*TILE,y:(y+.5)*TILE});
      }
      if(this.showTownfolk)for(const person of TOWN_PEOPLE){
        const py=(person.point.y+.5)*TILE,px=(person.point.x+.5)*TILE;
        const view=this.add.image(px,py,'variety-resident-'+person.rig,0).setOrigin(ART.actorAnchor.x,ART.actorAnchor.y).setScale(ART.actorScale).setDepth(py);
        const tag=this.add.text(px,py-62,person.name+' · '+person.role.split(' · ')[0],{fontFamily:'Georgia',fontSize:11,color:'#343c36',backgroundColor:'#f8f1df',padding:{x:3,y:2}}).setOrigin(.5,1).setDepth(py+1);
        const prop=drawTownResidentProp(this,person.id).setDepth(py+.2);
        this.townfolk.push({id:person.id,image:view,label:tag,prop});
      }
    } else if(this.room==='neighborhood') {
      this.add.graphics().fillStyle(0xa6b48e).fillRect(-8192,-8192,18432,18432).setDepth(-2000);
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
    } else if(this.room==='lodging') {
      this.bedPose=this.add.image(151,127,'variety-resident-'+residentArt(this.residentId),0)
        .setScale(.68).setRotation(-Math.PI/2).setDepth(156).setVisible(this.resting);
      this.bedQuilt=this.add.rectangle(187,127,61,42,0x8d7661)
        .setStrokeStyle(2,0x745f4c).setDepth(157).setVisible(this.resting);
      this.lodgingLabels=[
        label(10.15,5.6,'A note by the bed').setVisible(!this.resting),
        label(10.02,11.65,'Step outside ↓').setVisible(!this.resting),
      ];
      this.add.rectangle(242,185,21,15,0xf1e1b6).setStrokeStyle(1,0x927e5b).setRotation(-.16).setDepth(183);
    } else if(this.room==='trail') {
      for(const [index,planting] of TRAIL_ART.treePlacements.entries()){const kind=planting.kind,meta=art('tree-'+kind+'-canopy'),foot=meta.foot!,footX=(planting.tileX+1)*TILE,footY=(planting.tileY+2)*TILE;for(const layer of ['trunk','canopy']){const tree=this.add.image(footX,footY,'variety-tree-'+kind+'-'+layer).setOrigin(foot.x/meta.width,foot.y/meta.height).setDepth(footY+(layer==='canopy'?.1:0));if(layer==='canopy'){this.canopies.push({key:kind,image:tree,phase:index*1.7,baseX:footX});const bounds=meta.occlusion??{x:4,y:0,width:meta.width-8,height:foot.y};this.occluders.push({image:tree,x:footX-foot.x+bounds.x,y:footY-foot.y+bounds.y+bounds.height,width:bounds.width,height:bounds.height});}}}
      for(const meta of Object.values(TRAIL_ART.landmarks)){const x=(meta.point.x+.5)*TILE,y=meta.point.y*TILE;this.add.image(x,y,meta.key).setOrigin(meta.foot.x/meta.width,meta.foot.y/meta.height).setDepth(y);label(meta.point.x+.5,meta.point.y+1.1,'Field note');}
      const glasshouse=INKWOOD_GLASSHOUSE.point;
      const threshold=(glasshouse.y-.75)*TILE;
      if(this.textures.exists('glasshouse-overgrown'))this.add.image((glasshouse.x+.5)*TILE,threshold,'glasshouse-overgrown').setOrigin(.5,1).setDepth(threshold);
      label(glasshouse.x+.5,glasshouse.y+1.2,'Glasshouse');
      const steward=INKWOOD_STEWARD.point;
      const feet=(steward.y+.5)*TILE;
      this.add.image((steward.x+.5)*TILE,feet,'inkwood-steward').setOrigin(.5,.9).setScale(.66).setDepth(feet);
      label(steward.x+.5,steward.y+.85,'Wren');
      label(9.5,24.4,'Town square ↓');
    } else if(this.room.startsWith('home')) {
      const key=this.room==='home'?HOME_ART.starterInterior:HOME_ART.expandedInterior;const meta=HOME_CATALOG.assets.find(asset=>asset.id===key);for(const box of meta?.lightingWindows??[])litWindows.push(box);
      label(9,1.4,this.homeOwnerName+'’s '+(this.loadedInteriorKey==='garden-studio-interior'?'garden studio':this.loadedInteriorKey==='workshop-lodge-interior'?'workshop lodge':this.room==='home'?'home':'home · workroom added'));
      label(9.5,14,this.districtId?'Street ↓':'Square ↓');
      if(this.loadedInteriorKey==='garden-studio-interior')label(20.7,3.6,'Open notebook').setFontSize(11).setPadding(5,2,5,2);
      if(this.loadedInteriorKey==='workshop-lodge-interior')label(20.7,3.6,'Read board').setFontSize(11).setPadding(5,2,5,2);
      const frame=NATURALIST_KEEPSAKE.frame;
      const shadow=this.add.ellipse(0,36,76,14,0x3b3228,.2);
      const feet=[-27,27].map(x=>this.add.rectangle(x,30,8,14,0x795840).setStrokeStyle(2,0x303930));
      const backing=this.add.rectangle(0,0,frame.width,frame.height,0x795840).setStrokeStyle(2,0x303930);
      const certificate=this.add.image(0,0,'home-naturalist').setDisplaySize(frame.width-8,frame.height-8);
      this.keepsakeView=this.add.container(frame.x,frame.y,[shadow,...feet,backing,certificate]).setDepth(frame.y+36).setVisible(this.keepsakeShown);
      this.pennantView=this.add.image(15*TILE,5.5*TILE,TRAIL_ART.pennant.world).setOrigin(TRAIL_ART.pennant.foot.x/TRAIL_ART.pennant.width,TRAIL_ART.pennant.foot.y/TRAIL_ART.pennant.height).setDepth(2*TILE).setVisible(this.homePennantOwned);
    } else {
      image('bench',3*TILE,3*TILE,5*TILE).setDisplaySize(5*TILE,3*TILE);
      this.benchPiece=this.add.image(4.75*TILE,3.48*TILE,HOME_ART.materials.timber).setDepth(5*TILE+1).setVisible(false);
      this.benchCard=label(6.65,3.3,'').setDepth(5*TILE+1).setFontSize(12).setPadding(5,3,5,3).setVisible(false);
      const rack=carpentryArt('finishing-rack-empty');this.rackView=this.add.image(12.5*TILE,6*TILE,rack.id).setOrigin(rack.foot!.x/rack.width,rack.foot!.y/rack.height).setDepth(6*TILE);label(12.5,6.9,'Pine finishing rack');
      image('crates',3*TILE,8*TILE,10*TILE);
      label(9,1.8,'Your workshop');
      label(9,7.6,'Great things take time.');
      label(9,8.5,'This bench is extremely optimistic.');
      this.add.rectangle(9.5*TILE,14*TILE,3*TILE,2*TILE,0x8c7757).setStrokeStyle(2,0x343c36).setDepth(0);
      label(9.5,14,'Square ↓');
    }
    // A single static chalk mark. It follows the accepted world target, below the actor.
    this.walkMark = this.add.graphics().setDepth(-.5).setVisible(false);
    this.walkMark.lineStyle(2, 0x394d42, .9).fillStyle(0xf7edcb, .9);
    this.walkMark.fillEllipse(0, 0, 21, 14).strokeEllipse(0, 0, 21, 14);
    this.walkMark.lineStyle(2, 0x50694d).lineBetween(-4, 0, 4, 0).lineBetween(0, -3, 0, 3);
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
      camera.setZoom(1).setFollowOffset(0,this.room==='lodging'?this.lodgingFollow(height):0);if(this.room==='neighborhood'){const b=residentialFrame(width,height,1);camera.setBounds(b.x,b.y,b.width,b.height);return;}
      if(this.room==='square'){camera.setZoom(outdoorZoom(width,height,w.width*TILE,w.height*TILE));return;}
      const worldWidth=w.width*TILE,worldHeight=w.height*TILE;
      camera.setBounds(-Math.max(0,(width-worldWidth)/2),-Math.max(0,(height-worldHeight)/2),Math.max(width,worldWidth),Math.max(height,worldHeight));
    };
    roomBounds();this.scale.on(Phaser.Scale.Events.RESIZE,roomBounds);this.events.once('shutdown',()=>this.scale.off(Phaser.Scale.Events.RESIZE,roomBounds));
    this.cameras.main.startFollow(this.actor, true, 1, 1);roomBounds();
    this.sky=new TownSky(this,this.room==='neighborhood'?this.streetWindows:litWindows);this.sky.update(this.skyNow(),0,this.room==='workshop'||this.room==='lodging'||this.room.startsWith('home'),!document.hidden&&!this.reducedMotion.matches,this.skyFixture);
    const onDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('button,input,select,dialog,[data-ui-scroll]')) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(key)) {if(!this.session.locked)this.onSteer?.(); this.keys.add(key); e.preventDefault(); }
    };
    const onUp = (e: KeyboardEvent) => this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    let touch: {id:number;x:number;y:number;at:number}|null=null;
    const cancelTouch = () => { touch=null; };
    const clear = () => { cancelTouch();this.orchardMotion=null;this.gardenMotion=null;this.carpentryMotion=null;this.noticeReveal=0;this.noticeboardView?.setAlpha(1);this.movementReset=true;this.keys.clear(); this.session.stop();this.walkMark?.setVisible(false);this.clearBridgeCeremony();this.updateAmbient(0); };
    const readingFocus=(event:FocusEvent)=>{
      if(!(event.target instanceof HTMLElement))return;
      if(event.target.closest('dialog'))cancelTouch();
      if(event.target.closest('[data-ui-scroll]')){this.keys.clear();this.movementReset=true;}
    };
    document.addEventListener('focusin',readingFocus);
    const motionChanged=()=>this.updateAmbient(0);this.reducedMotion.addEventListener('change',motionChanged);
    document.addEventListener('keydown', onDown); document.addEventListener('keyup', onUp);
    window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
    const pointAt = (screenX: number, screenY: number) => {
      const pos = this.cameras.main.getWorldPoint(screenX, screenY);
      const to = { x: pos.x / TILE - .5, y: pos.y / TILE - .5 };
      if(!this.session.locked){
        this.onSteer?.();
        const label=this.room==='garden'?this.gardenLabels.findIndex(text=>this.gardenLabelHit(text).contains(pos.x,pos.y)):-1;
        // Caption taps use the same approach/arrival validation as a body tap.
        // They never open a panel or authorize a command from a distance.
        const sign=this.room==='square'?this.commonsSigns.find(s=>pos.x>=s.hit.x&&pos.x<=s.hit.x+s.hit.width&&pos.y>=s.hit.y&&pos.y<=s.hit.y+s.hit.height):undefined;
        const branch=this.orchardLabels.find(item=>this.gardenLabelHit(item.label).contains(pos.x,pos.y));
        const table=this.orchardTable?.getBounds().contains(pos.x,pos.y)||
          this.orchardTableLabel&&this.gardenLabelHit(this.orchardTableLabel).contains(pos.x,pos.y);
        const target=label>=0?this.gardenLabelTargets[label]:branch?.stop.id??(table?'commons-orchard':sign?.id);
        const accepted=target?this.session.approach(target):this.session.point(to);
        if(!accepted)this.onWalkFailure?.();
      }
    };
    const canvas = this.game.canvas;
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // HTML controls and secondary mouse buttons must never start a walk.
      if (!pointer.wasTouch && pointer.downElement===canvas && pointer.button===0 && pointer.leftButtonDown()) pointAt(pointer.x,pointer.y);
    });

    // A finger first touching the glass may be about to swipe, hold or pinch.
    // Keep that gesture separate from a deliberate tap on the playfield.
    const touchSlop = (event:PointerEvent) => touch &&
      Math.hypot(event.clientX-touch.x,event.clientY-touch.y)>12;
    const startTouch = (event:PointerEvent) => {
      if(event.pointerType!=='touch')return;
      if(!event.isPrimary){cancelTouch();return;}
      if(event.target!==canvas||this.session.locked)return;
      // Suppress the compatibility mouse press for this same touch.
      event.preventDefault();
      touch={id:event.pointerId,x:event.clientX,y:event.clientY,at:event.timeStamp};
    };
    const moveTouch = (event:PointerEvent) => {
      if(event.pointerId===touch?.id&&touchSlop(event))cancelTouch();
    };
    const finishTouch = (event:PointerEvent) => {
      if(!touch||event.pointerId!==touch.id)return;
      const isTap=!touchSlop(event)&&event.timeStamp-touch.at<=450;
      cancelTouch();
      if(isTap&&!this.session.locked&&this.session.room===this.room&&
        document.elementFromPoint(event.clientX,event.clientY)===canvas){
        pointAt(this.scale.transformX(event.pageX),this.scale.transformY(event.pageY));
      }
    };
    window.addEventListener('pointerdown',startTouch,true);
    window.addEventListener('pointermove',moveTouch,true);
    window.addEventListener('pointerup',finishTouch,true);
    window.addEventListener('pointercancel',cancelTouch,true);
    this.scale.on(Phaser.Scale.Events.RESIZE,cancelTouch);
    this.events.once('shutdown',()=>{
      window.removeEventListener('pointerdown',startTouch,true);
      window.removeEventListener('pointermove',moveTouch,true);
      window.removeEventListener('pointerup',finishTouch,true);
      window.removeEventListener('pointercancel',cancelTouch,true);
      this.scale.off(Phaser.Scale.Events.RESIZE,cancelTouch);
    });
    this.events.once('shutdown', () => { this.reducedMotion.removeEventListener('change',motionChanged);document.removeEventListener('focusin',readingFocus);document.removeEventListener('keydown', onDown); document.removeEventListener('keyup', onUp); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear); });
  }
  private gardenLabelHit(text:Phaser.GameObjects.Text){
    const b=text.getBounds(),minimum=44/this.cameras.main.zoom;
    return new Phaser.Geom.Rectangle(b.centerX-Math.max(b.width,minimum)/2,b.centerY-Math.max(b.height,minimum)/2,Math.max(b.width,minimum),Math.max(b.height,minimum));
  }
  private buildingSites:Array<{plotId:string;ownerId:string;ownerName:string;phase:string}>=[];set constructionSites(value:typeof this.buildingSites){if(JSON.stringify(value)===JSON.stringify(this.buildingSites))return;this.buildingSites=value;this.streetDirty=true;}
  private constructionArt:Phaser.GameObjects.Graphics[]=[];
  private yardViews:Phaser.GameObjects.Image[]=[];
  private drawNeighborhood(){
    if(this.room!=='neighborhood'||!this.streetDirty)return;this.streetDirty=false;this.streetWindows=[];for(const v of this.constructionArt)v.destroy();this.constructionArt=[];for(const v of this.yardViews)v.destroy();this.yardViews=[];
    const chimneys:ChimneyAnchor[]=[];
    for(const view of this.streetViews){
      const parcel=PARCELS[view.slot-1],plot=this.streetPlots.find(p=>{const a=addressForPlot(p.id);return a.block===this.districtId&&a.slot===view.slot;});
      view.plotId=plot?.id??null;view.boundary.setVisible(!!plot);
      if(plot){const meta=homeExteriorForPlot(plot.id,plot.level,plot.planId),left=parcel.foot.x*TILE-meta.foot.x,top=parcel.foot.y*TILE-meta.foot.y;
        view.image.setTexture(meta.id).setOrigin(meta.foot.x/meta.width,meta.foot.y/meta.height);const o=this.occluders.find(o=>o.image===view.image);if(o){o.x=parcel.foot.x*TILE-(plot.planId?contractPlan(plot.planId).width*TILE/2:104);o.y=parcel.foot.y*TILE;o.width=plot.planId?contractPlan(plot.planId).width*TILE:208;o.height=plot.planId?contractPlan(plot.planId).height*TILE+20:240;}for(const box of meta.lightingWindows)this.streetWindows.push({...box,x:left+box.x,y:top+box.y});
        chimneys.push({plotId:plot.id,slot:view.slot,x:left+meta.chimney.x,y:top+meta.chimney.y,depth:parcel.foot.y*TILE+.15});
      }else view.image.setTexture('future-home-site').setOrigin(.5,240/248);
      if(plot?.yard){for(const a of yardAnchors(plot.planId??('legacy-'+homeExteriorForPlot(plot.id,plot.level).id))){const prop=plot.yard[a.slot];if(!prop)continue;const key=prop==='letterbox'?'letterbox-'+(plot.letterboxMotif??'leaf')+'-closed':'home-planter-world';const v=this.add.image((parcel.lot.x+a.x)*TILE,(parcel.lot.y+a.y)*TILE,key).setDisplaySize(.6*TILE,(prop==='letterbox'?.84:.75)*TILE).setOrigin(.5,1).setDepth(Math.max((parcel.lot.y+a.y)*TILE,parcel.foot.y*TILE+.3));this.yardViews.push(v);}}
      const construction=this.buildingSites.find(b=>{const a=addressForPlot(b.plotId);return a.block===this.districtId&&a.slot===view.slot;});
      if(construction){const x=(parcel.lot.x+1.3)*TILE,y=(parcel.lot.y+8.7)*TILE,g=this.add.graphics().setDepth(y);g.lineStyle(2,0x41483c).fillStyle(0xa48457).fillRect(x-14,y-14,28,12).strokeRect(x-14,y-14,28,12).fillStyle(0xe8d393).fillRect(x-10,y-34,20,17).strokeRect(x-10,y-34,20,17);g.lineBetween(x-7,y-17,x-10,y+2).lineBetween(x+7,y-17,x+10,y+2);this.constructionArt.push(g);}
      const owner=plot?.ownerName??construction?.ownerName??'Resident';view.label.setText(parcel.number+' '+parcel.street+'\n'+(plot||construction?(owner.length>22?owner.slice(0,21)+'…':owner):'Future home site')+(construction?'\n'+(construction.phase==='ready'?'Ready for the owner':'Builders at work')+(plot?' · home open':''):''));
    }
    this.residentialLife?.replace(chimneys);this.sky?.setWindows(this.streetWindows);
  }
  visualState(){const camera=this.cameras.main;return {waving:this.localWaveLabel?.visible===true,peerWaves:[...this.residentViews].filter(([,view])=>view.label.text.startsWith('Waves hello!\n')).map(([id])=>id),peerMotion:[...this.residentViews].map(([id,{motion,headwear}])=>({id,position:{...motion.position},facing:motion.facing,frame:motion.frame,hat:headwear?.visible?Number(headwear.frame.name):null,walking:motion.walking})),peerHeadwear:[...this.residentViews].filter(([,view])=>view.headwear?.visible).map(([id,view])=>({id,texture:view.headwear!.texture.key})),resting:!!this.bedPose?.visible,headwear:this.headwearLayer?.visible?{texture:this.headwearLayer.texture.key,frame:this.headwearLayer.frame.name,x:this.headwearLayer.x,y:this.headwearLayer.y}:null,canopyTransformWrites:this.canopyTransformWrites,ordinaryBench:{phase:this.benchPhase,recipe:this.benchRecipe,piece:this.benchPiece?.visible?this.benchPiece.texture.key:null},walkTarget:this.walkMark?.visible?{x:this.walkMark.x/TILE-.5,y:this.walkMark.y/TILE-.5}:null,commons:{signs:this.commonsSigns,life:this.commonsLife?.snapshot()??null,framing:this.room==='square'?commonsFrame(this.session.position,camera.width,camera.height):null,shelters:this.occluders.filter(o=>o.image instanceof Phaser.GameObjects.Graphics).map(o=>({alpha:o.image.alpha,x:o.x,y:o.y,width:o.width,height:o.height}))},camera:{zoom:camera.zoom,scrollX:camera.scrollX,scrollY:camera.scrollY,worldView:{x:camera.worldView.x,y:camera.worldView.y,width:camera.worldView.width,height:camera.worldView.height},matrix:Array.from(camera.matrixCombined.matrix).slice(0,6)},neighborhood:{yardItems:this.yardViews.map(v=>({texture:v.texture.key,depth:v.depth,bounds:v.getBounds()})),districtId:this.districtId??null,life:this.residentialLife?.snapshot()??null,windows:this.streetWindows.map(w=>({...w})),sites:this.streetViews.map(v=>({slot:v.slot,plotId:v.plotId,texture:v.image.texture.key,label:v.label.text,bounds:v.image.getBounds(),labelBounds:v.label.getBounds()}))},depots:this.depotViews.map(d=>({resource:d.resource,key:d.image.texture.key,depth:d.image.depth,bounds:d.image.getBounds(),labelBounds:d.label.getBounds(),label:d.label.text})),letterboxes:this.decorationViews.filter((v):v is Phaser.GameObjects.Image=>v instanceof Phaser.GameObjects.Image&&v.texture.key.startsWith('letterbox-')).map(v=>v.texture.key),carpentry:{pineTextures:this.pineViews.map(v=>v.image.texture.key),rackTexture:this.rackView?.texture.key??null,noticeboardTexture:this.noticeboardView?.texture.key??null,equipped:this.carpentryState?.()?.saw.equipped??false,lastAction:this.lastCarpentryAction,action:this.carpentryMotion?.action??null},garden:{room:this.room,lastAction:this.lastGardenAction,bedTextures:this.gardenViews.map(v=>v.texture.key),bedFeet:this.gardenViews.map(v=>({x:v.x,y:v.y})),labels:this.gardenLabels.map((v,i)=>({text:v.text,target:this.gardenLabelTargets[i],bounds:v.getBounds(),hitBounds:this.gardenLabelHit(v)})),action:this.gardenMotion?.action??null,actorTexture:this.actor?.texture.key??null,welcomeTexture:this.gardenWelcomeView?.texture.key??null},bridge:{ceremony:!!this.bridgeRibbon?.visible,phase:this.bridgePhase??(this.bridgeRestored?'open':'collecting'),texture:this.bridgeView?.texture.key??null,readyAt:this.bridgeReadyAt},home:{keepsakeVisible:!!this.keepsakeView?.visible,pennantVisible:this.pennantView?.visible??false,pennantTexture:this.pennantView?.texture.key??null,pennantPosition:this.pennantView?{x:this.pennantView.x,y:this.pennantView.y}:null,room:this.room,plotId:this.loadedHomePlotId??null,ownerName:this.homeOwnerName,level:this.homeLevel,decorations:this.room.startsWith('home')&&this.decorations?this.decorations():null,interiorTexture:this.room.startsWith('home')?this.loadedInteriorKey:null,furniture:this.decorationViews.map(view=>({texture:view.texture.key,x:view.x,y:view.y,alpha:view.alpha}))},facing:this.facing,frame:this.frame,anchor:ART.actorAnchor,scale:ART.actorScale,variety:{actorId:residentArt(this.residentId),actorTexture:this.actor?.texture?.key??null,actorFrame:this.actor?.frame?.name??null,actorSize:{width:this.actor?.width??0,height:this.actor?.height??0},residentFramesReady:!!this.actor&&RESIDENT_IDS.every(id=>this.textures.get('variety-resident-'+id).has('27')),treeKinds:(this.room==='square'||this.room==='neighborhood')?[...TREE_KINDS]:[],buildingKinds:this.room==='square'?[...BUILDING_KINDS]:[],ambient:{enabled:this.ambientEnabled,canopies:this.canopies.map(c=>({key:c.key,rotation:c.image.rotation,offsetX:c.image.x-c.baseX})),steam:{alpha:this.steam?.alpha??0,y:this.steam?this.steam.y-this.steamBaseY:0},routines:this.townfolk.filter(person=>person.prop.visible).map(person=>person.id),gestureOffset:this.gestureOffset}}};}
  private updateAmbient(delta:number){
    this.ambientEnabled=!document.hidden&&!this.reducedMotion.matches;
    this.sky?.motion(0,this.ambientEnabled);
    if(this.ambientEnabled)this.ambientMs+=cosmeticStep(delta);
    this.residentialLife?.update(this.ambientMs,this.ambientEnabled&&this.room==='neighborhood');
    this.commonsLife?.update(this.ambientMs,this.ambientEnabled);
    this.commonsLife?.showRiverFloat(this.riverCast,this.cameras.main.worldView,this.ambientMs,this.ambientEnabled);
    if(this.room==='square'){const c=this.cameras.main,frame=commonsFrame(this.session.position,c.width,c.height);c.setFollowOffset(frame.x,frame.y);}
    const camera=this.cameras.main,visible=(x:number,y:number)=>x>camera.worldView.left-120&&x<camera.worldView.right+120&&y>camera.worldView.top-160&&y<camera.worldView.bottom+120;
    // Keep canopy quads axis-aligned: software rendering clipped rotated SVG quads in CI.
    let transformWrites=0;
    for(const canopy of this.canopies){
      const active=this.ambientEnabled&&visible(canopy.baseX,canopy.image.y);
      const x=canopy.baseX+(active?ambientPose(this.ambientMs,true,canopy.phase).canopyX:0);
      if(canopy.image.rotation!==0){canopy.image.setRotation(0);transformWrites++;}
      if(canopy.image.x!==x){canopy.image.setX(x);transformWrites++;}
    }
    this.canopyTransformWrites=transformWrites;
    const pose=ambientPose(this.ambientMs,this.ambientEnabled);this.gestureOffset=pose.gesture;
    if(this.steam){const active=this.ambientEnabled&&visible(this.steam.x,this.steamBaseY);this.steam.setAlpha(active?pose.steamAlpha:0).setY(this.steamBaseY+(active?pose.steamY:0));}
    for(const {label,x,y} of this.surveyLabels){
      const show=Phaser.Math.Distance.Squared(x,y,this.actor.x,this.actor.y)<100**2;
      if(label.visible!==show)label.setVisible(show);
    }
    for(const [index,person] of this.townfolk.entries()){
      const {x,y}=person.image;
      const enabled=this.ambientEnabled&&visible(x,y);
      const p=ambientPose(this.ambientMs,enabled,index*1.7);
      person.image.setScale(ART.actorScale,ART.actorScale+p.gesture*.004);
      const d=Math.hypot(x-this.actor.x,y-this.actor.y);
      person.label.setVisible(d<(person.id==='clerk'?255:100));
      const pose=enabled?townResidentRoutine(person.id,this.ambientMs):null;
      if(pose)person.prop.setPosition(x+15,y-27-pose.raise).setRotation(pose.rotation);
      if(person.prop.visible!==!!pose)person.prop.setVisible(!!pose);
    }
  }
  update(time: number, delta: number) {
    if (this.room !== this.session.room||(this.room==='neighborhood'&&this.loadedDistrictId!==this.districtId)||(this.room.startsWith('home')&&(this.loadedHomePlotId!==this.homePlotId||this.loadedInteriorKey!==this.interiorKey()))) { this.scene.restart(); return; }
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
    this.paintWalkMark();
    this.paintOrdinaryBench();
    this.paintOrchardTags();
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
    const orchardAge=this.orchardMotion?performance.now()-this.orchardMotion.started:0;
    if(moving||document.hidden||this.session.locked||orchardAge>=615)this.orchardMotion=null;
    const orchard=this.orchardMotion;
    const texture=orchard?'orchard-picking-':motion?'carpentry-actions-':gardenMotion?'garden-actions-':saw?'saw-equipped-':'variety-resident-';
    this.warmActivityArt();
    const rig=residentArt(this.residentId);
    const desiredKey=texture+rig,available=this.textures.exists(desiredKey),actorKey=available?desiredKey:'variety-resident-'+rig;
    const orchardFrame=orchard?['south','north','east','west'].indexOf(orchard.facing)*4+(reduced?2:orchardAge<190?1:orchardAge<345?2:3):0;
    const actorFrame=available&&orchard?orchardFrame:available&&motion?carpentryActionFrame(motion.facing,motion.action,performance.now()-motion.started,reduced):available&&gardenMotion?gardenActionFrame(gardenMotion.facing,gardenMotion.action,performance.now()-gardenMotion.started,reduced):residentFrame(this.facing,this.frame);
    if(this.actor.texture.key!==actorKey||String(this.actor.frame.name)!==String(actorFrame))this.actor.setTexture(actorKey,actorFrame);
    const x=(this.session.position.x+.5)*TILE,y=(this.session.position.y+.5)*TILE;
    this.actor.setPosition(x,y).setDepth(y);
    if(this.bedPose&&this.bedQuilt){
      if(this.bedPose.visible!==this.resting){
        this.bedPose.setVisible(this.resting);
        this.bedQuilt.setVisible(this.resting);
        for(const label of this.lodgingLabels)label.setVisible(!this.resting);
        this.cameras.main.setFollowOffset(0,this.lodgingFollow(this.scale.gameSize.height));
      }
      if(this.resting&&this.bedPose.texture.key!=='variety-resident-'+rig)this.bedPose.setTexture('variety-resident-'+rig,0);
      if(this.actor.visible===this.resting)this.actor.setVisible(!this.resting);
    }
    const actionFacing=available?(orchard?.facing??motion?.facing??gardenMotion?.facing):undefined;
    this.headwearLayer=this.paintHeadwear(this.resting?null:this.headwear,this.headwearLayer,x,y,residentFrame(actionFacing??this.facing,actionFacing?0:this.frame));
    this.drawGarden();this.drawCarpentry();this.drawOuting();
    this.updateAmbient(delta);
    this.sky?.update(this.skyNow(),delta,this.room==='workshop'||this.room==='lodging'||this.room.startsWith('home'),this.ambientEnabled,this.skyFixture);
    for(const item of this.occluders){const hidden=x>item.x&&x<item.x+item.width&&y<item.y&&y>item.y-item.height;item.image.setAlpha(hidden?.55:1);}
    if (this.samplePresentationFrames && this.lastFrame && !document.hidden) { this.frameSamples.push(time - this.lastFrame); if (this.frameSamples.length > 600) this.frameSamples.shift(); }
    this.lastFrame = this.samplePresentationFrames?time:0;
    this.updateDecorations(x,y);
    if(this.houseView)this.houseView.setVisible(true);this.drawNeighborhood();
    this.paintBridgeCeremony();
    if(this.bridgeView)this.bridgeView.setTexture(this.bridgeTexture());if(this.pennantView)this.pennantView.setVisible(this.homePennantOwned);
    const cameraView=this.cameras.main.worldView;
    const peers=this.residents.filter(peer=>{
      if(peer.room!==this.room||this.room.startsWith('home')&&peer.homePlotId!==this.homePlotId||
        this.room==='neighborhood'&&peer.districtId!==this.districtId)return false;
      const x=(peer.position.x+.5)*TILE,y=(peer.position.y+.5)*TILE;
      // Leave room for sprites and signs just outside the viewport, then mount
      // them only when the camera approaches. Presence and the town map keep all peers.
      const margin=this.residentViews.has(peer.id)?192:144;
      return x>=cameraView.left-margin&&x<=cameraView.right+margin&&y>=cameraView.top-margin&&y<=cameraView.bottom+margin;
    });
    const nearPeers=new Set(peers.map(peer=>peer.id));
    for(const [id,view] of this.residentViews)if(!nearPeers.has(id)){
      view.image.destroy();view.label.destroy();view.headwear?.destroy();this.residentViews.delete(id);
    }
    const waveNow=this.waveTime();
    if(this.room==='square'&&activeWave(this.localWaveUntil,waveNow)){
      this.localWaveLabel??=this.add.text(0,0,'Wave hello!',{fontFamily:'Georgia',fontSize:12,color:'#253c34',backgroundColor:'#ffe6a3',padding:{x:4,y:3}}).setOrigin(.5,1);
      const waveY=Math.max(this.cameras.main.worldView.top+22,y-94);
      if(this.localWaveLabel.x!==x||this.localWaveLabel.y!==waveY)this.localWaveLabel.setPosition(x,waveY);
      if(this.localWaveLabel.depth!==y+1)this.localWaveLabel.setDepth(y+1);
      if(!this.localWaveLabel.visible)this.localWaveLabel.setVisible(true);
    }else if(this.localWaveLabel?.visible)this.localWaveLabel.setVisible(false);
    if(this.room!=='square')this.localWaveUntil=0;
    this.visiblePeerWalking=false;
    for(const peer of peers){
      let view=this.residentViews.get(peer.id);
      if(!view){
        view={image:this.add.image(0,0,'variety-resident-'+residentArt(peer.id),0).setOrigin(ART.actorAnchor.x,ART.actorAnchor.y).setScale(ART.actorScale),
          label:this.add.text(0,0,peer.name,{fontFamily:'Georgia',fontSize:12,color:'#253c34',backgroundColor:'#f8f1df',padding:{x:4,y:3}}).setOrigin(.5,1),
          motion:new ResidentMotion(peer.position)};
        this.residentViews.set(peer.id,view);
      }
      const visible=cameraView.contains((peer.position.x+.5)*TILE,(peer.position.y+.5)*TILE);
      view.motion.sample(peer.position,time,visible&&!reduced&&!document.hidden,this.clearPeerStep);
      if(view.motion.walking)this.visiblePeerWalking=true;
      const {position,frame}=view.motion;
      const px=(position.x+.5)*TILE,py=(position.y+.5)*TILE;
      if(String(view.image.frame.name)!==String(frame))view.image.setFrame(frame);
      if(view.image.x!==px||view.image.y!==py){
        view.image.setPosition(px,py).setDepth(py);
        view.label.setPosition(px,py-63).setDepth(py+1);
      }
      const waving=this.room==='square'&&activeWave(peer.waveUntil,waveNow);
      const label=waving?'Waves hello!\n'+peer.name:peer.name;
      if(view.label.text!==label)view.label.setText(label).setBackgroundColor(waving?'#ffe6a3':'#f8f1df');
      view.headwear=this.paintHeadwear(peer.headwear===INKWOOD_HOOD||peer.headwear===CLERK_CAP?peer.headwear:null,view.headwear,px,py,frame);
    }
    this.onFrame?.();
  }
}
