// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../../../test/api/mocha-interface.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Formatter from '../formatter/formatter.js';

import * as Workspace from './workspace.js';

interface Frame {
  functionName: string;
  location: SDK.DebuggerModel.Location;
}

type ToUILocation = (location: SDK.DebuggerModel.Location) => Promise<Workspace.UISourceCode.UILocation|null>;

/**
 * Formats the call stack, including async call frames, like the Sources panel does and marks the
 * ignore-listed call frames with `*`.
 */
async function formatCallStack(details: SDK.DebuggerModel.DebuggerPausedDetails, toUILocation: ToUILocation,
                               ignoreListManager: Workspace.IgnoreListManager.IgnoreListManager): Promise<string[]> {
  async function formatFrames(frames: Frame[]): Promise<string[]> {
    const lines = [];
    for (const [index, {functionName, location}] of frames.entries()) {
      const uiLocation = await toUILocation(location);
      assert.exists(uiLocation);
      const {uiSourceCode, lineNumber} = uiLocation;
      const marker = uiLocation.isIgnoreListed(ignoreListManager) ? '* ' : '';
      lines.push(`${marker}${functionName} (${uiSourceCode.name()}:${lineNumber + 1})`);
      // The call frames below the function that scheduled the test belong to the test harness.
      if (functionName === 'scheduleTestFunction') {
        if (index < frames.length - 1) {
          lines.push('<... skipped remaining frames ...>');
        }
        break;
      }
    }
    return lines;
  }

  const lines = await formatFrames(
      details.callFrames.map(callFrame => ({functionName: callFrame.functionName, location: callFrame.location()})));
  for (let stackTrace = details.asyncStackTrace; stackTrace; stackTrace = stackTrace.parent) {
    const frames = stackTrace.callFrames.map(
        ({functionName, scriptId, lineNumber, columnNumber}) => ({
          functionName,
          location: new SDK.DebuggerModel.Location(details.debuggerModel, scriptId, lineNumber, columnNumber),
        }));
    const asyncLines = await formatFrames(frames);
    if (asyncLines.length) {
      lines.push(`[${stackTrace.description || 'Async Call'}]`, ...asyncLines);
    }
  }
  return lines;
}

describe('IgnoreListManager API Test', () => {
  it('skips the source-mapped frames of a script whose original source matches an ignore-list pattern',
     async ({inspectedPage, universe}) => {
       const debuggerModel = universe.targetManager.primaryPageTarget()?.model(SDK.DebuggerModel.DebuggerModel);
       assert.exists(debuggerModel);
       const ignoreListManager = universe.context.get(Workspace.IgnoreListManager.IgnoreListManager);
       const callStack = async(): Promise<string[]> => {
         const details = debuggerModel.debuggerPausedDetails();
         assert.exists(details);
         return await formatCallStack(details,
                                      location => universe.debuggerWorkspaceBinding.rawLocationToUILocation(location),
                                      ignoreListManager);
       };
       const step = async(action: () => Promise<void>): Promise<void> => {
         const paused = debuggerModel.once(SDK.DebuggerModel.Events.DebuggerPaused);
         await action();
         await paused;
       };

       // Wait for the source map, which maps framework-with-sourcemap.js back to framework.js.
       const sourceMapAttached = debuggerModel.sourceMapManager().once(SDK.SourceMapManager.Events.SourceMapAttached);
       await inspectedPage.goToResource('sources/frameworks-sourcemap/frameworks-sourcemap.html');
       const {client: frameworkScript, sourceMap} = await sourceMapAttached;
       assert.match(frameworkScript.sourceURL, /\/framework-with-sourcemap\.js$/);
       assert.deepEqual(sourceMap.sourceURLs().map(url => url.split('/').at(-1)), ['framework.js']);

       // The pattern only matches the original source of the framework script, not the script itself.
       const {promise: patternApplied, resolve} = Promise.withResolvers<void>();
       ignoreListManager.addChangeListener(resolve);
       universe.settings.resolve(Workspace.IgnoreListManager.skipStackFramesPatternSettingDescriptor)
           .set('/framework\\.js$');
       await patternApplied;
       ignoreListManager.removeChangeListener(resolve);

       await step(async () => {
         await inspectedPage.evaluate(() => {
           (globalThis as unknown as {scheduleTestFunction: () => void}).scheduleTestFunction();
         });
       });
       try {
         assert.deepEqual(await callStack(), [
           'testFunction (frameworks-sourcemap.js:10)',
           '[setTimeout]',
           'scheduleTestFunction (frameworks-sourcemap.js:6)',
           '<... skipped remaining frames ...>',
         ]);

         await step(() => debuggerModel.stepInto());
         await step(() => debuggerModel.stepInto());
         // The second step into enters callback() through the ignore-listed foo().
         assert.deepEqual(await callStack(), [
           'callback (frameworks-sourcemap.js:15)',
           '* foo (framework.js:4)',
           'testFunction (frameworks-sourcemap.js:11)',
           '[setTimeout]',
           'scheduleTestFunction (frameworks-sourcemap.js:6)',
           '<... skipped remaining frames ...>',
         ]);

         // Stepping out of callback() also steps out of the ignore-listed foo().
         await step(() => debuggerModel.stepOut());
         assert.deepEqual(await callStack(), [
           'testFunction (frameworks-sourcemap.js:11)',
           '[setTimeout]',
           'scheduleTestFunction (frameworks-sourcemap.js:6)',
           '<... skipped remaining frames ...>',
         ]);
       } finally {
         if (debuggerModel.isPaused()) {
           debuggerModel.resume();
         }
         // Resolving the original function names of the paused call frames starts a formatter worker, which would
         // otherwise keep the test runner alive.
         Formatter.FormatterWorkerPool.FormatterWorkerPool.removeInstance();
       }
     });
});
