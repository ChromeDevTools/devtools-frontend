// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';
import {
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';

const CONTENT_SLOT = 'content';
const HEADING_SUFFIX_SLOT = 'heading-suffix';

import * as Cards from './cards.js';

function assertCardContent(card: Cards.Card.Card, slotName: string, expectedContent: string[]) {
  const slot = getElementWithinComponent(card, `slot[name="${slotName}"]`, HTMLSlotElement);
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

    assertCardContent(card, CONTENT_SLOT, ['content 1', 'content 2']);
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
    assertCardContent(card, CONTENT_SLOT, ['content 1', 'content 2']);

    card.data = {
      content: [content2, content1],
    };
    assertCardContent(card, CONTENT_SLOT, ['content 2', 'content 1']);
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

  it('shows heading icon', async () => {
    const card = new Cards.Card.Card();
    card.data = {
      headingIconName: 'folder',
      content: [],
    };
    renderElementIntoDOM(card);
    const icon = card.shadowRoot?.querySelector('devtools-icon');
    assert.isNotNull(icon);
  });

  it('shows heading-suffix', () => {
    const suffix = document.createElement('span');
    suffix.textContent = 'hello';
    const card = new Cards.Card.Card();
    card.data = {
      headingSuffix: suffix,
      content: [],
    };
    renderElementIntoDOM(card);
    assertCardContent(card, HEADING_SUFFIX_SLOT, ['hello']);
  });
});
