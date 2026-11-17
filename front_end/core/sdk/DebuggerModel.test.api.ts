// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../../../test/api/mocha-interface.js';

import * as SDK from './sdk.js';

describe('DebuggerModel API Test', () => {
  it('verifies that skipAllPauses setting works when navigating to a page with a debugger stmt',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget, 'Primary page target should exist');

       const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
       assert.isNotNull(debuggerModel, 'DebuggerModel should exist');

       const skipAllPausesSetting = universe.settings.resolve(SDK.DebuggerModel.skipAllPausesSettingDescriptor);
       skipAllPausesSetting.set(true);

       let debuggerPausedFired = false;
       const listener = (): void => {
         debuggerPausedFired = true;
       };
       debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerPaused, listener);

       await inspectedPage.goToHtml(`
         <!DOCTYPE html>
         <html>
           <body>
             <script>
               debugger;
             </script>
           </body>
         </html>
       `);

       assert.isFalse(debuggerPausedFired, 'DebuggerPaused event should not fire when skipAllPauses is enabled');
       assert.isFalse(debuggerModel.isPaused(), 'DebuggerModel should not be paused when skipAllPauses is enabled');

       debuggerModel.removeEventListener(SDK.DebuggerModel.Events.DebuggerPaused, listener);
     });

  it('provides the current variable values for call frames whose scope chain was marked stale',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget);
       const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
       assert.isNotNull(debuggerModel);

       // Load the page first: A `debugger` statement that runs while the page loads can race with the
       // debugger getting enabled.
       await inspectedPage.goToHtml('<!DOCTYPE html><html><body></body></html>');
       const paused = debuggerModel.once(SDK.DebuggerModel.Events.DebuggerPaused);
       void inspectedPage.evaluate(() => {
         const script = document.createElement('script');
         script.textContent = `
           let scriptVar = 1;
           function outer() {
             let outerVar = 2;
             function inner() {
               let localVar = 3;
               debugger;
               return outerVar + localVar + scriptVar;
             }
             return inner();
           }
           setTimeout(outer, 0);`;
         document.body.appendChild(script);
       });
       await paused;

       try {
         const [innerFrame, outerFrame] = debuggerModel.debuggerPausedDetails()?.callFrames ?? [];
         /** Stringifies the number variables of all but the global scope. */
         const variables = async(callFrame: SDK.DebuggerModel.CallFrame): Promise<string> => {
           const scopes = (await callFrame.scopeChain()).filter(scope => scope.type() !== 'global');
           const lines = await Promise.all(scopes.map(async scope => {
             const {properties} = await scope.object().getAllProperties(false, false);
             const numbers =
                 properties?.filter(p => p.value?.type === 'number').map(p => `${p.name}=${p.value?.value}`);
             return `${scope.type()}: ${numbers?.join(',')}`;
           }));
           return lines.join(' | ');
         };
         assert.strictEqual(await variables(innerFrame),
                            'local: localVar=3 | closure: outerVar=2 | script: scriptVar=1');
         assert.strictEqual(await variables(outerFrame), 'local: outerVar=2 | script: scriptVar=1');

         await innerFrame.evaluate({expression: 'localVar = 30; outerVar = 20; scriptVar = 10;'});

         // The scope chains V8 reported with the pause are snapshots.
         assert.strictEqual(await variables(innerFrame),
                            'local: localVar=3 | closure: outerVar=2 | script: scriptVar=1');

         innerFrame.markScopeChainStale();
         assert.strictEqual(await variables(innerFrame),
                            'local: localVar=30 | closure: outerVar=20 | script: scriptVar=10');
         // Only the call frames marked stale are re-fetched.
         assert.strictEqual(await variables(outerFrame), 'local: outerVar=2 | script: scriptVar=1');

         outerFrame.markScopeChainStale();
         assert.strictEqual(await variables(outerFrame), 'local: outerVar=20 | script: scriptVar=10');
       } finally {
         if (debuggerModel.isPaused()) {
           await debuggerModel.resume();
         }
       }
     });
});
