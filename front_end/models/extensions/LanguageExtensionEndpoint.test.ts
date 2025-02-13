// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import * as Extensions from './extensions.js';

const {urlString} = Platform.DevToolsPath;

for (const allowFileAccess of [true, false]) {
  describe(`LanguageExtensionEndpoint ${allowFileAccess ? 'with' : 'without'} file access`, () => {
    let endpoint: Extensions.LanguageExtensionEndpoint.LanguageExtensionEndpoint;
    beforeEach(() => {
      const channel = new MessageChannel();
      endpoint = new Extensions.LanguageExtensionEndpoint.LanguageExtensionEndpoint(
          allowFileAccess, '', '', {language: 'lang', symbol_types: [Protocol.Debugger.DebugSymbolsType.SourceMap]},
          channel.port1);
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
  });
}
