export type FieldNote = Readonly<{text:string;at:number}>;
const NOTE_LIMIT=12;

export class RecentFieldNotes {
 private owner:string|null=null;
 private entries:readonly FieldNote[]=[];

 read(owner:string|null):readonly FieldNote[] {
  if(this.owner!==owner){this.owner=owner;this.entries=[];}
  return this.entries;
 }

 record(owner:string|null,text:string|null,at:number){
  const entries=this.read(owner),message=text?.trim();
  if(!owner||!message||entries[0]?.text===message||!Number.isFinite(at)||Math.abs(at)>8.64e15)return;
  this.entries=[{text:message,at},...entries.slice(0,NOTE_LIMIT-1)];
 }
}
