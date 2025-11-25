// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';

import * as LinearMemoryInspectorComponents from './components.js';

export const HIGHLIGHT_CHIP = '.highlight-chip';
export const HIGHLIGHT_PILL_JUMP_BUTTON_SELECTOR = '.jump-to-highlight-button';
export const HIGHLIGHT_PILL_VARIABLE_NAME = HIGHLIGHT_PILL_JUMP_BUTTON_SELECTOR + ' .value';
export const HIGHLIGHT_ROW_REMOVE_BUTTON_SELECTOR = '.delete-highlight-button';

describe('LinearMemoryInspectorHighlightChipList', () => {
  setupLocaleHooks();
  let component: LinearMemoryInspectorComponents.LinearMemoryHighlightChipList.LinearMemoryHighlightChipList;

  beforeEach(renderHighlightRow);

  function renderHighlightRow() {
    component = new LinearMemoryInspectorComponents.LinearMemoryHighlightChipList.LinearMemoryHighlightChipList();
    renderElementIntoDOM(component);
    const highlightInfo = {
      startAddress: 10,
      size: 8,
      type: 'double',
      name: 'myNumber',
    };
    component.data = {
      highlightInfos: [
        highlightInfo,
      ],
    };
  }

  it('renders a highlight chip button', () => {
    const button = component.shadowRoot!.querySelector(HIGHLIGHT_PILL_JUMP_BUTTON_SELECTOR);
    assert.instanceOf(button, HTMLButtonElement);
    const expressionName = component.shadowRoot!.querySelector(HIGHLIGHT_PILL_VARIABLE_NAME);
    assert.instanceOf(expressionName, HTMLSpanElement);
    assert.strictEqual(expressionName.innerText, 'myNumber');
  });

  it('focuses a highlight chip button', async () => {
    const chip = component.shadowRoot!.querySelector(HIGHLIGHT_CHIP);
    assert.instanceOf(chip, HTMLDivElement);
    assert.isNotOk(chip.classList.contains('focused'));

    const highlightedMemory = {
      startAddress: 10,
      size: 8,
      type: 'double',
      name: 'myNumber',
    };
    const data = {
      highlightInfos: [highlightedMemory],
      focusedMemoryHighlight: highlightedMemory,
    } as LinearMemoryInspectorComponents.LinearMemoryHighlightChipList.LinearMemoryHighlightChipListData;
    component.data = data;
    assert.isTrue(chip.classList.contains('focused'));
  });

  it('renders multiple chips', () => {
    const highlightInfos = [
      {
        startAddress: 10,
        size: 8,
        type: 'double',
        name: 'myNumber',
      },
      {
        startAddress: 20,
        size: 4,
        type: 'int',
        name: 'myInt',
      },
    ];
    component.data = {
      highlightInfos,
    };
    const chips = component.shadowRoot!.querySelectorAll(HIGHLIGHT_CHIP);
    assert.strictEqual(chips.length, highlightInfos.length);
  });

  it('calls callback when clicking on jump to highlighted memory', () => {
    const jumpToAddress = sinon.spy();
    const highlightInfo = {
      startAddress: 10,
      size: 8,
      type: 'double',
      name: 'myNumber',
    };
    component.data = {
      highlightInfos: [highlightInfo],
      jumpToAddress,
    };

    const button = component.shadowRoot!.querySelector(HIGHLIGHT_PILL_JUMP_BUTTON_SELECTOR);
    assert.instanceOf(button, HTMLButtonElement);
    button.click();

    assert.isTrue(jumpToAddress.calledOnceWith(highlightInfo.startAddress));
  });

  it('calls callback when clicking on delete highlight chip', () => {
    const deleteHighlight = sinon.spy();
    const highlightInfo = {
      startAddress: 10,
      size: 8,
      type: 'double',
      name: 'myNumber',
    };
    component.data = {
      highlightInfos: [highlightInfo],
      deleteHighlight,
    };

    const button = component.shadowRoot!.querySelector(HIGHLIGHT_ROW_REMOVE_BUTTON_SELECTOR);
    assert.instanceOf(button, HTMLButtonElement);
    button.click();

    assert.isTrue(deleteHighlight.calledOnceWith(highlightInfo));
  });

  it('shows tooltip on jump to highlighted memory button', () => {
    const button = getElementWithinComponent(component, HIGHLIGHT_PILL_JUMP_BUTTON_SELECTOR, HTMLButtonElement);
    assert.strictEqual(button.title, 'Jump to this memory');
  });

  it('shows tooltip on delete highlight button', () => {
    const button = getElementWithinComponent(component, HIGHLIGHT_ROW_REMOVE_BUTTON_SELECTOR, HTMLButtonElement);
    assert.strictEqual(button.title, 'Stop highlighting this memory');
  });
});
