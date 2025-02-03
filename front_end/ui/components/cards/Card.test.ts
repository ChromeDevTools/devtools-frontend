// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';

import * as Cards from './cards.js';

describe('Card', () => {
  const {Card} = Cards.Card;

  describe('Card', () => {
    it('can be instantiated via `createElement`', () => {
      const card = document.createElement('devtools-card');

      assert.instanceOf(card, Card);
    });

    it('attaches a shadow root', () => {
      const card = document.createElement('devtools-card');

      assert.isNotNull(card.shadowRoot, 'Expected Card to use Shadow DOM');
    });

    it('slots its regular children into the content area', () => {
      const card = document.createElement('devtools-card');

      const h1 = card.appendChild(document.createElement('h1'));
      const p = card.appendChild(document.createElement('p'));

      assert.include(card.shadowRoot!.querySelector<HTMLSlotElement>('#content')!.assignedElements(), h1);
      assert.include(card.shadowRoot!.querySelector<HTMLSlotElement>('#content')!.assignedElements(), p);
    });

    it('slots `heading-prefix` children into the heading area', () => {
      const card = document.createElement('devtools-card');

      const span = card.appendChild(document.createElement('span'));
      span.slot = 'heading-prefix';

      assert.include(
          card.shadowRoot!.querySelector<HTMLSlotElement>('[name="heading-prefix"]')!.assignedElements(),
          span,
      );
    });

    it('slots `heading-suffix` children into the heading area', () => {
      const card = document.createElement('devtools-card');

      const span = card.appendChild(document.createElement('span'));
      span.slot = 'heading-suffix';

      assert.include(
          card.shadowRoot!.querySelector<HTMLSlotElement>('[name="heading-suffix"]')!.assignedElements(),
          span,
      );
    });

    describe('heading', () => {
      it('defaults to null', () => {
        const card = document.createElement('devtools-card');

        assert.isNull(card.heading);
      });

      it('can be changed', () => {
        const card = document.createElement('devtools-card');

        card.heading = 'My awesome title';

        assert.strictEqual(card.heading, 'My awesome title');
      });

      it('reflects changes onto the `heading` attribute', () => {
        const card = document.createElement('devtools-card');

        card.heading = 'My awesome title';

        assert.strictEqual(card.getAttribute('heading'), 'My awesome title');
      });

      it('is rendered into the shadow DOM', () => {
        const card = document.createElement('devtools-card');

        card.heading = 'Some other title';

        assert.include(card.shadowRoot!.querySelector('[role="heading"]')!.textContent, 'Some other title');
      });
    });

    describe('hidden', () => {
      it('hides the card when present', () => {
        const card = renderElementIntoDOM(document.createElement('devtools-card'));

        card.hidden = true;

        assert.strictEqual(window.getComputedStyle(card).display, 'none');
      });
    });
  });
});
