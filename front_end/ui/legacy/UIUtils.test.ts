// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';

import * as UI from './legacy.js';

const {urlString} = Platform.DevToolsPath;

describe('UIUtils', () => {
  describe('addReferrerToURL', () => {
    it('correctly adds referrer info to URLs', () => {
      assert.strictEqual(
          UI.UIUtils.addReferrerToURL(urlString`https://www.domain.com/route`),
          'https://www.domain.com/route?utm_source=devtools');
      assert.strictEqual(
          UI.UIUtils.addReferrerToURL(urlString`https://www.domain.com/route#anchor`),
          'https://www.domain.com/route?utm_source=devtools#anchor');
      assert.strictEqual(
          UI.UIUtils.addReferrerToURL(urlString`https://www.domain.com/route?key=value`),
          'https://www.domain.com/route?key=value&utm_source=devtools');
      assert.strictEqual(
          UI.UIUtils.addReferrerToURL(urlString`https://www.domain.com/route?key=value#anchor`),
          'https://www.domain.com/route?key=value&utm_source=devtools#anchor');
      assert.strictEqual(
          UI.UIUtils.addReferrerToURL(urlString`https://www.domain.com/route?utm_source=devtools#anchor`),
          'https://www.domain.com/route?utm_source=devtools#anchor');
      assert.strictEqual(
          UI.UIUtils.addReferrerToURL(urlString`https://www.domain.com/route?key=value&utm_source=devtools#anchor`),
          'https://www.domain.com/route?key=value&utm_source=devtools#anchor');
    });
  });

  describe('addReferrerToURLIfNecessary', () => {
    it('correctly adds referrer for web.dev and developers.google.com', () => {
      assert.strictEqual(
          UI.UIUtils.addReferrerToURLIfNecessary(urlString`https://web.dev/route`),
          'https://web.dev/route?utm_source=devtools');
      assert.strictEqual(
          UI.UIUtils.addReferrerToURLIfNecessary(urlString`https://developers.google.com/route#anchor`),
          'https://developers.google.com/route?utm_source=devtools#anchor');
      assert.strictEqual(
          UI.UIUtils.addReferrerToURLIfNecessary(urlString`https://www.domain.com/web.dev/route`),
          'https://www.domain.com/web.dev/route');
      assert.strictEqual(
          UI.UIUtils.addReferrerToURLIfNecessary(urlString`https://foo.developers.google.com/route#anchor`),
          'https://foo.developers.google.com/route#anchor');
    });
  });

  describe('LongClickController', () => {
    it('does not invoke callback when disposed', () => {
      const el = document.createElement('div');
      const callback = sinon.spy();
      const controller = new UI.UIUtils.LongClickController(el, callback);
      // @ts-ignore
      const setTimeout = sinon.stub(window, 'setTimeout').callsFake(cb => cb());

      el.dispatchEvent(new PointerEvent('pointerdown'));
      assert.isTrue(callback.calledOnce);

      controller.dispose();

      el.dispatchEvent(new PointerEvent('pointerdown'));
      assert.isTrue(callback.calledOnce);

      setTimeout.restore();
    });
  });

  describe('measuredScrollbarWidth', () => {
    let style: HTMLStyleElement;
    before(() => {
      UI.UIUtils.resetMeasuredScrollbarWidthForTest();
    });
    after(() => {
      style.remove();
    });

    it('provides a default value', () => {
      const expectedDefaultWidth = 16;
      assert.strictEqual(UI.UIUtils.measuredScrollbarWidth(), expectedDefaultWidth);
    });

    it('calculates specific widths correctly', () => {
      const width = 20;

      // Enforce custom width on scrollbars to test.
      style = document.createElement('style');
      style.textContent = `::-webkit-scrollbar {
        appearance: none;
        width: ${width}px;
      }`;
      document.head.appendChild(style);
      assert.strictEqual(UI.UIUtils.measuredScrollbarWidth(document), width);

      // Remove the styles and try again to detect that cached values are used.
      style.remove();
      assert.strictEqual(UI.UIUtils.measuredScrollbarWidth(document), width);
    });
  });

  describe('createFileSelectorElement', () => {
    it('by default it accepts any file types', async () => {
      const callback = () => {};
      const inputElement = UI.UIUtils.createFileSelectorElement(callback);
      assert.isNull(inputElement.getAttribute('accept'));
    });

    it('can set the accept attribute on the input', async () => {
      const callback = () => {};
      const inputElement = UI.UIUtils.createFileSelectorElement(callback, '.json');
      assert.strictEqual(inputElement.getAttribute('accept'), '.json');
    });
  });
});
