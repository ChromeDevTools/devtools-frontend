// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../../front_end/core/platform/platform.js';
import type * as Logs from '../../../../../../front_end/models/logs/logs.js';
import type * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import * as Common from '../../../../../../front_end/core/common/common.js';
import type * as Platform from '../../../../../../front_end/core/platform/platform.js';
import * as RequestLinkIcon from '../../../../../../front_end/ui/components/request_link_icon/request_link_icon.js';
import * as IconButton from '../../../../../../front_end/ui/components/icon_button/icon_button.js';
import {assertElement, assertShadowRoot, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../../../../front_end/ui/legacy/legacy.js';
import type * as Protocol from '../../../../../../front_end/generated/protocol.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import * as NetworkForward from '../../../../../../front_end/panels/network/forward/forward.js';
import * as Root from '../../../../../../front_end/core/root/root.js';

const {assert} = chai;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const renderRequestLinkIcon = async(data: RequestLinkIcon.RequestLinkIcon.RequestLinkIconData): Promise<{
  component: RequestLinkIcon.RequestLinkIcon.RequestLinkIcon,
  shadowRoot: ShadowRoot,
}> => {
  const component = new RequestLinkIcon.RequestLinkIcon.RequestLinkIcon();
  component.data = data;
  renderElementIntoDOM(component);
  assertShadowRoot(component.shadowRoot);
  await coordinator.done();
  return {component, shadowRoot: component.shadowRoot};
};

export const extractElements = (shadowRoot: ShadowRoot): {
  icon: IconButton.Icon.Icon,
  container: HTMLSpanElement,
  label?: HTMLSpanElement,
} => {
  const icon = shadowRoot.querySelector('devtools-icon');
  assertElement(icon, IconButton.Icon.Icon);
  const container = shadowRoot.querySelector('span');
  assertNotNullOrUndefined(container);
  const label = shadowRoot.querySelector('span > span');
  if (label !== null) {
    assertElement(label, HTMLSpanElement);
    return {
      icon,
      container,
      label,
    };
  }
  return {icon, container};
};

export const extractData = (shadowRoot: ShadowRoot): {
  iconData: IconButton.Icon.IconData,
  label: string|null,
  containerClasses: string[],
} => {
  const {icon, container, label} = extractElements(shadowRoot);
  return {
    iconData: icon.data,
    label: label ? label.textContent : null,
    containerClasses: Array.from(container.classList),
  };
};

interface MockRequestResolverEntry {
  resolve: (request: SDK.NetworkRequest.NetworkRequest|null) => void;
  promise: Promise<SDK.NetworkRequest.NetworkRequest|null>;
}

class MockRequestResolver {
  private promiseMap: Map<string, MockRequestResolverEntry> = new Map();

  waitFor(requestId?: string) {
    if (!requestId) {
      if (this.promiseMap.size !== 1) {
        throw new Error('more than one request being awaited, specify a request id');
      }
      requestId = this.promiseMap.keys().next().value;
    }
    requestId = requestId || '';
    const entry = this.promiseMap.get(requestId);
    if (entry) {
      return entry.promise;
    }
    let resolve: (request: SDK.NetworkRequest.NetworkRequest|null) => void = () => {};
    const promise = new Promise<SDK.NetworkRequest.NetworkRequest|null>(r => {
      resolve = r;
    });
    this.promiseMap.set(requestId, {resolve, promise});
    return promise;
  }

  resolve(result: SDK.NetworkRequest.NetworkRequest|null, requestId?: string): void {
    if (!requestId && this.promiseMap.size === 1) {
      requestId = this.promiseMap.keys().next().value;
    }
    requestId = requestId || result?.requestId() || '';
    const entry = this.promiseMap.get(requestId);
    if (!entry) {
      throw new Error('resolve uninitialized');
    }
    entry.resolve(result);
    this.promiseMap.delete(requestId);
  }

  clear() {
    for (const {resolve} of this.promiseMap.values()) {
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

      const {iconData, label} = extractData(shadowRoot);
      assert.strictEqual('iconName' in iconData ? iconData.iconName : null, 'arrow-up-down-circle');
      assert.strictEqual(iconData.color, 'var(--icon-no-request)');
      assert.isNull(label, 'Didn\'t expect a label');
    });

    it('renders correctly with a request', async () => {
      const {shadowRoot} = await renderRequestLinkIcon({
        request: mockRequest as unknown as SDK.NetworkRequest.NetworkRequest,
      });

      const {iconData, label} = extractData(shadowRoot);
      assert.strictEqual('iconName' in iconData ? iconData.iconName : null, 'arrow-up-down-circle');
      assert.strictEqual(iconData.color, 'var(--icon-link)');
      assert.isNull(label, 'Didn\'t expect a label');
    });

    it('renders the request label correctly without a trailing slash', async () => {
      const {shadowRoot} = await renderRequestLinkIcon({
        request: mockRequest as unknown as SDK.NetworkRequest.NetworkRequest,
        displayURL: true,
      });

      const {label} = extractData(shadowRoot);
      assert.strictEqual(label, 'baz');
    });

    it('renders the request label correctly with a trailing slash', async () => {
      const {shadowRoot} = await renderRequestLinkIcon({
        request: mockRequestWithTrailingSlash as unknown as SDK.NetworkRequest.NetworkRequest,
        displayURL: true,
      });

      const {label} = extractData(shadowRoot);
      assert.strictEqual(label, 'baz/');
    });

    it('renders the request label correctly without a request', async () => {
      const {shadowRoot} = await renderRequestLinkIcon({
        affectedRequest: {requestId: requestId1, url: 'https://alpha.beta/gamma'},
        requestResolver: failingRequestResolver as unknown as Logs.RequestResolver.RequestResolver,
        displayURL: true,
      });

      const {label} = extractData(shadowRoot);
      assert.strictEqual(label, 'gamma');
    });

    it('renders alternative text for URL', async () => {
      const {shadowRoot} = await renderRequestLinkIcon({
        affectedRequest: {requestId: requestId1, url: 'https://alpha.beta/gamma'},
        requestResolver: failingRequestResolver as unknown as Logs.RequestResolver.RequestResolver,
        displayURL: true,
        urlToDisplay: 'https://alpha.beta/gamma',
      });

      const {label} = extractData(shadowRoot);
      assert.strictEqual(label, 'https://alpha.beta/gamma');
    });

    it('the style reacts to the presence of a request', async () => {
      const {shadowRoot} = await renderRequestLinkIcon({
        request: mockRequest as unknown as SDK.NetworkRequest.NetworkRequest,
      });

      const {containerClasses} = extractData(shadowRoot);
      assert.include(containerClasses, 'link');
    });

    it('the style reacts to the absence of a request', async () => {
      const {shadowRoot} = await renderRequestLinkIcon({
        affectedRequest: {requestId: requestId1, url: 'https://alpha.beta/gamma'},
        requestResolver: failingRequestResolver as unknown as Logs.RequestResolver.RequestResolver,
      });

      const {containerClasses} = extractData(shadowRoot);
      assert.notInclude(containerClasses, 'link');
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

      const {containerClasses: containerClassesBefore} = extractData(shadowRoot);
      assert.notInclude(containerClassesBefore, 'link');

      resolver.resolve(mockRequest as unknown as SDK.NetworkRequest.NetworkRequest);

      await coordinator.done({waitForWork: true});

      const {containerClasses: containerClassesAfter} = extractData(shadowRoot);
      assert.include(containerClassesAfter, 'link');
    });

    it('to set the label correctly', async () => {
      const resolver = new MockRequestResolver();
      const {shadowRoot} = await renderRequestLinkIcon({
        affectedRequest: {requestId: requestId1, url: 'https://alpha.beta/gamma'},
        requestResolver: resolver as unknown as Logs.RequestResolver.RequestResolver,
        displayURL: true,
      });

      const {label: labelBefore} = extractData(shadowRoot);
      assert.strictEqual(labelBefore, 'gamma');

      resolver.resolve(mockRequest as unknown as SDK.NetworkRequest.NetworkRequest);

      await coordinator.done({waitForWork: true});

      const {label: labelAfter} = extractData(shadowRoot);
      assert.strictEqual(labelAfter, 'baz');
    });

    it('to set icon color correctly', async () => {
      const resolver = new MockRequestResolver();
      const {shadowRoot} = await renderRequestLinkIcon({
        affectedRequest: {requestId: requestId1, url: 'https://alpha.beta/gamma'},
        requestResolver: resolver as unknown as Logs.RequestResolver.RequestResolver,
        displayURL: true,
      });

      const {iconData: iconDataBefore} = extractData(shadowRoot);
      assert.strictEqual(iconDataBefore.color, 'var(--icon-no-request)');

      resolver.resolve(mockRequest as unknown as SDK.NetworkRequest.NetworkRequest);

      await coordinator.done({waitForWork: true});

      const {iconData: iconDataAfter} = extractData(shadowRoot);
      assert.strictEqual(iconDataAfter.color, 'var(--icon-link)');
    });

    it('handles multiple data assignments', async () => {
      const resolver = new MockRequestResolver();
      const {shadowRoot, component} = await renderRequestLinkIcon({
        affectedRequest: {requestId: requestId2, url: 'https://alpha.beta/gamma'},
        requestResolver: resolver as unknown as Logs.RequestResolver.RequestResolver,
        displayURL: true,
      });

      const {label: labelBefore} = extractData(shadowRoot);
      assert.strictEqual(labelBefore, 'gamma');

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

      const {label: labelAfter} = extractData(shadowRoot);
      assert.strictEqual(labelAfter, 'baz');
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

    it('if the icon is clicked', async () => {
      Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.HEADER_OVERRIDES);
      const revealOverride = sinon.fake(Common.Revealer.reveal);
      const {shadowRoot} = await renderRequestLinkIcon({
        request: mockRequest as unknown as SDK.NetworkRequest.NetworkRequest,
        displayURL: true,
        revealOverride,
      });

      const {icon} = extractElements(shadowRoot);

      icon.click();

      assert.isTrue(revealOverride.called);
      assert.isTrue(revealOverride.calledOnceWith(
          sinon.match({tab: NetworkForward.UIRequestLocation.UIRequestTabs.HeadersComponent})));
    });

    it('if the container is clicked', async () => {
      Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.HEADER_OVERRIDES);
      const revealOverride = sinon.fake(Common.Revealer.reveal);
      const {shadowRoot} = await renderRequestLinkIcon({
        request: mockRequest as unknown as SDK.NetworkRequest.NetworkRequest,
        displayURL: true,
        revealOverride,
      });

      const {container} = extractElements(shadowRoot);

      container.click();

      assert.isTrue(revealOverride.called);
      assert.isTrue(
          revealOverride.calledOnceWith(sinon.match({tab: NetworkForward.UIRequestLocation.UIRequestTabs.Headers})));
    });

    it('if the label is clicked', async () => {
      const revealOverride = sinon.fake(Common.Revealer.reveal);
      const {shadowRoot} = await renderRequestLinkIcon({
        request: mockRequest as unknown as SDK.NetworkRequest.NetworkRequest,
        displayURL: true,
        revealOverride,
      });

      const {label} = extractElements(shadowRoot);

      label?.click();

      assert.isTrue(revealOverride.called);
    });
  });
});
