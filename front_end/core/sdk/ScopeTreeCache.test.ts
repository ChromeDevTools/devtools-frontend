// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Formatter from '../../models/formatter/formatter.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';

import * as SDK from './sdk.js';

describe('ScopeTreeCache', () => {
  describe('scopeTreeForScript', () => {
    const {scopeTreeForScript} = SDK.ScopeTreeCache;
    let javaScriptScopeTreeStub: sinon.SinonStub;
    let script: SDK.Script.Script;

    beforeEach(() => {
      javaScriptScopeTreeStub = sinon.stub(Formatter.FormatterWorkerPool.formatterWorkerPool(), 'javaScriptScopeTree');
      script = sinon.createStubInstance(
          SDK.Script.Script,
          {requestContentData: Promise.resolve(new TextUtils.ContentData.ContentData('', false, 'text/javascript'))});
    });

    it('requests the scope tree once for a script', async () => {
      const scopeTree =
          {start: 0, end: 20, kind: Formatter.FormatterWorkerPool.ScopeKind.GLOBAL, variables: [], children: []};
      javaScriptScopeTreeStub.returns(Promise.resolve(scopeTree));

      const actualScopeTree1 = await scopeTreeForScript(script);
      const actualScopeTree2 = await scopeTreeForScript(script);

      sinon.assert.calledOnce(javaScriptScopeTreeStub);
      assert.strictEqual(actualScopeTree1, scopeTree);
      assert.strictEqual(actualScopeTree2, scopeTree);
    });

    it('requests the scope tree once for a script that fails to parse', async () => {
      javaScriptScopeTreeStub.returns(Promise.reject('some error'));

      const actualScopeTree1 = await scopeTreeForScript(script);
      const actualScopeTree2 = await scopeTreeForScript(script);

      sinon.assert.calledOnce(javaScriptScopeTreeStub);
      assert.isNull(actualScopeTree1);
      assert.isNull(actualScopeTree2);
    });

    it('requests the scope tree once for a script, even if the first request is not done yet', async () => {
      const scopeTree =
          {start: 0, end: 20, kind: Formatter.FormatterWorkerPool.ScopeKind.GLOBAL, variables: [], children: []};
      const {promise: scopeTreePromise, resolve: scopeTreeResolve} =
          Promise.withResolvers<Formatter.FormatterWorkerPool.ScopeTreeNode|null>();
      javaScriptScopeTreeStub.returns(scopeTreePromise);

      const scopeTreePromise1 = scopeTreeForScript(script);
      const scopeTreePromise2 = scopeTreeForScript(script);

      scopeTreeResolve(scopeTree);
      const [actualScopeTree1, actualScopeTree2] = await Promise.all([scopeTreePromise1, scopeTreePromise2]);

      sinon.assert.calledOnce(javaScriptScopeTreeStub);
      assert.strictEqual(actualScopeTree1, scopeTree);
      assert.strictEqual(actualScopeTree2, scopeTree);
    });
  });
});
