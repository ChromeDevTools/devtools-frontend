// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type Chrome} from '../../../../../extension-api/ExtensionAPI.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import {TestPlugin} from '../../helpers/LanguagePluginHelpers.js';

describe('DebuggerLanguagePlugins', () => {
  describe('ExtensionRemoteObject', () => {
    describe('isLinearMemoryInspectable', () => {
      it('yields false when the extension object has no linear memory address', () => {
        const callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
        const extensionObject: Chrome.DevTools.RemoteObject = {
          type: 'object',
          hasChildren: false,
        };
        const plugin = new TestPlugin('TestPlugin');
        const remoteObject =
            new Bindings.DebuggerLanguagePlugins.ExtensionRemoteObject(callFrame, extensionObject, plugin);
        assert.isFalse(remoteObject.isLinearMemoryInspectable());
      });

      it('yields true when the extension object has a linear memory address', () => {
        const callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
        const extensionObject: Chrome.DevTools.RemoteObject = {
          type: 'object',
          linearMemoryAddress: 42,
          hasChildren: false,
        };
        const plugin = new TestPlugin('TestPlugin');
        const remoteObject =
            new Bindings.DebuggerLanguagePlugins.ExtensionRemoteObject(callFrame, extensionObject, plugin);
        assert.isTrue(remoteObject.isLinearMemoryInspectable());
      });
    });
  });
});
