// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {Link} from '../kit.js';

describe('devtools-link', () => {
  describe('title', () => {
    it('equals href by default', () => {
      const link = new Link();
      link.setAttribute('href', 'https://example.com/');
      link.connectedCallback();
      assert.strictEqual(link.href, 'https://example.com/');
      assert.strictEqual(link.title, link.href);
    });

    it('overrides href', () => {
      const link = new Link();
      link.setAttribute('href', 'https://example.com/');
      link.setAttribute('title', 'test');
      link.connectedCallback();
      assert.strictEqual(link.href, 'https://example.com/');
      assert.strictEqual(link.title, 'test');
    });
  });

  describe('tabindex', () => {
    it('should be 0 by default', () => {
      const link = new Link();
      link.connectedCallback();
      assert.strictEqual(link.tabIndex, 0);
    });

    it('can be set explicitly', () => {
      const link = new Link();
      link.connectedCallback();
      link.setAttribute('tabindex', '-1');
      assert.strictEqual(link.tabIndex, -1);
    });
  });

  describe('visual logging', () => {
    it('should default to href', () => {
      const link = new Link();
      link.setAttribute('href', 'https://example.com/');
      renderElementIntoDOM(link);

      const jslog = link.getAttribute('jslog');
      assert.isNotEmpty(jslog);
      assert.include(jslog, 'example');
    });

    it('should use the specific value', () => {
      const link = new Link();
      link.jslogContext = 'specialString';
      link.setAttribute('href', 'https://example.com/');
      renderElementIntoDOM(link);

      const jslog = link.getAttribute('jslog');
      assert.isNotEmpty(jslog);
      assert.notInclude(jslog, 'example');
      assert.include(jslog, 'specialString');
    });
  });
});
