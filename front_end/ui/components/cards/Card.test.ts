// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';
import {
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';

import * as Cards from './cards.js';

function assertCardContent(card: Cards.Card.Card, expectedContent: string[]) {
  const slot = getElementWithinComponent(card, 'slot', HTMLSlotElement);
  const textContents = Array.from(slot.assignedElements()).map(child => child.textContent);
  assert.deepStrictEqual(textContents, expectedContent);
}

describe('Card', () => {
  it('contains slotted elements', async () => {
    const content1 = document.createElement('span');
    content1.textContent = 'content 1';

    const content2 = document.createElement('div');
    content2.textContent = 'content 2';

    const card = new Cards.Card.Card();
    card.data = {
      content: [content1, content2],
    };

    assertCardContent(card, ['content 1', 'content 2']);
  });

  it('order of slotted elements matter', () => {
    const content1 = document.createElement('span');
    content1.textContent = 'content 1';

    const content2 = document.createElement('div');
    content2.textContent = 'content 2';

    const card = new Cards.Card.Card();
    card.data = {
      content: [content1, content2],
    };
    assertCardContent(card, ['content 1', 'content 2']);

    card.data = {
      content: [content2, content1],
    };
    assertCardContent(card, ['content 2', 'content 1']);
  });

  it('shows heading', () => {
    const content1 = document.createElement('span');
    const card = new Cards.Card.Card();
    card.data = {
      heading: 'This is my heading' as Common.UIString.LocalizedString,
      content: [content1],
    };
    renderElementIntoDOM(card);
    const heading = card.shadowRoot?.querySelector('[role="heading"]');
    assert.instanceOf(heading, HTMLElement);
    assert.strictEqual(heading.textContent, 'This is my heading');
  });
});
