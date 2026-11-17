// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import * as i18n from '../../../core/i18n/i18n.js';
import {dispatchClickEvent, dispatchInputEvent, raf, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Buttons from '../buttons/buttons.js';
import * as RenderCoordinator from '../render_coordinator/render_coordinator.js';

import * as Dialogs from './dialogs.js';

describe('TypeToAllowDialog.matchesPhrase', () => {
  for (const {label, input} of [{label: 'unquoted phrase', input: 'allow pasting'},
                                {label: 'ASCII double quotes', input: '"allow pasting"'},
                                {label: 'ASCII single quotes', input: '\'allow pasting\''},
                                {label: 'double curly quotes', input: '“allow pasting”'},
                                {label: 'Swedish right double curly quotes', input: '”allow pasting”'},
                                {label: 'single curly quotes', input: '‘allow pasting’'},
                                {label: 'mixed single curly and straight quote', input: '‘allow pasting\''},
                                {label: 'German low-high double curly quotes', input: '„allow pasting“'},
                                {label: 'German low-right double curly quotes', input: '„allow pasting”'},
                                {label: 'guillemets', input: '«allow pasting»'},
                                {label: 'guillemets with NBSP padding', input: '«\xa0allow pasting\xa0»'},
                                {label: 'reversed guillemets', input: '»allow pasting«'},
                                {label: 'Japanese corner brackets', input: '「allow pasting」'},
                                {label: 'outer whitespace around double quotes', input: '  "allow pasting"  '},
                                {label: 'inner whitespace inside guillemets', input: '« allow pasting »'},
  ]) {
    it(`accepts ${label}`, () => {
      assert.isTrue(Dialogs.TypeToAllowDialog.TypeToAllowDialog.matchesPhrase(input, 'allow pasting'));
    });
  }

  for (const {label,
              input,
              phrase = 'allow pasting'} of [{label: 'empty string', input: ''},
                                            {label: 'whitespace only', input: '   '},
                                            {label: 'partial phrase', input: '"allow"'},
                                            {label: 'unclosed single quote', input: '\'allow pasting'},
                                            {label: 'unclosed double quote', input: '"allow pasting'},
                                            {label: 'trailing quote only', input: 'allow pasting"'},
                                            {label: 'mismatched quotes', input: '"allow pasting\''},
                                            {label: 'mismatched guillemet and curly quote', input: '«allow pasting”'},
                                            {label: 'extra prefix text', input: 'please "allow pasting"'},
                                            {label: 'empty expected phrase', input: '""', phrase: ''},
  ]) {
    it(`rejects ${label}`, () => {
      assert.isFalse(Dialogs.TypeToAllowDialog.TypeToAllowDialog.matchesPhrase(input, phrase));
    });
  }
});

describeWithEnvironment('TypeToAllowDialog', () => {
  it('accepts double-quoted confirmation phrase via DOM input and Allow button', async () => {
    // Provide inspector and button styles for the document-attached UI.Dialog glass pane.
    renderElementIntoDOM(document.createElement('div'), {includeCommonStyles: true});

    const resultPromise = Dialogs.TypeToAllowDialog.TypeToAllowDialog.show({
      jslogContext: {dialog: 'test-dialog', input: 'test-input'},
      header: i18n.i18n.lockedString('Do you trust this code?'),
      message: i18n.i18n.lockedString('Type "allow pasting" below.'),
      typePhrase: i18n.i18n.lockedString('allow pasting'),
      inputPlaceholder: i18n.i18n.lockedString('Type "allow pasting"'),
    });

    await RenderCoordinator.done();
    await raf();

    const dialogShadowRoot = document.body.querySelector<HTMLDivElement>('[data-devtools-glass-pane]')
                                 ?.shadowRoot?.querySelector('.widget')
                                 ?.shadowRoot;
    assert.exists(dialogShadowRoot);

    const input = dialogShadowRoot.querySelector('input');
    assert.instanceOf(input, HTMLInputElement);
    input.value = '"allow pasting"';
    dispatchInputEvent(input, {inputType: 'insertText', data: '"allow pasting"', bubbles: true, composed: true});

    await RenderCoordinator.done();
    await raf();

    const allowButton = dialogShadowRoot.querySelector('.button')?.children[0];
    assert.instanceOf(allowButton, Buttons.Button.Button);
    assert.isFalse(allowButton.disabled);
    dispatchClickEvent(allowButton, {bubbles: true, composed: true});

    assert.isTrue(await resultPromise);
  });
});
