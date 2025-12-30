// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as AiCodeCompletion from '../../../models/ai_code_completion/ai_code_completion.js';
import * as AiCodeGeneration from '../../../models/ai_code_generation/ai_code_generation.js';
import * as PanelCommon from '../../../panels/common/common.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';

import {AiCodeGenerationProvider, Config, TextEditor} from './text_editor.js';

function createEditorWithProvider(doc: string, config: AiCodeGenerationProvider.AiCodeGenerationConfig = {
  panel: AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE,
  generationContext: {},
  onSuggestionAccepted: () => {},
  onRequestTriggered: () => {},
  onResponseReceived: () => {},
}): {editor: TextEditor.TextEditor, provider: AiCodeGenerationProvider.AiCodeGenerationProvider} {
  const provider = AiCodeGenerationProvider.AiCodeGenerationProvider.createInstance(config);
  const editor = new TextEditor.TextEditor(
      CodeMirror.EditorState.create({
        doc,
        extensions: [
          provider.extension(),
        ],
      }),
  );
  renderElementIntoDOM(editor);
  provider.editorInitialized(editor);
  return {editor, provider};
}

describeWithEnvironment('AiCodeGenerationProvider', () => {
  let clock: sinon.SinonFakeTimers;
  let checkAccessPreconditionsStub: sinon.SinonStub;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    updateHostConfig({
      devToolsAiCodeGeneration: {
        enabled: true,
      },
      aidaAvailability: {
        enabled: true,
        blockedByAge: false,
        blockedByGeo: false,
      }
    });
    checkAccessPreconditionsStub = sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions');
    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    sinon.stub(Host.AidaClient.HostConfigTracker, 'instance').returns({
      addEventListener: () => {},
      removeEventListener: () => {},
      dispose: () => {},
    } as unknown as Host.AidaClient.HostConfigTracker);
    Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
  });

  afterEach(() => {
    clock.restore();
  });

  it('does not create a provider when the feature is disabled', () => {
    updateHostConfig({
      devToolsAiCodeGeneration: {
        enabled: false,
      },
    });
    assert.throws(() => createEditorWithProvider(''), 'AI code generation feature is not enabled.');
  });

  describe('Teaser decoration', () => {
    it('shows teaser when cursor is in empty line', async () => {
      const {editor, provider} = createEditorWithProvider('');
      await clock.tickAsync(0);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));
      provider.dispose();
    });

    it('shows teaser when cursor is at the end of a comment line', async () => {
      const {editor, provider} = createEditorWithProvider('// Hello');
      editor.dispatch({selection: {anchor: 8}});
      await clock.tickAsync(0);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));
      provider.dispose();
    });

    it('hides teaser when cursor is not at the end of the line', async () => {
      const {editor, provider} = createEditorWithProvider('// Hello');
      editor.dispatch({selection: {anchor: 5}});
      await clock.tickAsync(0);
      assert.isNull(editor.editor.dom.querySelector('.cm-placeholder'));
      provider.dispose();
    });

    it('hides teaser when the line is not a comment', async () => {
      const {editor, provider} = createEditorWithProvider('console');
      editor.dispatch({selection: {anchor: 7}});
      await clock.tickAsync(0);
      assert.isNull(editor.editor.dom.querySelector('.cm-placeholder'));
      provider.dispose();
    });

    it('hides teaser when mode is DISMISSED', async () => {
      const {editor, provider} = createEditorWithProvider('// Hello');
      editor.dispatch({selection: {anchor: 8}});
      await clock.tickAsync(0);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));

      editor.dispatch({
        effects: AiCodeGenerationProvider.setAiCodeGenerationTeaserMode.of(
            AiCodeGenerationProvider.AiCodeGenerationTeaserMode.DISMISSED)
      });
      await clock.tickAsync(0);
      assert.isNull(editor.editor.dom.querySelector('.cm-placeholder'));
      provider.dispose();
    });

    it('shows teaser again after a document change', async () => {
      const {editor, provider} = createEditorWithProvider('// Hello');
      editor.dispatch({selection: {anchor: 8}});
      await clock.tickAsync(0);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));

      editor.dispatch({
        effects: AiCodeGenerationProvider.setAiCodeGenerationTeaserMode.of(
            AiCodeGenerationProvider.AiCodeGenerationTeaserMode.DISMISSED)
      });
      await clock.tickAsync(0);
      assert.isNull(editor.editor.dom.querySelector('.cm-placeholder'));

      editor.dispatch({changes: {from: 8, insert: 'W'}, selection: {anchor: 9}});
      await clock.tickAsync(0);
      assert.isNotNull(editor.editor.dom.querySelector('.cm-placeholder'));
      provider.dispose();
    });
  });

  describe('Editor keymap', () => {
    it('accepts suggestion on Tab', async () => {
      const {editor, provider} = createEditorWithProvider('');
      await clock.tickAsync(0);  // for the initial onAidaAvailabilityChange call

      editor.dispatch({
        effects: Config.setAiAutoCompleteSuggestion.of({
          text: 'code suggestion',
          from: 0,
          rpcGlobalId: 1,
          sampleId: 1,
          startTime: performance.now(),
          onImpression: () => {},
        }),
      });
      editor.editor.contentDOM.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab'}));

      assert.strictEqual(editor.state.doc.toString(), 'code suggestion');
      provider.dispose();
    });

    it('dismisses suggestion on Escape', async () => {
      const {editor, provider} = createEditorWithProvider('');
      await clock.tickAsync(0);  // for the initial onAidaAvailabilityChange call

      editor.dispatch({
        effects: Config.setAiAutoCompleteSuggestion.of({
          text: 'code suggestion',
          from: 0,
          rpcGlobalId: 1,
          sampleId: 1,
          startTime: performance.now(),
          onImpression: () => {},
        }),
      });

      assert.isNotNull(editor.editor.state.field(Config.aiAutoCompleteSuggestionState));

      editor.editor.contentDOM.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));

      assert.isNull(editor.editor.state.field(Config.aiAutoCompleteSuggestionState));
      provider.dispose();
    });

    it('dismisses teaser on Escape when loading', async () => {
      const generateCodeStub = sinon.stub(AiCodeGeneration.AiCodeGeneration.AiCodeGeneration.prototype, 'generateCode');
      generateCodeStub.returns(new Promise(() => {}));
      const generationTeaser = PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaser.prototype;
      sinon.stub(generationTeaser, 'displayState').set(_ => {});
      const loadingSetter = sinon.spy(generationTeaser, 'displayState', ['set']);
      const {editor, provider} = createEditorWithProvider('// Hello');
      editor.dispatch({selection: {anchor: 8}});
      await clock.tickAsync(0);

      const triggerEvent = new KeyboardEvent('keydown', {
        key: 'i',
        ctrlKey: Host.Platform.isMac() ? false : true,
        metaKey: Host.Platform.isMac() ? true : false,
      });
      editor.editor.contentDOM.dispatchEvent(triggerEvent);
      // Explicitly set display state to LOADING, so that loading state can be cancelled as expected
      sinon.stub(generationTeaser, 'displayState')
          .get(() => PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.LOADING);
      await clock.tickAsync(0);

      assert.deepEqual(
          loadingSetter.set.lastCall.args[0],
          PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.LOADING);
      sinon.assert.calledOnce(generateCodeStub);

      const dispatchSpy = sinon.spy(editor, 'dispatch');
      editor.editor.contentDOM.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
      await clock.tickAsync(0);

      sinon.assert.calledOnce(dispatchSpy);
      sinon.assert.calledWith(dispatchSpy, {
        effects: [
          AiCodeGenerationProvider.setAiCodeGenerationTeaserMode.of(
              AiCodeGenerationProvider.AiCodeGenerationTeaserMode.DISMISSED),
          Config.setAiAutoCompleteSuggestion.of(null),
        ]
      });
      assert.deepEqual(
          loadingSetter.set.lastCall.args[0],
          PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.TRIGGER);
      provider.dispose();
    });

    it('triggers code generation on Ctrl+I', async () => {
      const generateCodeStub = sinon.stub(AiCodeGeneration.AiCodeGeneration.AiCodeGeneration.prototype, 'generateCode');
      const generationTeaser = PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaser.prototype;
      sinon.stub(generationTeaser, 'displayState').set(_ => {});
      Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(true);
      const {editor, provider} = createEditorWithProvider('// Hello');
      editor.dispatch({selection: {anchor: 8}});
      await clock.tickAsync(0);

      const event = new KeyboardEvent('keydown', {
        key: 'i',
        ctrlKey: Host.Platform.isMac() ? false : true,
        metaKey: Host.Platform.isMac() ? true : false,
      });
      editor.editor.contentDOM.dispatchEvent(event);

      sinon.assert.calledOnce(generateCodeStub);
      assert.deepEqual(generateCodeStub.firstCall.args[0], '// Hello');
      provider.dispose();
    });

    it('triggers loading state on Ctrl+I', async () => {
      const {editor, provider} = createEditorWithProvider('// Hello');
      const generationTeaser = PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaser.prototype;
      sinon.stub(generationTeaser, 'displayState').set(_ => {});
      const loadingSetter = sinon.spy(generationTeaser, 'displayState', ['set']);
      sinon.stub(PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaser.prototype, 'isShowing').returns(true);
      editor.dispatch({selection: {anchor: 8}});
      await clock.tickAsync(0);

      const event = new KeyboardEvent('keydown', {
        key: 'i',
        ctrlKey: Host.Platform.isMac() ? false : true,
        metaKey: Host.Platform.isMac() ? true : false,
      });
      editor.editor.contentDOM.dispatchEvent(event);

      assert.deepEqual(
          loadingSetter.set.lastCall.args[0],
          PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.LOADING);
      provider.dispose();
    });

    it('aborts code generation request when Escape is pressed while loading', async () => {
      const generateCodeStub = sinon.stub(AiCodeGeneration.AiCodeGeneration.AiCodeGeneration.prototype, 'generateCode');
      generateCodeStub.returns(new Promise(() => {}));
      const generationTeaser = PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaser.prototype;
      sinon.stub(generationTeaser, 'displayState').set(_ => {});
      const abortSpy = sinon.spy(AbortController.prototype, 'abort');
      const {editor, provider} = createEditorWithProvider('// Hello');
      editor.dispatch({selection: {anchor: 8}});
      await clock.tickAsync(0);

      const triggerEvent = new KeyboardEvent('keydown', {
        key: 'i',
        ctrlKey: Host.Platform.isMac() ? false : true,
        metaKey: Host.Platform.isMac() ? true : false,
      });
      editor.editor.contentDOM.dispatchEvent(triggerEvent);
      // Explicitly set display state to LOADING, so that abort is called as expected
      sinon.stub(generationTeaser, 'displayState')
          .get(() => PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.LOADING);
      await clock.tickAsync(0);

      sinon.assert.calledOnce(generateCodeStub);

      editor.editor.contentDOM.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
      await clock.tickAsync(0);

      sinon.assert.calledOnce(abortSpy);
      const suggestion = editor.editor.state.field(Config.aiAutoCompleteSuggestionState);
      assert.notExists(suggestion);
      provider.dispose();
    });
  });

  it('aborts code generation request when user starts typing again', async () => {
    const generateCodeStub = sinon.stub(AiCodeGeneration.AiCodeGeneration.AiCodeGeneration.prototype, 'generateCode');
    generateCodeStub.returns(new Promise(() => {}));
    const generationTeaser = PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaser.prototype;
    sinon.stub(generationTeaser, 'displayState').set(_ => {});
    const abortSpy = sinon.spy(AbortController.prototype, 'abort');
    const {editor, provider} = createEditorWithProvider('// Hello');
    editor.dispatch({selection: {anchor: 8}});
    await clock.tickAsync(0);

    const triggerEvent = new KeyboardEvent('keydown', {
      key: 'i',
      ctrlKey: Host.Platform.isMac() ? false : true,
      metaKey: Host.Platform.isMac() ? true : false,
    });
    editor.editor.contentDOM.dispatchEvent(triggerEvent);
    // Explicitly set display state to LOADING, so that abort is called as expected
    sinon.stub(generationTeaser, 'displayState')
        .get(() => PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.LOADING);
    await clock.tickAsync(0);

    sinon.assert.calledOnce(generateCodeStub);

    editor.dispatch({changes: {from: 8, insert: '!'}});
    await clock.tickAsync(0);

    sinon.assert.calledOnce(abortSpy);
    const suggestion = editor.editor.state.field(Config.aiAutoCompleteSuggestionState);
    assert.notExists(suggestion);
    provider.dispose();
  });

  describe('Dispatches', () => {
    it('dispatches a suggestion to the editor and updates teaser state when AIDA returns suggestion', async () => {
      const generationTeaser = PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaser.prototype;
      sinon.stub(generationTeaser, 'displayState').set(_ => {});
      const loadingSetter = sinon.spy(generationTeaser, 'displayState', ['set']);
      const generateCodeStub = sinon.stub(AiCodeGeneration.AiCodeGeneration.AiCodeGeneration.prototype, 'generateCode')
                                   .returns(Promise.resolve({
                                     samples: [{
                                       generationString: '```javascript\nconsole.log(\'suggestion\');\n```',
                                       sampleId: 1,
                                       score: 1,
                                     }],
                                     metadata: {rpcGlobalId: 1},
                                   }));
      const {editor, provider} = createEditorWithProvider('// Hello');
      editor.dispatch({selection: {anchor: 8}});
      await clock.tickAsync(0);

      const event = new KeyboardEvent('keydown', {
        key: 'i',
        ctrlKey: Host.Platform.isMac() ? false : true,
        metaKey: Host.Platform.isMac() ? true : false,
      });
      editor.editor.contentDOM.dispatchEvent(event);
      await clock.tickAsync(0);

      sinon.assert.calledOnce(generateCodeStub);
      const suggestion = editor.editor.state.field(Config.aiAutoCompleteSuggestionState);
      assert.exists(suggestion);
      assert.strictEqual(suggestion.text, '\nconsole.log(\'suggestion\');');
      assert.strictEqual(suggestion.from, 8);
      assert.strictEqual(suggestion.sampleId, 1);
      assert.strictEqual(suggestion.rpcGlobalId, 1);
      sinon.assert.calledWith(
          loadingSetter.set, PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.GENERATED);
      provider.dispose();
    });

    it('does not dispatch suggestion or citation if recitation action is BLOCK', async () => {
      const generationTeaser = PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaser.prototype;
      sinon.stub(generationTeaser, 'displayState').set(_ => {});
      const generateCodeStub = sinon.stub(AiCodeGeneration.AiCodeGeneration.AiCodeGeneration.prototype, 'generateCode')
                                   .returns(Promise.resolve({
                                     samples: [{
                                       generationString: 'suggestion',
                                       sampleId: 1,
                                       score: 1,
                                       attributionMetadata: {
                                         attributionAction: Host.AidaClient.RecitationAction.BLOCK,
                                         citations: [{uri: 'https://www.example.com'}],
                                       }
                                     }],
                                     metadata: {},
                                   }));
      const {editor, provider} = createEditorWithProvider('// Hello');
      editor.dispatch({selection: {anchor: 8}});
      await clock.tickAsync(0);

      const event = new KeyboardEvent('keydown', {
        key: 'i',
        ctrlKey: Host.Platform.isMac() ? false : true,
        metaKey: Host.Platform.isMac() ? true : false,
      });
      editor.editor.contentDOM.dispatchEvent(event);
      await clock.tickAsync(0);

      sinon.assert.calledOnce(generateCodeStub);
      const suggestion = editor.editor.state.field(Config.aiAutoCompleteSuggestionState);
      assert.notExists(suggestion);
      provider.dispose();
    });
  });

  it('logs error and dismisses teaser when generateCode rejects', async () => {
    const generateCodeStub = sinon.stub(AiCodeGeneration.AiCodeGeneration.AiCodeGeneration.prototype, 'generateCode')
                                 .rejects(new Error('AIDA Error'));
    const actionTakenStub = sinon.stub(Host.userMetrics, 'actionTaken');
    const {editor, provider} = createEditorWithProvider('// Hello');
    const generationTeaser = PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaser.prototype;
    sinon.stub(generationTeaser, 'isShowing').returns(true);
    sinon.stub(generationTeaser, 'displayState').set(_ => {});
    const loadingSetter = sinon.spy(generationTeaser, 'displayState', ['set']);
    editor.dispatch({selection: {anchor: 8}});
    await clock.tickAsync(0);

    const event = new KeyboardEvent('keydown', {
      key: 'i',
      ctrlKey: Host.Platform.isMac() ? false : true,
      metaKey: Host.Platform.isMac() ? true : false,
    });
    const dispatchSpy = sinon.spy(editor, 'dispatch');
    editor.editor.contentDOM.dispatchEvent(event);
    await clock.tickAsync(0);

    sinon.assert.calledOnce(generateCodeStub);
    sinon.assert.calledWith(actionTakenStub, Host.UserMetrics.Action.AiCodeGenerationError);
    const suggestion = editor.editor.state.field(Config.aiAutoCompleteSuggestionState);
    assert.notExists(suggestion);
    sinon.assert.calledWith(
        loadingSetter.set, PanelCommon.AiCodeGenerationTeaser.AiCodeGenerationTeaserDisplayState.TRIGGER);
    sinon.assert.calledWith(dispatchSpy, {
      effects: [
        AiCodeGenerationProvider.setAiCodeGenerationTeaserMode.of(
            AiCodeGenerationProvider.AiCodeGenerationTeaserMode.DISMISSED),
        Config.setAiAutoCompleteSuggestion.of(null),
      ]
    });
    provider.dispose();
  });
});
