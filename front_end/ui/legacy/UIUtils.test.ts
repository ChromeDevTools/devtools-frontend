// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import type * as Root from '../../core/root/root.js';
import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';

import * as UI from './legacy.js';

const {urlString} = Platform.DevToolsPath;

describe('UIUtils', () => {
  describe('openInNewTab', () => {
    const {openInNewTab} = UI.UIUtils;
    const {InspectorFrontendHostInstance} = Host.InspectorFrontendHost;

    it('throws a TypeError if the URL is invalid', () => {
      assert.throws(() => openInNewTab('ThisIsNotAValidURL'), TypeError);
    });

    it('opens URLs via host bindings', () => {
      const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

      openInNewTab('https://www.google.com/');

      sinon.assert.callCount(stub, 1);
      assert.deepEqual(stub.args[0], ['https://www.google.com/']);
    });

    it('doesn\'t override existing `utm_source` search parameters', () => {
      const URLs = [
        'http://developer.chrome.com/docs/devtools/workspaces/?utm_source=unittests',
        'http://developers.google.com/learn/?utm_source=unittests',
        'http://web.dev/?utm_source=unittests',
        'http://www.google.com/?utm_source=unittests',
        'https://developer.chrome.com/docs/devtools/?utm_source=unittests',
        'https://developers.google.com/community/?utm_source=unittests',
        'https://www.google.com/?utm_source=unittests',
        'https://web.dev/baseline/?utm_source=unittests',
      ];
      for (const url of URLs) {
        const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

        openInNewTab(url);

        sinon.assert.calledOnceWithExactly(stub, urlString`${url}`);
        stub.restore();
      }
    });

    it('adds `utm_source` search parameter to Google documentation set links', () => {
      const URLs = [
        'http://developer.chrome.com/docs/devtools/workspaces/',
        'http://developers.google.com/learn/',
        'http://web.dev/',
        'https://developer.chrome.com/docs/devtools/',
        'https://developers.google.com/community/',
        'https://web.dev/baseline/',
      ];
      for (const url of URLs) {
        const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

        openInNewTab(url);

        sinon.assert.calledOnce(stub);
        assert.strictEqual(new URL(stub.args[0][0]).searchParams.get('utm_source'), 'devtools');
        stub.restore();
      }
    });

    it('adds `utm_campaign` search parameter to Google documentation set links', () => {
      const CHANNELS: Array<typeof Root.Runtime.hostConfig.channel> = [
        'stable',
        'beta',
        'dev',
        'canary',
      ];
      const URLs = [
        'http://developer.chrome.com/docs/devtools/workspaces/',
        'http://developers.google.com/learn/',
        'http://web.dev/',
        'https://developer.chrome.com/docs/devtools/',
        'https://developers.google.com/community/',
        'https://web.dev/baseline/',
      ];
      for (const channel of CHANNELS) {
        updateHostConfig({channel});

        for (const url of URLs) {
          const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

          openInNewTab(url);

          sinon.assert.calledOnce(stub);
          assert.strictEqual(new URL(stub.args[0][0]).searchParams.get('utm_campaign'), channel);
          stub.restore();
        }
      }
    });

    it('correctly preserves anchors', () => {
      updateHostConfig({channel: 'stable'});
      const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

      openInNewTab('https://developer.chrome.com/docs/devtools/settings/ignore-list/#skip-third-party');

      sinon.assert.calledOnce(stub);
      const url = new URL(stub.args[0][0]);
      assert.strictEqual(url.hash, '#skip-third-party');
      assert.strictEqual(url.searchParams.get('utm_campaign'), 'stable');
      assert.strictEqual(url.searchParams.get('utm_source'), 'devtools');
    });

    it('correctly preserves other search params', () => {
      updateHostConfig({channel: 'stable'});
      const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

      openInNewTab('http://web.dev/route?foo=bar&baz=devtools');

      sinon.assert.calledOnce(stub);
      const url = new URL(stub.args[0][0]);
      assert.strictEqual(url.searchParams.get('baz'), 'devtools');
      assert.strictEqual(url.searchParams.get('foo'), 'bar');
      assert.strictEqual(url.searchParams.get('utm_campaign'), 'stable');
      assert.strictEqual(url.searchParams.get('utm_source'), 'devtools');
    });
  });

  describe('LongClickController', () => {
    it('does not invoke callback when disposed', () => {
      const el = document.createElement('div');
      const callback = sinon.spy();
      const controller = new UI.UIUtils.LongClickController(el, callback);
      // @ts-expect-error
      const setTimeout = sinon.stub(window, 'setTimeout').callsFake(cb => cb());

      el.dispatchEvent(new PointerEvent('pointerdown'));
      sinon.assert.calledOnce(callback);

      controller.dispose();

      el.dispatchEvent(new PointerEvent('pointerdown'));
      sinon.assert.calledOnce(callback);

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
