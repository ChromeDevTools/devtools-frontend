// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import {
  dispatchInputEvent,
  dispatchPasteEvent,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Console from './console.js';

describeWithEnvironment('ConsolePinPane', () => {
  it('correctly deletes the second pin when three pins exist', async () => {
    const consolePinPane = new Console.ConsolePinPane.ConsolePinPane(() => {});
    renderElementIntoDOM(consolePinPane);
    consolePinPane.wasShown();

    consolePinPane.addPin('1');
    consolePinPane.addPin('2');
    consolePinPane.addPin('3');

    await UI.Widget.Widget.allUpdatesComplete;

    const pins = consolePinPane.element.shadowRoot?.querySelectorAll('.console-pin');
    assert.strictEqual(pins?.length, 3, 'There should be 3 pins');

    const secondPinDeleteButton = pins?.[1].querySelector('.close-button');
    assert.exists(secondPinDeleteButton, 'Second pin should have a delete button');

    (secondPinDeleteButton as HTMLElement).click();

    await UI.Widget.Widget.allUpdatesComplete;

    const remainingPins = consolePinPane.element.shadowRoot?.querySelectorAll('.console-pin');
    assert.strictEqual(remainingPins?.length, 2, 'There should be 2 pins remaining');

    const pinTexts = Array.from(remainingPins || []).map(p => {
      return p.querySelector('devtools-text-editor')?.state.doc.toString();
    });
    assert.deepEqual(pinTexts, ['1', '3'], 'Remaining pins should have expressions "1" and "3"');
  });

  describe('Self-XSS Protection', () => {
    let setting: Common.Settings.Setting<boolean>;

    beforeEach(() => {
      setting = Common.Settings.Settings.instance().createSetting(
          'disable-self-xss-warning', false, Common.Settings.SettingStorageType.SYNCED);
      setting.set(false);
    });

    async function pasteIntoLiveExpression(consolePinPane: Console.ConsolePinPane.ConsolePinPane):
        Promise<{codeMirror: HTMLDivElement, dataTransfer: DataTransfer}> {
      const pins = consolePinPane.element.shadowRoot?.querySelectorAll('.console-pin');
      const codeMirror =
          pins?.[0]?.querySelector('devtools-text-editor')?.shadowRoot?.querySelector('.cm-content') || null;
      assert.instanceOf(codeMirror, HTMLDivElement);

      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', 'foo');
      dispatchPasteEvent(codeMirror, {clipboardData: dataTransfer, bubbles: true});
      await new Promise(resolve => setTimeout(resolve, 0));
      return {codeMirror, dataTransfer};
    }

    it('shows self-XSS warning which the user can disable', async () => {
      const consolePinPane = new Console.ConsolePinPane.ConsolePinPane(() => {});
      renderElementIntoDOM(consolePinPane);
      consolePinPane.wasShown();

      consolePinPane.addPin('1');
      await UI.Widget.Widget.allUpdatesComplete;

      const {codeMirror, dataTransfer} = await pasteIntoLiveExpression(consolePinPane);
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

      const consolePinPane = new Console.ConsolePinPane.ConsolePinPane(() => {});
      renderElementIntoDOM(consolePinPane);
      consolePinPane.wasShown();

      consolePinPane.addPin('1');
      await UI.Widget.Widget.allUpdatesComplete;

      await pasteIntoLiveExpression(consolePinPane);
      const dialogContainer = document.body.querySelector<HTMLDivElement>('[data-devtools-glass-pane]');
      assert.isNull(dialogContainer);
      stub.restore();
    });
  });
});
