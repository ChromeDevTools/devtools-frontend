// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  getElementWithinComponent,
  getEventPromise,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';

import * as LinearMemoryInspectorComponents from './components.js';

export const HIGHLIGHT_CHIP = '.highlight-chip';
export const HIGHLIGHT_PILL_JUMP_BUTTON_SELECTOR = '.jump-to-highlight-button';
export const HIGHLIGHT_PILL_VARIABLE_NAME = HIGHLIGHT_PILL_JUMP_BUTTON_SELECTOR + ' .value';
export const HIGHLIGHT_ROW_REMOVE_BUTTON_SELECTOR = '.delete-highlight-button';

describeWithLocale('LinearMemoryInspectorHighlightChipList', () => {
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
    assert.isTrue(!chip.classList.contains('focused'));

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

  it('sends event when clicking on jump to highlighted memory', async () => {
    const eventPromise =
        getEventPromise<LinearMemoryInspectorComponents.LinearMemoryHighlightChipList.JumpToHighlightedMemoryEvent>(
            component,
            LinearMemoryInspectorComponents.LinearMemoryHighlightChipList.JumpToHighlightedMemoryEvent.eventName);

    const button = component.shadowRoot!.querySelector(HIGHLIGHT_PILL_JUMP_BUTTON_SELECTOR);
    assert.instanceOf(button, HTMLButtonElement);
    button.click();

    assert.isNotNull(await eventPromise);
  });

  it('sends event when clicking on delete highlight chip', async () => {
    const eventPromise =
        getEventPromise<LinearMemoryInspectorComponents.LinearMemoryHighlightChipList.DeleteMemoryHighlightEvent>(
            component,
            LinearMemoryInspectorComponents.LinearMemoryHighlightChipList.DeleteMemoryHighlightEvent.eventName);

    const button = component.shadowRoot!.querySelector(HIGHLIGHT_ROW_REMOVE_BUTTON_SELECTOR);
    assert.instanceOf(button, HTMLButtonElement);
    button.click();

    assert.isNotNull(await eventPromise);
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
