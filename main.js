import { synth, music } from './audio.js';
import confetti from 'canvas-confetti';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let motionEnabled = !reducedMotion.matches;
let flower = null;
const container = document.getElementById('canvas-container');
const motionButton = document.getElementById('motion-toggle');
const status = document.getElementById('response-status');

function showFallback() {
  container.replaceChildren();
  const image = new Image();
  image.src = '/flower-fallback.png';
  image.alt = 'A lilac flower with dew drops in a glass vase';
  image.className = 'flower-fallback';
  container.removeAttribute('role');
  container.removeAttribute('aria-label');
  container.append(image);
  document.getElementById('rotate-left').disabled = true;
  document.getElementById('rotate-right').disabled = true;
  flower = null;
}

// Page controls are independent of graphics initialization.
const nav = document.getElementById('main-nav');
const menu = document.getElementById('menu-dots-trigger');
function closeMenu() {menu.setAttribute('aria-expanded','false'); menu.setAttribute('aria-label','Open Menu'); nav.classList.remove('is-open');}
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded',String(open));
  menu.setAttribute('aria-label',open?'Close Menu':'Open Menu');
  nav.classList.toggle('is-open',open);
});
document.addEventListener('click', e => {if(!nav.contains(e.target)&&!menu.contains(e.target))closeMenu();});
document.addEventListener('keydown', e => {if(e.key==='Escape'&&nav.classList.contains('is-open')){closeMenu();menu.focus();}});
matchMedia('(min-width: 981px)').addEventListener('change',closeMenu);

const dialogs = [...document.querySelectorAll('dialog')];
const triggers = new WeakMap();
function openModal(id) {
  const dialog=document.getElementById(id);
  if(!dialog||dialog.open)return;
  closeMenu();
  triggers.set(dialog,document.activeElement);
  dialog.showModal();
  document.body.classList.add('modal-open');
  synth.playGentlePing();
}
for(const dialog of dialogs) {
  dialog.addEventListener('close',()=>{
    document.body.classList.toggle('modal-open',dialogs.some(d=>d.open));
    const trigger=triggers.get(dialog);
    if(trigger?.isConnected&&!trigger.closest('dialog:not([open])')&&trigger.getClientRects().length)trigger.focus();
    else if(!dialogs.some(d=>d.open))document.getElementById('open-full-note-btn').focus();
  });
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
}
document.querySelectorAll('[data-close-modal]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.closeModal).close()));
nav.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
  if(button.dataset.action==='home') {closeMenu();window.scrollTo({top:0,behavior:motionEnabled?'smooth':'instant'});}
  else openModal(`${button.dataset.action}-modal`);
}));
document.getElementById('open-full-note-btn').addEventListener('click',()=>openModal('full-note-modal'));
const needTimeButton = document.getElementById('need-time-btn');
let runawayX = 0, runawayY = 0, lastEscape = 0;
function runAway(event) {
  if (performance.now() - lastEscape < 180 || dialogs.some(dialog => dialog.open)) return;
  lastEscape = performance.now();
  // Measure afresh so scrolling and responsive changes never leave stale bounds.
  const rect = needTimeButton.getBoundingClientRect();
  const card = document.getElementById('apology-card').getBoundingClientRect();
  const baseLeft = rect.left - runawayX, baseTop = rect.top - runawayY;
  const minX = Math.max(card.left + 12, 12) - baseLeft;
  const maxX = Math.min(card.right - 12, innerWidth - 12) - rect.width - baseLeft;
  const minY = Math.max(card.top + 12, 12) - baseTop;
  const maxY = Math.min(card.bottom - 12, innerHeight - 12) - rect.height - baseTop;
  if (maxX < minX || maxY < minY) return;
  let dx = rect.left + rect.width / 2 - (event.clientX ?? rect.left);
  let dy = rect.top + rect.height / 2 - (event.clientY ?? rect.top);
  if (Math.hypot(dx, dy) < 12) { const angle = Math.random() * Math.PI * 2; dx = Math.cos(angle); dy = Math.sin(angle); }
  const distance = Math.hypot(dx, dy) || 1;
  let nextX = Math.max(minX, Math.min(maxX, runawayX + dx / distance * 150));
  let nextY = Math.max(minY, Math.min(maxY, runawayY + dy / distance * 150));
  if (Math.hypot(nextX - runawayX, nextY - runawayY) < 50) {
    nextX = runawayX < (minX + maxX) / 2 ? maxX : minX;
    nextY = runawayY < (minY + maxY) / 2 ? maxY : minY;
  }
  runawayX = nextX; runawayY = nextY;
  needTimeButton.style.transform = `translate(${runawayX}px, ${runawayY}px)`;
  synth.playGentlePing();
}
needTimeButton.addEventListener('pointerenter', runAway);
needTimeButton.addEventListener('pointerdown', event => { if (event.pointerType === 'touch') {event.preventDefault(); runAway(event);} });
needTimeButton.addEventListener('click', event => {event.preventDefault(); runAway(event);});
window.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse') return;
  const rect = needTimeButton.getBoundingClientRect();
  if (Math.hypot(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2) < 85) runAway(event);
});
window.addEventListener('resize', () => { runawayX = runawayY = 0; needTimeButton.style.transform = ''; });
function forgive() {
  document.getElementById('full-note-modal').close();
  openModal('forgive-modal');
  synth.playChime([523.25,659.25,783.99,1046.5],1);
  status.textContent='Thank You, Farly ❤️';
  if(motionEnabled)confetti({particleCount:90,spread:65,origin:{y:.65},colors:['#8A68AC','#B89FD8','#E6DEF5','#F59E0B'],disableForReducedMotion:true,zIndex:2147483647});
}
document.getElementById('forgive-btn').addEventListener('click',forgive);
document.getElementById('letter-forgive-trigger').addEventListener('click',forgive);
const soundButton=document.getElementById('sound-toggle');
function soundState(){soundButton.setAttribute('aria-pressed',String(synth.enabled));soundButton.setAttribute('aria-label',synth.enabled?'Mute music and sound':'Play music and sound');soundButton.title=synth.enabled?'Mute music and sound':'Play music and sound';soundButton.classList.toggle('is-muted',!synth.enabled);}
music.audio.addEventListener('ended',()=>{synth.enabled=false;soundState();});
synth.enabled=true;
let awaitingMusicGesture=true;
let soundRequest=0;
function clearMusicGesture(){
  awaitingMusicGesture=false;
  document.removeEventListener('click',startMusicOnGesture);
  document.removeEventListener('keydown',startMusicOnGesture);
}
async function startDefaultMusic(){
  const request=++soundRequest;
  try {
    await music.setEnabled(true);
    if(request===soundRequest)clearMusicGesture();
  } catch(error) {
    if(request!==soundRequest)return;
    // Browser autoplay restrictions are expected; retry on a real interaction.
    if(error.name!=='NotAllowedError')console.warn('Music unavailable:',error);
  }
}
function startMusicOnGesture(event){
  if(!awaitingMusicGesture||!synth.enabled||event.target.closest?.('#sound-toggle'))return;
  if(event.type==='keydown'&&(event.repeat||!['Enter',' '].includes(event.key)))return;
  startDefaultMusic();
}
document.addEventListener('click',startMusicOnGesture);
document.addEventListener('keydown',startMusicOnGesture);
startDefaultMusic();
soundState();soundButton.addEventListener('click',async()=>{
  ++soundRequest;clearMusicGesture();
  synth.toggle();soundState();
  try { await music.setEnabled(synth.enabled); }
  catch(error) {
    synth.enabled=false;music.setEnabled(false);soundState();
    status.textContent='Music could not play. Tap the sound button to try again.';
    console.warn('Music unavailable:',error);
  }
});
const cards=[...document.querySelectorAll('.secret-petal-card')];
cards.forEach((card,i)=>{card.setAttribute('aria-label',`Open flower note ${i+1}`);card.addEventListener('click',()=>{
  cards.forEach(c=>{c.classList.toggle('selected',c===card);c.setAttribute('aria-pressed',String(c===card));});
  document.getElementById('revealed-note-box').textContent=`“${card.dataset.note}”`;
  synth.playGentlePing();
});});

// A small fixed particle pool; celebrations never increase its size.
const canvas=document.getElementById('petals-canvas');
const ctx=canvas.getContext('2d');
const particles=Array.from({length:38},()=>({x:Math.random(),y:Math.random(),angle:Math.random()*Math.PI*2,size:5+Math.random()*8,speed:.025+Math.random()*.03,sway:Math.random()*Math.PI*2,spin:(Math.random()-.5)*.9}));
let frame=0,last=0;
function sizePetals(){canvas.width=innerWidth;canvas.height=innerHeight;}
function animate(t){
  frame=0;if(!motionEnabled||document.hidden)return;
  const dt=Math.min((t-(last||t))/1000,.05);last=t;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(const p of particles){
    p.y+=p.speed*dt;p.angle+=dt*p.spin;p.sway+=dt*.65;
    p.x+=dt*.008;
    if(p.y>1.04){p.y=-.04;p.x=Math.random();}
    if(p.x>1.08)p.x=-.08;
    ctx.save();ctx.translate(p.x*canvas.width+Math.sin(p.sway)*32,p.y*canvas.height);ctx.rotate(p.angle);
    ctx.scale(.5+Math.abs(Math.sin(p.sway))*.5,1);
    const s=p.size;
    const tint=ctx.createLinearGradient(-s,-s,s,s);
    tint.addColorStop(0,'rgba(255,220,231,.8)');tint.addColorStop(1,'rgba(205,111,146,.45)');
    ctx.fillStyle=tint;ctx.beginPath();ctx.moveTo(0,s);
    ctx.bezierCurveTo(-s*1.1,s*.1,-s*.8,-s, -s*.22,-s*.85);
    ctx.lineTo(0,-s*.55);ctx.lineTo(s*.22,-s*.85);
    ctx.bezierCurveTo(s*.8,-s,s*1.1,s*.1,0,s);ctx.fill();ctx.restore();
  }
  frame=requestAnimationFrame(animate);
}
function applyMotion(){
  document.documentElement.classList.toggle('motion-paused',!motionEnabled);
  motionButton.textContent=motionEnabled?'Pause motion':'Resume motion';
  motionButton.setAttribute('aria-pressed',String(!motionEnabled));
  flower?.setMotion(motionEnabled);
  cancelAnimationFrame(frame);frame=0;last=0;
  if(motionEnabled&&ctx&&!document.hidden)frame=requestAnimationFrame(animate);
  else ctx?.clearRect(0,0,canvas.width,canvas.height);
  if(!motionEnabled)confetti.reset();
}
sizePetals();window.addEventListener('resize',sizePetals);
document.addEventListener('visibilitychange',applyMotion);
motionButton.addEventListener('click',()=>{motionEnabled=!motionEnabled;applyMotion();});
reducedMotion.addEventListener('change',e=>{motionEnabled=!e.matches;applyMotion();});
document.getElementById('rotate-left').addEventListener('click',()=>flower?.rotate(-1));
document.getElementById('rotate-right').addEventListener('click',()=>flower?.rotate(1));
applyMotion();
import('./flower.js').then(({FlowerScene})=>{
  try{flower=new FlowerScene(container,showFallback);flower.setMotion(motionEnabled);}
  catch(error){console.warn('Flower unavailable; showing still image.',error);showFallback();}
}).catch(showFallback);
if(import.meta.hot)import.meta.hot.dispose(()=>{flower?.dispose();music.dispose();cancelAnimationFrame(frame);});
