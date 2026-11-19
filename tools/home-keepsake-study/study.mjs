const owner = document.querySelector('#owner');
const visitor = document.querySelector('#visitor');
const frame = document.querySelector('#frame');
const heading = document.querySelector('#heading');
const description = document.querySelector('#description');
const choose = document.querySelector('#journey');
const previewActions = document.querySelector('#preview-actions');
const hang = document.querySelector('#hang');
const cancel = document.querySelector('#cancel');
const remove = document.querySelector('#remove');
const status = document.querySelector('#status');

const earned = new URL(location.href).searchParams.get('earned') !== '0';
let viewing = 'owner';
let preview = false;
let shown = false;

function paint() {
 const owns = viewing === 'owner';
 owner.setAttribute('aria-pressed', String(owns));
 visitor.setAttribute('aria-pressed', String(!owns));
 frame.hidden = !(shown || (owns && preview));
 frame.classList.toggle('preview', owns && preview);
 choose.hidden = !owns || !earned || preview || shown;
 previewActions.hidden = !owns || !preview;
 remove.hidden = !owns || !shown;
 if (!owns) {
  heading.textContent = shown ? 'Neighborhood Naturalist' : 'A quiet place to visit';
  description.textContent = shown
   ? 'Three studies of Ledgerwick’s trees. Officially approved by two shrubs and a committee.'
   : '';
  return;
 }
 heading.textContent = earned ? 'Neighborhood Naturalist' : 'Home keepsake';
 description.textContent = !earned ? 'Record three tree studies to earn this keepsake.'
  : preview ? 'Preview. The frame stays private until you hang it.'
  : shown ? 'Visitors can see the frame. The keepsake stays in your Journal.'
  : 'Hang your earned tree certificate where visitors can see it.';
}

function showView(view) {
 viewing = view;
 preview = false;
 status.textContent = '';
 paint();
}
owner.addEventListener('click', () => showView('owner'));
visitor.addEventListener('click', () => showView('visitor'));
choose.addEventListener('click', () => {
 preview = true;
 status.textContent = '';
 paint();
 hang.focus();
});
hang.addEventListener('click', () => {
 shown = true;
 preview = false;
 status.textContent = 'Hung for visitors.';
 paint();
 remove.focus();
});
cancel.addEventListener('click', () => {
 preview = false;
 paint();
 choose.focus();
});
remove.addEventListener('click', () => {
 shown = false;
 status.textContent = 'The wall is clear. Your Journal keeps the certificate.';
 paint();
 choose.focus();
});
paint();
