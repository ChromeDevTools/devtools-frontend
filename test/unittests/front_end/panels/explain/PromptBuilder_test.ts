// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as Logs from '../../../../../front_end/models/logs/logs.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Explain from '../../../../../front_end/panels/explain/explain.js';
import {createConsoleViewMessageWithStubDeps, createStackTrace} from '../../helpers/ConsoleHelpers.js';
import {createTarget, describeWithLocale} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {createContentProviderUISourceCode, createFakeScriptMapping} from '../../helpers/UISourceCodeHelpers.js';

const {assert} = chai;

describeWithLocale('PromptBuilder', () => {
  describe('allowHeader', () => {
    it('disallows cookie headers', () => {
      assert(!Explain.allowHeader({name: 'Cookie', value: ''}));
      assert(!Explain.allowHeader({name: 'cookiE', value: ''}));
      assert(!Explain.allowHeader({name: 'cookie', value: ''}));
      assert(!Explain.allowHeader({name: 'set-cookie', value: ''}));
      assert(!Explain.allowHeader({name: 'Set-cOokie', value: ''}));
    });

    it('disallows authorization headers', () => {
      assert(!Explain.allowHeader({name: 'AuthoRization', value: ''}));
      assert(!Explain.allowHeader({name: 'authorization', value: ''}));
    });

    it('disallows custom headers', () => {
      assert(!Explain.allowHeader({name: 'X-smth', value: ''}));
      assert(!Explain.allowHeader({name: 'X-', value: ''}));
      assert(!Explain.allowHeader({name: 'x-smth', value: ''}));
      assert(!Explain.allowHeader({name: 'x-', value: ''}));
    });
  });

  const NETWORK_REQUEST = {
    url() {
      return 'https://example.com' as Platform.DevToolsPath.UrlString;
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
    assert.strictEqual(Explain.lineWhitespace(' '), null);
    assert.strictEqual(Explain.lineWhitespace(''), null);
    assert.strictEqual(Explain.lineWhitespace('\t\ta'), '\t\t');
  });

  describeWithMockConnection('buildPrompt', () => {
    let target: SDK.Target.Target;
    let debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;

    beforeEach(() => {
      target = createTarget();
      const targetManager = target.targetManager();
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
      debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(
          {forceNew: true, resourceMapping, targetManager});
    });

    const PREAMBLE = `You are an expert software engineer looking at a console message in DevTools.

You will follow these rules strictly:
- Answer the question as truthfully as possible using the provided context
- if you don't have the answer, say "I don't know" and suggest looking for this information
  elsewhere
- Start with the explanation immediately without repeating the given console message.
- Always wrap code with three backticks (\`\`\`)`;

    const MESSAGE_HEADER = '### Console message:';
    const EXAMPLE_MESSAGE1 =
        `Uncaught TypeError: Cannot read properties of undefined (reading 'setState') at home.jsx:15
    at delta (home.jsx:15:14)
    at Object.Dc (react-dom.production.min.js:54:317)
    at Fc (react-dom.production.min.js:54:471)
    at jc (react-dom.production.min.js:55:35)
    at ai (react-dom.production.min.js:105:68)
    at Ks (react-dom.production.min.js:106:380)
    at react-dom.production.min.js:117:104
    at Pu (react-dom.production.min.js:274:42)
    at vs (react-dom.production.min.js:52:375)
    at Dl (react-dom.production.min.js:109:469)
delta @ home.jsx:15


Dc @ react-dom.production.min.js:54
Fc @ react-dom.production.min.js:54
jc @ react-dom.production.min.js:55
ai @ react-dom.production.min.js:105
Ks @ react-dom.production.min.js:106
(anonymous) @ react-dom.production.min.js:117
Pu @ react-dom.production.min.js:274
vs @ react-dom.production.min.js:52
Dl @ react-dom.production.min.js:109
eu @ react-dom.production.min.js:74
bc @ react-dom.production.min.js:73`;
    const EXAMPLE_MESSAGE2 = `Uncaught TypeError: Cannot set properties of null(setting 'innerHTML')
        at(index): 57: 49(anonymous) @(index): 57 `;
    const EXAMPLE_MESSAGE3 = 'Uncaught SyntaxError: Unexpected token \')\' (at script.js:39:14)';
    const RELATED_CODE_HEADER = '### Code that generated the error:';
    const RELATED_REQUEST_HEADER = '### Related network request:';

    const EXAMPLE_RELATED_CODE1 = `class Counter extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            count : 1
        };

        this.delta.bind(this);
    }

    delta() {
        this.setState({
            count : this.state.count++
        });
    }

    render() {
        return (
            <div>
                <h1>{this.state.count}</h1>
                <button onClick={this.delta}>+</button>
            </div>
        );
    }
}`;
    const EXAMPLE_RELATED_CODE2 = `<script>
      document.getElementById("test").innerHTML = "Element does not exist";
    </script>
    <div id="test"></div>`;

    const EXAMPLE_RELATED_CODE3 = `if (10 < 120)) {
  console.log('test')
}`;
    const EXPLANATION_HEADER = '### Summary:';
    const EXAMPLE_EXPLANATION1 =
        'The error occurs because this.delta is not bound to the instance of the Counter component. The fix is it to change the code to be ` this.delta = this.delta.bind(this);`';
    const EXAMPLE_EXPLANATION2 =
        'The error means that getElementById returns null instead of the div element. This happens because the script runs before the element is added to the DOM.';
    const EXAMPLE_EXPLANATION3 = 'There is an extra closing `)`. Remove it to fix the issue.';

    it('builds a simple prompt', async () => {
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
      };
      const ERROR_MESSAGE = 'kaboom!';
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, SDK.ConsoleModel.FrontendMessageSource.ConsoleAPI, /* level */ null, ERROR_MESSAGE,
          messageDetails);
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const promptBuilder = new Explain.PromptBuilder(message);
      const {prompt, sources} = await promptBuilder.buildPrompt();
      assert.strictEqual(prompt, [
        '',
        PREAMBLE,
        '',
        MESSAGE_HEADER,
        EXAMPLE_MESSAGE1,
        EXPLANATION_HEADER,
        EXAMPLE_EXPLANATION1,
        '',
        MESSAGE_HEADER,
        EXAMPLE_MESSAGE2,
        EXPLANATION_HEADER,
        EXAMPLE_EXPLANATION2,
        '',
        MESSAGE_HEADER,
        EXAMPLE_MESSAGE3,
        EXPLANATION_HEADER,
        EXAMPLE_EXPLANATION3,
        '',
        MESSAGE_HEADER,
        ERROR_MESSAGE,
        EXPLANATION_HEADER,
        '',
      ].join('\n'));
      assert.deepStrictEqual(sources, [{type: 'message', value: ERROR_MESSAGE}]);
    });

    it('builds a prompt with related code', async () => {
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const SCRIPT_ID = '1' as Protocol.Runtime.ScriptId;
      const LINE_NUMBER = 42;
      const URL = 'http://example.com/script.js' as Platform.DevToolsPath.UrlString;
      const stackTrace = createStackTrace([
        `${SCRIPT_ID}::userNestedFunction::${URL}::${LINE_NUMBER}::15`,
        `${SCRIPT_ID}::userFunction::http://example.com/script.js::10::2`,
        `${SCRIPT_ID}::entry::http://example.com/app.js::25::10`,
      ]);
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
        stackTrace,
      };
      const RELATED_CODE = `${'\n'.repeat(LINE_NUMBER)}console.error('kaboom!')`;
      const {uiSourceCode, project} =
          createContentProviderUISourceCode({url: URL, mimeType: 'text/javascript', content: RELATED_CODE});
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(debuggerModel);
      const mapping = createFakeScriptMapping(debuggerModel, uiSourceCode, LINE_NUMBER, SCRIPT_ID);
      debuggerWorkspaceBinding.addSourceMapping(mapping);
      const ERROR_MESSAGE = 'kaboom!';
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, SDK.ConsoleModel.FrontendMessageSource.ConsoleAPI, /* level */ null, ERROR_MESSAGE,
          messageDetails);
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const promptBuilder = new Explain.PromptBuilder(message);
      const {prompt, sources} = await promptBuilder.buildPrompt();
      assert.strictEqual(prompt, [
        '',
        PREAMBLE,
        '',
        MESSAGE_HEADER,
        EXAMPLE_MESSAGE1,
        RELATED_CODE_HEADER,
        '```',
        EXAMPLE_RELATED_CODE1,
        '```',
        EXPLANATION_HEADER,
        EXAMPLE_EXPLANATION1,
        '',
        MESSAGE_HEADER,
        EXAMPLE_MESSAGE2,
        RELATED_CODE_HEADER,
        '```',
        EXAMPLE_RELATED_CODE2,
        '```',
        EXPLANATION_HEADER,
        EXAMPLE_EXPLANATION2,
        '',
        MESSAGE_HEADER,
        EXAMPLE_MESSAGE3,
        RELATED_CODE_HEADER,
        '```',
        EXAMPLE_RELATED_CODE3,
        '```',
        EXPLANATION_HEADER,
        EXAMPLE_EXPLANATION3,
        '',
        MESSAGE_HEADER,
        ERROR_MESSAGE,
        RELATED_CODE_HEADER,
        '```',
        RELATED_CODE.trim(),
        '```',
        EXPLANATION_HEADER,
        '',
      ].join('\n'));

      assert.deepStrictEqual(
          sources, [{type: 'message', value: ERROR_MESSAGE}, {type: 'relatedCode', value: RELATED_CODE.trim()}]);

      Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().removeSourceMapping(mapping);
    });

    it('builds a prompt with related code and stacktrace', async () => {
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const SCRIPT_ID = '1' as Protocol.Runtime.ScriptId;
      const LINE_NUMBER = 42;
      const URL = 'http://example.com/script.js' as Platform.DevToolsPath.UrlString;
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
      const RELATED_CODE = `${'\n'.repeat(LINE_NUMBER)}console.error('kaboom!')`;
      const {uiSourceCode, project} =
          createContentProviderUISourceCode({url: URL, mimeType: 'text/javascript', content: RELATED_CODE});
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assertNotNullOrUndefined(debuggerModel);
      const mapping = createFakeScriptMapping(debuggerModel, uiSourceCode, LINE_NUMBER, SCRIPT_ID);
      debuggerWorkspaceBinding.addSourceMapping(mapping);
      const ERROR_MESSAGE = 'kaboom!';
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, SDK.ConsoleModel.FrontendMessageSource.ConsoleAPI, Protocol.Log.LogEntryLevel.Error,
          ERROR_MESSAGE, messageDetails);
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const promptBuilder = new Explain.PromptBuilder(message);
      const {prompt, sources} = await promptBuilder.buildPrompt();
      assert.strictEqual(prompt, [
        '',
        PREAMBLE,
        '',
        MESSAGE_HEADER,
        EXAMPLE_MESSAGE1,
        RELATED_CODE_HEADER,
        '```',
        EXAMPLE_RELATED_CODE1,
        '```',
        EXPLANATION_HEADER,
        EXAMPLE_EXPLANATION1,
        '',
        MESSAGE_HEADER,
        EXAMPLE_MESSAGE2,
        RELATED_CODE_HEADER,
        '```',
        EXAMPLE_RELATED_CODE2,
        '```',
        EXPLANATION_HEADER,
        EXAMPLE_EXPLANATION2,
        '',
        MESSAGE_HEADER,
        EXAMPLE_MESSAGE3,
        RELATED_CODE_HEADER,
        '```',
        EXAMPLE_RELATED_CODE3,
        '```',
        EXPLANATION_HEADER,
        EXAMPLE_EXPLANATION3,
        '',
        MESSAGE_HEADER,
        ERROR_MESSAGE,
        STACK_TRACE,
        RELATED_CODE_HEADER,
        '```',
        RELATED_CODE.trim(),
        '```',
        EXPLANATION_HEADER,
        '',
      ].join('\n'));

      assert.deepStrictEqual(sources, [
        {type: 'message', value: ERROR_MESSAGE},
        {type: 'stacktrace', value: STACK_TRACE},
        {type: 'relatedCode', value: RELATED_CODE.trim()},
      ]);

      Workspace.Workspace.WorkspaceImpl.instance().removeProject(project);
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().removeSourceMapping(mapping);
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
          runtimeModel, SDK.ConsoleModel.FrontendMessageSource.ConsoleAPI, /* level */ null, ERROR_MESSAGE,
          messageDetails);
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const promptBuilder = new Explain.PromptBuilder(message);
      const {prompt, sources} = await promptBuilder.buildPrompt();
      assert.strictEqual(prompt, [
        '',
        PREAMBLE,
        '',
        MESSAGE_HEADER,
        EXAMPLE_MESSAGE1,
        EXPLANATION_HEADER,
        EXAMPLE_EXPLANATION1,
        '',
        MESSAGE_HEADER,
        EXAMPLE_MESSAGE2,
        EXPLANATION_HEADER,
        EXAMPLE_EXPLANATION2,
        '',
        MESSAGE_HEADER,
        EXAMPLE_MESSAGE3,
        EXPLANATION_HEADER,
        EXAMPLE_EXPLANATION3,
        '',
        MESSAGE_HEADER,
        ERROR_MESSAGE,
        RELATED_REQUEST_HEADER,
        RELATED_REQUEST,
        EXPLANATION_HEADER,
        '',
      ].join('\n'));

      assert.deepStrictEqual(
          sources, [{type: 'message', value: ERROR_MESSAGE}, {type: 'networkRequest', value: RELATED_REQUEST}]);
    });
  });
});
