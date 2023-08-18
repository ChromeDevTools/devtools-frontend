// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../../../front_end/core/common/common.js';
import * as Root from '../../../../../../../front_end/core/root/root.js';
import type * as TextUtils from '../../../../../../../front_end/models/text_utils/text_utils.js';
import * as SourceFrame from '../../../../../../../front_end/ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../../../../../../front_end/ui/legacy/legacy.js';
import {
  assertElement,
  assertShadowRoot,
  dispatchInputEvent,
  dispatchPasteEvent,
} from '../../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../helpers/EnvironmentHelpers.js';

describeWithEnvironment('SourceFrame', () => {
  async function createSourceFrame(content: string): Promise<SourceFrame.SourceFrame.SourceFrameImpl> {
    const deferredContentStub = {content: '', isEncoded: true} as TextUtils.ContentProvider.DeferredContent;
    const sourceFrame = new SourceFrame.SourceFrame.SourceFrameImpl(async () => deferredContentStub);
    await sourceFrame.setContent(content);
    return sourceFrame;
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
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.SELF_XSS_WARNING);
    const setting = Common.Settings.Settings.instance().createSetting(
        'disableSelfXssWarning', false, Common.Settings.SettingStorageType.Synced);
    assert.isFalse(setting.get());

    const sourceFrame = await createSourceFrame('Example');
    const codeMirror =
        sourceFrame.element.querySelector('devtools-text-editor')?.shadowRoot?.querySelector('.cm-content') || null;
    assertElement(codeMirror, HTMLDivElement);

    const dt = new DataTransfer();
    dt.setData('text/plain', 'foo');
    dispatchPasteEvent(codeMirror, {clipboardData: dt, bubbles: true});
    await new Promise(resolve => setTimeout(resolve, 0));

    const dialogShadowRoot = document.body.querySelector<HTMLDivElement>('[data-devtools-glass-pane]')
                                 ?.shadowRoot?.querySelector('.widget')
                                 ?.shadowRoot ||
        null;
    assertShadowRoot(dialogShadowRoot);

    const title = dialogShadowRoot.querySelector('.title');
    assertElement(title, HTMLDivElement);
    assert.strictEqual(title.textContent, 'Do you trust this code?');

    const input = dialogShadowRoot.querySelector('input');
    assertElement(input, HTMLInputElement);
    input.value = 'allow pasting';
    dispatchInputEvent(input, {inputType: 'insertText', data: 'allow pasting', bubbles: true, composed: true});

    const allowButton = dialogShadowRoot.querySelector('.primary-button');
    assertElement(allowButton, HTMLButtonElement);
    allowButton.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.isTrue(setting.get());

    dispatchPasteEvent(codeMirror, {clipboardData: dt, bubbles: true});
    await new Promise(resolve => setTimeout(resolve, 0));
    const dialogContainer = document.body.querySelector<HTMLDivElement>('[data-devtools-glass-pane]');
    assert.isNull(dialogContainer);
  });
});
