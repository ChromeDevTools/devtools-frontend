// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {afterEach, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockExecutionContext} from '../../testing/MockExecutionContext.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Snippets from './snippets.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('ScriptSnippetFileSystem', () => {
  afterEach(() => {
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, null);
  });

  function createSnippet() {
    return new Workspace.UISourceCode.UISourceCode({} as Persistence.FileSystemWorkspaceBinding.FileSystem,
                                                   urlString`snippet://test.js`,
                                                   Common.ResourceType.resourceTypes.Script);
  }

  it('evaluates snippets with user gesture', async () => {
    UI.Context.Context.instance().setFlavor(
        SDK.RuntimeModel.ExecutionContext, new MockExecutionContext(createTarget()));
    await Snippets.ScriptSnippetFileSystem.evaluateScriptSnippet(createSnippet());
  });

  it('invalidates the scope chains after evaluating a snippet', async () => {
    const executionContext = new MockExecutionContext(createTarget());
    const invalidateScopeChains = sinon.stub(executionContext.debuggerModel, 'invalidateScopeChains');
    sinon.stub(executionContext, 'evaluateWithSelectedFrameFallback').resolves({
      object: SDK.RemoteObject.RemoteObject.fromLocalObject(undefined),
    });
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);

    await Snippets.ScriptSnippetFileSystem.evaluateScriptSnippet(createSnippet());

    sinon.assert.calledOnce(invalidateScopeChains);
  });

  it('invalidates the scope chains even when the snippet throws', async () => {
    const executionContext = new MockExecutionContext(createTarget());
    const invalidateScopeChains = sinon.stub(executionContext.debuggerModel, 'invalidateScopeChains');
    sinon.stub(executionContext, 'evaluateWithSelectedFrameFallback').resolves({
      object: SDK.RemoteObject.RemoteObject.fromLocalObject(undefined),
      exceptionDetails: {exceptionId: 1, text: 'Uncaught', lineNumber: 0, columnNumber: 0},
    });
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);

    await Snippets.ScriptSnippetFileSystem.evaluateScriptSnippet(createSnippet());

    sinon.assert.calledOnce(invalidateScopeChains);
  });

  it('does not invalidate the scope chains on protocol error', async () => {
    const executionContext = new MockExecutionContext(createTarget());
    const invalidateScopeChains = sinon.stub(executionContext.debuggerModel, 'invalidateScopeChains');
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);

    await Snippets.ScriptSnippetFileSystem.evaluateScriptSnippet(createSnippet());

    sinon.assert.notCalled(invalidateScopeChains);
  });
});
