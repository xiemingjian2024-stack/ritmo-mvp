import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {TRAINING_RECENCY,recencyIndex} from '../src/recordsAnatomy.ts';

test('recency boundaries preserve original ranges, including old and never-trained records',()=>{
 for(const[days,index]of [[undefined,5],[0,0],[1,0],[2,0],[3,1],[4,1],[5,2],[7,2],[8,3],[14,3],[15,4],[365,4]])assert.equal(recencyIndex(days),index);
});
test('all five trained periods stay warm and progressively reduce color emphasis',()=>{
 for(let i=0;i<5;i++){const tone=TRAINING_RECENCY[i];const[r,g,b]=[1,3,5].map(n=>parseInt(tone.color.slice(n,n+2),16));assert.ok(r>=g&&g>b);if(i)assert.ok(tone.stops[0]<TRAINING_RECENCY[i-1].stops[0]);}
 assert.ok(parseInt(TRAINING_RECENCY[0].color.slice(3,5),16)>0x65,'recent red is brighter than the old coral');
});
test('both shipped anatomical assets preserve stable regions and load highlight images locally',()=>{
 for(const[side,count]of [['front',28],['back',30]]){const svg=readFileSync(new URL('../public/assets/muscle/translucent-v2/'+side+'.svg',import.meta.url),'utf8');const regions=s=>[...s.matchAll(/<path\b[^>]*data-group="[^"]+"[^>]*>/g)].map(m=>['d','data-group','data-part-id'].map(k=>m[0].match(new RegExp('(?:^|\\s)'+k+'="([^"]*)"'))?.[1]));assert.equal(regions(svg).length,count);assert.equal(createHash("sha256").update(JSON.stringify(regions(svg))).digest("hex"),({"front": "0f303f60fcca2ad49186a1214b9cd3cc7e55312b4c9d1ae395a6dadff0933f59", "back": "5d35c508bd5e3454f2391c2a30755c45210fca94c1686f598052f7c657a8b5b8"})[side]);assert.ok(svg.includes('white-highlight-alpha'));assert.ok(!svg.includes('/reports/'));assert.ok(svg.indexOf('id="anatomy-regions-1"')<svg.indexOf('id="anatomy-texture"'));assert.ok(existsSync(new URL('../public/assets/muscle/translucent-v2/'+side+'.webp',import.meta.url)));}
});
