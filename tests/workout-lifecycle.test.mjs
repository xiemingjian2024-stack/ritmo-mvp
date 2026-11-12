import test from 'node:test';
import assert from 'node:assert/strict';
import { retainInterruptedSession, suspendWorkoutForHome } from '../src/workoutLifecycle.ts';

const run = (patch = {}) => ({ id:'run-1', stage:'active', phase:'strength', paused:false, restRemaining:90, activeRemainingSeconds:30, rep:4, setNumber:2, completedSets:{0:[{completed:true,weight:20,recordedReps:10}]}, nextSetAdjustment:{targetReps:12,weight:22}, ...patch });

test('rest freezes the remaining clock and repeated lifecycle events are idempotent', () => {
  const result = suspendWorkoutForHome(run({stage:'rest',restDeadlineAt:12400}), 2000);
  assert.equal(result.restRemaining,11);
  assert.equal(result.restDeadlineAt,null);
  assert.equal(result.paused,true);
  assert.equal(result.parkedOnHome,true);
  assert.deepEqual(suspendWorkoutForHome(result,50000),result);
});
test('timed strength and side-switch clocks freeze without advancing an action', () => {
  assert.equal(suspendWorkoutForHome(run({activeDeadlineAt:19000}),3000).activeRemainingSeconds,16);
  const side = suspendWorkoutForHome(run({stage:'phase-switch',phase:'cooldown',phaseSegmentIndex:1,phaseRemaining:5,phaseDeadlineAt:5500}),3000);
  assert.equal(side.phaseRemaining,3);
  assert.equal(side.phaseSegmentIndex,1);
  assert.equal(side.stage,'phase-switch');
  assert.equal(side.phaseDeadlineAt,null);
});
test('reps, completed sets and next-set edits are preserved without creating a Session', () => {
  const original=run(); const result=suspendWorkoutForHome(original,10000);
  assert.equal(result.rep,4);assert.equal(result.setNumber,2);
  assert.deepEqual(result.completedSets,original.completedSets);
  assert.deepEqual(result.nextSetAdjustment,original.nextSetAdjustment);
  assert.equal(result.id,original.id);assert.equal('sessions' in result,false);
  assert.equal(original.paused,false);
});
test('interrupted countdown returns to the same ready item, never an active action', () => {
  assert.equal(suspendWorkoutForHome(run({stage:'countdown'})).stage,'transition');
  assert.equal(suspendWorkoutForHome(run({stage:'countdown',phase:'warmup'})).stage,'phase-intro');
});
test('cold restoration ignores stale deadlines and preserves legacy snapshots', () => {
  const result=suspendWorkoutForHome(run({phase:undefined,stage:'rest',paused:true,restRemaining:45,restDeadlineAt:1000}),100000);
  assert.equal(result.restRemaining,45);assert.equal(result.stage,'rest');assert.equal(result.phase,undefined);
});

test('restart retains confirmed sets and associates phase records without rewriting previous sessions', () => {
  const old = {id:'old',status:'completed',exercises:[]};
  const partial = {id:'run-1',status:'partial',exercises:[{completedSets:[{completed:true,weight:22,recordedReps:8}]}]};
  const records = [{runId:'run-1'},{runId:'other'}];
  const result = retainInterruptedSession([old],records,partial);
  assert.deepEqual(result.sessions,[old,partial]);
  assert.deepEqual(result.phaseRecords,[{runId:'run-1',sessionId:'run-1'},{runId:'other'}]);
  assert.deepEqual(records,[{runId:'run-1'},{runId:'other'}]);
  assert.deepEqual(retainInterruptedSession(result.sessions,result.phaseRecords,partial),result);
});
test('restart during cooldown never downgrades a completed Session or makes an empty record', () => {
  const completed = {id:'run-1',status:'completed',exercises:[{completedSets:[{completed:true}]}]};
  const result=retainInterruptedSession([completed],[],{...completed,status:'partial'});
  assert.equal(result.sessions[0],completed);assert.equal(result.sessions.length,1);
  assert.deepEqual(retainInterruptedSession([],undefined,{id:'warmup-only',exercises:[]}),{sessions:[],phaseRecords:undefined});
});
