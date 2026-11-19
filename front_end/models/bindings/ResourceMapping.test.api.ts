// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../../../test/api/mocha-interface.js';
import type * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';

describe('ResourceMapping', () => {
  it('maps multiple inline scripts in an HTML resource to exact UI and raw locations',
     async ({inspectedPage, universe}) => {
       await inspectedPage.goToResource('empty.html');

       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget);
       const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
       assert.isNotNull(debuggerModel);

       const url = Platform.DevToolsPath.urlString`${
           inspectedPage.getResourcesPath()}/sources/resource-script-mapping/multiple-scripts.html`;

       const scripts: SDK.Script.Script[] = [];
       const {promise: scriptsPromise, resolve: resolveScripts} = Promise.withResolvers<void>();
       const onParsedScriptSource = (event: Common.EventTarget.EventTargetEvent<SDK.Script.Script>) => {
         if (event.data.sourceURL === url) {
           scripts.push(event.data);
           if (scripts.length === 3) {
             resolveScripts();
           }
         }
       };

       const uiSourceCodePromise = universe.debuggerWorkspaceBinding.waitForUISourceCodeAdded(url, primaryTarget);
       debuggerModel.addEventListener(SDK.DebuggerModel.Events.ParsedScriptSource, onParsedScriptSource);

       let uiSourceCode: Awaited<typeof uiSourceCodePromise>;
       try {
         await inspectedPage.evaluate(iframeUrl => {
           const iframe = document.createElement('iframe');
           iframe.src = iframeUrl;
           document.body.appendChild(iframe);
         }, url);

         [, uiSourceCode] = await Promise.all([scriptsPromise, uiSourceCodePromise]);
       } finally {
         debuggerModel.removeEventListener(SDK.DebuggerModel.Events.ParsedScriptSource, onParsedScriptSource);
       }

       const sortedScripts = [...scripts].sort((s1, s2) => s1.lineOffset - s2.lineOffset);
       assert.lengthOf(sortedScripts, 3);

       const expectedCheckpoints = [
         {scriptLineOffset: 3, scriptColumnOffset: 8, checkLine: 3, checkColumn: 10},
         {scriptLineOffset: 11, scriptColumnOffset: 12, checkLine: 11, checkColumn: 14},
         {scriptLineOffset: 16, scriptColumnOffset: 8, checkLine: 16, checkColumn: 10},
       ];

       for (let i = 0; i < sortedScripts.length; ++i) {
         const script = sortedScripts[i];
         const {scriptLineOffset, scriptColumnOffset, checkLine, checkColumn} = expectedCheckpoints[i];
         assert.strictEqual(script.lineOffset, scriptLineOffset);
         assert.strictEqual(script.columnOffset, scriptColumnOffset);

         const rawLocation = debuggerModel.createRawLocation(script, checkLine, checkColumn);
         const uiLocation = await universe.debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation);
         assert.isNotNull(uiLocation);
         assert.strictEqual(uiLocation.uiSourceCode, uiSourceCode);
         assert.strictEqual(uiLocation.lineNumber, checkLine);
         assert.strictEqual(uiLocation.columnNumber, checkColumn);

         const reverseLocations =
             await universe.debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode, checkLine, checkColumn);
         assert.lengthOf(reverseLocations, 1);
         assert.strictEqual(reverseLocations[0].scriptId, script.scriptId);
         assert.strictEqual(reverseLocations[0].lineNumber, checkLine);
         assert.strictEqual(reverseLocations[0].columnNumber, checkColumn);
       }
     });
});
