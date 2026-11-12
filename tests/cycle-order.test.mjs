import test from 'node:test';
import assert from 'node:assert/strict';
import {cycleOrder,reorderCycle} from '../src/cycleOrder.ts';

test('existing saved cursor puts NEXT first without mutating the queue',()=>{
 const ids=['chest','back','legs'];
 assert.deepEqual(cycleOrder(ids,1),['back','legs','chest']);
 assert.deepEqual(ids,['chest','back','legs']);
});
test('normal cursor advancement rotates displayed order, including wraparound',()=>{
 const ids=['chest','back','legs'];
 assert.deepEqual([0,1,2,0].map(i=>cycleOrder(ids,i)[0]),['chest','back','legs','chest']);
});
test('moving a later visible row first explicitly changes NEXT',()=>{
 const result=reorderCycle(['chest','back','legs'],1,'chest',0);
 assert.deepEqual(result,{ids:['chest','back','legs'],nextIndex:0});
 assert.deepEqual(cycleOrder(result.ids,result.nextIndex),['chest','back','legs']);
});
test('moving the first row down selects the new first and keeps the other order',()=>{
 assert.deepEqual(reorderCycle(['chest','back','legs'],1,'back',2),{ids:['legs','chest','back'],nextIndex:0});
 assert.deepEqual(reorderCycle(['chest','back','legs'],0,'legs',1),{ids:['chest','legs','back'],nextIndex:0});
});
test('empty, one-item, cancelled/no-op and stale requests are safe',()=>{
 assert.deepEqual(cycleOrder([],4),[]);
 assert.deepEqual(cycleOrder(['one'],8),['one']);
 assert.equal(reorderCycle(['one'],0,'one',0),null);
 assert.equal(reorderCycle(['one'],0,'missing',0),null);
});
