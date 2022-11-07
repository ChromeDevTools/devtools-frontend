// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../../front_end/core/common/common.js';
import * as Host from '../../../../../../front_end/core/host/host.js';
import * as Root from '../../../../../../front_end/core/root/root.js';
import * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as Persistence from '../../../../../../front_end/models/persistence/persistence.js';
import * as NetworkComponents from '../../../../../../front_end/panels/network/components/components.js';
import * as NetworkForward from '../../../../../../front_end/panels/network/forward/forward.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {
  assertElement,
  assertShadowRoot,
  dispatchClickEvent,
  dispatchCopyEvent,
  dispatchKeyDownEvent,
  getCleanTextContentFromElements,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {deinitializeGlobalVars, describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../helpers/MockConnection.js';

import type * as Platform from '../../../../../../front_end/core/platform/platform.js';
import {createFileSystemUISourceCode} from '../../../helpers/UISourceCodeHelpers.js';
import {createWorkspaceProject, setUpEnvironment} from '../../../helpers/OverridesHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

const defaultRequest = {
  statusCode: 200,
  statusText: 'OK',
  requestMethod: 'GET',
  url: () => 'https://www.example.com/index.html',
  cachedInMemory: () => true,
  remoteAddress: () => '199.36.158.100:443',
  referrerPolicy: () => Protocol.Network.RequestReferrerPolicy.StrictOriginWhenCrossOrigin,
  sortedResponseHeaders: [
    {name: 'age', value: '0'},
    {name: 'cache-control', value: 'max-age=600'},
    {name: 'content-encoding', value: 'gzip'},
    {name: 'content-length', value: '661'},
  ],
  requestHeadersText: () => '',
  requestHeaders: () =>
      [{name: ':method', value: 'GET'}, {name: 'accept-encoding', value: 'gzip, deflate, br'},
       {name: 'cache-control', value: 'no-cache'}],
  responseHeadersText: `HTTP/1.1 200 OK
  age: 0
  cache-control: max-age=600
  content-encoding: gzip
  content-length: 661
  `,
  wasBlocked: () => false,
  blockedResponseCookies: () => [],
  originalResponseHeaders: [],
  setCookieHeaders: [],
  getAssociatedData: () => null,
  setAssociatedData: () => {},
} as unknown as SDK.NetworkRequest.NetworkRequest;

async function renderHeadersComponent(request: SDK.NetworkRequest.NetworkRequest) {
  const component = new NetworkComponents.RequestHeadersView.RequestHeadersComponent();
  renderElementIntoDOM(component);
  Object.setPrototypeOf(request, SDK.NetworkRequest.NetworkRequest.prototype);
  component.data = {request} as NetworkComponents.RequestHeadersView.RequestHeadersComponentData;
  await coordinator.done();
  return component;
}

const getTextFromRow = (row: HTMLElement): string[] => {
  assertShadowRoot(row.shadowRoot);
  const headerNameElement = row.shadowRoot.querySelector('.header-name');
  const headerName = headerNameElement?.textContent?.trim() || '';
  const headerValueElement = row.shadowRoot.querySelector('.header-value');
  const headerValue = headerValueElement?.textContent?.trim() || '';
  return [headerName, headerValue];
};

const getRowsFromCategory = (category: HTMLElement): NetworkComponents.HeaderSectionRow.HeaderSectionRow[] => {
  const slot = getElementWithinComponent(category, 'slot', HTMLSlotElement);
  const section = slot.assignedElements()[0];
  assertElement(section, HTMLElement);
  assertShadowRoot(section.shadowRoot);
  const rows = section.shadowRoot.querySelectorAll('devtools-header-section-row');
  return Array.from(rows);
};

const getRowsTextFromCategory = (category: HTMLElement): string[][] => {
  return getRowsFromCategory(category).map(row => getTextFromRow(row));
};

const getRowHighlightStatus = (container: HTMLElement): boolean[] => {
  const rows = getRowsFromCategory(container);
  return rows.map(row => {
    const element = row.shadowRoot?.querySelector('.row');
    return element?.classList.contains('header-highlight') || false;
  });
};

describeWithMockConnection('RequestHeadersView', () => {
  let component: HTMLElement|null|undefined = null;

  beforeEach(() => {
    Root.Runtime.experiments.register(Root.Runtime.ExperimentName.HEADER_OVERRIDES, '');
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.HEADER_OVERRIDES);
    setUpEnvironment();
  });

  afterEach(async () => {
    component?.remove();
    await deinitializeGlobalVars();
  });

  it('renders the General section', async () => {
    component = await renderHeadersComponent(defaultRequest);
    assertShadowRoot(component.shadowRoot);

    const generalCategory = component.shadowRoot.querySelector('[aria-label="General"]');
    assertElement(generalCategory, HTMLElement);

    const names = getCleanTextContentFromElements(generalCategory, '.header-name');
    assert.deepEqual(names, [
      'Request URL:',
      'Request Method:',
      'Status Code:',
      'Remote Address:',
      'Referrer Policy:',
    ]);

    const values = getCleanTextContentFromElements(generalCategory, '.header-value');
    assert.deepEqual(values, [
      'https://www.example.com/index.html',
      'GET',
      '200 OK (from memory cache)',
      '199.36.158.100:443',
      'strict-origin-when-cross-origin',
    ]);
  });

  it('renders request and response headers', async () => {
    component = await renderHeadersComponent(defaultRequest);
    assertShadowRoot(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assertElement(responseHeadersCategory, HTMLElement);
    assert.deepStrictEqual(
        getRowsTextFromCategory(responseHeadersCategory),
        [['age:', '0'], ['cache-control:', 'max-age=600'], ['content-encoding:', 'gzip'], ['content-length:', '661']]);

    const requestHeadersCategory = component.shadowRoot.querySelector('[aria-label="Request Headers"]');
    assertElement(requestHeadersCategory, HTMLElement);
    assert.deepStrictEqual(
        getRowsTextFromCategory(requestHeadersCategory),
        [[':method:', 'GET'], ['accept-encoding:', 'gzip, deflate, br'], ['cache-control:', 'no-cache']]);
  });

  it('emits UMA event when a header value is being copied', async () => {
    component = await renderHeadersComponent(defaultRequest);
    assertShadowRoot(component.shadowRoot);

    const generalCategory = component.shadowRoot.querySelector('[aria-label="General"]');
    assertElement(generalCategory, HTMLElement);

    const spy = sinon.spy(Host.userMetrics, 'actionTaken');
    const headerValue = generalCategory.querySelector('.header-value');
    assertElement(headerValue, HTMLElement);

    assert.isTrue(spy.notCalled);
    dispatchCopyEvent(headerValue);
    assert.isTrue(spy.calledWith(Host.UserMetrics.Action.NetworkPanelCopyValue));
  });

  it('can switch between source and parsed view', async () => {
    component = await renderHeadersComponent(defaultRequest);
    assertShadowRoot(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assertElement(responseHeadersCategory, HTMLElement);

    // Switch to viewing source view
    responseHeadersCategory.dispatchEvent(new NetworkComponents.RequestHeadersView.ToggleRawHeadersEvent());

    const rawHeadersDiv = responseHeadersCategory.querySelector('.raw-headers');
    assertElement(rawHeadersDiv, HTMLDivElement);
    const rawTextContent = rawHeadersDiv.textContent?.replace(/ {2,}/g, '');
    assert.strictEqual(
        rawTextContent,
        'HTTP/1.1 200 OK\nage: 0\ncache-control: max-age=600\ncontent-encoding: gzip\ncontent-length: 661');

    // Switch to viewing parsed view
    responseHeadersCategory.dispatchEvent(new NetworkComponents.RequestHeadersView.ToggleRawHeadersEvent());
    await coordinator.done();

    assert.deepStrictEqual(
        getRowsTextFromCategory(responseHeadersCategory),
        [['age:', '0'], ['cache-control:', 'max-age=600'], ['content-encoding:', 'gzip'], ['content-length:', '661']]);
  });

  it('cuts off long raw headers and shows full content on button click', async () => {
    const loremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
    incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
    ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit
    in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
    cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;

    component = await renderHeadersComponent({
      ...defaultRequest,
      responseHeadersText: loremIpsum.repeat(10),
    } as unknown as SDK.NetworkRequest.NetworkRequest);
    assertShadowRoot(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assertElement(responseHeadersCategory, HTMLElement);

    // Switch to viewing source view
    responseHeadersCategory.dispatchEvent(new NetworkComponents.RequestHeadersView.ToggleRawHeadersEvent());

    const rawHeadersDiv = responseHeadersCategory.querySelector('.raw-headers');
    assertElement(rawHeadersDiv, HTMLDivElement);
    const shortenedRawTextContent = rawHeadersDiv.textContent?.replace(/ {2,}/g, '');
    assert.strictEqual(shortenedRawTextContent?.length, 2896);

    const showMoreButton = responseHeadersCategory.querySelector('devtools-button');
    assertElement(showMoreButton, HTMLElement);
    assert.strictEqual(showMoreButton.textContent, 'Show more');
    showMoreButton.click();
    const noMoreShowMoreButton = responseHeadersCategory.querySelector('devtools-button');
    assert.isNull(noMoreShowMoreButton);

    const fullRawTextContent = rawHeadersDiv.textContent?.replace(/ {2,}/g, '');
    assert.strictEqual(fullRawTextContent?.length, 4450);
  });

  it('re-renders on request headers update', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        'https://www.example.com/foo.html' as Platform.DevToolsPath.UrlString, '' as Platform.DevToolsPath.UrlString,
        null, null, null);
    request.responseHeaders = [{name: 'originalName', value: 'originalValue'}];

    const view = new NetworkComponents.RequestHeadersView.RequestHeadersView(request);
    const div = document.createElement('div');
    renderElementIntoDOM(div);
    view.markAsRoot();
    view.show(div);
    await coordinator.done();

    component = view.element.querySelector('devtools-request-headers');
    assertElement(component, NetworkComponents.RequestHeadersView.RequestHeadersComponent);
    assertShadowRoot(component.shadowRoot);
    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assertElement(responseHeadersCategory, HTMLElement);

    const spy = sinon.spy(component, 'data', ['set']);
    assert.isTrue(spy.set.notCalled);
    assert.deepStrictEqual(getRowsTextFromCategory(responseHeadersCategory), [['originalname:', 'originalValue']]);

    request.responseHeaders = [{name: 'updatedName', value: 'updatedValue'}];
    await coordinator.done();
    assert.isTrue(spy.set.calledOnce);
    assert.deepStrictEqual(getRowsTextFromCategory(responseHeadersCategory), [['updatedname:', 'updatedValue']]);

    view.detach();
  });

  it('can highlight individual response headers', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        'https://www.example.com/foo.html' as Platform.DevToolsPath.UrlString, '' as Platform.DevToolsPath.UrlString,
        null, null, null);
    request.responseHeaders = [
      {name: 'foo', value: 'bar'},
      {name: 'highlightMe', value: 'some value'},
      {name: 'DevTools', value: 'rock'},
    ];

    const view = new NetworkComponents.RequestHeadersView.RequestHeadersView(request);
    const div = document.createElement('div');
    renderElementIntoDOM(div);
    view.markAsRoot();
    view.show(div);
    await coordinator.done();

    component = view.element.querySelector('devtools-request-headers');
    assertElement(component, NetworkComponents.RequestHeadersView.RequestHeadersComponent);
    assertShadowRoot(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assertElement(responseHeadersCategory, HTMLElement);
    assert.deepStrictEqual(
        getRowsTextFromCategory(responseHeadersCategory),
        [['devtools:', 'rock'], ['foo:', 'bar'], ['highlightme:', 'some value']]);

    assert.deepStrictEqual(getRowHighlightStatus(responseHeadersCategory), [false, false, false]);
    view.revealHeader(NetworkForward.UIRequestLocation.UIHeaderSection.Response, 'HiGhLiGhTmE');
    await coordinator.done();
    assert.deepStrictEqual(getRowHighlightStatus(responseHeadersCategory), [false, false, true]);

    view.detach();
  });

  it('can highlight individual request headers', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        'https://www.example.com/foo.html' as Platform.DevToolsPath.UrlString, '' as Platform.DevToolsPath.UrlString,
        null, null, null);
    request.setRequestHeaders([
      {name: 'foo', value: 'bar'},
      {name: 'highlightMe', value: 'some value'},
      {name: 'DevTools', value: 'rock'},
    ]);

    const view = new NetworkComponents.RequestHeadersView.RequestHeadersView(request);
    const div = document.createElement('div');
    renderElementIntoDOM(div);
    view.markAsRoot();
    view.show(div);
    await coordinator.done();

    component = view.element.querySelector('devtools-request-headers');
    assertElement(component, NetworkComponents.RequestHeadersView.RequestHeadersComponent);
    assertShadowRoot(component.shadowRoot);

    const requestHeadersCategory = component.shadowRoot.querySelector('[aria-label="Request Headers"]');
    assertElement(requestHeadersCategory, HTMLElement);
    assert.deepStrictEqual(
        getRowsTextFromCategory(requestHeadersCategory),
        [['devtools:', 'rock'], ['foo:', 'bar'], ['highlightme:', 'some value']]);

    assert.deepStrictEqual(getRowHighlightStatus(requestHeadersCategory), [false, false, false]);
    view.revealHeader(NetworkForward.UIRequestLocation.UIHeaderSection.Request, 'HiGhLiGhTmE');
    await coordinator.done();
    assert.deepStrictEqual(getRowHighlightStatus(requestHeadersCategory), [false, false, true]);

    view.detach();
  });

  it('renders a link to \'.headers\'', async () => {
    const {project} = createFileSystemUISourceCode({
      url: 'file:///path/to/overrides/www.example.com/.headers' as Platform.DevToolsPath.UrlString,
      mimeType: 'text/plain',
      fileSystemPath: 'file:///path/to/overrides',
    });

    await Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().setProject(project);

    component = await renderHeadersComponent(defaultRequest);
    assertShadowRoot(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assertElement(responseHeadersCategory, HTMLElement);
    assertShadowRoot(responseHeadersCategory.shadowRoot);

    const linkElement = responseHeadersCategory.shadowRoot.querySelector('x-link');
    assertElement(linkElement, HTMLElement);
    assert.strictEqual(linkElement.textContent?.trim(), 'Header overrides');
  });

  it('does not render a link to \'.headers\' if a matching \'.headers\' does not exist', async () => {
    const {project} = createFileSystemUISourceCode({
      url: 'file:///path/to/overrides/www.mismatch.com/.headers' as Platform.DevToolsPath.UrlString,
      mimeType: 'text/plain',
      fileSystemPath: 'file:///path/to/overrides',
    });

    await Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().setProject(project);

    component = await renderHeadersComponent(defaultRequest);
    assertShadowRoot(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assertElement(responseHeadersCategory, HTMLElement);
    assertShadowRoot(responseHeadersCategory.shadowRoot);

    const linkElement = responseHeadersCategory.shadowRoot.querySelector('x-link');
    assert.isNull(linkElement);
  });

  it('allows enabling header overrides via buttons located next to each header', async () => {
    Common.Settings.Settings.instance().moduleSetting('persistenceNetworkOverridesEnabled').set(false);

    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, 'https://www.example.com/' as Platform.DevToolsPath.UrlString,
        '' as Platform.DevToolsPath.UrlString, null, null, null);
    request.responseHeaders = [
      {name: 'foo', value: 'bar'},
    ];

    await createWorkspaceProject('file:///path/to/overrides' as Platform.DevToolsPath.UrlString, [
      {
        name: '.headers',
        path: 'www.example.com/',
        content: '[]',
      },
    ]);

    component = await renderHeadersComponent(request);
    assertShadowRoot(component.shadowRoot);
    const responseHeaderSection = component.shadowRoot.querySelector('devtools-response-header-section');
    assertElement(responseHeaderSection, HTMLElement);
    assertShadowRoot(responseHeaderSection.shadowRoot);
    const headerRow = responseHeaderSection.shadowRoot.querySelector('devtools-header-section-row');
    assertElement(headerRow, HTMLElement);
    assertShadowRoot(headerRow.shadowRoot);

    const checkRow = (shadowRoot: ShadowRoot, headerName: string, headerValue: string, isEditable: boolean): void => {
      assert.strictEqual(shadowRoot.querySelector('.header-name')?.textContent?.trim(), headerName);
      assert.strictEqual(shadowRoot.querySelector('.header-value')?.textContent?.trim(), headerValue);
      const editable = shadowRoot.querySelector('.editable');
      if (isEditable) {
        assertElement(editable, HTMLSpanElement);
      } else {
        assert.strictEqual(editable, null);
      }
    };

    checkRow(headerRow.shadowRoot, 'foo:', 'bar', false);

    const pencilButton = headerRow.shadowRoot.querySelector('.enable-editing');
    assertElement(pencilButton, HTMLElement);
    pencilButton.click();
    await coordinator.done();

    checkRow(headerRow.shadowRoot, 'foo:', 'bar', true);
  });
});

describeWithEnvironment('RequestHeadersView\'s Category', () => {
  it('can be opened and closed with right/left arrow keys', async () => {
    const component = new NetworkComponents.RequestHeadersView.Category();
    renderElementIntoDOM(component);
    component.data = {
      name: 'general',
      title: 'General' as Common.UIString.LocalizedString,
    };
    assertShadowRoot(component.shadowRoot);
    await coordinator.done();

    const details = getElementWithinComponent(component, 'details', HTMLDetailsElement);
    const summary = getElementWithinComponent(component, 'summary', HTMLElement);

    assert.isTrue(details.hasAttribute('open'));

    dispatchKeyDownEvent(summary, {key: 'ArrowLeft'});
    assert.isFalse(details.hasAttribute('open'));

    dispatchKeyDownEvent(summary, {key: 'ArrowDown'});
    assert.isFalse(details.hasAttribute('open'));

    dispatchKeyDownEvent(summary, {key: 'ArrowLeft'});
    assert.isFalse(details.hasAttribute('open'));

    dispatchKeyDownEvent(summary, {key: 'ArrowRight'});
    assert.isTrue(details.hasAttribute('open'));

    dispatchKeyDownEvent(summary, {key: 'ArrowUp'});
    assert.isTrue(details.hasAttribute('open'));
  });

  it('dispatches an event when its checkbox is toggled', async () => {
    let eventCounter = 0;
    const component = new NetworkComponents.RequestHeadersView.Category();
    renderElementIntoDOM(component);
    component.data = {
      name: 'responseHeaders',
      title: 'Response Headers' as Common.UIString.LocalizedString,
      headerCount: 3,
      checked: false,
    };
    assertShadowRoot(component.shadowRoot);
    await coordinator.done();
    component.addEventListener(NetworkComponents.RequestHeadersView.ToggleRawHeadersEvent.eventName, () => {
      eventCounter += 1;
    });
    const checkbox = getElementWithinComponent(component, 'input', HTMLInputElement);

    dispatchClickEvent(checkbox);
    assert.strictEqual(eventCounter, 1);
  });
});
