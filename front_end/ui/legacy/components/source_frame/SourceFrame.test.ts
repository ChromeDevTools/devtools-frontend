// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Root from '../../../../core/root/root.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import {
  dispatchInputEvent,
  dispatchPasteEvent,
} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import * as Buttons from '../../../components/buttons/buttons.js';
import * as UI from '../../legacy.js';

import * as SourceFrame from './source_frame.js';

describeWithEnvironment('SourceFrame', () => {
  let setting: Common.Settings.Setting<boolean>;

  beforeEach(() => {
    setting = Common.Settings.Settings.instance().createSetting(
        'disable-self-xss-warning', false, Common.Settings.SettingStorageType.SYNCED);
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
        new UI.SearchableView.SearchConfig('xa', /* caseSensitive */ false, /* isRegex */ true), true);
    sourceFrame.jumpToSearchResult(0);

    assert.strictEqual(sourceFrame.textEditor.state.selection.main.from, 1);
    assert.strictEqual(sourceFrame.textEditor.state.selection.main.to, 3);
  });

  it('does not match always-empty match regex', async () => {
    const sourceFrame = await createSourceFrame('Example');

    sourceFrame.performSearch(
        new UI.SearchableView.SearchConfig('Z*', /* caseSensitive */ false, /* isRegex */ true), true);

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
        new UI.SearchableView.SearchConfig('a?', /* caseSensitive */ false, /* isRegex */ true), true);

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

    const allowButton = dialogShadowRoot.querySelector('.button')?.children[1];
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
    stub.restore();
  });
});
