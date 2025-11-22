// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/LocaleHelpers.js';

import * as LinearMemoryInspectorComponents from './components.js';

export const HIGHLIGHT_CHIP = '.highlight-chip';
export const HIGHLIGHT_PILL_JUMP_BUTTON_SELECTOR = '.jump-to-highlight-button';
export const HIGHLIGHT_PILL_VARIABLE_NAME = HIGHLIGHT_PILL_JUMP_BUTTON_SELECTOR + ' .value';
export const HIGHLIGHT_ROW_REMOVE_BUTTON_SELECTOR = '.delete-highlight-button';

describeWithLocale('LinearMemoryInspectorHighlightChipList', () => {
  let component: LinearMemoryInspectorComponents.LinearMemoryHighlightChipList.LinearMemoryHighlightChipList;

  beforeEach(renderHighlightRow);

  async function renderHighlightRow() {
    component = new LinearMemoryInspectorComponents.LinearMemoryHighlightChipList.LinearMemoryHighlightChipList();
    renderElementIntoDOM(component);
    const highlightInfo = {
      startAddress: 10,
      size: 8,
      type: 'double',
      name: 'myNumber',
    };
    component.highlightInfos = [highlightInfo];
    await component.updateComplete;
  }

  it('renders a highlight chip button', () => {
    const button = component.contentElement.querySelector(HIGHLIGHT_PILL_JUMP_BUTTON_SELECTOR);
    assert.instanceOf(button, HTMLButtonElement);
    const expressionName = component.contentElement.querySelector(HIGHLIGHT_PILL_VARIABLE_NAME);
    assert.instanceOf(expressionName, HTMLSpanElement);
    assert.strictEqual(expressionName.innerText, 'myNumber');
  });

  it('focuses a highlight chip button', async () => {
    const chip = component.contentElement.querySelector(HIGHLIGHT_CHIP);
    assert.instanceOf(chip, HTMLDivElement);
    assert.isNotOk(chip.classList.contains('focused'));

    const highlightedMemory = {
      startAddress: 10,
      size: 8,
      type: 'double',
      name: 'myNumber',
    };
    component.highlightInfos = [highlightedMemory];
    component.focusedMemoryHighlight = highlightedMemory;
    await component.updateComplete;
    assert.isTrue(chip.classList.contains('focused'));
  });

  it('renders multiple chips', async () => {
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
    component.highlightInfos = highlightInfos;
    await component.updateComplete;
    const chips = component.contentElement.querySelectorAll(HIGHLIGHT_CHIP);
    assert.strictEqual(chips.length, highlightInfos.length);
  });

  it('calls callback when clicking on jump to highlighted memory', async () => {
    const jumpToAddress = sinon.spy();
    const highlightInfo = {
      startAddress: 10,
      size: 8,
      type: 'double',
      name: 'myNumber',
    };
    component.highlightInfos = [highlightInfo];
    component.jumpToAddress = jumpToAddress;
    await component.updateComplete;

    const button = component.contentElement.querySelector(HIGHLIGHT_PILL_JUMP_BUTTON_SELECTOR);
    assert.instanceOf(button, HTMLButtonElement);
    button.click();

    assert.isTrue(jumpToAddress.calledOnceWith(highlightInfo.startAddress));
  });

  it('calls callback when clicking on delete highlight chip', async () => {
    const deleteHighlight = sinon.spy();
    const highlightInfo = {
      startAddress: 10,
      size: 8,
      type: 'double',
      name: 'myNumber',
    };
    component.highlightInfos = [highlightInfo];
    component.deleteHighlight = deleteHighlight;
    await component.updateComplete;

    const button = component.contentElement.querySelector(HIGHLIGHT_ROW_REMOVE_BUTTON_SELECTOR);
    assert.instanceOf(button, HTMLButtonElement);
    button.click();

    assert.isTrue(deleteHighlight.calledOnceWith(highlightInfo));
  });

  it('shows tooltip on jump to highlighted memory button', () => {
    const button = component.contentElement.querySelector<HTMLButtonElement>(HIGHLIGHT_PILL_JUMP_BUTTON_SELECTOR)!;
    assert.strictEqual(button.title, 'Jump to this memory');
  });

  it('shows tooltip on delete highlight button', () => {
    const button = component.contentElement.querySelector<HTMLButtonElement>(HIGHLIGHT_ROW_REMOVE_BUTTON_SELECTOR)!;
    assert.strictEqual(button.title, 'Stop highlighting this memory');
  });
});
