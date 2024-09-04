// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import type * as Platform from '../../../core/platform/platform.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import type * as Logs from '../../../models/logs/logs.js';
import * as NetworkForward from '../../../panels/network/forward/forward.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as UI from '../../legacy/legacy.js';
import * as IconButton from '../icon_button/icon_button.js';
import * as Coordinator from '../render_coordinator/render_coordinator.js';

import * as RequestLinkIcon from './request_link_icon.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const renderRequestLinkIcon = async(data: RequestLinkIcon.RequestLinkIcon.RequestLinkIconData): Promise<{
  component: RequestLinkIcon.RequestLinkIcon.RequestLinkIcon,
  shadowRoot: ShadowRoot,
}> => {
  const component = new RequestLinkIcon.RequestLinkIcon.RequestLinkIcon();
  component.data = data;
  renderElementIntoDOM(component);
  assert.isNotNull(component.shadowRoot);
  await coordinator.done();
  return {component, shadowRoot: component.shadowRoot};
};

export const extractElements = (shadowRoot: ShadowRoot): {
  icon: IconButton.Icon.Icon,
  button: HTMLButtonElement,
  label: HTMLSpanElement|null,
} => {
  const icon = shadowRoot.querySelector('devtools-icon');
  assert.instanceOf(icon, IconButton.Icon.Icon);
  const button = shadowRoot.querySelector('button');
  assert.instanceOf(button, HTMLButtonElement);
  const label = shadowRoot.querySelector('button > span');
  if (label !== null) {
    assert.instanceOf(label, HTMLSpanElement);
  }
  return {icon, button, label};
};

interface MockRequestResolverEntry {
  resolve: (request: SDK.NetworkRequest.NetworkRequest|null) => void;
  promise: Promise<SDK.NetworkRequest.NetworkRequest|null>;
}

class MockRequestResolver {
  #promiseMap: Map<string, MockRequestResolverEntry> = new Map();

  waitFor(requestId?: string) {
    if (!requestId) {
      if (this.#promiseMap.size !== 1) {
        throw new Error('more than one request being awaited, specify a request id');
      }
      requestId = this.#promiseMap.keys().next().value;
    }
    requestId = requestId || '';
    const entry = this.#promiseMap.get(requestId);
    if (entry) {
      return entry.promise;
    }
    let resolve: (request: SDK.NetworkRequest.NetworkRequest|null) => void = () => {};
    const promise = new Promise<SDK.NetworkRequest.NetworkRequest|null>(r => {
      resolve = r;
    });
    this.#promiseMap.set(requestId, {resolve, promise});
    return promise;
  }

  resolve(result: SDK.NetworkRequest.NetworkRequest|null, requestId?: string): void {
    if (!requestId && this.#promiseMap.size === 1) {
      requestId = this.#promiseMap.keys().next().value;
    }
    requestId = requestId || result?.requestId() || '';
    const entry = this.#promiseMap.get(requestId);
    if (!entry) {
      throw new Error('resolve uninitialized');
    }
    entry.resolve(result);
    this.#promiseMap.delete(requestId);
  }

  clear() {
    for (const {resolve} of this.#promiseMap.values()) {
      resolve(null);
    }
  }
}

describeWithEnvironment('RequestLinkIcon', () => {
  const requestId1 = 'r1' as Protocol.Network.RequestId;
  const requestId2 = 'r2' as Protocol.Network.RequestId;

  describe('with simple requests', () => {
    const mockRequest = {
      url() {
        return 'http://foo.bar/baz';
      },
    };

    const mockRequestWithTrailingSlash = {
      url() {
        return 'http://foo.bar/baz/';
      },
    };

    const failingRequestResolver = {
      async waitFor() {
        throw new Error('Couldn\'t resolve');
      },
    };

    it('renders correctly without a request', async () => {
      const {shadowRoot} = await renderRequestLinkIcon({
        affectedRequest: {requestId: requestId1},
        requestResolver: failingRequestResolver as unknown as Logs.RequestResolver.RequestResolver,
      });

      const {button, icon, label} = extractElements(shadowRoot);
      assert.isFalse(button.classList.contains('link'));
      assert.strictEqual(icon.name, 'arrow-up-down-circle');
      assert.isNull(label, 'Didn\'t expect a label');
    });

    it('renders correctly with a request', async () => {
      const {shadowRoot} = await renderRequestLinkIcon({
        request: mockRequest as unknown as SDK.NetworkRequest.NetworkRequest,
      });

      const {button, icon, label} = extractElements(shadowRoot);
      assert.isTrue(button.classList.contains('link'));
      assert.strictEqual(icon.name, 'arrow-up-down-circle');
      assert.isNull(label, 'Didn\'t expect a label');
    });

    it('renders the request label correctly without a trailing slash', async () => {
      const {shadowRoot} = await renderRequestLinkIcon({
        request: mockRequest as unknown as SDK.NetworkRequest.NetworkRequest,
        displayURL: true,
      });

      const {label} = extractElements(shadowRoot);
      assert.strictEqual(label?.textContent, 'baz');
    });

    it('renders the request label correctly with a trailing slash', async () => {
      const {shadowRoot} = await renderRequestLinkIcon({
        request: mockRequestWithTrailingSlash as unknown as SDK.NetworkRequest.NetworkRequest,
        displayURL: true,
      });

      const {label} = extractElements(shadowRoot);
      assert.strictEqual(label?.textContent, 'baz/');
    });

    it('renders the request label correctly without a request', async () => {
      const {shadowRoot} = await renderRequestLinkIcon({
        affectedRequest: {requestId: requestId1, url: 'https://alpha.beta/gamma'},
        requestResolver: failingRequestResolver as unknown as Logs.RequestResolver.RequestResolver,
        displayURL: true,
      });

      const {label} = extractElements(shadowRoot);
      assert.strictEqual(label?.textContent, 'gamma');
    });

    it('renders alternative text for URL', async () => {
      const {shadowRoot} = await renderRequestLinkIcon({
        affectedRequest: {requestId: requestId1, url: 'https://alpha.beta/gamma'},
        requestResolver: failingRequestResolver as unknown as Logs.RequestResolver.RequestResolver,
        displayURL: true,
        urlToDisplay: 'https://alpha.beta/gamma',
      });

      const {label} = extractElements(shadowRoot);
      assert.strictEqual(label?.textContent, 'https://alpha.beta/gamma');
    });
  });

  describe('transitions upon request resolution', () => {
    const mockRequest = {
      url() {
        return 'http://foo.bar/baz';
      },
    };

    it('to change the style correctly', async () => {
      const resolver = new MockRequestResolver();
      const {shadowRoot} = await renderRequestLinkIcon({
        affectedRequest: {requestId: requestId1, url: 'https://alpha.beta/gamma'},
        requestResolver: resolver as unknown as Logs.RequestResolver.RequestResolver,
      });

      assert.isFalse(extractElements(shadowRoot).button.classList.contains('link'));

      resolver.resolve(mockRequest as unknown as SDK.NetworkRequest.NetworkRequest);
      await coordinator.done({waitForWork: true});

      assert.isTrue(extractElements(shadowRoot).button.classList.contains('link'));
    });

    it('to set the label correctly', async () => {
      const resolver = new MockRequestResolver();
      const {shadowRoot} = await renderRequestLinkIcon({
        affectedRequest: {requestId: requestId1, url: 'https://alpha.beta/gamma'},
        requestResolver: resolver as unknown as Logs.RequestResolver.RequestResolver,
        displayURL: true,
      });

      assert.strictEqual(extractElements(shadowRoot).label?.textContent, 'gamma');

      resolver.resolve(mockRequest as unknown as SDK.NetworkRequest.NetworkRequest);
      await coordinator.done({waitForWork: true});

      assert.strictEqual(extractElements(shadowRoot).label?.textContent, 'baz');
    });

    it('handles multiple data assignments', async () => {
      const resolver = new MockRequestResolver();
      const {shadowRoot, component} = await renderRequestLinkIcon({
        affectedRequest: {requestId: requestId2, url: 'https://alpha.beta/gamma'},
        requestResolver: resolver as unknown as Logs.RequestResolver.RequestResolver,
        displayURL: true,
      });

      assert.strictEqual(extractElements(shadowRoot).label?.textContent, 'gamma');

      const mockRequest2 = {
        url() {
          return 'http://foo.bar/baz';
        },
        requestId() {
          return requestId1;
        },
      };

      component.data = {
        affectedRequest: {requestId: requestId1, url: 'https://alpha.beta/gamma'},
        requestResolver: resolver as unknown as Logs.RequestResolver.RequestResolver,
        displayURL: true,
      };

      resolver.resolve(mockRequest2 as unknown as SDK.NetworkRequest.NetworkRequest);
      await coordinator.done({waitForWork: true});

      assert.strictEqual(extractElements(shadowRoot).label?.textContent, 'baz');

      resolver.clear();
    });
  });

  describe('handles clicks correctly', () => {
    const mockRequest = {
      url() {
        return 'http://foo.bar/baz';
      },
    };

    before(() => {
      UI.ViewManager.resetViewRegistration();
      UI.ViewManager.registerViewExtension({
        // @ts-ignore
        location: 'mock-location',
        id: 'network',
        title: () => 'Network' as Platform.UIString.LocalizedString,
        commandPrompt: () => 'Network' as Platform.UIString.LocalizedString,
        persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
        async loadView() {
          return new UI.Widget.Widget();
        },
      });
      UI.ViewManager.ViewManager.instance({forceNew: true});
    });

    after(() => {
      UI.ViewManager.maybeRemoveViewExtension('network');
    });

    it('if the button is clicked', async () => {
      const revealOverride = sinon.fake(Common.Revealer.reveal);
      const {shadowRoot} = await renderRequestLinkIcon({
        request: mockRequest as unknown as SDK.NetworkRequest.NetworkRequest,
        displayURL: true,
        revealOverride,
      });

      const {button} = extractElements(shadowRoot);

      button.click();

      assert.isTrue(revealOverride.called);
      assert.isTrue(revealOverride.calledOnceWith(
          sinon.match({tab: NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT})));
    });
  });
});
