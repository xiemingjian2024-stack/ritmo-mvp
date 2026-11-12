import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PropsWithChildren, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PlayIcon } from '@radix-ui/react-icons';
import { BottomSheet, useScreenPortal } from '../mobile';
import { ExerciseMediaView } from '../ExerciseMediaView';
import type { PhaseSegment } from '../phaseExerciseCatalog';
import { REP_INTERVAL_MS } from './pacing';
import {useActiveCountdownHandoff} from './CountdownHandoff';

type Rect={left:number;top:number;width:number;height:number};
type ActiveHandle={button:HTMLButtonElement;glyph:HTMLSpanElement;feedback:HTMLElement;media:HTMLElement;paused:boolean;identity:string;progress:number;display:string|number;timed:boolean;freeze:()=>number};
type MotionPhase='idle'|'opening'|'closing';
type Bridge={active:React.MutableRefObject<ActiveHandle|null>;phase:MotionPhase;opened:boolean;target:React.MutableRefObject<HTMLButtonElement|null>;register:(handle:ActiveHandle|null)=>void;pause:(callback:()=>void)=>void;resume:(callback:()=>void)=>void;setOpened:(open:boolean)=>void;isLocked:()=>boolean};
const BridgeContext=createContext<Bridge|null>(null);
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>n*n*(3-2*n);
function useBridge(){const value=useContext(BridgeContext);if(!value)throw new Error('Ring view requires isolated bridge');return value;}

// This clock is presentation-only. It never increments a rep, changes a target,
// completes a set, saves a Session or advances NEXT. All those remain in the formal executor.
function useReadOnlyProgress(display:string|number,target:string,paused:boolean,identity:string,repIntervalMs:number){
 const timed=typeof display==='string'&&display.includes(':');
 const parts=String(display).split(':').map(Number);
 const value=timed?(parts[0]*60+parts[1]):Number(display);
 const goal=Number(target.match(/(\d+)\s*(?:次|秒)/)?.[1]||target.match(/\d+/)?.[0]||1);
 const [progress,setProgress]=useState(timed?value/goal:(value-1)/goal);
 const state=useRef({identity,value,goal,timed,fraction:0,base:0,started:0,paused,frame:0});
 const sample=(now=performance.now())=>{const s=state.current;if(!s.paused&&s.started)s.fraction=clamp(s.base+(1-s.base)*(now-s.started)/(s.timed?1000:repIntervalMs));return clamp(s.timed?(s.value-s.fraction)/s.goal:(s.value-1+s.fraction)/s.goal);};
 const freeze=()=>{const p=sample();state.current.paused=true;state.current.base=state.current.fraction;state.current.started=0;cancelAnimationFrame(state.current.frame);setProgress(p);return p;};
 useLayoutEffect(()=>{
  const s=state.current;cancelAnimationFrame(s.frame);
  if(s.identity!==identity||s.value!==value||s.goal!==goal||s.timed!==timed){s.fraction=0;s.base=0;s.identity=identity;s.value=value;s.goal=goal;s.timed=timed;}
  if(paused){s.paused=true;s.started=0;s.base=s.fraction;setProgress(sample());return;}
  // Formal resume restarts the current repetition/1s interval. Map the remaining visual
  // arc over that unchanged interval rather than driving a different timer.
  s.paused=false;s.started=performance.now();s.base=s.fraction;
  const tick=()=>{setProgress(sample());s.frame=requestAnimationFrame(tick);};tick();return()=>cancelAnimationFrame(s.frame);
 },[display,target,paused,identity,repIntervalMs]);
 useEffect(()=>()=>cancelAnimationFrame(state.current.frame),[]);
 return {progress,freeze,timed};
}

export function RingMotionProvider({children}:PropsWithChildren){
 const {screenRef}=useScreenPortal();const active=useRef<ActiveHandle|null>(null),target=useRef<HTMLButtonElement|null>(null);
 const [phase,setPhase]=useState<MotionPhase>('idle'),[opened,setOpened]=useState(false),[proxy,setProxy]=useState<CSSProperties>({}),[p,setP]=useState(0),[ready,setReady]=useState(false);
 const lastAction=useRef(-Infinity);const lock=useRef(false),pending=useRef<{direction:'opening'|'closing';from:DOMRect;identity:string;progress:number;display:string|number;timed:boolean;onResume?:()=>void}|null>(null);
 const frame=useRef(0),cleanupMask=useRef(()=>{});
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const slow=false;
 const register=(handle:ActiveHandle|null)=>{active.current=handle;if(!handle){cancel();setOpened(false);}};
 const cancel=()=>{cancelAnimationFrame(frame.current);lock.current=false;pending.current=null;setPhase('idle');setReady(false);cleanupMask.current();};
 const pause=(callback:()=>void)=>{if(lock.current||(reduced&&performance.now()-lastAction.current<450))return;lastAction.current=performance.now();const source=active.current;if(!source){callback();return;}const frozen=source.freeze();lock.current=true;pending.current={direction:'opening',from:source.button.getBoundingClientRect(),identity:source.identity,progress:frozen,display:source.display,timed:source.timed};setReady(false);setP(0);setPhase('opening');callback();};
 const resume=(callback:()=>void)=>{if(lock.current||(reduced&&performance.now()-lastAction.current<450))return;lastAction.current=performance.now();if(!active.current||!target.current){callback();return;}lock.current=true;pending.current={direction:'closing',from:target.current.getBoundingClientRect(),identity:active.current.identity,progress:active.current.progress,display:active.current.display,timed:active.current.timed,onResume:callback};setReady(false);setP(1);setPhase('closing');};
 useEffect(()=>{const screen=screenRef.current;if(!screen)return;screen.classList.add('ring-training-screen');const mq=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(mq.matches);mq.addEventListener('change',change);const hide=()=>{if(document.visibilityState==='hidden')cancel();};document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',cancel);return()=>{screen.classList.remove('ring-training-screen');mq.removeEventListener('change',change);document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',cancel);cancelAnimationFrame(frame.current);cleanupMask.current();};},[]);
 useLayoutEffect(()=>{
  if(!opened){cleanupMask.current();if(phase==='opening')cancel();return;}
  const screen=screenRef.current;const a=active.current;
  const sheet=screen?.querySelector<HTMLElement>('.bottom-sheet:has(.ring-controls)');const overlay=screen?.querySelector<HTMLElement>('.sheet-overlay');
  if(!a||!sheet||!screen)return;
  const position=()=>{
   const bounds=screen.getBoundingClientRect(),scale=bounds.width/screen.offsetWidth,ring=a.button.getBoundingClientRect();
   sheet.style.setProperty('--ring-control-size',ring.width/scale+'px');
   sheet.style.setProperty('--ring-control-max-height',Math.max(300,bounds.height/scale-24)+'px');
   sheet.style.setProperty('--ring-sheet-shift',(sheet.offsetHeight+36)+'px');

  };
  position();const ro=new ResizeObserver(position);ro.observe(a.feedback);ro.observe(a.media);ro.observe(sheet);window.addEventListener('resize',position);
  cleanupMask.current=()=>{if(overlay)overlay.style.removeProperty('clip-path');sheet.style.removeProperty('top');sheet.style.removeProperty('left');sheet.style.removeProperty('width');sheet.style.removeProperty('right');sheet.style.removeProperty('bottom');sheet.style.removeProperty('--ring-control-max-height');sheet.style.removeProperty('--ring-control-size');sheet.style.removeProperty('--ring-sheet-shift');};
  return()=>{ro.disconnect();window.removeEventListener('resize',position);cleanupMask.current();};
 },[opened]);
 useLayoutEffect(()=>{
  if(phase==='idle')return;let attempts=0,start=0,ended=false,destination:Rect|null=null;
  const current=pending.current;if(!current)return;
  const finish=(resumeAllowed:boolean)=>{if(ended)return;ended=true;cancelAnimationFrame(frame.current);setPhase('idle');setReady(false);lock.current=false;pending.current=null;if(current.direction==='opening'&&!document.hidden)requestAnimationFrame(()=>target.current?.focus({preventScroll:true}));if(current.direction==='closing'&&resumeAllowed&&!document.hidden&&active.current?.identity===current.identity){current.onResume?.();}};
  const tick=(now:number)=>{
   try{
    const screen=screenRef.current,a=active.current,to=current.direction==='opening'?target.current:a?.button;
    if(document.hidden||!a||a.identity!==current.identity){finish(false);return;}
    if(!screen||!to||to.getBoundingClientRect().width<1){if(++attempts<12){frame.current=requestAnimationFrame(tick);return;}finish(current.direction==='closing');return;}
    const rect=to.getBoundingClientRect(),bounds=screen.getBoundingClientRect(),scale=bounds.width/screen.offsetWidth;
    const sheet=to.closest<HTMLElement>('.bottom-sheet');
    const translation=sheet?new DOMMatrixReadOnly(getComputedStyle(sheet).transform).m42*scale:0;
    const goal={left:rect.left,top:rect.top-translation,width:rect.width,height:rect.height};
    if(!start){start=now;destination=goal;setReady(true);}
    if(destination&&(Math.abs(goal.left-destination.left)>3||Math.abs(goal.top-destination.top)>3||Math.abs(goal.width-destination.width)>3)){finish(false);return;}
    if(reduced){finish(true);return;}
    const progress=clamp((now-start)/((current.direction==='opening'?360:340)*(slow?2:1))),e=ease(progress);
    const lerp=(x:number,y:number)=>x+(y-x)*e;const from=current.from;
    const morph=current.direction==='opening'?e:1-e;
    setProxy({left:(lerp(from.left,goal.left)-bounds.left)/scale,top:(lerp(from.top,goal.top)-bounds.top)/scale,width:lerp(from.width,goal.width)/scale,height:lerp(from.height,goal.height)/scale} as CSSProperties);
    setP(morph);
    if(progress>=1)finish(true);else frame.current=requestAnimationFrame(tick);
   }catch{finish(current.direction==='closing'&&!document.hidden);}
  };frame.current=requestAnimationFrame(tick);return()=>{ended=true;cancelAnimationFrame(frame.current);};
 },[phase,reduced]);
 useLayoutEffect(()=>{const screen=screenRef.current;if(!screen)return;screen.dataset.ringMotion=phase;screen.dataset.ringControl=String(opened);screen.dataset.ringReduced=String(reduced);screen.style.setProperty('--ring-motion-progress',String(phase==='idle'?(opened?1:0):p));return()=>{screen.style.removeProperty('--ring-motion-progress');};},[p,opened,phase,reduced]);
 const bridge:Bridge={active,target,phase,opened,register,pause,resume,setOpened,isLocked:()=>lock.current};
 const snapshot=pending.current;
 const arc=(snapshot?.progress||0)+(1-(snapshot?.progress||0))*clamp(p/.55);
 return <BridgeContext.Provider value={bridge}>{children}{phase!=='idle'&&ready&&snapshot&&screenRef.current?createPortal(<div className="ring-shared-element" data-timed={snapshot.timed} style={{...proxy,'--icon-morph':p} as CSSProperties} aria-hidden="true"><svg className="ring-progress-svg" viewBox="0 0 240 240"><circle className="ring-track" cx="120" cy="120" r="113.5" style={{opacity:1-p}}/><circle className="ring-fill" cx="120" cy="120" r={113.5-53.5*p} pathLength="100" style={{strokeWidth:13+107*p,strokeDashoffset:100-arc*100}}/></svg><span className="ring-number">{snapshot.display}</span><span className="ring-shared-action" style={{opacity:1-clamp(p/.45),color:"white"}}>暂停</span><span className="ring-shared-action" style={{opacity:clamp((p-.55)/.45),color:"var(--ring-resume-ink)"}}>继续</span></div>,screenRef.current):null}</BridgeContext.Provider>;
}

type ActiveProps={name:string;setNumber:number;totalSets:number;mediaId:string;mediaSegment?:PhaseSegment;display:string|number;target:string;load:string;cue:string;paused:boolean;repIntervalMs?:number;mediaPaused?:boolean;onPause:()=>void};
export function ActiveSetView({name,setNumber,totalSets,mediaId,mediaSegment='whole',display,target,load,cue,paused,repIntervalMs=REP_INTERVAL_MS,mediaPaused,onPause}:ActiveProps){
 const bridge=useBridge(),button=useRef<HTMLButtonElement>(null),glyph=useRef<HTMLSpanElement>(null),feedback=useRef<HTMLElement>(null),main=useRef<HTMLElement>(null);
 const identity=`${mediaId}:${mediaSegment}:${setNumber}:${totalSets}`;
 useActiveCountdownHandoff(main,button,identity);
 const {progress,freeze,timed}=useReadOnlyProgress(display,target,paused,identity,repIntervalMs);
 const rendered=timed?`${Number(String(display).split(':')[0])}:${String(display).split(':')[1]}`:display;
 useLayoutEffect(()=>{const media=main.current?.querySelector<HTMLElement>('.exercise-media');if(button.current&&glyph.current&&feedback.current&&media)bridge.register({button:button.current,glyph:glyph.current,feedback:feedback.current,media,paused,identity,progress,display:rendered,timed,freeze});});
 useEffect(()=>()=>bridge.register(null),[]);
 const hidden=bridge.opened||bridge.phase!=='idle';
 return <main ref={main} className="active-content ring-active-content"><header className="immersive-header"><div className="immersive-title"><h1>{name}</h1><p>第 {setNumber} / {totalSets} 组</p></div></header><ExerciseMediaView key={`${mediaId}:${mediaSegment}`} exerciseId={mediaId} exerciseName={name} variant="active" segment={mediaSegment} paused={mediaPaused??paused}/><section ref={feedback} className="ring-feedback-panel"><button ref={button} className="ring-progress ring-pause-trigger" data-timed={timed} data-progress={progress.toFixed(6)} aria-label={paused?'继续训练':'暂停训练'} style={{visibility:hidden?'hidden':undefined}} onClick={()=>paused?bridge.resume(onPause):bridge.pause(onPause)}><svg className="ring-progress-svg" viewBox="0 0 240 240" aria-hidden="true"><circle className="ring-track" cx="120" cy="120" r="113.5"/><circle className="ring-fill" cx="120" cy="120" r="113.5" pathLength="100" style={{strokeDashoffset:100-progress*100,opacity:progress>0?1:0}}/></svg><output className="ring-number">{rendered}</output><span ref={glyph} className="ring-action-label">{paused?"继续":"暂停"}</span></button><div className="target-summary"><span>{target}</span>{load ? <><span>·</span><span>{load}</span></> : null}</div><p className="motion-cue">{cue}</p></section></main>;
}

type ControlProps={open:boolean;onOpenChange:(open:boolean)=>void;onResume:()=>void;endLabel:string;onEnd:()=>void;actions?:ReactNode;endKind?:'phase'|'workout'};
export function TrainingControlSheet({open,onOpenChange,onResume,endLabel,onEnd,actions,endKind='workout'}:ControlProps){
 const bridge=useBridge();const hasRing=Boolean(bridge.active.current);
 useLayoutEffect(()=>{bridge.setOpened(open&&hasRing);},[open,hasRing]);
 // Rest has no action media/ring. Preserve its original control sheet and callbacks.
 if(!hasRing)return <BottomSheet open={open} onOpenChange={onOpenChange} title="训练控制" snap={.46}><div className="training-control-actions"><button className="control-resume" onClick={onResume}><PlayIcon/><span>继续训练</span></button>{actions}<button className={endKind==='phase'?'control-phase-skip':'control-workout-end'} onClick={onEnd}>{endLabel}</button></div></BottomSheet>;
 return <BottomSheet open={open} onOpenChange={value=>{if(!bridge.isLocked())onOpenChange(value);}} title="训练控制" snap={.46}><div className="training-control-actions ring-controls"><button ref={bridge.target} className="control-resume" onClick={()=>bridge.resume(onResume)} style={{visibility:bridge.phase!=='idle'?'hidden':undefined}} data-timed={bridge.active.current?.timed} aria-label="继续训练"><span className="ring-number">{bridge.active.current?.display}</span><span className="ring-action-label">继续</span></button><div className="ring-secondary-actions">{actions}</div><button className={endKind==='phase'?'control-phase-skip':'control-workout-end'} onClick={onEnd}>{endLabel}</button></div></BottomSheet>;
}
