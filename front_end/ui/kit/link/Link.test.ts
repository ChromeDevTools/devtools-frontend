// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Host from '../../../core/host/host.js';
import * as Platform from '../../../core/platform/platform.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {Link} from '../kit.js';

const {urlString} = Platform.DevToolsPath;

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

  describe('allowPrivileged', () => {
    it('sets allow-privileged attribute', () => {
      const link = new Link();
      link.allowPrivileged = true;
      assert.isTrue(link.hasAttribute('allow-privileged'));
    });

    it('unsets allow-privileged attribute', () => {
      const link = new Link();
      link.allowPrivileged = true;
      link.allowPrivileged = false;
      assert.isFalse(link.hasAttribute('allow-privileged'));
    });

    it('reads allow-privileged attribute', () => {
      const link = new Link();
      link.setAttribute('allow-privileged', '');
      assert.isTrue(link.allowPrivileged);
    });
  });

  describe('keyboard activation', () => {
    function dispatchKeyDown(link: Link, key: string): void {
      link.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true}));
    }

    for (const key of ['Enter', ' ']) {
      it(`dispatches a click on "${key}" when there is no href`, () => {
        const link = new Link();
        const onClick = sinon.spy();
        link.addEventListener('click', onClick);
        renderElementIntoDOM(link);

        dispatchKeyDown(link, key);

        sinon.assert.calledOnce(onClick);
      });
    }

    it('does not dispatch a click for other keys', () => {
      const link = new Link();
      const onClick = sinon.spy();
      link.addEventListener('click', onClick);
      renderElementIntoDOM(link);

      dispatchKeyDown(link, 'a');

      sinon.assert.notCalled(onClick);
    });

    it('opens the href instead of dispatching a click when there is an href', () => {
      const stub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'openInNewTab');
      const link = new Link();
      const onClick = sinon.spy();
      link.addEventListener('click', onClick);
      link.setAttribute('href', 'https://example.com/');
      renderElementIntoDOM(link);

      dispatchKeyDown(link, 'Enter');

      sinon.assert.calledOnceWithExactly(stub, urlString`https://example.com/`);
      sinon.assert.notCalled(onClick);
    });
  });

  describe('visual logging', () => {
    it('should default to empty link', () => {
      const link = new Link();
      link.setAttribute('href', 'https://example.com/');
      renderElementIntoDOM(link);

      const jslog = link.getAttribute('jslog');
      assert.isNotEmpty(jslog);
      assert.include(jslog, 'Link');
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
