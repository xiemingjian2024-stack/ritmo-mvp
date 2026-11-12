import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const data=JSON.parse(fs.readFileSync('src/data/personalTrainingLibrary.json'));
const audit=JSON.parse(fs.readFileSync('reports/ritmo-video-library-integration-2026-10-30/template-source-and-defaults.json'));
const allAssets=m=>m.segments?Object.values(m.segments).flatMap(allAssets):[m.animation||m.staticImage];
test('all selected media have actual local files and no reference-only/report/remote paths',()=>{
 for(const [id,m] of Object.entries(data.media)) for(const u of allAssets(m)) {assert.ok(u.startsWith('/media/'),id);assert.ok(fs.statSync('public'+u).size>1000,u);}
 assert.ok(!data.media.smith);assert.ok(!data.media.row);
});
test('six home templates preserve49 source positions and explicit phase doses',()=>{
 assert.equal(data.homePlans.length,6);assert.equal(audit.length,49);
 for(const p of data.homePlans){assert.equal(p.environment,'家里');assert.ok(p.phaseItems.warmup.length);assert.ok(p.phaseItems.cooldown.length);assert.ok(p.requirements);
 assert.equal(new Set(p.exercises.map(x=>x.id)).size,p.exercises.length);
 for(const x of p.exercises){assert.ok(data.media[x.id]);assert.ok(x.reviewNotes);assert.equal(x.weight,0);assert.ok(x.sourceVideo);}
 for(const x of [...p.phaseItems.warmup,...p.phaseItems.cooldown]){assert.ok(data.media[x.id]);assert.equal(x.segments.length,x.sets*x.segmentsPerSet);}
 }
 assert.equal(data.homePlans.find(p=>p.id.endsWith(':legs')).exercises.filter(x=>x.id==='hasan:1760').length,1);
});
test('unilateral strength keeps distinct identities and media; timed sideplank stays seconds',()=>{
 for(const id of ['one-arm-row','ritmo:video:rack-supported-kickback','ritmo:video:rear-foot-elevated-db-split-squat','ritmo:alternative:forearm-side-plank-hold']){
 const l=data.specs.find(x=>x.id===id+':left'),r=data.specs.find(x=>x.id===id+':right');assert.ok(l&&r);assert.equal(l.sourceActionId,id);assert.notEqual(allAssets(data.media[l.id])[0],allAssets(data.media[r.id])[0]);
 }
 const x=data.specs.find(x=>x.id==='ritmo:alternative:forearm-side-plank-hold:left');assert.equal(x.measurementType,'duration');assert.equal(x.targetDurationSeconds,20);assert.equal(x.reps,0);
});
test('copied approved assets retain source hashes',()=>{
 const rows=JSON.parse(fs.readFileSync('reports/ritmo-video-library-integration-2026-10-30/asset-copy-manifest.json'));
 for(const r of rows)assert.equal(crypto.createHash('sha256').update(fs.readFileSync('public'+r.public)).digest('hex'),r.sha256);
});
