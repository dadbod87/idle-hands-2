export type StudyPoint={x:number;y:number};
export type StudyRect=StudyPoint&{width:number;height:number};
export type GardenStudyGeometry={width:number;height:number;actor:StudyPoint;activity:StudyRect};
export function studyUnion(rects:StudyRect[]):StudyRect{if(!rects.length)throw new Error('A study needs bounds.');const left=Math.min(...rects.map(r=>r.x)),top=Math.min(...rects.map(r=>r.y));return{x:left,y:top,width:Math.max(...rects.map(r=>r.x+r.width))-left,height:Math.max(...rects.map(r=>r.y+r.height))-top};}
/** Render-only comparison. It never settles, moves or writes a game resident. */
export function gardenStudyFrame(view:{width:number;height:number},geometry:GardenStudyGeometry,mode:'current'|'proposed',pan:StudyPoint={x:0,y:0}){
 if(![view.width,view.height,geometry.width,geometry.height].every(n=>Number.isFinite(n)&&n>0)||![pan.x,pan.y,geometry.actor.x,geometry.actor.y].every(Number.isFinite))throw new Error('Finite positive study viewport required.');
 const a=geometry.activity,zoom=mode==='current'?1:Math.max(.75,Math.min(1,view.width/(a.width+24),view.height/(a.height+24))),width=view.width/zoom,height=view.height/zoom;
 const focus=mode==='current'?geometry.actor:{x:a.x+a.width/2,y:a.y+a.height/2};
 const clamp=(n:number,extent:number,visible:number)=>{const low=-Math.max(0,(visible-extent)/2),high=low+Math.max(extent,visible)-visible;return Math.min(high,Math.max(low,n-visible/2));};
 const scrollX=clamp(focus.x+pan.x,geometry.width,width),scrollY=clamp(focus.y+pan.y,geometry.height,height);
 return{zoom,scrollX,scrollY,width,height,fitsActivity:a.x>=scrollX&&a.y>=scrollY&&a.x+a.width<=scrollX+width&&a.y+a.height<=scrollY+height};
}
export function studyProject(rect:StudyRect,frame:ReturnType<typeof gardenStudyFrame>):StudyRect{return{x:(rect.x-frame.scrollX)*frame.zoom,y:(rect.y-frame.scrollY)*frame.zoom,width:rect.width*frame.zoom,height:rect.height*frame.zoom};}
