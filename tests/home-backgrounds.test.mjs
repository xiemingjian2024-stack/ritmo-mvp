import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {homeBackgroundForGroup} from '../src/homeBackgrounds.ts';
import {resolvePrimaryGroup} from '../src/phaseExerciseCatalog.ts';
const approvedHashes={"chest": "e848cc9da9bd9a9617eca983978de864b7906ea27fe1b570dd58675af5833808", "back": "309f59a26f72b08673d1a27f8b197319a0cea36d227ce0bd2a2a00d84e52be20", "shoulders": "d88bd6a2dc696471d188fef9656f7f0c18ee2a1fb795fcafceee11f9a31451e0", "arms": "005fa4fbe89573b3857225a1457ee0a5c6eef4dcc517fa75cd64efdec1fd4cbb", "legs": "716451051abcd4ef9c654274c6eb264a2a300c39e9285ef6bdfa7c6e8fed3556", "core": "ebf655337dbd1e91058233d528dc809742755f1e08e76afbe816e7c3cf129bbc"};

test('six actual primary muscle groups resolve to complete approved files',()=>{
 for(const [muscle,key] of Object.entries({'胸':'chest','背':'back','肩':'shoulders','手臂':'arms','腿':'legs','核心':'core'})){
  const background=homeBackgroundForGroup(resolvePrimaryGroup([{muscle}]));
  assert.equal(background.key,key);
  assert.ok(existsSync(new URL('../public'+background.imagePath,import.meta.url)));
  const actual=readFileSync(new URL('../public'+background.imagePath,import.meta.url));
  assert.equal(createHash('sha256').update(actual).digest('hex'),approvedHashes[key]);
 }
});
test('mixed programs share phase contribution/tie rules independent of order and training parameters',()=>{
 const exercises=[{muscle:'背',sets:1,reps:5,weight:1},{muscle:'胸',sets:9,reps:99,weight:99}];
 assert.equal(homeBackgroundForGroup(resolvePrimaryGroup(exercises)).key,'chest');
 assert.equal(homeBackgroundForGroup(resolvePrimaryGroup(exercises.toReversed())).key,'chest');
 assert.equal(homeBackgroundForGroup(resolvePrimaryGroup([...exercises,{primaryMuscleIds:['LATS']}])).key,'back');
});
test('no plan or reliable group preserves old default and core uses reviewed framing only',()=>{
 const fallback=homeBackgroundForGroup(resolvePrimaryGroup([{muscle:'未知'}]));
 assert.equal(fallback.imagePath,'/assets/home/immersive-athlete.jpg');
 assert.equal(fallback.size,'auto 805px');
 assert.deepEqual(homeBackgroundForGroup('核心'),{key:'core',imagePath:'/assets/home/muscle-v2/core.webp',size:'auto 1030.4px',position:'right -95px'});
});
