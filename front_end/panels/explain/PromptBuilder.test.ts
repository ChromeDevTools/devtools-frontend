// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Logs from '../../models/logs/logs.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {
  createConsoleViewMessageWithStubDeps,
  createStackTrace,
} from '../../testing/ConsoleHelpers.js';
import {createTarget, describeWithLocale} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {MockProtocolBackend} from '../../testing/MockScopeChain.js';

import * as Explain from './explain.js';

const {urlString} = Platform.DevToolsPath;

describeWithLocale('PromptBuilder', () => {
  describe('allowHeader', () => {
    it('disallows cookie headers', () => {
      assert.isNotOk(Explain.allowHeader({name: 'Cookie', value: ''}));
      assert.isNotOk(Explain.allowHeader({name: 'cookiE', value: ''}));
      assert.isNotOk(Explain.allowHeader({name: 'cookie', value: ''}));
      assert.isNotOk(Explain.allowHeader({name: 'set-cookie', value: ''}));
      assert.isNotOk(Explain.allowHeader({name: 'Set-cOokie', value: ''}));
    });

    it('disallows authorization headers', () => {
      assert.isNotOk(Explain.allowHeader({name: 'AuthoRization', value: ''}));
      assert.isNotOk(Explain.allowHeader({name: 'authorization', value: ''}));
    });

    it('disallows custom headers', () => {
      assert.isNotOk(Explain.allowHeader({name: 'X-smth', value: ''}));
      assert.isNotOk(Explain.allowHeader({name: 'X-', value: ''}));
      assert.isNotOk(Explain.allowHeader({name: 'x-smth', value: ''}));
      assert.isNotOk(Explain.allowHeader({name: 'x-', value: ''}));
    });
  });

  const NETWORK_REQUEST = {
    url() {
      return urlString`https://example.com`;
    },
    requestHeaders() {
      return [{
        name: 'Origin',
        value: 'https://example.com',
      }];
    },
    statusCode: 404,
    statusText: 'Not found',
    responseHeaders: [{
      name: 'Origin',
      value: 'https://example.com',
    }],
  } as SDK.NetworkRequest.NetworkRequest;

  describe('format formatNetworkRequest', () => {
    it('formats a network request', () => {
      assert.strictEqual(Explain.formatNetworkRequest(NETWORK_REQUEST), `Request: https://example.com

Request headers:
Origin: https://example.com

Response headers:
Origin: https://example.com

Response status: 404 Not found`);
    });
  });

  describe('formatRelatedCode', () => {
    it('formats a single line code', () => {
      assert.strictEqual(
          Explain.formatRelatedCode(
              {
                text: '12345678901234567890',
                columnNumber: 10,
                lineNumber: 0,
              },
              /* maxLength=*/ 5),
          '89012');
      assert.strictEqual(
          Explain.formatRelatedCode(
              {
                text: '12345678901234567890',
                columnNumber: 10,
                lineNumber: 0,
              },
              /* maxLength=*/ 6),
          '890123');
      assert.strictEqual(
          Explain.formatRelatedCode(
              {
                text: '12345678901234567890',
                columnNumber: 10,
                lineNumber: 0,
              },
              /* maxLength=*/ 30),
          '12345678901234567890');
    });

    it('formats a multiline code', () => {
      assert.strictEqual(
          Explain.formatRelatedCode(
              {
                text: '123\n456\n789\n123\n456\n789\n',
                columnNumber: 1,
                lineNumber: 1,
              },
              /* maxLength=*/ 5),
          '456');
      assert.strictEqual(
          Explain.formatRelatedCode(
              {
                text: '123\n456\n789\n123\n456\n789\n',
                columnNumber: 1,
                lineNumber: 1,
              },
              /* maxLength=*/ 10),
          '456\n789\n123');
      assert.strictEqual(
          Explain.formatRelatedCode(
              {
                text: '123\n456\n789\n123\n456\n789\n',
                columnNumber: 1,
                lineNumber: 1,
              },
              /* maxLength=*/ 16),
          '123\n456\n789\n123');
    });

    it('uses indentation to select blocks or functions', () => {
      // Somewhat realistic code
      const text = `import something;
import anotherthing;

const x = 1;
function f1() {
  // a

  // b
}

function bigger() {
  // x
  if (true) {
    // y

    // zzzzzz
  }

  let y = x + 2;

  if (false) {
    // a

    f1();
    if (x == x) {
      // z
    }
  }
}

export const y = "";
`;
      assert.strictEqual(
          Explain.formatRelatedCode({text, columnNumber: 4, lineNumber: 11}, /* maxLength=*/ 233),
          '  // x\n  if (true) {\n    // y\n\n    // zzzzzz\n  }\n\n  let y = x + 2;\n\n  if (false) {\n    // a\n\n    f1();\n    if (x == x) {\n      // z\n    }\n  }',
      );
      assert.strictEqual(
          Explain.formatRelatedCode({text, columnNumber: 4, lineNumber: 11}, /* maxLength=*/ 232),
          '  // x\n  if (true) {\n    // y\n\n    // zzzzzz\n  }\n\n  let y = x + 2;',
      );
      assert.strictEqual(
          Explain.formatRelatedCode({text, columnNumber: 4, lineNumber: 11}, /* maxLength=*/ 600),
          text.trim(),
      );
      assert.strictEqual(
          Explain.formatRelatedCode({text, columnNumber: 4, lineNumber: 11}, /* maxLength=*/ 50),
          '  // x\n  if (true) {\n    // y\n\n    // zzzzzz\n  }',
      );
      assert.strictEqual(
          Explain.formatRelatedCode({text, columnNumber: 4, lineNumber: 11}, /* maxLength=*/ 40),
          '  // x',
      );
      assert.strictEqual(
          Explain.formatRelatedCode({text, columnNumber: 4, lineNumber: 18}, /* maxLength=*/ 50),
          '  let y = x + 2;',
      );
    });
  });

  it('Extracts expected whitespace from beginnings of lines', () => {
    assert.strictEqual(Explain.lineWhitespace(' a'), ' ');
    assert.strictEqual(Explain.lineWhitespace('a'), '');
    assert.isNull(Explain.lineWhitespace(' '));
    assert.isNull(Explain.lineWhitespace(''));
    assert.strictEqual(Explain.lineWhitespace('\t\ta'), '\t\t');
  });

  describeWithMockConnection('buildPrompt', () => {
    let target: SDK.Target.Target;
    let backend: MockProtocolBackend;

    beforeEach(() => {
      target = createTarget();
      const targetManager = target.targetManager();
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
      const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
        ignoreListManager,
      });
      backend = new MockProtocolBackend();
    });

    const PROMPT_PREFIX = 'Please explain the following console error or warning:';
    const RELATED_CODE_PREFIX = 'For the following code:';
    const RELATED_NETWORK_REQUEST_PREFIX = 'For the following network request:';

    it('builds a simple prompt', async () => {
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
      };
      const ERROR_MESSAGE = 'kaboom!';
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, /* level */ null, ERROR_MESSAGE,
          messageDetails);
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const promptBuilder = new Explain.PromptBuilder(message);
      const {prompt, sources} = await promptBuilder.buildPrompt();
      assert.strictEqual(prompt, [
        PROMPT_PREFIX,
        '',
        '```',
        ERROR_MESSAGE,
        '```',
      ].join('\n'));
      assert.deepEqual(sources, [{type: 'message', value: ERROR_MESSAGE}]);
    });

    it('builds a prompt with related code', async () => {
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const LINE_NUMBER = 42;
      const URL = urlString`http://example.com/script.js`;
      const RELATED_CODE = `${'\n'.repeat(LINE_NUMBER)}console.error('kaboom!')`;
      const script = await backend.addScript(target, {url: URL, content: RELATED_CODE}, null);

      const SCRIPT_ID = script.scriptId;
      const stackTrace = createStackTrace([
        `${SCRIPT_ID}::userNestedFunction::${URL}::${LINE_NUMBER}::15`,
        `${SCRIPT_ID}::userFunction::http://example.com/script.js::10::2`,
        `${SCRIPT_ID}::entry::http://example.com/app.js::25::10`,
      ]);
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
        stackTrace,
      };

      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assert.exists(debuggerModel);
      const ERROR_MESSAGE = 'kaboom!';
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, /* level */ null, ERROR_MESSAGE,
          messageDetails);
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const promptBuilder = new Explain.PromptBuilder(message);
      const {prompt, sources} = await promptBuilder.buildPrompt();
      assert.strictEqual(prompt, [
        PROMPT_PREFIX,
        '',
        '```',
        ERROR_MESSAGE,
        '```',
        RELATED_CODE_PREFIX,
        '',
        '```',
        RELATED_CODE.trim(),
        '```',
      ].join('\n'));

      assert.deepEqual(
          sources, [{type: 'message', value: ERROR_MESSAGE}, {type: 'relatedCode', value: RELATED_CODE.trim()}]);
    });

    it('builds a prompt with related code and stacktrace', async () => {
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const LINE_NUMBER = 42;
      const URL = urlString`http://example.com/script.js`;
      const RELATED_CODE = `${'\n'.repeat(LINE_NUMBER)}console.error('kaboom!')`;
      const script = await backend.addScript(target, {url: URL, content: RELATED_CODE}, null);

      const SCRIPT_ID = script.scriptId;
      const stackTrace = createStackTrace([
        `${SCRIPT_ID}::userNestedFunction::${URL}::${LINE_NUMBER}::15`,
        `${SCRIPT_ID}::userFunction::http://example.com/script.js::10::2`,
        `${SCRIPT_ID}::entry::http://example.com/app.js::25::10`,
      ]);
      // Linkifier is mocked in this test, therefore, no link text after @.
      const STACK_TRACE = ['userNestedFunction @ ', 'userFunction @ ', 'entry @'].join('\n');
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
        stackTrace,
      };
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assert.exists(debuggerModel);
      const ERROR_MESSAGE = 'kaboom!';
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, Protocol.Log.LogEntryLevel.Error,
          ERROR_MESSAGE, messageDetails);
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const promptBuilder = new Explain.PromptBuilder(message);
      const {prompt, sources} = await promptBuilder.buildPrompt();
      assert.strictEqual(prompt, [
        PROMPT_PREFIX,
        '',
        '```',
        ERROR_MESSAGE,
        STACK_TRACE,
        '```',
        RELATED_CODE_PREFIX,
        '',
        '```',
        RELATED_CODE.trim(),
        '```',
      ].join('\n'));

      assert.deepEqual(sources, [
        {type: 'message', value: ERROR_MESSAGE},
        {type: 'stacktrace', value: STACK_TRACE},
        {type: 'relatedCode', value: RELATED_CODE.trim()},
      ]);

    });

    it('trims a very long network request', async () => {
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const REQUEST_ID = '29.1' as Protocol.Network.RequestId;
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
        affectedResources: {
          requestId: REQUEST_ID,
        },
      };
      const NETWORK_REQUEST = {
        url() {
          return urlString`https://example.com`;
        },
        requestHeaders() {
          return Array(100).fill({
            name: 'Origin',
            value: 'https://example.com',
          });
        },
        statusCode: 404,
        statusText: 'Not found',
        responseHeaders: Array(100).fill({
          name: 'Origin',
          value: 'https://example.com',
        }),
      } as SDK.NetworkRequest.NetworkRequest;
      sinon.stub(Logs.NetworkLog.NetworkLog.instance(), 'requestsForId').withArgs(REQUEST_ID).returns([
        NETWORK_REQUEST,
      ]);
      const RELATED_REQUEST = [
        'Request: https://example.com',
        '',
        'Request headers:',
        'Origin: https://example.com\n'.repeat(35),
        'Response headers:',
        'Origin: https://example.com\n'.repeat(35),
        'Response status: 404 Not found',
      ].join('\n');
      const ERROR_MESSAGE = 'kaboom!';
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, /* level */ null, ERROR_MESSAGE,
          messageDetails);
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const promptBuilder = new Explain.PromptBuilder(message);
      const {prompt, sources} = await promptBuilder.buildPrompt();
      assert.strictEqual(prompt, [
        PROMPT_PREFIX,
        '',
        '```',
        ERROR_MESSAGE,
        '```',
        RELATED_NETWORK_REQUEST_PREFIX,
        '',
        '```',
        RELATED_REQUEST,
        '```',
      ].join('\n'));

      assert.deepEqual(
          sources, [{type: 'message', value: ERROR_MESSAGE}, {type: 'networkRequest', value: RELATED_REQUEST}]);
    });

    it('trims a very long console message', async () => {
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
      };
      const ERROR_MESSAGE = 'a'.repeat(2000);
      const TRIMMED_ERROR_MESSAGE = 'a'.repeat(1000);
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, /* level */ null, ERROR_MESSAGE,
          messageDetails);
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const promptBuilder = new Explain.PromptBuilder(message);
      const {prompt, sources} = await promptBuilder.buildPrompt();
      assert.strictEqual(prompt, [
        PROMPT_PREFIX,
        '',
        '```',
        TRIMMED_ERROR_MESSAGE,
        '```',
      ].join('\n'));
      assert.deepEqual(sources, [{type: 'message', value: TRIMMED_ERROR_MESSAGE}]);
    });

    it('trims a very long stack trace', async () => {
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const LINE_NUMBER = 0;
      const URL = urlString`${`http://example.com/${'a'.repeat(100)}.js`}`;
      const RELATED_CODE = 'console.error(\'kaboom!\')';
      const script = await backend.addScript(target, {url: URL, content: RELATED_CODE}, null);

      const SCRIPT_ID = script.scriptId;
      const STACK_FRAME = `${SCRIPT_ID}::userNestedFunction::${URL}::${LINE_NUMBER}::15`;
      const stackTrace = createStackTrace(Array(80).fill(STACK_FRAME));
      const STACK_TRACE = 'userNestedFunction @ \n'.repeat(45).trim();
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
        stackTrace,
      };

      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assert.isNotNull(debuggerModel);
      const ERROR_MESSAGE = 'kaboom!';
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, Protocol.Log.LogEntryLevel.Error,
          ERROR_MESSAGE, messageDetails);
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const promptBuilder = new Explain.PromptBuilder(message);
      const {prompt, sources} = await promptBuilder.buildPrompt();
      assert.strictEqual(prompt, [
        PROMPT_PREFIX,
        '',
        '```',
        ERROR_MESSAGE,
        STACK_TRACE,
        '```',
        RELATED_CODE_PREFIX,
        '',
        '```',
        RELATED_CODE.trim(),
        '```',
      ].join('\n'));

      assert.deepEqual(sources, [
        {type: 'message', value: ERROR_MESSAGE},
        {type: 'stacktrace', value: STACK_TRACE},
        {type: 'relatedCode', value: RELATED_CODE.trim()},
      ]);
    });

    it('builds a prompt with related request', async () => {
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const REQUEST_ID = '29.1' as Protocol.Network.RequestId;
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
        affectedResources: {
          requestId: REQUEST_ID,
        },
      };
      sinon.stub(Logs.NetworkLog.NetworkLog.instance(), 'requestsForId').withArgs(REQUEST_ID).returns([
        NETWORK_REQUEST,
      ]);
      const RELATED_REQUEST = [
        'Request: https://example.com',
        '',
        'Request headers:',
        'Origin: https://example.com',
        '',
        'Response headers:',
        'Origin: https://example.com',
        '',
        'Response status: 404 Not found',
      ].join('\n');
      const ERROR_MESSAGE = 'kaboom!';
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, /* level */ null, ERROR_MESSAGE,
          messageDetails);
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const promptBuilder = new Explain.PromptBuilder(message);
      const {prompt, sources, isPageReloadRecommended} = await promptBuilder.buildPrompt();
      assert.strictEqual(prompt, [
        PROMPT_PREFIX,
        '',
        '```',
        ERROR_MESSAGE,
        '```',
        RELATED_NETWORK_REQUEST_PREFIX,
        '',
        '```',
        RELATED_REQUEST,
        '```',
      ].join('\n'));

      assert.isNotTrue(isPageReloadRecommended, 'PromptBuilder did recommend reloading the page');
      assert.deepEqual(
          sources, [{type: 'message', value: ERROR_MESSAGE}, {type: 'networkRequest', value: RELATED_REQUEST}]);
    });

    it('recommends page reload if the sources are not complete', async () => {
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const REQUEST_ID = '29.1' as Protocol.Network.RequestId;
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
        affectedResources: {
          requestId: REQUEST_ID,
        },
      };
      sinon.stub(Logs.NetworkLog.NetworkLog.instance(), 'requestsForId').withArgs(REQUEST_ID).returns([]);
      const ERROR_MESSAGE = 'kaboom!';
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, /* level */ null, ERROR_MESSAGE,
          messageDetails);
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const promptBuilder = new Explain.PromptBuilder(message);
      const {sources, isPageReloadRecommended} = await promptBuilder.buildPrompt();
      assert.isTrue(isPageReloadRecommended, 'PromptBuilder did not recommend reloading the page');
      assert.isNotTrue(sources.some(source => source.type === Explain.SourceType.NETWORK_REQUEST));
    });

  });

  describeWithMockConnection('getSearchQuery', () => {
    let target: SDK.Target.Target;

    beforeEach(() => {
      target = createTarget();
    });

    it('builds a simple search query', async () => {
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
      };
      const ERROR_MESSAGE = 'kaboom!';
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, Protocol.Log.LogEntryLevel.Error,
          ERROR_MESSAGE, messageDetails);
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const promptBuilder = new Explain.PromptBuilder(message);
      const query = await promptBuilder.getSearchQuery();
      assert.strictEqual(query, 'kaboom!');
    });

    it('builds a search query from an error without the callstack', async () => {
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
      };
      const ERROR_MESSAGE = 'Got an error: ' + new Error('fail').stack;
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, Protocol.Log.LogEntryLevel.Error,
          ERROR_MESSAGE, messageDetails);
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const promptBuilder = new Explain.PromptBuilder(message);
      const query = await promptBuilder.getSearchQuery();
      assert.strictEqual(query, 'Got an error: Error: fail');
    });
  });
});
