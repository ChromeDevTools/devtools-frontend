// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as Root from '../../../../core/root/root.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as TextUtils from '../../../../core/text_utils/text_utils.js';
import {
  dispatchInputEvent,
  dispatchPasteEvent,
  renderElementIntoDOM,
} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../../../testing/ExpectStubCall.js';
import {createViewFunctionStub} from '../../../../testing/ViewFunctionHelpers.js';
import * as Buttons from '../../../components/buttons/buttons.js';
import {render} from '../../../lit/lit.js';
import * as UI from '../../legacy.js';

import * as SourceFrame from './source_frame.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('SourceFrame', () => {
  let setting: Common.Settings.Setting<boolean>;

  beforeEach(() => {
    setting = Common.Settings.Settings.instance().createSetting('disable-self-xss-warning', false,
                                                                Common.Settings.SettingStorageType.SYNCED);
    setting.set(false);
  });

  async function createSourceFrame(content: string): Promise<SourceFrame.SourceFrame.SourceFrameImpl> {
    const sourceFrame =
        new SourceFrame.SourceFrame.SourceFrameImpl(async () => TextUtils.ContentData.EMPTY_TEXT_CONTENT_DATA);
    await sourceFrame.setContent(content);
    return sourceFrame;
  }

  async function pasteIntoSourceFrame(): Promise<{codeMirror: HTMLDivElement, dataTransfer: DataTransfer}> {
    const sourceFrame = await createSourceFrame('Example');
    const codeMirror =
        sourceFrame.element.querySelector('devtools-text-editor')?.shadowRoot?.querySelector('.cm-content') || null;
    assert.instanceOf(codeMirror, HTMLDivElement);

    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', 'foo');
    dispatchPasteEvent(codeMirror, {clipboardData: dataTransfer, bubbles: true});
    await new Promise(resolve => setTimeout(resolve, 0));
    return {codeMirror, dataTransfer};
  }

  it('finds string by simple regex', async () => {
    const sourceFrame = await createSourceFrame('Example');

    sourceFrame.performSearch(
        new UI.SearchableView.SearchConfig('xa', /* caseSensitive */ false, /* wholeWord */ false, /* isRegex */ true),
        true);
    sourceFrame.jumpToSearchResult(0);

    assert.strictEqual(sourceFrame.textEditor.state.selection.main.from, 1);
    assert.strictEqual(sourceFrame.textEditor.state.selection.main.to, 3);
  });

  it('does not match always-empty match regex', async () => {
    const sourceFrame = await createSourceFrame('Example');

    sourceFrame.performSearch(
        new UI.SearchableView.SearchConfig('Z*', /* caseSensitive */ false, /* wholeWord */ false, /* isRegex */ true),
        true);

    // Check that the search did not find anything.
    // We do this in a roundabout way: select the whole document, then try to select
    // the search result and finally verify that the whole document selection
    // has not changed.
    const dummySelection =
        sourceFrame.textEditor.createSelection({lineNumber: 0, columnNumber: 0}, {lineNumber: 0, columnNumber: 7});
    sourceFrame.textEditor.dispatch({selection: dummySelection});
    sourceFrame.jumpToSearchResult(1);

    assert.strictEqual(sourceFrame.textEditor.state.selection.main.from, 0);
    assert.strictEqual(sourceFrame.textEditor.state.selection.main.to, 7);
  });

  it('skips empty matches and finds non-empty match by regex', async () => {
    const sourceFrame = await createSourceFrame('Example');

    sourceFrame.performSearch(
        new UI.SearchableView.SearchConfig('a?', /* caseSensitive */ false, /* wholeWord */ false, /* isRegex */ true),
        true);

    sourceFrame.jumpToSearchResult(0);

    assert.strictEqual(sourceFrame.textEditor.state.selection.main.from, 2);
    assert.strictEqual(sourceFrame.textEditor.state.selection.main.to, 3);
  });

  it('shows self-XSS warning which the user can disable', async () => {
    const {codeMirror, dataTransfer} = await pasteIntoSourceFrame();
    const dialogShadowRoot = document.body.querySelector<HTMLDivElement>('[data-devtools-glass-pane]')
                                 ?.shadowRoot?.querySelector('.widget')
                                 ?.shadowRoot ||
        null;
    assert.isNotNull(dialogShadowRoot);

    const title = dialogShadowRoot.querySelector('.title');
    assert.instanceOf(title, HTMLDivElement);
    assert.strictEqual(title.textContent, 'Do you trust this code?');

    const input = dialogShadowRoot.querySelector('input');
    assert.instanceOf(input, HTMLInputElement);
    input.value = 'allow pasting';
    dispatchInputEvent(input, {inputType: 'insertText', data: 'allow pasting', bubbles: true, composed: true});

    const allowButton = dialogShadowRoot.querySelector('.button')?.children[0];
    assert.deepEqual(allowButton?.textContent, 'Allow');
    assert.instanceOf(allowButton, Buttons.Button.Button);
    allowButton.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.isTrue(setting.get());

    dispatchPasteEvent(codeMirror, {clipboardData: dataTransfer, bubbles: true});
    await new Promise(resolve => setTimeout(resolve, 0));
    const dialogContainer = document.body.querySelector<HTMLDivElement>('[data-devtools-glass-pane]');
    assert.isNull(dialogContainer);
  });

  it('does not show self-XSS warning when disabled via command line', async () => {
    const stub = sinon.stub(Root.Runtime.Runtime, 'queryParam');
    stub.withArgs('disableSelfXssWarnings').returns('true');
    await pasteIntoSourceFrame();
    const dialogContainer = document.body.querySelector<HTMLDivElement>('[data-devtools-glass-pane]');
    assert.isNull(dialogContainer);
  });

  it('disassembles wasm', async () => {
    const contentData = new TextUtils.ContentData.ContentData(
        'AGFzbQEAAAABBQFgAAF/AwIBAAcHAQNiYXIAAAoGAQQAQQILACQEbmFtZQAQD3Nob3ctd2FzbS0yLndhdAEGAQADYmFyAgMBAAA=', true,
        'application/wasm');
    const sourceFrame = new SourceFrame.SourceFrame.SourceFrameImpl(async () => contentData);

    const setContentStub = sinon.stub(sourceFrame, 'setContent');
    renderElementIntoDOM(sourceFrame);
    const content = await expectCall(setContentStub);

    assert.strictEqual(content.toString(),
                       '(module\n  (func $bar (;0;) (export \"bar\") (result i32)\n    i32.const 2\n  )\n)');

    sourceFrame.detach();
  });

  it('passes textEditor and onKeyDown handler to injected view function', () => {
    const view = createViewFunctionStub(SourceFrame.SourceFrame.SourceFrameImpl);
    const sourceFrame = new SourceFrame.SourceFrame.SourceFrameImpl(
        async () => TextUtils.ContentData.EMPTY_TEXT_CONTENT_DATA, {}, undefined, view);

    assert.strictEqual(view.input.textEditor, sourceFrame.textEditor);

    const nonPreventedStopPropagationSpy = sinon.spy();
    const nonPreventedEvent = new KeyboardEvent('keydown', {cancelable: true});
    nonPreventedEvent.stopPropagation = nonPreventedStopPropagationSpy;
    view.input.onKeyDown(nonPreventedEvent);
    sinon.assert.notCalled(nonPreventedStopPropagationSpy);

    const stopPropagationSpy = sinon.spy();
    const defaultPreventedEvent = new KeyboardEvent('keydown', {cancelable: true});
    defaultPreventedEvent.preventDefault();
    defaultPreventedEvent.stopPropagation = stopPropagationSpy;
    view.input.onKeyDown(defaultPreventedEvent);
    sinon.assert.calledOnce(stopPropagationSpy);

    sourceFrame.disposeView();
  });

  describe('toolbarItems', () => {
    async function renderToolbar(sourceFrame: SourceFrame.SourceFrame.SourceFrameImpl): Promise<HTMLElement> {
      const container = document.createElement('devtools-toolbar');
      renderElementIntoDOM(container);
      const items = await sourceFrame.toolbarItems();
      render(items, container);
      return container;
    }

    it('renders and toggles the pretty print button when canPrettyPrint is enabled', async () => {
      const sourceFrame = await createSourceFrame('{"a":1,"b":2}');
      const toolbar = await renderToolbar(sourceFrame);

      const prettyButton = toolbar.querySelector<Buttons.Button.Button>('[aria-label="Pretty print"]');
      assert.exists(prettyButton);
      assert.isTrue(prettyButton.classList.contains('hidden'));

      sourceFrame.setCanPrettyPrint(true);
      assert.isFalse(prettyButton.classList.contains('hidden'));
      assert.isFalse(prettyButton.toggled);

      prettyButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.isTrue(sourceFrame.pretty);
      assert.isTrue(prettyButton.toggled);

      toolbar.remove();
    });

    it('updates the source position text when selection changes', async () => {
      const sourceFrame = await createSourceFrame('first line\nsecond line');
      const toolbar = await renderToolbar(sourceFrame);

      sourceFrame.textEditor.dispatch({
        selection: sourceFrame.textEditor.createSelection({lineNumber: 1, columnNumber: 3}),
      });
      const positionText = toolbar.querySelector('.toolbar-text');
      assert.strictEqual(positionText?.textContent, 'Line 2, column 4');

      sourceFrame.textEditor.dispatch({
        selection:
            sourceFrame.textEditor.createSelection({lineNumber: 0, columnNumber: 0}, {lineNumber: 0, columnNumber: 5}),
      });
      assert.strictEqual(positionText?.textContent, '5 characters selected');

      sourceFrame.textEditor.dispatch({
        selection:
            sourceFrame.textEditor.createSelection({lineNumber: 0, columnNumber: 0}, {lineNumber: 1, columnNumber: 6}),
      });
      assert.strictEqual(positionText?.textContent, '2 lines, 17 characters selected');

      toolbar.remove();
    });

    it('shows a progress indicator while content is loading and removes it when done', async () => {
      let resolveContent!: (data: TextUtils.ContentData.ContentDataOrError) => void;
      const contentPromise = new Promise<TextUtils.ContentData.ContentDataOrError>(resolve => {
        resolveContent = resolve;
      });
      const sourceFrame = new SourceFrame.SourceFrame.SourceFrameImpl(() => contentPromise);
      const toolbar = await renderToolbar(sourceFrame);
      renderElementIntoDOM(sourceFrame, {allowMultipleChildren: true});

      const progress = toolbar.querySelector('devtools-progress');
      assert.exists(progress);
      assert.strictEqual(progress.title, 'Loading\u2026');

      resolveContent(new TextUtils.ContentData.ContentData('loaded', false, 'text/plain'));
      await new Promise(resolve => setTimeout(resolve, 0));

      assert.isNull(toolbar.querySelector('devtools-progress'));

      sourceFrame.detach();
      toolbar.remove();
    });
  });

  describe('indent setting', () => {
    function countIndentSettingListeners(): number {
      return Common.Settings.Settings.instance().eventTargetForTest.listeners?.get('text-editor-indent')?.size ?? 0;
    }

    it('only listens to changes of the indent setting while shown', async () => {
      const initialCount = countIndentSettingListeners();
      const sourceFrame =
          new SourceFrame.SourceFrame.SourceFrameImpl(async () => TextUtils.ContentData.EMPTY_TEXT_CONTENT_DATA);
      // Stub `setContent()`, as the text editor listens to the indent setting on its own once it has content.
      const setContentStub = sinon.stub(sourceFrame, 'setContent');
      assert.strictEqual(countIndentSettingListeners(), initialCount);

      renderElementIntoDOM(sourceFrame);
      await expectCall(setContentStub);
      assert.strictEqual(countIndentSettingListeners(), initialCount + 1);

      sourceFrame.detach();
      assert.strictEqual(countIndentSettingListeners(), initialCount);
    });

    it('stops listening to changes of the indent setting when disposed', async () => {
      const initialCount = countIndentSettingListeners();
      const sourceFrame =
          new SourceFrame.SourceFrame.SourceFrameImpl(async () => TextUtils.ContentData.EMPTY_TEXT_CONTENT_DATA);
      const setContentStub = sinon.stub(sourceFrame, 'setContent');
      renderElementIntoDOM(sourceFrame);
      await expectCall(setContentStub);

      sourceFrame.disposeView();
      assert.strictEqual(countIndentSettingListeners(), initialCount);

      sourceFrame.detach();
      sourceFrame.disposeView();
      assert.strictEqual(countIndentSettingListeners(), initialCount);
    });

    it('re-formats with an indent that changed while hidden when shown again', async () => {
      const indentSetting =
          Common.Settings.Settings.instance().resolve(SDK.SDKSettings.textEditorIndentSettingDescriptor);
      indentSetting.set('  ');
      // Long enough for the content to be considered minified, so that it is pretty printed automatically.
      const value = 'x'.repeat(100);
      const sourceFrame = new SourceFrame.ResourceSourceFrame.ResourceSourceFrame(
          TextUtils.StaticContentProvider.StaticContentProvider.fromString(
              urlString`https://example.com/data.json`, Common.ResourceType.resourceTypes.XHR, `{"a":"${value}"}`),
          'application/json');
      sourceFrame.setCanPrettyPrint(true, /* autoPrettyPrint */ true);
      const setContentStub = sinon.stub(sourceFrame, 'setContent');

      renderElementIntoDOM(sourceFrame);
      let [content] = await expectCall(setContentStub);
      assert.strictEqual(content, `{\n  "a": "${value}"\n}`);

      sourceFrame.detach();
      indentSetting.set('\t');
      sinon.assert.calledOnce(setContentStub);

      // Showing the frame again first restores the raw content and then pretty prints it with the new indent.
      const reformatted = expectCall(setContentStub, {callCount: 3});
      renderElementIntoDOM(sourceFrame);
      [content] = await reformatted;
      assert.strictEqual(content, `{\n\t"a": "${value}"\n}`);

      sourceFrame.detach();
    });

    async function createShownPrettyJsonFrame(): Promise<{
      sourceFrame: SourceFrame.ResourceSourceFrame.ResourceSourceFrame,
      indentSetting: Common.Settings.Setting<string>,
      bPropertyRawColumn: number,
    }> {
      const indentSetting =
          Common.Settings.Settings.instance().resolve(SDK.SDKSettings.textEditorIndentSettingDescriptor);
      indentSetting.set('  ');
      const value = 'x'.repeat(100);
      const rawJson = `{"a":"${value}","b":1}`;
      const bPropertyRawColumn = rawJson.indexOf('"b"');
      const sourceFrame = new SourceFrame.ResourceSourceFrame.ResourceSourceFrame(
          TextUtils.StaticContentProvider.StaticContentProvider.fromString(
              urlString`https://example.com/data.json`, Common.ResourceType.resourceTypes.XHR, rawJson),
          'application/json');
      sourceFrame.setCanPrettyPrint(true, /* autoPrettyPrint */ true);

      const originalRevealPosition = sourceFrame.textEditor.revealPosition.bind(sourceFrame.textEditor);
      const revealPositionStub = sinon.stub(sourceFrame.textEditor, 'revealPosition');
      const initialReveal = expectCall(revealPositionStub, {fakeFn: originalRevealPosition});
      sourceFrame.revealPosition({lineNumber: 0, columnNumber: 0});
      renderElementIntoDOM(sourceFrame);
      await initialReveal;
      revealPositionStub.restore();

      return {sourceFrame, indentSetting, bPropertyRawColumn};
    }

    it('preserves the cursor position when re-formatting after an indent change while hidden', async () => {
      const {sourceFrame, indentSetting} = await createShownPrettyJsonFrame();
      // Place the cursor on `"b": 1` (line 2, column 2 with 2-space indent).
      sourceFrame.textEditor.dispatch({
        selection: sourceFrame.textEditor.createSelection({lineNumber: 2, columnNumber: 2}),
      });

      sourceFrame.detach();
      indentSetting.set('\t');

      const originalRevealPosition = sourceFrame.textEditor.revealPosition.bind(sourceFrame.textEditor);
      const revealPositionStub = sinon.stub(sourceFrame.textEditor, 'revealPosition');
      const reformatted = expectCall(revealPositionStub, {fakeFn: originalRevealPosition, callCount: 2});
      renderElementIntoDOM(sourceFrame);
      await reformatted;

      // With a tab indent, `"b": 1` moves to line 2, column 1.
      const cursor = sourceFrame.textEditor.toLineColumn(sourceFrame.textEditor.state.selection.main.head);
      assert.deepEqual(cursor, {lineNumber: 2, columnNumber: 1});

      sourceFrame.detach();
    });

    it('reveals a pending position with the new indent when shown after an indent change', async () => {
      const {sourceFrame, indentSetting, bPropertyRawColumn} = await createShownPrettyJsonFrame();
      sourceFrame.detach();
      indentSetting.set('\t');

      const originalRevealPosition = sourceFrame.textEditor.revealPosition.bind(sourceFrame.textEditor);
      const revealPositionStub = sinon.stub(sourceFrame.textEditor, 'revealPosition');
      const revealed = expectCall(revealPositionStub, {fakeFn: originalRevealPosition, callCount: 3});
      sourceFrame.revealPosition({lineNumber: 0, columnNumber: bPropertyRawColumn}, true);
      renderElementIntoDOM(sourceFrame);
      const [, shouldHighlight] = await revealed;

      const cursor = sourceFrame.textEditor.toLineColumn(sourceFrame.textEditor.state.selection.main.head);
      assert.deepEqual(cursor, {lineNumber: 2, columnNumber: 1});
      assert.isTrue(shouldHighlight);

      sourceFrame.detach();
    });

    it('reveals a position requested right after showing when re-formatting for an indent change', async () => {
      const {sourceFrame, indentSetting, bPropertyRawColumn} = await createShownPrettyJsonFrame();
      sourceFrame.detach();
      indentSetting.set('\t');

      const originalRevealPosition = sourceFrame.textEditor.revealPosition.bind(sourceFrame.textEditor);
      const revealPositionStub = sinon.stub(sourceFrame.textEditor, 'revealPosition');
      const revealed = expectCall(revealPositionStub, {fakeFn: originalRevealPosition, callCount: 3});
      renderElementIntoDOM(sourceFrame);
      sourceFrame.revealPosition({lineNumber: 0, columnNumber: bPropertyRawColumn}, true);
      const [, shouldHighlight] = await revealed;

      const cursor = sourceFrame.textEditor.toLineColumn(sourceFrame.textEditor.state.selection.main.head);
      assert.deepEqual(cursor, {lineNumber: 2, columnNumber: 1});
      assert.isTrue(shouldHighlight);

      sourceFrame.detach();
    });
  });
});
