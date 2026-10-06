// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import * as SourceMapScopes from '../../../models/source_map_scopes/source_map_scopes.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment, updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../../testing/ExpectStubCall.js';
import {TestPlugin} from '../../../testing/LanguagePluginHelpers.js';
import {MockExecutionContext} from '../../../testing/MockExecutionContext.js';
import {MockDebuggerBackend} from '../../../testing/MockScopeChain.js';
import {encodeSourceMap} from '../../../testing/SourceMapEncoder.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
import * as ScopesCodec from '../../../third_party/source-map-scopes-codec/source-map-scopes-codec.js';
import * as UI from '../../legacy/legacy.js';
import * as ThemeSupport from '../../legacy/theme_support/theme_support.js';

import * as TextEditor from './text_editor.js';

const {urlString} = Platform.DevToolsPath;

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

    it('propagates data-file-path attribute to active editor DOM', () => {
      const editor = new TextEditor.TextEditor.TextEditor(makeState(''));
      editor.setAttribute('data-file-path', 'test.js');
      assert.strictEqual(editor.editor.dom.getAttribute('data-file-path'), 'test.js');

      renderElementIntoDOM(editor);
      editor.remove();
      renderElementIntoDOM(editor);
      assert.strictEqual(editor.editor.dom.getAttribute('data-file-path'), 'test.js');

      editor.removeAttribute('data-file-path');
      assert.isNull(editor.editor.dom.getAttribute('data-file-path'));
      editor.remove();
    });

    it('can highlight whitespace', () => {
      const editor = new TextEditor.TextEditor.TextEditor(
          makeState('line1  \n  line2( )\n\tline3  ', TextEditor.Config.showWhitespace.instance()));
      renderElementIntoDOM(editor);
      assert.lengthOf(editor.editor.dom.querySelectorAll('.cm-trailingWhitespace, .cm-highlightedSpaces'), 0);
      Common.Settings.Settings.instance().moduleSetting('show-whitespaces-in-editor').set('all');
      assert.lengthOf(editor.editor.dom.querySelectorAll('.cm-highlightedSpaces'), 4);
      assert.lengthOf(editor.editor.dom.querySelectorAll('.cm-highlightedTab'), 1);
      Common.Settings.Settings.instance().moduleSetting('show-whitespaces-in-editor').set('trailing');
      assert.lengthOf(editor.editor.dom.querySelectorAll('.cm-highlightedSpaces'), 0);
      assert.lengthOf(editor.editor.dom.querySelectorAll('.cm-trailingWhitespace'), 2);
      Common.Settings.Settings.instance().moduleSetting('show-whitespaces-in-editor').set('none');
      assert.lengthOf(editor.editor.dom.querySelectorAll('.cm-trailingWhitespace, .cm-highlightedSpaces'), 0);
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

    it('removes its theme change listener when disconnected', () => {
      const themeSupport = ThemeSupport.ThemeSupport.instance();
      const addSpy = sinon.spy(themeSupport, 'addEventListener');
      const removeSpy = sinon.spy(themeSupport, 'removeEventListener');
      const editor = new TextEditor.TextEditor.TextEditor(makeState(''));

      renderElementIntoDOM(editor);
      editor.remove();

      const themeListenersOf = (spy: typeof addSpy|typeof removeSpy) =>
          spy.getCalls()
              .filter(call => call.args[0] === ThemeSupport.ThemeChangeEvent.eventName)
              .map(call => call.args[1]);
      const added = themeListenersOf(addSpy);
      assert.isNotEmpty(added);
      assert.sameMembers(themeListenersOf(removeSpy), added);
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
        range = '',
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

  describe('AI auto completion', () => {
    it('can dispatch an effect to set the AI auto complete suggestion', () => {
      const editor = new TextEditor.TextEditor.TextEditor(makeState('', TextEditor.Config.aiAutoCompleteSuggestion));
      renderElementIntoDOM(editor);

      const text = 'hello';
      editor.dispatch({
        effects: TextEditor.Config.setAiAutoCompleteSuggestion.of({
          text,
          from: 0,
          sampleId: 1,
          startTime: 0,
          onImpression: () => {},
          clearCachedRequest: () => {},
          source: TextEditor.Config.AiSuggestionSource.COMPLETION,
        }),
      });

      const actualSuggestion = editor.editor.state.field(TextEditor.Config.aiAutoCompleteSuggestionState);
      assert.isOk(actualSuggestion);
      assert.strictEqual(actualSuggestion.text, text);
      editor.remove();
    });

    it('keeps the AI suggestion if the typed text is a prefix of the suggestion', () => {
      const editor = new TextEditor.TextEditor.TextEditor(makeState('', TextEditor.Config.aiAutoCompleteSuggestion));
      renderElementIntoDOM(editor);

      editor.dispatch({
        effects: TextEditor.Config.setAiAutoCompleteSuggestion.of({
          text: 'hello',
          from: 0,
          sampleId: 1,
          startTime: 0,
          onImpression: () => {},
          clearCachedRequest: () => {},
          source: TextEditor.Config.AiSuggestionSource.COMPLETION,
        }),
      });
      assert.isOk(editor.editor.state.field(TextEditor.Config.aiAutoCompleteSuggestionState));

      editor.dispatch({
        changes: {from: 0, insert: 'he'},
        selection: {anchor: 2},
      });
      assert.isOk(editor.editor.state.field(TextEditor.Config.aiAutoCompleteSuggestionState));
      editor.remove();
    });

    it('clears the AI auto complete suggestion if the typed text is not a prefix of the suggestion', () => {
      const editor = new TextEditor.TextEditor.TextEditor(makeState('', TextEditor.Config.aiAutoCompleteSuggestion));
      renderElementIntoDOM(editor);

      editor.dispatch({
        effects: TextEditor.Config.setAiAutoCompleteSuggestion.of({
          text: 'hello',
          from: 0,
          sampleId: 1,
          startTime: 0,
          onImpression: () => {},
          clearCachedRequest: () => {},
          source: TextEditor.Config.AiSuggestionSource.COMPLETION,
        }),
      });
      assert.isOk(editor.editor.state.field(TextEditor.Config.aiAutoCompleteSuggestionState));

      editor.dispatch({changes: {from: 0, insert: 'a'}, selection: {anchor: 1}});
      assert.isNull(editor.editor.state.field(TextEditor.Config.aiAutoCompleteSuggestionState));
      editor.remove();
    });

    it('can accept an AI auto complete suggestion', () => {
      const editor = new TextEditor.TextEditor.TextEditor(makeState('', TextEditor.Config.aiAutoCompleteSuggestion));
      renderElementIntoDOM(editor);
      const text = 'hello';
      editor.dispatch({
        effects: TextEditor.Config.setAiAutoCompleteSuggestion.of({
          text,
          from: 0,
          sampleId: 1,
          startTime: 0,
          onImpression: () => {},
          clearCachedRequest: () => {},
          source: TextEditor.Config.AiSuggestionSource.COMPLETION,
        }),
      });

      const {accepted, suggestion} = TextEditor.Config.acceptAiAutoCompleteSuggestion(editor.editor);
      assert.isTrue(accepted);
      assert.strictEqual(suggestion?.text, text);

      assert.strictEqual(editor.state.doc.toString(), text);
      assert.isNull(editor.editor.state.field(TextEditor.Config.aiAutoCompleteSuggestionState));
      editor.remove();
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
    editorViewA.destroy();
  });
});

describeWithEnvironment('TextEditor autocompletion', () => {
  it('does not complete on language plugin frames', async () => {
    const executionContext = new MockExecutionContext(createTarget());
    const {debuggerModel} = executionContext;
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    const {pluginManager} = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
      workspace,
    });
    const testScript = debuggerModel.parsedScriptSource('1' as Protocol.Runtime.ScriptId, urlString`script://1`, 0, 0,
                                                        0, 0, executionContext.id, '', undefined, undefined, false,
                                                        false, 0, null, null, null, null, null, null, null);
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

  it('completes original and synthesized variables from source map scopes and skips unavailable variables',
     async () => {
       updateHostConfig({devToolsSourceMapScopesInSourcesPanel: {enabled: true}});
       const backend = new MockDebuggerBackend();
       sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
           .returns(backend.universe.debuggerWorkspaceBinding);
       sinon.stub(SourceMapScopes.ScopeChainResolver.ScopeChainResolver, 'instance')
           .returns(backend.universe.scopeChainResolver);
       const target = backend.createTarget();

       const sourceMapUrl = 'file:///tmp/example.js.min.map';
       const builder = new ScopesCodec.ScopeInfoBuilder();
       builder.startSource()
           .startScope(0, 0, {kind: 'global', key: 'global'})
           .startScope(0, 0, {
             kind: 'function',
             name: 'outerFn',
             isStackFrame: true,
             variables: ['outerVar', 'unavailableVar', 'undefVar'],
             key: 'outer',
           })
           .startScope(0, 10, {
             kind: 'function',
             name: 'inlinedFn',
             isStackFrame: true,
             variables: ['synthesizedConst', 'inlinedCallback'],
             key: 'inlined',
           })
           .endScope(0, 20)
           .endScope(0, 20)
           .endScope(0, 20)
           .endSource();
       builder.startRange(0, 0, {scopeKey: 'global'})
           .startRange(0, 0, {
             scopeKey: 'outer',
             isStackFrame: true,
             values: ['a', null, 'u'],
           })
           .startRange(0, 0, {
             scopeKey: 'inlined',
             values: ['42', 'cb'],
             callSite: {sourceIndex: 0, line: 0, column: 5},
           })
           .endRange(0, 30)
           .endRange(0, 30)
           .endRange(0, 30);

       const baseMap = encodeSourceMap(['0:0 => index.js:0:12']);
       const map = ScopesCodec.encode(builder.build(), baseMap as ScopesCodec.SourceMapJson);
       const sourceMapContent = JSON.stringify(map);

       const source = `function f(a,u,cb){console.log(a)}\n//# sourceMappingURL=${sourceMapUrl}`;
       const scopes = '                  {              }';
       const callFrame = await backend.createCallFrame(target, {url: urlString`file:///tmp/bundle.js`, content: source},
                                                       scopes, {url: sourceMapUrl, content: sourceMapContent});
       const inlinedFrame = callFrame.createVirtualCallFrame(0, 'inlinedFn');

       sinon.stub(inlinedFrame, 'evaluate').callsFake(async ({expression}) => {
         if (expression.includes('(42)')) {
           return {object: new SDK.RemoteObject.LocalJSONObject({0: 42, 1: () => {}})};
         }
         if (expression.includes('(a)')) {
           return {object: new SDK.RemoteObject.LocalJSONObject({0: 'hello', 2: undefined})};
         }
         return {object: new SDK.RemoteObject.LocalJSONObject({})};
       });

       const executionContext = new MockExecutionContext(target);
       sinon.stub(executionContext.debuggerModel, 'selectedCallFrame').returns(inlinedFrame);
       UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);

       const state = makeState('', CodeMirror.javascript.javascriptLanguage);
       const result =
           await TextEditor.JavaScript.javascriptCompletionSource(new CodeMirror.CompletionContext(state, 0, true));
       assert.isNotNull(result);

       const byLabel = new Map(result.options.map(option => [option.label, option]));
       assert.strictEqual(byLabel.get('synthesizedConst')?.type, 'variable');
       assert.strictEqual(byLabel.get('inlinedCallback')?.type, 'function');
       assert.strictEqual(byLabel.get('outerVar')?.type, 'variable');
       assert.strictEqual(byLabel.get('undefVar')?.type, 'variable');
       assert.isFalse(byLabel.has('unavailableVar'));
     });

  it('substitutes source-mapped variable names when completing properties and invalidates cache on frame change',
     async () => {
       updateHostConfig({devToolsSourceMapScopesInSourcesPanel: {enabled: true}});
       const backend = new MockDebuggerBackend();
       sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
           .returns(backend.universe.debuggerWorkspaceBinding);
       sinon.stub(SourceMapScopes.ScopeChainResolver.ScopeChainResolver, 'instance')
           .returns(backend.universe.scopeChainResolver);
       sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(backend.universe.targetManager);
       const target = backend.createTarget();

       const sourceMapUrl = 'file:///tmp/example.js.min.map';
       const builder = new ScopesCodec.ScopeInfoBuilder();
       builder.startSource()
           .startScope(0, 0, {kind: 'global', key: 'global'})
           .startScope(0, 0, {
             kind: 'function',
             name: 'fn',
             isStackFrame: true,
             variables: ['origObj'],
             key: 'fn',
           })
           .endScope(0, 20)
           .endScope(0, 20)
           .endSource();
       builder.startRange(0, 0, {scopeKey: 'global'})
           .startRange(0, 0, {
             scopeKey: 'fn',
             isStackFrame: true,
             values: ['_mod.genObj'],
           })
           .endRange(0, 30)
           .endRange(0, 30);

       const baseMap = encodeSourceMap(['0:0 => index.js:0:5']);
       const map = ScopesCodec.encode(builder.build(), baseMap as ScopesCodec.SourceMapJson);
       const sourceMapContent = JSON.stringify(map);

       const source = `function f(){console.log(_mod.genObj)}\n//# sourceMappingURL=${sourceMapUrl}`;
       const scopes = '            {                        }';
       const callFrame = await backend.createCallFrame(target, {
         url: urlString`file:///tmp/bundle.js`,
         content: source,
         scriptLanguage: Protocol.Debugger.ScriptLanguage.JavaScript,
       },
                                                       scopes, {url: sourceMapUrl, content: sourceMapContent});

       const executionContext = new MockExecutionContext(target);
       executionContext.debuggerModel.setSelectedCallFrame(callFrame);
       UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);

       let currentProps: Record<string, unknown> = {firstProp: 1, firstMethod: () => {}};
       const evaluateSpy = sinon.stub(callFrame, 'evaluate').callsFake(async options => {
         if (options.expression === '_mod.genObj') {
           return {object: new SDK.RemoteObject.LocalJSONObject(currentProps)};
         }
         return {object: new SDK.RemoteObject.LocalJSONObject({})};
       });

       const state = makeState('origObj.', CodeMirror.javascript.javascriptLanguage);
       const result1 =
           await TextEditor.JavaScript.javascriptCompletionSource(new CodeMirror.CompletionContext(state, 8, false));
       assert.isNotNull(result1);
       sinon.assert.calledWithMatch(evaluateSpy, {expression: '_mod.genObj'});
       const labels1 = new Map(result1.options.map(o => [o.label, o.type]));
       assert.strictEqual(labels1.get('firstProp'), 'property');
       assert.strictEqual(labels1.get('firstMethod'), 'method');

       // Change properties and switch call frames to verify PropertyCache invalidation on CallFrameSelected.
       currentProps = {secondProp: 2};
       const otherFrame = callFrame.createVirtualCallFrame(0, 'other');
       sinon.stub(otherFrame, 'evaluate').callsFake(async options => {
         if (options.expression === '_mod.genObj') {
           return {object: new SDK.RemoteObject.LocalJSONObject(currentProps)};
         }
         return {object: new SDK.RemoteObject.LocalJSONObject({})};
       });
       executionContext.debuggerModel.setSelectedCallFrame(otherFrame);

       const result2 =
           await TextEditor.JavaScript.javascriptCompletionSource(new CodeMirror.CompletionContext(state, 8, false));
       assert.isNotNull(result2);
       const labels2 = new Map(result2.options.map(o => [o.label, o.type]));
       assert.strictEqual(labels2.get('secondProp'), 'property');
       assert.isFalse(labels2.has('firstProp'));
     });

  it('completes only variables, not properties, from a Location when not paused or paused elsewhere', async () => {
    updateHostConfig({devToolsSourceMapScopesInSourcesPanel: {enabled: true}});
    const backend = new MockDebuggerBackend();
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(backend.universe.debuggerWorkspaceBinding);
    sinon.stub(SourceMapScopes.ScopeChainResolver.ScopeChainResolver, 'instance')
        .returns(backend.universe.scopeChainResolver);
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(backend.universe.targetManager);
    const target = backend.createTarget();

    const sourceMapUrl = 'file:///tmp/example.js.min.map';
    const builder = new ScopesCodec.ScopeInfoBuilder();
    builder.startSource()
        .startScope(0, 0, {kind: 'global', key: 'global'})
        .startScope(0, 0, {
          kind: 'function',
          name: 'outerFn',
          isStackFrame: true,
          variables: ['outerVar', 'unavailableVar', 'origObj'],
          key: 'outer',
        })
        .startScope(0, 10, {
          kind: 'function',
          name: 'inlinedFn',
          isStackFrame: true,
          variables: ['synthesizedConst'],
          key: 'inlined',
        })
        .endScope(0, 20)
        .endScope(0, 20)
        .endScope(0, 20)
        .endSource();
    builder.startRange(0, 0, {scopeKey: 'global'})
        .startRange(0, 0, {
          scopeKey: 'outer',
          isStackFrame: true,
          values: ['a', null, '_mod.genObj'],
        })
        .startRange(0, 18, {
          scopeKey: 'inlined',
          values: ['42'],
          callSite: {sourceIndex: 0, line: 0, column: 5},
        })
        .endRange(0, 35)
        .endRange(0, 35)
        .endRange(0, 35);

    const baseMap = encodeSourceMap(['0:18 => index.js:0:12']);
    const map = ScopesCodec.encode(builder.build(), baseMap as ScopesCodec.SourceMapJson);
    const sourceMapContent = JSON.stringify(map);

    const source = `function f(a){console.log(a,_mod.genObj)}\n//# sourceMappingURL=${sourceMapUrl}`;
    const scopes = '             {                          }';
    const unrelatedCallFrame = await backend.createCallFrame(target, {
      url: urlString`file:///tmp/bundle.js`,
      content: source,
      scriptLanguage: Protocol.Debugger.ScriptLanguage.JavaScript,
    },
                                                             scopes, {url: sourceMapUrl, content: sourceMapContent});
    const script = unrelatedCallFrame.script;
    const location = new SDK.DebuggerModel.Location(script.debuggerModel, script.scriptId, 0, 20);

    const executionContext = new MockExecutionContext(target);
    assert.isNull(executionContext.debuggerModel.selectedCallFrame());
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);

    const evaluateSpy = sinon.stub(executionContext, 'evaluate').resolves({
      object: new SDK.RemoteObject.LocalJSONObject({unrelatedGlobalProp: 1}),
    });

    const completionOptions: TextEditor.JavaScript.CompletionOptions = {
      location: async () => location,
    };

    const scopeState = makeState('', CodeMirror.javascript.javascriptLanguage);
    const scopeResult = await TextEditor.JavaScript.javascriptCompletionSource(
        new CodeMirror.CompletionContext(scopeState, 0, true), completionOptions);
    assert.isNotNull(scopeResult);

    const byLabel = new Map(scopeResult.options.map(option => [option.label, option]));
    assert.strictEqual(byLabel.get('synthesizedConst')?.type, 'variable');
    assert.strictEqual(byLabel.get('outerVar')?.type, 'variable');
    assert.strictEqual(byLabel.get('origObj')?.type, 'variable');
    assert.isFalse(byLabel.has('unavailableVar'));

    // Without a call frame at `location`, the local variables don't exist anywhere we could evaluate in.
    // Evaluating in the global scope would resolve e.g. `outerVar` (generated `a`) to an unrelated global.
    evaluateSpy.resetHistory();
    const propState = makeState('outerVar.', CodeMirror.javascript.javascriptLanguage);
    const propResult = await TextEditor.JavaScript.javascriptCompletionSource(
        new CodeMirror.CompletionContext(propState, 9, false), completionOptions);
    assert.isNull(propResult);
    sinon.assert.notCalled(evaluateSpy);

    // Same when paused at an unrelated call frame (line 0, col 13 != col 20).
    const unrelatedFrameEvaluateSpy = sinon.spy(unrelatedCallFrame, 'evaluate');
    executionContext.debuggerModel.setSelectedCallFrame(unrelatedCallFrame);

    const propResultWhilePausedElsewhere = await TextEditor.JavaScript.javascriptCompletionSource(
        new CodeMirror.CompletionContext(propState, 9, false), completionOptions);
    assert.isNull(propResultWhilePausedElsewhere);
    sinon.assert.notCalled(unrelatedFrameEvaluateSpy);
    sinon.assert.notCalled(evaluateSpy);
  });
});
