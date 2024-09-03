// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {
  createTarget,
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../../testing/ExpectStubCall.js';
import {TestPlugin} from '../../../testing/LanguagePluginHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import {MockExecutionContext} from '../../../testing/MockExecutionContext.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../legacy/legacy.js';

import * as TextEditor from './text_editor.js';

function makeState(doc: string, extensions: CodeMirror.Extension = []) {
  return CodeMirror.EditorState.create({
    doc,
    extensions: [
      extensions,
      TextEditor.Config.baseConfiguration(doc),
      TextEditor.Config.autocompletion.instance(),
    ],
  });
}

describeWithEnvironment('TextEditor', () => {
  describe('component', () => {
    it('has a state property', () => {
      const editor = new TextEditor.TextEditor.TextEditor(makeState('one'));
      assert.strictEqual(editor.state.doc.toString(), 'one');
      editor.state = makeState('two');
      assert.strictEqual(editor.state.doc.toString(), 'two');
      renderElementIntoDOM(editor);
      assert.strictEqual(editor.editor.state.doc.toString(), 'two');
      editor.editor.dispatch({changes: {from: 3, insert: '!'}});
      editor.remove();
      assert.strictEqual(editor.editor.state.doc.toString(), 'two!');
    });

    it('sets an aria-label attribute', () => {
      const editor = new TextEditor.TextEditor.TextEditor(makeState(''));
      assert.strictEqual(editor.editor.contentDOM.getAttribute('aria-label'), 'Code editor');
    });

    it('can highlight whitespace', () => {
      const editor = new TextEditor.TextEditor.TextEditor(
          makeState('line1  \n  line2( )\n\tline3  ', TextEditor.Config.showWhitespace.instance()));
      renderElementIntoDOM(editor);
      assert.strictEqual(editor.editor.dom.querySelectorAll('.cm-trailingWhitespace, .cm-highlightedSpaces').length, 0);
      Common.Settings.Settings.instance().moduleSetting('show-whitespaces-in-editor').set('all');
      assert.strictEqual(editor.editor.dom.querySelectorAll('.cm-highlightedSpaces').length, 4);
      assert.strictEqual(editor.editor.dom.querySelectorAll('.cm-highlightedTab').length, 1);
      Common.Settings.Settings.instance().moduleSetting('show-whitespaces-in-editor').set('trailing');
      assert.strictEqual(editor.editor.dom.querySelectorAll('.cm-highlightedSpaces').length, 0);
      assert.strictEqual(editor.editor.dom.querySelectorAll('.cm-trailingWhitespace').length, 2);
      Common.Settings.Settings.instance().moduleSetting('show-whitespaces-in-editor').set('none');
      assert.strictEqual(editor.editor.dom.querySelectorAll('.cm-trailingWhitespace, .cm-highlightedSpaces').length, 0);
      editor.remove();
    });

    it('should restore scroll to the same position after reconnecting to DOM when it is scrollable', async () => {
      const editor = new TextEditor.TextEditor.TextEditor(makeState(
          'line1\nline2\nline3\nline4\nline5\nline6andthisisalonglinesothatwehaveenoughspacetoscrollhorizontally',
          [CodeMirror.EditorView.theme(
              {'&.cm-editor': {height: '50px', width: '50px'}, '.cm-scroller': {overflow: 'auto'}})]));
      const scrollEventHandledToSaveScrollPositionForTest =
          sinon.stub(editor, 'scrollEventHandledToSaveScrollPositionForTest');
      const waitForFirstScrollPromise = expectCall(scrollEventHandledToSaveScrollPositionForTest);
      renderElementIntoDOM(editor);
      editor.editor.dispatch({
        effects: CodeMirror.EditorView.scrollIntoView(0, {
          x: 'start',
          xMargin: -20,
          y: 'start',
          yMargin: -20,
        }),
      });
      await waitForFirstScrollPromise;
      const scrollTopBeforeRemove = editor.editor.scrollDOM.scrollTop;
      const scrollLeftBeforeRemove = editor.editor.scrollDOM.scrollLeft;

      const waitForSecondScrollPromise = expectCall(scrollEventHandledToSaveScrollPositionForTest);
      editor.remove();
      renderElementIntoDOM(editor);
      await waitForSecondScrollPromise;

      const scrollTopAfterReconnect = editor.editor.scrollDOM.scrollTop;
      const scrollLeftAfterReconnect = editor.editor.scrollDOM.scrollLeft;
      assert.strictEqual(scrollTopBeforeRemove, scrollTopAfterReconnect);
      assert.strictEqual(scrollLeftBeforeRemove, scrollLeftAfterReconnect);
    });
  });

  describe('configuration', () => {
    it('can detect line separators', () => {
      assert.strictEqual(makeState('one\r\ntwo\r\nthree').lineBreak, '\r\n');
      assert.strictEqual(makeState('one\ntwo\nthree').lineBreak, '\n');
      assert.strictEqual(makeState('one\r\ntwo\nthree').lineBreak, '\n');
    });

    it('handles dynamic reconfiguration', () => {
      const editor = new TextEditor.TextEditor.TextEditor(makeState(''));
      renderElementIntoDOM(editor);

      assert.strictEqual(editor.state.facet(CodeMirror.indentUnit), '    ');
      Common.Settings.Settings.instance().moduleSetting('text-editor-indent').set('\t');
      assert.strictEqual(editor.state.facet(CodeMirror.indentUnit), '\t');
      Common.Settings.Settings.instance().moduleSetting('text-editor-indent').set('    ');
    });

    it('does not treat dashes as word chars in CSS', () => {
      const state = makeState('.some-selector {}', CodeMirror.css.cssLanguage);
      const {from, to} = state.wordAt(1)!;
      assert.strictEqual(state.sliceDoc(from, to), 'some');
    });
  });

  describe('autocompletion', () => {
    it('can complete builtins and keywords', async () => {
      const state = makeState('c', CodeMirror.javascript.javascriptLanguage);
      const result =
          await TextEditor.JavaScript.javascriptCompletionSource(new CodeMirror.CompletionContext(state, 1, false));
      assert.isNotNull(result);
      const completions = result ? result.options : [];
      assert.isTrue(completions.some(o => o.label === 'clear'));
      assert.isTrue(completions.some(o => o.label === 'continue'));
    });

    async function testQueryType(
        code: string,
        pos: number,
        type?: TextEditor.JavaScript.QueryType,
        range: string = '',
        related?: string,
        ): Promise<void> {
      const state = makeState(code, CodeMirror.javascript.javascriptLanguage);
      const query = TextEditor.JavaScript.getQueryType(CodeMirror.syntaxTree(state), pos, state.doc);
      if (type === undefined) {
        assert.isNull(query);
      } else {
        assert.isNotNull(query);
        if (query) {
          assert.strictEqual(query.type, type);
          assert.strictEqual(code.slice(query.from ?? pos, pos), range);
          assert.strictEqual(query.relatedNode && code.slice(query.relatedNode.from, query.relatedNode.to), related);
        }
      }
    }

    it('recognizes expression queries', async () => {
      await testQueryType('foo', 3, TextEditor.JavaScript.QueryType.EXPRESSION, 'foo');
      await testQueryType('foo ', 4, TextEditor.JavaScript.QueryType.EXPRESSION, '');
      await testQueryType('let', 3, TextEditor.JavaScript.QueryType.EXPRESSION, 'let');
    });

    it('recognizes propery name queries', async () => {
      await testQueryType('foo.bar', 7, TextEditor.JavaScript.QueryType.PROPERTY_NAME, 'bar', 'foo.bar');
      await testQueryType('foo.', 4, TextEditor.JavaScript.QueryType.PROPERTY_NAME, '', 'foo.');
      await testQueryType('if (foo.', 8, TextEditor.JavaScript.QueryType.PROPERTY_NAME, '', 'foo.');
      await testQueryType('new foo.bar().', 14, TextEditor.JavaScript.QueryType.PROPERTY_NAME, '', 'new foo.bar().');
      await testQueryType('foo?.', 5, TextEditor.JavaScript.QueryType.PROPERTY_NAME, '', 'foo?.');
      await testQueryType('foo?.b', 6, TextEditor.JavaScript.QueryType.PROPERTY_NAME, 'b', 'foo?.b');
    });

    it('recognizes property expression queries', async () => {
      await testQueryType('foo[', 4, TextEditor.JavaScript.QueryType.PROPERTY_EXPRESSION, '', 'foo[');
      await testQueryType('foo["ba', 7, TextEditor.JavaScript.QueryType.PROPERTY_EXPRESSION, '"ba', 'foo["ba');
    });

    describe('potential map key retrievals', () => {
      it('recognizes potential maps', async () => {
        await testQueryType('foo.get(', 8, TextEditor.JavaScript.QueryType.POTENTIALLY_RETRIEVING_FROM_MAP, '', 'foo');
        await testQueryType(
            'foo\n.get(', 9, TextEditor.JavaScript.QueryType.POTENTIALLY_RETRIEVING_FROM_MAP, '', 'foo');
      });

      it('leaves other expressions as-is', async () => {
        await testQueryType('foo.method(', 11, TextEditor.JavaScript.QueryType.EXPRESSION);
        await testQueryType('5 + (', 5, TextEditor.JavaScript.QueryType.EXPRESSION);
        await testQueryType('functionCall(', 13, TextEditor.JavaScript.QueryType.EXPRESSION);
      });
    });

    it('does not complete in inappropriate places', async () => {
      await testQueryType('"foo bar"', 4);
      await testQueryType('x["foo" + "bar', 14);
      await testQueryType('// comment', 10);
    });
  });

  it('dispatching a transaction from a saved editor reference should not throw an error', () => {
    const textEditor = new TextEditor.TextEditor.TextEditor(makeState('one'));
    const editorViewA = textEditor.editor;

    renderElementIntoDOM(textEditor);
    // textEditor.editor references to EditorView A.
    textEditor.dispatch({changes: {from: 0, insert: 'a'}});
    // `disconnectedCallback` removed `textEditor.#activeEditor`
    // so reaching to `textEditor.editor` will create a new EditorView after this.
    textEditor.remove();
    // EditorView B is created from the previous state
    // and EditorView B's state is diverged from previous state after this transaction.
    textEditor.dispatch({changes: {from: 0, insert: 'b'}});

    // directly dispatching from Editor A now calls `textEditor.editor.update`
    // which references to EditorView B that has a different state.
    assert.doesNotThrow(() => editorViewA.dispatch({changes: {from: 3, insert: '!'}}));
  });
});

describeWithMockConnection('TextEditor autocompletion', () => {
  it('does not complete on language plugin frames', async () => {
    const executionContext = new MockExecutionContext(createTarget());
    const {debuggerModel} = executionContext;
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);

    const {pluginManager} = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(
        {forceNew: true, targetManager, resourceMapping});
    const testScript = debuggerModel.parsedScriptSource(
        '1' as Protocol.Runtime.ScriptId, 'script://1' as Platform.DevToolsPath.UrlString, 0, 0, 0, 0,
        executionContext.id, '', undefined, false, undefined, false, false, 0, null, null, null, null, null, null);
    const payload: Protocol.Debugger.CallFrame = {
      callFrameId: '0' as Protocol.Debugger.CallFrameId,
      functionName: 'test',
      functionLocation: undefined,
      location: {
        scriptId: testScript.scriptId,
        lineNumber: 0,
        columnNumber: 0,
      },
      url: 'test-url',
      scopeChain: [],
      this: {type: 'object'} as Protocol.Runtime.RemoteObject,
      returnValue: undefined,
      canBeRestarted: false,
    };
    const callframe = new SDK.DebuggerModel.CallFrame(debuggerModel, testScript, payload);

    executionContext.debuggerModel.setSelectedCallFrame(callframe);
    pluginManager.addPlugin(new class extends TestPlugin {
      constructor() {
        super('TextEditorTestPlugin');
      }

      override handleScript(script: SDK.Script.Script) {
        return script === testScript;
      }
    }());

    const state = makeState('c', CodeMirror.javascript.javascriptLanguage);
    const result =
        await TextEditor.JavaScript.javascriptCompletionSource(new CodeMirror.CompletionContext(state, 1, false));
    assert.isNull(result);
  });
});
