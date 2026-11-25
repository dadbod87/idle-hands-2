export const VALLEY_PRINT_KEY='ih2:hidden-valley-print:v1';
export const VALLEY_PRINT_STOP_ID='valley-cider-court';

type PrintStorage=Pick<Storage,'getItem'|'setItem'>;
export function earnedValleyPrint(storage:Pick<PrintStorage,'getItem'>){
 try{return storage.getItem(VALLEY_PRINT_KEY)==='1';}
 catch{return false;}
}

/** A local souvenir with a single ownership bit. No workshop or town writes. */
export function takeValleyPrint(storage:PrintStorage,atPress:boolean){
 if(!atPress)return false;
 try{
  if(earnedValleyPrint(storage))return true;
  storage.setItem(VALLEY_PRINT_KEY,'1');
 }catch{
  // Verify the write because browsers may report an error after storing it.
 }
 return earnedValleyPrint(storage);
}
