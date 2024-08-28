// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Formatter from '../formatter/formatter.js';
import * as SourceMapScopes from '../source_map_scopes/source_map_scopes.js';
import * as TextUtils from '../text_utils/text_utils.js';

describe('ScopeTreeCache', () => {
  describe('scopeTreeForScript', () => {
    const {scopeTreeForScript} = SourceMapScopes.ScopeTreeCache;
    let javaScriptScopeTreeStub: sinon.SinonStub;
    let script: SDK.Script.Script;

    beforeEach(() => {
      javaScriptScopeTreeStub = sinon.stub(Formatter.FormatterWorkerPool.formatterWorkerPool(), 'javaScriptScopeTree');
      script = sinon.createStubInstance(
          SDK.Script.Script,
          {requestContentData: Promise.resolve(new TextUtils.ContentData.ContentData('', false, 'text/javascript'))});
    });

    it('requests the scope tree once for a script', async () => {
      const scopeTree = {start: 0, end: 20, variables: [], children: []};
      javaScriptScopeTreeStub.returns(Promise.resolve(scopeTree));

      const actualScopeTree1 = await scopeTreeForScript(script);
      const actualScopeTree2 = await scopeTreeForScript(script);

      assert.isTrue(javaScriptScopeTreeStub.calledOnce);
      assert.strictEqual(actualScopeTree1, scopeTree);
      assert.strictEqual(actualScopeTree2, scopeTree);
    });

    it('requests the scope tree once for a script that fails to parse', async () => {
      javaScriptScopeTreeStub.returns(null);

      const actualScopeTree1 = await scopeTreeForScript(script);
      const actualScopeTree2 = await scopeTreeForScript(script);

      assert.isTrue(javaScriptScopeTreeStub.calledOnce);
      assert.isNull(actualScopeTree1);
      assert.isNull(actualScopeTree2);
    });

    it('requests the scope tree once for a script, even if the first request is not done yet', async () => {
      const scopeTree = {start: 0, end: 20, variables: [], children: []};
      const {promise: scopeTreePromise, resolve: scopeTreeResolve} =
          Promise.withResolvers<Formatter.FormatterWorkerPool.ScopeTreeNode|null>();
      javaScriptScopeTreeStub.returns(scopeTreePromise);

      const scopeTreePromise1 = scopeTreeForScript(script);
      const scopeTreePromise2 = scopeTreeForScript(script);

      scopeTreeResolve(scopeTree);
      const [actualScopeTree1, actualScopeTree2] = await Promise.all([scopeTreePromise1, scopeTreePromise2]);

      assert.isTrue(javaScriptScopeTreeStub.calledOnce);
      assert.strictEqual(actualScopeTree1, scopeTree);
      assert.strictEqual(actualScopeTree2, scopeTree);
    });
  });
});
