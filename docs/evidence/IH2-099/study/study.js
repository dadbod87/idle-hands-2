const $=id=>document.getElementById(id);
const catalog=await fetch('catalog.json').then(r=>{if(!r.ok)throw Error('Study catalog unavailable');return r.json();});
const examples={
 fresh:{held:0,personal:0,town:0,pip:true},ready:{held:3,personal:1,town:4},pip:{held:1,personal:0,town:4,pip:true},
 cooling:{held:4,personal:1,town:4,cooling:120},final:{held:2,personal:2,town:11},late:{held:3,personal:0,town:12,open:true},
 complete:{held:4,personal:3,town:12,open:true},full:{held:12,personal:1,town:8},race:{held:2,personal:3,town:11},
};
let model,selected='slices',generation=0,pending=false,confirmed=false,room=false,enlarged=false,lastReviewOpener=null;
const review=$('review'),information=$('information');
const done=()=>model.personal>=catalog.personalTarget&&model.town>=catalog.publicTarget;
const canServe=()=>!pending&&!done()&&!model.cooling&&model.held>=catalog.studyDefault.radishes;
const say=text=>{$('status').textContent=text;$('status').scrollTop=0;};
const selectedArt=()=>catalog.presentations.find(x=>x.id===selected);
function render(){
 $('town-count').textContent='Town · '+Math.min(model.town,12)+' / 12';$('town-progress').value=Math.min(model.town,12);
 $('town-note').hidden=model.town<12;$('personal-note').hidden=false;
 $('town-note').textContent=model.town>=12?(model.open?'Open · newcomers can still earn their teapot.':'Funded · opens in 4 real hours.'):'Then a 4-hour opening countdown.';
 $('personal-count').textContent='Your teapot · '+Math.min(model.personal,3)+' / 3';$('personal-progress').value=Math.min(model.personal,3);
 $('personal-note').textContent=model.personal>=3?'Keepsake earned · one permanent teapot.':'3 tastings → permanent teapot.';
 $('ingredient-count').textContent='1 radish required';$('ingredient-count').nextElementSibling.textContent='You have '+model.held+' · harvested produce';$('ingredient-count').dataset.held=String(model.held);
 $('chosen-art').src=selectedArt().image;$('chosen-name').textContent=selectedArt().name;
 for(const b of $('presentations').querySelectorAll('button')){b.setAttribute('aria-pressed',String(b.dataset.presentation===selected));b.disabled=pending;}
 const primary=$('primary');primary.disabled=pending||Boolean(model.cooling)&&!confirmed&&!done();
 primary.textContent=pending?'Waiting for confirmation':confirmed?'Tasting served · keep exploring':done()?'Chapter complete · keep exploring':model.cooling?'Serve again in '+Math.ceil(model.cooling/60)+' hours':model.held<1?'Visit your allotment':'Review tasting · 1 radish';
 $('keepsake').hidden=model.personal<3;
 $('review-art').src=selectedArt().image;
 $('review-cost').textContent='1 harvested radish → 1 tasting';
 $('review-result').textContent=model.town>=12?'Counts toward a permanent teapot for your home. The café is already funded.':'Counts toward a permanent teapot for your home and the town’s opening.';
 $('review-warning').textContent=model.pip&&model.held===1?'This uses the radish also needed for Pip’s letterbox. Keep it if that is your next goal.':'';
}
function reset(){generation++;pending=false;confirmed=false;model=structuredClone(examples[$('example').value]);review.close();information.close();$('confirm').disabled=false;$('confirm').hidden=false;$('confirm').textContent='Serve tasting · 1 radish';$('cancel').textContent='Keep my radish';$('review-status').textContent='';render();say(done()?'Both goals are complete. No more ingredients are needed.':model.cooling?'Your last tasting is confirmed. You can leave; there is no attendance window.':model.held<1?'Harvest a radish at your allotment. Growing plants and seeds cannot be spent.':model.pip&&model.held===1?'Pip’s unmade letterbox also needs this radish. You choose which goal comes first.':'Preview freely. Nothing spent.');}
for(const item of catalog.presentations){const b=document.createElement('button');b.type='button';b.dataset.presentation=item.id;b.setAttribute('aria-pressed','false');const img=document.createElement('img');img.src=item.image;img.alt='';img.width=70;img.height=56;const label=document.createElement('span');label.textContent=item.name;b.append(img,label);b.addEventListener('click',()=>{if(pending)return;selected=item.id;render();const choices=b.closest('details');choices.open=false;choices.querySelector('summary').focus();});$('presentations').append(b);}
function showInformation(title,text,image){$('information-title').textContent=title;const body=$('information-body');body.replaceChildren();if(image){const img=document.createElement('img');img.src=image;img.alt=title;img.width=100;img.height=100;body.append(img);}const p=document.createElement('p');p.textContent=text;body.append(p);information.showModal();}
function ingredientInfo(){showInformation('Your next stop: the allotment','Radishes come from your own beds. The first takes 5 real minutes; later radishes take 30. Harvest returns the seed. In the game, this route would walk you there; this separate study stops at the counter.','art/garden-radish-produce.svg');}
$('primary').addEventListener('click',()=>{
 if(pending)return;
 if(done()||confirmed){showInformation('Keep exploring','Your garden, Pip’s post and your workshop remain separate activities. The tasting chapter does not spend their materials or occupy their work slots. This is a design route preview, not a trip in the game.');return;}
 if(model.cooling)return;
 if(model.held<1){ingredientInfo();return;}
 lastReviewOpener=$('primary');$('review-title').textContent='Serve this tasting?';$('confirm').hidden=false;$('confirm').disabled=false;$('confirm').textContent='Serve tasting · 1 radish';$('cancel').textContent='Keep my radish';$('review-status').textContent='Serving is immediate after confirmation. Then wait 4 real hours before another.';render();review.showModal();
 if($('example').value==='race'){const g=generation;setTimeout(()=>{if(g!==generation||confirmed)return;model.town=12;model.open=true;render();say('Another resident finished the town. Both your goals are complete; no radish needs to be spent.');$('review-status').textContent=$('status').textContent;$('confirm').disabled=true;},900);}
});
$('confirm').addEventListener('click',()=>{
 if(pending||confirmed)return;
 if(!canServe()){say(done()?'The town finished while you reviewed. Both your goals are complete; no radish was spent.':'This example is no longer ready. Nothing spent.');$('review-status').textContent=$('status').textContent;$('confirm').disabled=true;return;}
 const requestGeneration=generation,style=selected;pending=true;$('confirm').disabled=true;$('confirm').textContent='Serving…';$('cancel').textContent='Close';$('review-status').textContent='Waiting for confirmation. Closing keeps this request active.';say('Serving… wait for confirmation.');render();
 // A short, labelled synthetic reply demonstration, not a server or production clock.
 setTimeout(()=>{
  if(requestGeneration!==generation)return;
  pending=false;
  if(done()){say('Both goals finished before confirmation. No radish spent.');$('review-status').textContent=$('status').textContent;$('confirm').disabled=true;render();return;}
  model.held--;model.personal++;model.town=Math.min(12,model.town+1);model.cooling=240;confirmed=true;
  const earned=model.personal===3;
  const result=earned?'Tasting confirmed. Brave little teapot earned for your home.':model.open?'Tasting confirmed. Your personal progress counts; the café is already open.':model.town===12?'Tasting confirmed. The town is funded; opening in 4 real hours.':'Tasting confirmed. Your own progress and the town total are saved in this example.';
  say(result);$('review-status').textContent=result;$('confirm').hidden=true;$('cancel').textContent='Return to counter';render();
  $('status').dataset.confirmedStyle=style;
  // Never reopen a closed review or move focus after a delayed reply.
 },$('slow-reply').checked?5000:400);
});
function closeReview(){review.close();if(lastReviewOpener&&document.activeElement===document.body)lastReviewOpener.focus();}
$('close-review').addEventListener('click',closeReview);$('cancel').addEventListener('click',closeReview);
$('close-information').addEventListener('click',()=>information.close());$('ingredient-source').addEventListener('click',ingredientInfo);
$('inspect-keepsake').addEventListener('click',()=>showInformation('Brave little teapot','One permanent keepsake after your third tasting, even if other residents opened the café first. Proposed destination: Bag, Furniture pocket. This art preview has not added an item to your game.','art/brave-teapot.svg'));
$('example').addEventListener('change',reset);
$('view').addEventListener('click',()=>{room=!room;$('scene').classList.toggle('room',room);$('view').textContent=room?'View exterior art':'View interior art';$('zoom').hidden=!room;$('scene-caption').textContent=room?'Interior composition study · shared tables and a clear central aisle.':'Exterior composition study · window service stays outside.';enlarged=false;$('scene').classList.remove('enlarged');$('zoom').textContent='Enlarge room art';$('scene').scrollLeft=0;$('scene').scrollTop=0;$('scene').focus({preventScroll:true});$('scene').scrollIntoView({block:'start'});});
$('zoom').addEventListener('click',()=>{enlarged=!enlarged;$('scene').classList.toggle('enlarged',enlarged);$('zoom').textContent=enlarged?'Reset room art':'Enlarge room art';if(!enlarged){$('scene').scrollLeft=0;$('scene').scrollTop=0;}});
$('opening').addEventListener('click',()=>{const scene=$('scene');scene.classList.remove('celebrate');void scene.offsetWidth;scene.classList.add('celebrate');scene.focus({preventScroll:true});scene.scrollIntoView({block:'start'});setTimeout(()=>scene.classList.remove('celebrate'),1100);});
$('back-counter').addEventListener('click',()=>{$('counter-title').tabIndex=-1;$('counter-title').focus({preventScroll:true});$('counter').scrollIntoView({block:'start'});});
document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('paused',document.hidden));
reset();
