// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../../../test/api/mocha-interface.js';
import type * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import * as Bindings from './bindings.js';

const {urlString} = Platform.DevToolsPath;

function waitUntil<T, Events, K extends keyof Events>(
    eventTarget: Common.EventTarget.EventTarget<Events>,
    eventType: K,
    getValue: () => T | null,
    ): Promise<T> {
  const current = getValue();
  if (current !== null) {
    return Promise.resolve(current);
  }
  const {promise, resolve} = Promise.withResolvers<T>();
  const descriptor = eventTarget.addEventListener(eventType, () => {
    const value = getValue();
    if (value !== null) {
      eventTarget.removeEventListener(descriptor.eventType, descriptor.listener);
      resolve(value);
    }
  });
  return promise;
}

describe('CSSWorkspaceBinding API Test', () => {
  it('maps UI locations in an HTML document to inline style and script raw locations',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget);

       const resourceTreeModel = primaryTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
       assert.isNotNull(resourceTreeModel);
       const cssModel = primaryTarget.model(SDK.CSSModel.CSSModel);
       assert.isNotNull(cssModel);
       const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
       assert.isNotNull(debuggerModel);

       if (!resourceTreeModel.cachedResourcesLoaded()) {
         await resourceTreeModel.once(SDK.ResourceTreeModel.Events.CachedResourcesLoaded);
       }
       if (!cssModel.isEnabled()) {
         await cssModel.once(SDK.CSSModel.Events.ModelWasEnabled);
       }
       if (!debuggerModel.isReadyToPause()) {
         await debuggerModel.once(SDK.DebuggerModel.Events.DebuggerIsReadyToPause);
       }

       const resourceUrl =
           urlString`${`${inspectedPage.getResourcesPath()}/sources/inline-styles-scripts-locations.html`}`;

       const findNetworkUISourceCode = (): Workspace.UISourceCode.UISourceCode|null =>
           universe.workspace.uiSourceCodesForProjectType(Workspace.Workspace.projectTypes.Network)
               .find(code => code.url() === resourceUrl) ??
           null;

       const uiSourceCodePromise =
           waitUntil(universe.workspace, Workspace.Workspace.Events.UISourceCodeAdded, findNetworkUISourceCode);
       const styleSheetsPromise = waitUntil(cssModel, SDK.CSSModel.Events.StyleSheetAdded, () => {
         const headers = cssModel.headersForSourceURL(resourceUrl);
         return headers.length >= 2 ? headers : null;
       });
       const scriptsPromise = waitUntil(debuggerModel, SDK.DebuggerModel.Events.ParsedScriptSource, () => {
         const scripts = debuggerModel.scriptsForSourceURL(resourceUrl);
         return scripts.length >= 2 ? scripts : null;
       });

       await inspectedPage.goToResource('sources/inline-styles-scripts-locations.html');

       const [uiSourceCode] = await Promise.all([uiSourceCodePromise, styleSheetsPromise, scriptsPromise]);
       assert.strictEqual(Bindings.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode), primaryTarget);

       const contentData = await uiSourceCode.requestContentData();
       assert.isFalse(TextUtils.ContentData.ContentData.isError(contentData));
       const content = TextUtils.ContentData.ContentData.textOr(contentData, '');

       const expectedLines = [
         '<!DOCTYPE html>',
         '<html>',
         '<head>',
         '    <meta charset="utf-8">',
         '    <title>Website</title>',
         '</head>',
         '<body>',
         '    <style>',
         '        body {',
         '            --var-1: one;',
         '        }',
         '    </style>',
         '    Hello World',
         '    <script>',
         '        function firstFunction() {',
         '        }',
         '    </script>',
         '    <style>body {--var-2: two;} </style><script>function secondFunction() { }</script>',
         '</body>',
         '</html>',
         '',
       ];
       assert.strictEqual(content, expectedLines.join('\n'));

       const sourceText = new TextUtils.Text.Text(content);
       assert.strictEqual(sourceText.lineCount(), 21);

       const cssLines: number[] = [];
       const debuggerLines: number[] = [];
       for (let line = 0; line < sourceText.lineCount(); ++line) {
         const cssLocations = universe.cssWorkspaceBinding.uiLocationToRawLocations(uiSourceCode.uiLocation(line, 0));
         for (const location of cssLocations) {
           assert.instanceOf(location, SDK.CSSModel.CSSLocation);
           const header = location.header();
           assert.isNotNull(header);
           assert.isTrue(header.containsLocation(line, 0));
           assert.strictEqual(location.lineNumber, line);
           assert.strictEqual(location.columnNumber, 0);
           cssLines.push(line);
         }

         const debuggerLocations =
             await universe.debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode, line, 0);
         for (const location of debuggerLocations) {
           assert.instanceOf(location, SDK.DebuggerModel.Location);
           const script = location.script();
           assert.isNotNull(script);
           assert.isTrue(script.containsLocation(line, 0));
           assert.strictEqual(location.lineNumber, line);
           assert.strictEqual(location.columnNumber, 0);
           debuggerLines.push(line);
         }
       }

       assert.deepEqual(cssLines, [8, 9, 10, 11]);
       assert.deepEqual(debuggerLines, [14, 15, 16]);
     });
});
