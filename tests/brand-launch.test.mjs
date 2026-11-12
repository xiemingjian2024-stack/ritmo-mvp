import test from 'node:test';import assert from 'node:assert/strict';
import {canPlayBrandIntro} from '../src/brandLaunch.ts';
const normal={navigationType:'navigate',standalone:false,trainingHome:true,storageReadable:true,preview:false,sessionLink:false};
test('ordinary browser cold navigation remains eligible',()=>assert.equal(canPlayBrandIntro(normal),true));
test('new standalone documents support every timing classification',()=>{for(const navigationType of ['navigate','reload','back_forward',undefined])assert.equal(canPlayBrandIntro({...normal,standalone:true,navigationType}),true);});
test('ordinary browser refresh and history restoration do not replay',()=>{assert.equal(canPlayBrandIntro({...normal,navigationType:'reload'}),false);assert.equal(canPlayBrandIntro({...normal,navigationType:'back_forward'}),false);});
test('storage failure, record deep links, preview and non-home routes remain excluded',()=>{for(const patch of [{storageReadable:false},{sessionLink:true},{preview:true},{trainingHome:false}])assert.equal(canPlayBrandIntro({...normal,...patch}),false);});
