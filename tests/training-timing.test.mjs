import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_TRAINING_TIMING,normalizeTrainingTiming} from '../src/trainingTiming.ts';
test('old data and malformed values retain established defaults',()=>{
 for(const value of [undefined,null,[],false,'4',{}, {repSeconds:NaN,setRestSeconds:Infinity}, {repSeconds:'2',setRestSeconds:'15'}])assert.deepEqual(normalizeTrainingTiming(value),{repSeconds:4,setRestSeconds:90});
});
test('settings clamp finite outliers and preserve supported half-second and rest steps',()=>{
 assert.deepEqual(normalizeTrainingTiming({repSeconds:-5,setRestSeconds:-1}),{repSeconds:2,setRestSeconds:15});
 assert.deepEqual(normalizeTrainingTiming({repSeconds:999,setRestSeconds:999}),{repSeconds:8,setRestSeconds:300});
 assert.deepEqual(normalizeTrainingTiming({repSeconds:4.5,setRestSeconds:105}),{repSeconds:4.5,setRestSeconds:105});
 assert.deepEqual(normalizeTrainingTiming({repSeconds:4.3,setRestSeconds:98}),{repSeconds:4.5,setRestSeconds:105});
 assert.deepEqual(DEFAULT_TRAINING_TIMING,{repSeconds:4,setRestSeconds:90});
});
