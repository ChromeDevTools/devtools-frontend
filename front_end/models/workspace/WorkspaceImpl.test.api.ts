// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../../../test/api/mocha-interface.js';
import type * as Common from '../../core/common/common.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';

import * as Workspace from './workspace.js';

describe('WorkspaceImpl API Test', () => {
  it('replaces the network UISourceCode of a script when a newer script has the same sourceURL',
     async ({inspectedPage, universe}) => {
       const {workspace} = universe;
       const added: Workspace.UISourceCode.UISourceCode[] = [];
       const {promise: twoNetworkCodesAdded, resolve} = Promise.withResolvers<void>();
       const onAdded =
           ({data: uiSourceCode}: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void => {
             if (!uiSourceCode.url().endsWith('MyScript.js')) {
               return;
             }
             added.push(uiSourceCode);
             if (added.filter(isNetwork).length === 2) {
               resolve();
             }
           };
       workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, onAdded);

       try {
         await inspectedPage.evaluate(() => {
           function injectScript(value: number): void {
             eval('function foo() { return ' + value + '; } //# sourceURL=MyScript.js');
           }
           injectScript(1);
           injectScript(2);
         });
         await twoNetworkCodesAdded;
       } finally {
         workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, onAdded);
       }

       const networkURL = await inspectedPage.evaluate(() => new URL('MyScript.js', location.href).href);

       // Each eval creates a debugger UISourceCode first and then the network UISourceCode for its sourceURL.
       assert.deepEqual(added.map(uiSourceCode => uiSourceCode.project().type()), [
         Workspace.Workspace.projectTypes.Debugger,
         Workspace.Workspace.projectTypes.Network,
         Workspace.Workspace.projectTypes.Debugger,
         Workspace.Workspace.projectTypes.Network,
       ]);
       const [firstDebuggerCode, firstNetworkCode, secondDebuggerCode, secondNetworkCode] = added;
       assert.match(firstDebuggerCode.url(), /^debugger:\/\/\/VM\d+ MyScript\.js$/);
       assert.match(secondDebuggerCode.url(), /^debugger:\/\/\/VM\d+ MyScript\.js$/);
       assert.notStrictEqual(firstDebuggerCode.url(), secondDebuggerCode.url());
       assert.strictEqual(firstNetworkCode.url(), networkURL);
       assert.strictEqual(secondNetworkCode.url(), networkURL);

       assert.deepEqual(await Promise.all(added.filter(isNetwork).map(contentOf)), [
         'function foo() { return 1; } //# sourceURL=MyScript.js',
         'function foo() { return 2; } //# sourceURL=MyScript.js',
       ]);

       // The newer script replaces the older one in the network project, while both
       // scripts keep their own debugger UISourceCode.
       assert.strictEqual(secondNetworkCode.canonicalScriptId(), firstNetworkCode.canonicalScriptId());
       const networkCodes = workspace.uiSourceCodes().filter(uiSourceCode => uiSourceCode.url() === networkURL);
       assert.deepEqual(networkCodes, [secondNetworkCode]);
       assert.strictEqual(workspace.uiSourceCodeForURL(firstDebuggerCode.url()), firstDebuggerCode);
       assert.strictEqual(workspace.uiSourceCodeForURL(secondDebuggerCode.url()), secondDebuggerCode);
     });
});

function isNetwork(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
  return uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Network;
}

async function contentOf(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<string> {
  return TextUtils.ContentData.ContentData.textOr(await uiSourceCode.requestContentData(), '');
}
