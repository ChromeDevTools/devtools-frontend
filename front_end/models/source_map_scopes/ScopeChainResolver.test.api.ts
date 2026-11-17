// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../../../test/api/mocha-interface.js';
import * as SDK from '../../core/sdk/sdk.js';

import * as SourceMapScopes from './source_map_scopes.js';

async function stringifyScopeChain(scopeChain: SDK.DebuggerModel.ScopeChainEntry[]): Promise<string> {
  const lines: string[] = [];
  for (const scope of scopeChain) {
    if (scope.type() === 'global') {
      continue;
    }
    lines.push(scope.typeName());
    const {properties} = await scope.object().getAllProperties(false, false);
    for (const prop of properties ?? []) {
      if (prop.value?.type === 'number') {
        lines.push(`  ${prop.name}: ${prop.value.value}`);
      }
    }
  }
  return lines.join('\n');
}

describe('ScopeChainResolver API Test', () => {
  // Regression test for crbug.com/583942448.
  it('provides up-to-date variable values after a console evaluation modified them while paused',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget);
       const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
       assert.isNotNull(debuggerModel);
       const consoleModel = primaryTarget.model(SDK.ConsoleModel.ConsoleModel);
       assert.isNotNull(consoleModel);

       // Load the page first: A `debugger` statement that runs while the page loads can race with the
       // debugger getting enabled.
       await inspectedPage.goToHtml('<!DOCTYPE html><html><body></body></html>');
       const paused = debuggerModel.once(SDK.DebuggerModel.Events.DebuggerPaused);
       void inspectedPage.evaluate(() => {
         const script = document.createElement('script');
         script.textContent = `
           let scriptVar = 1;
           function outer() {
             let closureVar = 2;
             function inner() {
               let localVar = 3;
               let untouchedVar = 4;
               debugger;
               return closureVar + localVar + untouchedVar + scriptVar;
             }
             return inner();
           }
           setTimeout(outer, 0);`;
         document.body.appendChild(script);
       });
       await paused;

       try {
         const callFrame = debuggerModel.debuggerPausedDetails()?.callFrames[0];
         assert.exists(callFrame);
         const resolver = universe.scopeChainResolver;

         assert.strictEqual(await stringifyScopeChain(await resolver.resolveScopeChain(callFrame)), [
           'Local',
           '  localVar: 3',
           '  untouchedVar: 4',
           'Closure',
           '  closureVar: 2',
           'Script',
           '  scriptVar: 1',
         ].join('\n'));

         const executionContext = debuggerModel.runtimeModel().executionContext(callFrame.script.executionContextId);
         assert.exists(executionContext);
         const invalidated: SDK.Script.Script[] = [];
         resolver.addEventListener(SourceMapScopes.ScopeChainResolver.Events.SCOPE_CHAIN_INVALIDATED,
                                   event => invalidated.push(event.data));
         const expression = 'localVar = 30; closureVar = 20; scriptVar = 10;';
         await consoleModel.evaluateCommandInConsole(
             executionContext, consoleModel.addCommandMessage(executionContext, expression), expression,
             /* useCommandLineAPI */ false);
         assert.deepEqual(invalidated, [callFrame.script]);

         assert.strictEqual(await stringifyScopeChain(await resolver.resolveScopeChain(callFrame)), [
           'Local',
           '  localVar: 30',
           '  untouchedVar: 4',
           'Closure',
           '  closureVar: 20',
           'Script',
           '  scriptVar: 10',
         ].join('\n'));
       } finally {
         if (debuggerModel.isPaused()) {
           await debuggerModel.resume();
         }
       }
     });
});
