// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDKModule from '../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
  setMockConnectionResponseHandler,
} from '../../helpers/MockConnection.js';

const {assert} = chai;

describeWithMockConnection('Script', () => {
  let SDK: typeof SDKModule;
  before(async () => {
    SDK = await import('../../../../../front_end/core/sdk/sdk.js');
  });

  describe('originalContentProvider', () => {
    it('doesn\'t strip //# sourceURL annotations', async () => {
      const target = createTarget();
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDKModule.DebuggerModel.DebuggerModel;
      const url = 'webpack:///src/foo.js';
      const scriptId = '1';
      const scriptSource = `
console.log("foo");
//# sourceURL=${url}
`;
      dispatchEvent(target, 'Debugger.scriptParsed', {
        scriptId,
        url,
        startLine: 2,
        startColumn: 14,
        endLine: 5,
        endColumn: 0,
        executionContextId: 1,
        hash: '',
        hasSourceURL: true,
      });
      setMockConnectionResponseHandler('Debugger.getScriptSource', (): Protocol.Debugger.GetScriptSourceResponse => {
        return {
          scriptSource,
          getError() {
            return undefined;
          },
        };
      });
      const script = debuggerModel.scriptForId(scriptId) as SDKModule.Script.Script;
      const {content} = await script.originalContentProvider().requestContent();
      assert.strictEqual(content, scriptSource);
    });
  });
});
