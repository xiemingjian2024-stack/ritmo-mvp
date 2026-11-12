const $ = (id) => document.getElementById(id);
if(new URLSearchParams(location.search).has('capture')) document.body.classList.add('capture');
const phone = $('phone');
const home = $('home');
const homeContent = $('home-content');
const countdown = $('countdown');
const target = $('target');
const digit = $('digit');
const progress = $('progress');
const moving = $('moving');
const movingDisc = $('moving-disc');
const movingDot = $('moving-dot');
const hole = $('moving-hole');
const countdownDot = $('countdown-dot');
const play = $('play');
const orbit = $('orbit');
const state = $('state');
const frameList = $('frames');
const activePreview = $('active-preview');
const activeVideo = $('active-video');
const activePause = $('active-pause');
const duration = 610;
let speed = 1;
let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let phase = 'idle';
let frame = 0;
let startedAt = 0;
let countdownStartedAt = 0;
let frozenAt = 0;
let source = null;

const clamp = (n) => Math.max(0, Math.min(1, n));
const lerp = (a,b,t) => a + (b-a)*t;
const mixColor = (a,b,t) => `rgb(${a.map((v,i)=>Math.round(lerp(v,b[i],t))).join(',')})`;
const ease = (t) => 1 - Math.pow(1-t,3);
const mixPoint = (a,b,t) => ({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)});

function triangleSegments(){
  // Match the approved BrandStartIcon in src/brandMotion.tsx. Its 48% SVG
  // viewport is 18 20 64 60; normalize that exact contour to the button.
  const radius=33.7;
  const corners=Array.from({length:3},(_,i)=>({x:50+radius*Math.cos(i*2*Math.PI/3),y:50+radius*Math.sin(i*2*Math.PI/3)}));
  const cut=13/(radius*Math.sqrt(3));
  const incoming=corners.map((p,i)=>mixPoint(p,corners[(i+2)%3],cut));
  const outgoing=corners.map((p,i)=>mixPoint(p,corners[(i+1)%3],cut));
  const normalize=p=>({x:12.5+.75*p.x,y:12.5+.75*p.y});
  const segments=[];
  for(let i=0;i<3;i++){
    const next=(i+1)%3,from=outgoing[i],to=incoming[next],vertex=corners[next],exit=outgoing[next];
    segments.push([mixPoint(from,to,1/3),mixPoint(from,to,2/3),to].map(normalize));
    segments.push([mixPoint(to,vertex,2/3),mixPoint(exit,vertex,2/3),exit].map(normalize));
  }
  return {start:normalize(outgoing[0]),segments};
}

function circleSegments(radius){
  const center={x:50,y:50};
  const point=(a)=>({x:center.x+radius*Math.cos(a),y:center.y+radius*Math.sin(a)});
  const step=Math.PI/3;
  const startAngle=Math.PI/6;
  const tangent=4/3*Math.tan(step/4)*radius;
  const segments=[];
  for(let i=0;i<6;i++){
    const a=startAngle+i*step,b=a+step,p=point(a),q=point(b);
    segments.push([{x:p.x-tangent*Math.sin(a),y:p.y+tangent*Math.cos(a)},{x:q.x+tangent*Math.sin(b),y:q.y-tangent*Math.cos(b)},q]);
  }
  return {start:point(startAngle),segments};
}

const triangle=triangleSegments();
function morphPath(from,to,t){
  const start=mixPoint(from.start,to.start,t);
  const parts=[`M ${start.x.toFixed(3)} ${start.y.toFixed(3)}`];
  for(let i=0;i<6;i++){
    const points=from.segments[i].map((p,j)=>mixPoint(p,to.segments[i][j],t));
    parts.push(`C ${points.map(p=>`${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join(' ')}`);
  }
  return `${parts.join(' ')} Z`;
}
$('static-triangle').setAttribute('d',morphPath(triangle,triangle,0));

function positionFor(node){
  const parent=phone.getBoundingClientRect(),rect=node.getBoundingClientRect();
  return {left:rect.left-parent.left,top:rect.top-parent.top,width:rect.width,height:rect.height};
}
function setState(label){state.textContent=label;}
function reset(){
  cancelAnimationFrame(frame);
  phase='idle';source=null;startedAt=0;countdownStartedAt=0;frozenAt=0;
  activePreview.hidden=true;activeVideo.pause();activePause.textContent='暂停 / 调整';
  home.style.cssText='';homeContent.style.cssText='';countdown.style.cssText='';
  home.querySelector('.bottom-nav').style.opacity='';
  countdown.querySelectorAll('.countdown-label, strong, small').forEach(el=>el.style.opacity='0');
  target.style.opacity='0';moving.style.display='none';play.style.visibility='visible';orbit.classList.remove('stopped');
  digit.textContent='3';progress.style.strokeDashoffset='100';countdownDot.removeAttribute('transform');
  movingDisc.style.fill='#b7ff19';movingDot.style.opacity='0';setState('待点击 PLAY');
}

function renderTransition(p){
  const from=source??positionFor(play);
  const to=positionFor(target);
  if(!Number.isFinite(to.left)||to.width<20){endTransition();return;}
  const move=ease(clamp((p-.08)/.92));
  const left=lerp(from.left,to.left,move),top=lerp(from.top,to.top,move);
  moving.style.display='block';moving.style.left=`${left}px`;moving.style.top=`${top}px`;
  moving.style.width=`${from.width}px`;moving.style.height=`${from.height}px`;
  const morph=clamp((p-.10)/.34);
  const expansion=ease(clamp((p-.34)/.66));
  const innerRadius=lerp(22,44,expansion);
  hole.setAttribute('d',morphPath(triangle,circleSegments(innerRadius),morph));
  // At handoff the lime surface settles into the existing dark countdown track.
  // The lime dot remains at twelve o'clock, so there is no ring color flash.
  const handoff=ease(clamp((p-.60)/.40));
  movingDisc.style.fill=mixColor([183,255,25],[22,59,11],handoff);
  movingDot.style.opacity=String(handoff);
  const dark=clamp((p-.1)/.73);
  countdown.style.backgroundColor=`rgba(8,10,9,${dark})`;
  home.style.transform=`scale(${1-.015*dark})`;
  homeContent.style.opacity=`${1-clamp((p-.2)/.65)}`;
  home.querySelector('.bottom-nav').style.opacity=`${1-clamp((p-.2)/.65)}`;
  setState(`转场 ${Math.round(p*100)}%`);
}

function endTransition(){
  phase='countdown';moving.style.display='none';home.style.visibility='hidden';
  countdown.style.backgroundColor='#080a09';
  target.style.opacity='1';
  countdown.querySelectorAll('.countdown-label, strong, small').forEach(el=>el.style.opacity='1');
  digit.textContent='3';progress.style.strokeDashoffset='100';countdownDot.removeAttribute('transform');countdownStartedAt=performance.now();
  setState('倒计时 3（完整 1 秒）');
  frame=requestAnimationFrame(tick);
}

function tick(now){
  if(phase==='transition'){
    const p=clamp((now-startedAt)/(duration/speed));
    renderTransition(p);
    if(p>=1){endTransition();return;}
  } else if(phase==='countdown'){
    const elapsed=Math.max(0,now-countdownStartedAt);
    if(elapsed>=3000){
      phase='active-preview';countdown.style.visibility='hidden';activePreview.hidden=false;
      activeVideo.currentTime=0;activeVideo.play().catch(()=>{});
      setState('已进入首个热身动作 · 隔离执行页预览');return;
    }
    const value=3-Math.floor(elapsed/1000);
    digit.textContent=String(value);
    progress.style.strokeDashoffset=String(100-elapsed/30);
    countdownDot.setAttribute('transform',`rotate(${elapsed*.12} 50 50)`);
    setState(`倒计时 ${value}（${(elapsed/1000).toFixed(1)} / 3.0 秒）`);
  }
  frame=requestAnimationFrame(tick);
}

function start(){
  if(phase!=='idle')return;
  source=positionFor(play);
  orbit.classList.add('stopped');play.style.visibility='hidden';
  if(reduced){endTransition();return;}
  phase='transition';startedAt=performance.now();
  frame=requestAnimationFrame(tick);
}

activePause.addEventListener('click',()=>{
  if(activeVideo.paused){activeVideo.play().catch(()=>{});activePause.textContent='暂停 / 调整';}
  else{activeVideo.pause();activePause.textContent='继续训练';}
});
play.addEventListener('click',start);
$('replay').addEventListener('click',()=>{reset();start();});
$('frame-button').addEventListener('click',()=>{frameList.hidden=!frameList.hidden;});
frameList.addEventListener('click',(event)=>{
  const button=event.target.closest('[data-frame]');if(!button)return;
  reset();source=positionFor(play);orbit.classList.add('stopped');play.style.visibility='hidden';
  const p=Number(button.dataset.frame);
  if(p===0){reset();return;}
  if(p>=1){phase='paused-frame';endTransition();cancelAnimationFrame(frame);phase='paused-frame';setState('关键帧 100% · 数字 3');return;}
  phase='paused-frame';renderTransition(p);setState(`关键帧 ${Math.round(p*100)}%`);
});

function group(id,attribute,onChange){
  $(id).addEventListener('click',(event)=>{
    const button=event.target.closest(`button[data-${attribute}]`);if(!button)return;
    $(id).querySelectorAll('button').forEach(el=>el.classList.toggle('on',el===button));
    onChange(button.dataset[attribute]);
    if(phase==='transition'){
      // Width and position are remeasured on the next frame. A size change
      // would break the fixed-diameter guarantee, so hand off immediately.
      if(attribute==='size'){cancelAnimationFrame(frame);endTransition();}
      return;
    }
    reset();
  });
}
group('widths','width',(v)=>{phone.style.setProperty('--phone-width',`${v}px`);phone.style.setProperty('--phone-height',`${{375:812,393:852,430:932}[v]}px`);});
group('positions','position',(v)=>$('hero').dataset.position=v);
group('sizes','size',(v)=>phone.style.setProperty('--play-size',`${v}px`));
group('speeds','speed',(v)=>{speed=Number(v);});
$('reduce').addEventListener('change',(e)=>{reduced=e.target.checked;if(phase==='transition'&&reduced){cancelAnimationFrame(frame);endTransition();}else reset();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    if(phase==='transition'){cancelAnimationFrame(frame);phase='hidden-transition';}
    else if(phase==='countdown'){cancelAnimationFrame(frame);frozenAt=performance.now();}
  }else if(phase==='hidden-transition'){endTransition();}
  else if(phase==='countdown'&&frozenAt){countdownStartedAt+=performance.now()-frozenAt;frozenAt=0;frame=requestAnimationFrame(tick);}
});
new ResizeObserver(()=>{
  if(phase==='transition'&&!target.getBoundingClientRect().width){cancelAnimationFrame(frame);endTransition();}
}).observe(phone);
reset();
window.ritmoMotion={start,reset,renderFrame:(p)=>{reset();source=positionFor(play);play.style.visibility='hidden';phase='paused-frame';if(p>=1){endTransition();cancelAnimationFrame(frame);phase='paused-frame';}else renderTransition(p);},getPhase:()=>phase};
