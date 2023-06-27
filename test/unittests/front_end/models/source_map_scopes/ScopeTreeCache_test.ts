// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SourceMapScopes from '../../../../../front_end/models/source_map_scopes/source_map_scopes.js';
import * as Formatter from '../../../../../front_end/models/formatter/formatter.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Platform from '../../../../../front_end/core/platform/platform.js';

describe('ScopeTreeCache', () => {
  let scopeTreeCache: SourceMapScopes.ScopeTreeCache.ScopeTreeCache;
  let scopeTreeStub: sinon.SinonStub;
  let script: SDK.Script.Script;

  beforeEach(() => {
    scopeTreeCache = new SourceMapScopes.ScopeTreeCache.ScopeTreeCache();
    scopeTreeStub = sinon.stub(Formatter.FormatterWorkerPool.formatterWorkerPool(), 'javaScriptScopeTree');
    script =
        sinon.createStubInstance(SDK.Script.Script, {requestContent: Promise.resolve({content: '', isEncoded: false})});
  });

  it('only requests the scope tree once for a script', async () => {
    const scopeTree = {start: 0, end: 20, variables: [], children: []};
    scopeTreeStub.returns(Promise.resolve(scopeTree));

    const actualScopeTree1 = await scopeTreeCache.scopeTreeForScript(script);
    const actualScopeTree2 = await scopeTreeCache.scopeTreeForScript(script);

    assert.isTrue(scopeTreeStub.calledOnce);
    assert.strictEqual(actualScopeTree1, scopeTree);
    assert.strictEqual(actualScopeTree2, scopeTree);
  });

  it('only requests the scope tree once for scripts that fail to parse', async () => {
    scopeTreeStub.returns(null);

    const actualScopeTree1 = await scopeTreeCache.scopeTreeForScript(script);
    const actualScopeTree2 = await scopeTreeCache.scopeTreeForScript(script);

    assert.isTrue(scopeTreeStub.calledOnce);
    assert.isNull(actualScopeTree1);
    assert.isNull(actualScopeTree2);
  });

  it('only requests the scope tree once for a script, even if the first request is not done yet', async () => {
    const scopeTree = {start: 0, end: 20, variables: [], children: []};
    const {promise: scopeTreePromise, resolve: scopeTreeResolve} =
        Platform.PromiseUtilities.promiseWithResolvers<Formatter.FormatterWorkerPool.ScopeTreeNode|null>();
    scopeTreeStub.returns(scopeTreePromise);

    const scopeTreePromise1 = scopeTreeCache.scopeTreeForScript(script);
    const scopeTreePromise2 = scopeTreeCache.scopeTreeForScript(script);

    scopeTreeResolve(scopeTree);
    const [actualScopeTree1, actualScopeTree2] = await Promise.all([scopeTreePromise1, scopeTreePromise2]);

    assert.isTrue(scopeTreeStub.calledOnce);
    assert.strictEqual(actualScopeTree1, scopeTree);
    assert.strictEqual(actualScopeTree2, scopeTree);
  });
});
