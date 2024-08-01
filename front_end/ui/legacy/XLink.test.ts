// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import * as LitHtml from '../lit-html/lit-html.js';

import * as UI from './legacy.js';

describe('XLink', () => {
  describe('title', () => {
    it('equals href by default', () => {
      const link = new UI.XLink.XLink();
      link.setAttribute('href', 'https://example.com/');
      assert.strictEqual(link.href, 'https://example.com/');
      assert.strictEqual(link.title, link.href);
    });

    it('overrides href', () => {
      const link = new UI.XLink.XLink();
      link.setAttribute('href', 'https://example.com/');
      link.setAttribute('title', 'test');
      assert.strictEqual(link.href, 'https://example.com/');
      assert.strictEqual(link.title, 'test');
    });
  });

  describe('HTML minification', () => {
    it('properly minifies whitespaces in release mode', () => {
      const target = document.createElement('section');
      LitHtml.render(UI.XLink.sample, target, {host: this});
      const result = target.querySelector('p')?.innerText;
      assert.strictEqual(result, 'Hello, world!');
    });
  });

  describe('tabindex', () => {
    it('is 0 by default', () => {
      const link = UI.XLink.XLink.create('https://example.com/', 'Click me');
      assert.strictEqual(link.tabIndex, 0);
    });

    it('can be set explicitly', () => {
      const link = UI.XLink.XLink.create('https://example.com/', 'Click me', undefined, undefined, undefined, '-1');
      assert.strictEqual(link.tabIndex, -1);
    });

    it('can be set via LitHTML template', async () => {
      const container = document.createElement('div');
      // clang-format off
      LitHtml.render(
        LitHtml.html`
          <x-link
            href="https://example.com/"
            tabindex="-1"
          >Click me</x-link>
        `,
        container, {host: this},
      );
      // clang-format on
      renderElementIntoDOM(container);

      const link = container.querySelector('x-link');
      assert.instanceOf(link, UI.XLink.XLink);
      assert.strictEqual(link.tabIndex, -1);
    });
  });
});
