// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../bindings/bindings.js';

import * as Extensions from './extensions.js';

const {urlString} = Platform.DevToolsPath;

for (const allowFileAccess of [true, false]) {
  describe(`LanguageExtensionEndpoint ${allowFileAccess ? 'with' : 'without'} file access`, () => {
    let endpoint: Extensions.LanguageExtensionEndpoint.LanguageExtensionEndpoint;
    beforeEach(() => {
      const channel = new MessageChannel();
      const pluginManager = sinon.createStubInstance(Bindings.DebuggerLanguagePlugins.DebuggerLanguagePluginManager);
      endpoint = new Extensions.LanguageExtensionEndpoint.LanguageExtensionEndpoint(
          allowFileAccess, '', '', {language: 'lang', symbol_types: [Protocol.Debugger.DebugSymbolsType.SourceMap]},
          channel.port1, pluginManager);
    });

    it('canAccessURL respects allowFileAccess correctly', () => {
      assert.isTrue(endpoint.canAccessURL('http://example.com'));
      assert.strictEqual(endpoint.canAccessURL('file:///file'), allowFileAccess);
    });

    it('handleScript respects allowFileAccess correctly', () => {
      const script = sinon.createStubInstance(SDK.Script.Script);
      script.debugSymbols = {type: Protocol.Debugger.DebugSymbolsType.SourceMap};
      script.scriptLanguage.returns('lang');

      script.contentURL.returns(urlString`file:///file`);
      assert.strictEqual(endpoint.handleScript(script), allowFileAccess);
      script.contentURL.returns(urlString`http://example.com`);
      assert.isTrue(endpoint.handleScript(script));

      script.hasSourceURL = true;
      script.sourceURL = urlString`file:///file`;
      assert.strictEqual(endpoint.handleScript(script), allowFileAccess);
      script.sourceURL = urlString`http://example.com`;
      assert.isTrue(endpoint.handleScript(script));

      script.debugSymbols.externalURL = 'file:///file';
      assert.strictEqual(endpoint.handleScript(script), allowFileAccess);
      script.debugSymbols.externalURL = 'http://example.com';
      assert.isTrue(endpoint.handleScript(script));
    });

    it('addRawModule respects allowFileAccess correctly', async () => {
      const endpointProxyStub = sinon.stub(Extensions.ExtensionEndpoint.ExtensionEndpoint.prototype, 'sendRequest');
      endpointProxyStub.resolves([]);
      await endpoint.addRawModule('', 'file:///file', {url: 'http://example.com'});
      assert.strictEqual(endpointProxyStub.calledOnce, allowFileAccess);
      await endpoint.addRawModule('', 'http://example.com', {url: 'file:///file'});
      assert.strictEqual(endpointProxyStub.calledTwice, allowFileAccess);
      await endpoint.addRawModule('', 'http://example.com', {url: 'http://example.com'});
      assert.lengthOf(endpointProxyStub.getCalls(), allowFileAccess ? 3 : 1);
      await endpoint.addRawModule('', '', {url: 'http://example.com'});
      assert.lengthOf(endpointProxyStub.getCalls(), allowFileAccess ? 4 : 2);
      await endpoint.addRawModule('', 'wasm.debug.wasm', {url: 'http://example.com'});
      assert.lengthOf(endpointProxyStub.getCalls(), allowFileAccess ? 5 : 3);
    });

    it('validates all properties in getFunctionInfo results', async () => {
      const endpointProxyStub = sinon.stub(Extensions.ExtensionEndpoint.ExtensionEndpoint.prototype, 'sendRequest');
      endpointProxyStub.resolves({frames: []});
      await endpoint.getFunctionInfo({rawModuleId: '', codeOffset: 0, inlineFrameIndex: 0});

      const validator = endpointProxyStub.firstCall.args[2];
      // Either result property is sufficient on its own, and both may be present.
      assert.isTrue(validator({frames: []}));
      assert.isTrue(validator({missingSymbolFiles: []}));
      assert.isTrue(validator({frames: [], missingSymbolFiles: []}));

      // Non-empty arrays validate function names and missing-file paths as strings.
      assert.isTrue(validator({frames: [{name: 'functionName'}]}));
      assert.isTrue(validator({missingSymbolFiles: ['missing.wasm']}));

      // Reject invalid property containers and invalid array elements.
      assert.isFalse(validator({frames: [], missingSymbolFiles: 123}));
      assert.isFalse(validator({frames: [], missingSymbolFiles: [123]}));
      assert.isFalse(validator({frames: 123, missingSymbolFiles: []}));
      assert.isFalse(validator({frames: [{name: 123}]}));
    });
  });
}
