// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as Protocol from '../../generated/protocol.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as TextUtils from '../text_utils/text_utils.js';

import * as SDK from './sdk.js';

describeWithEnvironment('Script', () => {
  let universe: TestUniverse;
  let connection: MockCDPConnection;

  beforeEach(() => {
    universe = new TestUniverse();
    connection = new MockCDPConnection();
  });

  describe('originalContentProvider', () => {
    it('doesn\'t strip //# sourceURL annotations', async () => {
      const target = universe.createTarget({connection});
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;
      const url = 'webpack:///src/foo.js';
      const scriptId = '1' as Protocol.Runtime.ScriptId;
      const scriptSource = `
console.log("foo");
//# sourceURL=${url}
`;
      connection.dispatchEvent('Debugger.scriptParsed', {
        scriptId,
        url,
        startLine: 2,
        startColumn: 14,
        endLine: 5,
        endColumn: 0,
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
        hash: '',
        buildId: '',
        hasSourceURL: true,
      },
                               undefined);
      connection.setSuccessHandler('Debugger.getScriptSource', () => {
        return {
          scriptSource,
        };
      });
      const script = debuggerModel.scriptForId(scriptId) as SDK.Script.Script;
      const content = await script.originalContentProvider().requestContentData();
      assert.instanceOf(content, TextUtils.ContentData.ContentData);
      assert.strictEqual(content.text, scriptSource);
    });
  });
});
