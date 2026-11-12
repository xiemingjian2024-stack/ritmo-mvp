import test from 'node:test';
import assert from 'node:assert/strict';
import {withDefaultWeight,isPhaseSetBoundary,hasEquipment,defaultEquipment,PHASE_SET_REST_SECONDS} from '../src/trainingPreferences.ts';
import {suspendWorkoutForHome,retainInterruptedSession} from '../src/workoutLifecycle.ts';
test('missing load defaults only on editable weighted copies; bodyweight and specified load stay intact',()=>{
 const source={id:'weighted',equipment:'哑铃＋平凳',weight:0};
 assert.equal(withDefaultWeight(source).weight,2.5);assert.equal(source.weight,0);
 assert.equal(withDefaultWeight({...source,weight:10}).weight,10);
 assert.equal(withDefaultWeight({...source,equipment:'徒手'}).weight,0);
 assert.equal(withDefaultWeight({...source,equipment:'body weight'}).weight,0);
});
test('30-second phase rest starts between sets, not between sides or after final set',()=>{
 assert.equal(PHASE_SET_REST_SECONDS,30);
 assert.equal(isPhaseSetBoundary(0,1,2),true);
 assert.equal(isPhaseSetBoundary(0,2,4),false);
 assert.equal(isPhaseSetBoundary(1,2,4),true);
 assert.equal(isPhaseSetBoundary(3,2,4),false);
});
test('phase rest freezes idempotently and retains the next side/group after backgrounding',()=>{
 const run={id:'r',stage:'phase-rest',phase:'cooldown',paused:false,restRemaining:90,phaseRemaining:30,phaseDeadlineAt:40000,phaseSegmentIndex:2};
 const suspended=suspendWorkoutForHome(run,15000);
 assert.equal(suspended.phaseRemaining,25);assert.equal(suspended.phaseSegmentIndex,2);
 assert.deepEqual(suspendWorkoutForHome(suspended,50000),suspended);
});
test('equipment requirements retain accessories and bodyweight independence',()=>{
 assert.equal(hasEquipment('哑铃＋平凳','press',['dumbbell']),false);
 assert.equal(hasEquipment('哑铃＋平凳','press',['dumbbell','bench']),true);
 assert.equal(hasEquipment('徒手','pushup',[]),true);
 assert.equal(hasEquipment('徒手','ritmo:video:seated-knee-tuck',[]),false);
 assert.equal(hasEquipment('哑铃＋固定支撑','one-arm-row:left',['dumbbell']),false);
 assert.equal(hasEquipment('Smith 架','smith',defaultEquipment('健身房')),true);
 assert.deepEqual(defaultEquipment('自定义'),[]);
});
test('archiving an interrupted cooldown never rewrites a saved Session or NEXT',()=>{
 const old={id:'same',status:'completed',exercises:[{completedSets:[{completed:true,weight:10}]}]};
 const result=retainInterruptedSession([old],[],{...old,status:'partial'});
 assert.equal(result.sessions[0],old);assert.equal('cycleIndexByEnvironment' in result,false);
});
