import {createContext,useContext,useEffect,useLayoutEffect,useRef,useState,type CSSProperties,type PropsWithChildren,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import {useScreenPortal} from '../mobile';
import {BaselineCountdownView} from './CountdownMarkup';

type Box={left:number;top:number;width:number;height:number};
type Copy={text:string;box:Box;size:number;color:string};
type Source={box:Box;number:string;font:number;spacing:number;progress:number;at:number;copy:Copy[]};
type Target={root:HTMLElement;button:HTMLButtonElement;identity:string};
type Frame={box:Box;progress:number;arc:number;radius:number;font:number;spacing:number;source:Source;value:string;timed:boolean;targetFont:number;copy:Array<Copy&{box:Box}>};
type Bridge={arm:(source:Source|null)=>void;attach:(target:Target)=>void;detach:(target:Target)=>void};
const Context=createContext<Bridge|null>(null);
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(x:number)=>x*x*(3-2*x);
const readBox=(node:Element):Box=>{const r=node.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};};

// Presentation-only. Never calls a training setter or delays its countdown/active handoff.
export function CountdownHandoffProvider({children}:PropsWithChildren){
 const {screenRef}=useScreenPortal();const source=useRef<Source|null>(null),target=useRef<Target|null>(null);
 const running=useRef<Target|null>(null),frame=useRef(0),expiry=useRef(0),watchdog=useRef(0);
 const [visual,setVisual]=useState<Frame|null>(null),[,setObservation]=useState<Record<string,unknown>>({status:'idle'});
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const duration=420;
 const restore=()=>{const a=running.current;if(a){a.root.classList.remove('countdown-entry-active');a.root.style.removeProperty('--countdown-entry-progress');}running.current=null;};
 const stop=(status:string)=>{cancelAnimationFrame(frame.current);cancelAnimationFrame(expiry.current);clearTimeout(watchdog.current);restore();source.current=null;setVisual(null);setObservation(old=>({...old,status,finishedAt:performance.now()}));};
 const start=()=>{
  const s=source.current,a=target.current,screen=screenRef.current;
  if(!s||!a||!screen||running.current)return;
  cancelAnimationFrame(expiry.current);source.current=null;
  if(document.hidden||!a.root.isConnected||performance.now()-s.at>600){setObservation({status:'skipped-stale'});return;}
  const initial=readBox(a.button);
  if(initial.width<1||s.box.width<1){setObservation({status:'skipped-layout'});return;}
  if(reduced()){setObservation({status:'skipped-reduced',from:s.box,to:initial});return;}
  const started=performance.now();running.current=a;
  a.root.classList.add('countdown-entry-active');a.root.style.setProperty('--countdown-entry-progress','0');
  setObservation({status:'running',startedAt:started,from:s.box,to:initial,duration});
  const tick=(now:number)=>{
   try{
    if(document.hidden||running.current!==a||!a.root.isConnected||!screen.isConnected){stop('cancelled');return;}
    const goal=readBox(a.button);
    if(Math.abs(goal.left-initial.left)>3||Math.abs(goal.top-initial.top)>3||Math.abs(goal.width-initial.width)>3){stop('cancelled-layout');return;}
    const t=clamp((now-started)/duration),p=ease(t),bounds=screen.getBoundingClientRect(),scale=bounds.width/screen.offsetWidth;
    const lerp=(x:number,y:number)=>x+(y-x)*p;
    const number=a.button.querySelector<HTMLElement>('.ring-number');
    if(!number){stop('skipped-number');return;}
    const targetFont=parseFloat(getComputedStyle(number).fontSize),targetSpacing=parseFloat(getComputedStyle(number).letterSpacing)||0;
    const progress=Number(a.button.dataset.progress)||0;
    const value=number.textContent||'',timed=a.button.dataset.timed==='true';
    const box={left:(lerp(s.box.left,goal.left)-bounds.left)/scale,top:(lerp(s.box.top,goal.top)-bounds.top)/scale,width:lerp(s.box.width,goal.width)/scale,height:lerp(s.box.height,goal.height)/scale};
    setVisual({box,progress:p,arc:lerp(s.progress,progress),radius:lerp(108,113.5),font:lerp(s.font,targetFont),spacing:lerp(s.spacing,targetSpacing),source:s,value,timed,targetFont,copy:s.copy.map(c=>({...c,box:{left:(c.box.left-bounds.left)/scale,top:(c.box.top-bounds.top)/scale,width:c.box.width/scale,height:c.box.height/scale}}))});
    a.root.style.setProperty('--countdown-entry-progress',String(p));
    if(t>=1){stop('complete');return;}
    frame.current=requestAnimationFrame(tick);
   }catch{stop('fallback-error');}
  };
  // First measured frame is prepared before paint, then a single progress drives the handoff.
  tick(started);if(running.current)watchdog.current=window.setTimeout(()=>stop('fallback-timeout'),duration+250);
 };
 // Defer within the same pre-paint turn so React StrictMode can finish its
 // attach/detach/attach validation before a real visual handoff is consumed.
 const arm=(s:Source|null)=>{source.current=s;if(!s)return;queueMicrotask(start);let attempts=0;const expire=()=>{if(!source.current)return;if(target.current){start();return;}if(++attempts>=4){source.current=null;setObservation({status:'skipped-no-active-target'});}else expiry.current=requestAnimationFrame(expire);};expiry.current=requestAnimationFrame(expire);};
 const attach=(a:Target)=>{target.current=a;queueMicrotask(start);};
 const detach=(a:Target)=>{if(target.current===a)target.current=null;if(running.current===a)stop('cancelled-unmount');};
 useEffect(()=>{const hide=()=>{if(document.hidden)stop('cancelled-background');};document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',hide);return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',hide);cancelAnimationFrame(frame.current);cancelAnimationFrame(expiry.current);clearTimeout(watchdog.current);restore();source.current=null;};},[]);
 return <Context.Provider value={{arm,attach,detach}}>{children}{visual&&screenRef.current?createPortal(<div className="countdown-entry-layer" aria-hidden="true">{visual.copy.map((c,i)=><span key={i} className="countdown-entry-copy" style={{left:c.box.left,top:c.box.top,width:c.box.width,height:c.box.height,fontSize:c.size,color:c.color,opacity:1-clamp(visual.progress/.4)}}>{c.text}</span>)}<div className="countdown-entry-proxy" style={{left:visual.box.left,top:visual.box.top,width:visual.box.width,height:visual.box.height} as CSSProperties}><svg viewBox="0 0 240 240"><circle className="ring-track" cx="120" cy="120" r={visual.radius}/><circle className="ring-fill" cx="120" cy="120" r={visual.radius} pathLength="100" style={{strokeDashoffset:100-visual.arc*100,opacity:visual.arc>0?1:0}}/></svg>{visual.source.number===visual.value?<span className="countdown-entry-number" style={{fontSize:visual.font,letterSpacing:visual.spacing}}>{visual.value}</span>:<><span className="countdown-entry-number" style={{fontSize:visual.font,letterSpacing:visual.spacing,opacity:1-clamp(visual.progress/.45)}}>{visual.source.number}</span><span className="countdown-entry-number" style={{fontSize:visual.box.width*(visual.timed ? .23 : .32),letterSpacing:-2,opacity:clamp((visual.progress-.45)/.55)}}>{visual.value}</span></>}<span className="ring-action-label" style={{opacity:clamp((visual.progress-.6)/.4)}}>暂停</span></div></div>,screenRef.current):null}</Context.Provider>;
}

export function CountdownView({count,name}:{count:number;name?:string}){
 const bridge=useContext(Context),root=useRef<HTMLDivElement>(null),currentCount=useRef(count),last=useRef<Source|null>(null);
 currentCount.current=count;
 useLayoutEffect(()=>{let frame=0;const capture=()=>{const ring=root.current?.querySelector<HTMLElement>('.countdown-ring'),number=ring?.querySelector('strong'),fill=ring?.querySelector('.countdown-ring-fill');if(ring&&number&&fill&&ring.isConnected){last.current={box:readBox(ring),number:String(currentCount.current),font:parseFloat(getComputedStyle(number).fontSize),spacing:parseFloat(getComputedStyle(number).letterSpacing)||0,progress:clamp(1-(parseFloat(getComputedStyle(fill).strokeDashoffset)||0)/100),at:performance.now(),copy:Array.from(root.current!.querySelectorAll<HTMLElement>('.countdown-screen>span,.countdown-screen>small')).map(node=>({text:node.textContent||'',box:readBox(node),size:parseFloat(getComputedStyle(node).fontSize),color:getComputedStyle(node).color}))};}frame=requestAnimationFrame(capture);};capture();return()=>{cancelAnimationFrame(frame);const s=last.current;bridge?.arm(!document.hidden&&currentCount.current===1&&s?s:null);};},[]);
 return <div ref={root} className="countdown-source-wrapper"><BaselineCountdownView count={count} name={name}/></div>;
}

export function useActiveCountdownHandoff(main:RefObject<HTMLElement|null>,button:RefObject<HTMLButtonElement|null>,identity:string){
 const bridge=useContext(Context);
 useLayoutEffect(()=>{if(!bridge||!main.current||!button.current)return;const a={root:main.current,button:button.current,identity};bridge.attach(a);return()=>bridge.detach(a);},[identity]);
}
