// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Protocol from '../../generated/protocol.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {expectCalled} from '../../testing/ExpectStubCall.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Snippets from './snippets.js';

const {EmptyEncodedPathString, urlString} = Platform.DevToolsPath;

describe('EvaluateScriptSnippet', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
    sinon.stub(Common.Settings.Settings, 'instance').returns(universe.settings);
    sinon.stub(Common.Console.Console, 'instance').returns(universe.console);
    sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(universe.workspace);
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
    sinon.stub(Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager, 'instance')
        .returns(universe.isolatedFileSystemManager);

    assert.exists(universe.persistence);
    assert.exists(universe.fileSystemWorkspaceBinding);
    universe.isolatedFileSystemManager.addPlatformFileSystem(urlString`snippet://`,
                                                             new Snippets.ScriptSnippetFileSystem.SnippetFileSystem());
  });

  afterEach(() => {
    UI.Context.Context.removeInstance();
    Common.Revealer.RevealerRegistry.removeInstance();
    universe.dispose();
  });

  it('evaluates script snippets with replMode enabled', async () => {
    const snippetName = 'Snippet1' as Platform.DevToolsPath.RawPathString;
    const snippetSource = 'let a = 1; let a = 2;';
    const expectedUrl = urlString`snippet:///Snippet1`;
    const expectedExpression = `${snippetSource}\n//# sourceURL=${expectedUrl}`;

    let capturedEvaluateParams: Protocol.Runtime.EvaluateRequest|undefined;
    const connection = new MockCDPConnection();
    connection.setSuccessHandler('Debugger.enable', () => ({
                                                      debuggerId: 'DEBUGGER_ID' as Protocol.Runtime.UniqueDebuggerId,
                                                    }));
    connection.setSuccessHandler('Debugger.getScriptSource', () => ({
                                                               scriptSource: expectedExpression,
                                                             }));
    connection.setSuccessHandler('Runtime.evaluate', (params, sessionId) => {
      capturedEvaluateParams = params;
      connection.dispatchEvent('Debugger.scriptFailedToParse', {
        scriptId: '7' as Protocol.Runtime.ScriptId,
        url: expectedUrl,
        startLine: 0,
        startColumn: 0,
        endLine: 1,
        endColumn: 33,
        executionContextId: 2 as Protocol.Runtime.ExecutionContextId,
        hash: '34546e5380e2ebf02f90c250bba2407051cdfb12816e1967e27fc95cf1eaa5d2',
        buildId: '',
        executionContextAuxData: {
          isDefault: true,
          type: 'default',
          frameId: 'frame-1' as Protocol.Page.FrameId,
        },
        sourceMapURL: '',
        hasSourceURL: true,
        isModule: false,
        length: expectedExpression.length,
        scriptLanguage: Protocol.Debugger.ScriptLanguage.JavaScript,
        embedderName: '',
      },
                               sessionId);
      return {
        result: {
          type: Protocol.Runtime.RemoteObjectType.Object,
          subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
          className: 'SyntaxError',
          description: 'SyntaxError: Identifier \'a\' has already been declared',
          objectId: '1071774700471163356.2.1' as Protocol.Runtime.RemoteObjectId,
        },
        exceptionDetails: {
          exceptionId: 1,
          text: 'Uncaught',
          lineNumber: 0,
          columnNumber: 15,
          scriptId: '7' as Protocol.Runtime.ScriptId,
          exception: {
            type: Protocol.Runtime.RemoteObjectType.Object,
            subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
            className: 'SyntaxError',
            description: 'SyntaxError: Identifier \'a\' has already been declared',
            objectId: '1071774700471163356.2.2' as Protocol.Runtime.RemoteObjectId,
          },
        },
      };
    });

    const revealStub = sinon.stub<[Common.Console.Console, boolean?]>();
    Common.Revealer.registerRevealer({
      contextTypes: () => [Common.Console.Console],
      async loadRevealer() {
        return {
          async reveal(revealable: Common.Console.Console, omitFocus?: boolean) {
            revealStub(revealable, omitFocus);
          },
        };
      },
    });

    const target = universe.createTarget({connection});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);
    connection.dispatchEvent('Runtime.executionContextCreated', {
      context: {
        id: 2 as Protocol.Runtime.ExecutionContextId,
        origin: 'http://localhost',
        name: '',
        uniqueId: 'unique-context-1',
        auxData: {
          isDefault: true,
          type: 'default',
          frameId: 'frame-1' as Protocol.Page.FrameId,
        },
      },
    },
                             target.sessionId);

    const executionContext = runtimeModel.executionContext(2);
    assert.exists(executionContext);
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);

    const evaluateWithFallbackSpy = sinon.spy(executionContext, 'evaluateWithSelectedFrameFallback');
    const invalidateScopeChainsSpy = sinon.spy(executionContext.debuggerModel, 'invalidateScopeChains');

    const snippetsProject = Snippets.ScriptSnippetFileSystem.findSnippetsProject();
    const uiSourceCode = await snippetsProject.createFile(EmptyEncodedPathString, null, '');
    assert.exists(uiSourceCode);
    const renamed = await uiSourceCode.rename(snippetName);
    assert.isTrue(renamed);
    assert.strictEqual(uiSourceCode.name(), 'Snippet1');
    assert.strictEqual(uiSourceCode.url(), 'snippet:///Snippet1');

    uiSourceCode.setWorkingCopy(snippetSource);
    await Snippets.ScriptSnippetFileSystem.evaluateScriptSnippet(uiSourceCode);
    await expectCalled(revealStub);

    const persistedContent = await snippetsProject.requestFileContent(uiSourceCode);
    assert.isFalse(TextUtils.ContentData.ContentData.isError(persistedContent));
    assert.strictEqual(TextUtils.ContentData.ContentData.textOr(persistedContent, null), 'let a = 1; let a = 2;');

    sinon.assert.calledOnceWithExactly(revealStub, universe.console, false);
    sinon.assert.calledOnceWithExactly(
        evaluateWithFallbackSpy,
        {
          expression: 'let a = 1; let a = 2;\n//# sourceURL=snippet:///Snippet1',
          objectGroup: 'console',
          silent: false,
          includeCommandLineAPI: true,
          returnByValue: false,
          generatePreview: true,
          replMode: true,
        },
        true,
        true,
    );
    assert.deepEqual(capturedEvaluateParams, {
      expression: 'let a = 1; let a = 2;\n//# sourceURL=snippet:///Snippet1',
      objectGroup: 'console',
      includeCommandLineAPI: true,
      silent: false,
      returnByValue: false,
      generatePreview: true,
      userGesture: true,
      awaitPromise: true,
      throwOnSideEffect: undefined,
      timeout: undefined,
      disableBreaks: undefined,
      replMode: true,
      allowUnsafeEvalBlockedByCSP: undefined,
      uniqueContextId: 'unique-context-1',
    });

    sinon.assert.calledOnce(invalidateScopeChainsSpy);
    const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
    assert.exists(consoleModel);
    const messages = consoleModel.messages();
    assert.lengthOf(messages, 1);
    assert.strictEqual(messages[0].messageText, 'Uncaught SyntaxError: Identifier \'a\' has already been declared');
  });
});
