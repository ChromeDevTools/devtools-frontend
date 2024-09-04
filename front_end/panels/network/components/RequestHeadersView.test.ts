// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as Persistence from '../../../models/persistence/persistence.js';
import {
  dispatchClickEvent,
  dispatchCopyEvent,
  dispatchKeyDownEvent,
  getCleanTextContentFromElements,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {
  deinitializeGlobalVars,
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import {
  createWorkspaceProject,
  setUpEnvironment,
} from '../../../testing/OverridesHelpers.js';
import {createFileSystemUISourceCode} from '../../../testing/UISourceCodeHelpers.js';
import {
  recordedMetricsContain,
  resetRecordedMetrics,
} from '../../../testing/UserMetricsHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as NetworkForward from '../forward/forward.js';

import * as NetworkComponents from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

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
  earlyHintsHeaders: [
    {name: 'link', value: '<src="/script.js" as="script">'},
  ],
} as unknown as SDK.NetworkRequest.NetworkRequest;

async function renderHeadersComponent(request: SDK.NetworkRequest.NetworkRequest) {
  Object.setPrototypeOf(request, SDK.NetworkRequest.NetworkRequest.prototype);
  const component = new NetworkComponents.RequestHeadersView.RequestHeadersView(request);
  renderElementIntoDOM(component);
  component.wasShown();
  await coordinator.done({waitForWork: true});
  return component;
}

const getTextFromRow = (row: HTMLElement) => {
  assert.isNotNull(row.shadowRoot);
  const headerNameElement = row.shadowRoot.querySelector('.header-name');
  const headerName = headerNameElement?.textContent?.trim() || '';
  const headerValueElement = row.shadowRoot.querySelector('.header-value');
  const headerValue = headerValueElement?.textContent?.trim() || '';
  return [headerName, headerValue];
};

const getRowsFromCategory = (category: HTMLElement) => {
  const slot = getElementWithinComponent(category, 'slot', HTMLSlotElement);
  const section = slot.assignedElements()[0];
  assert.instanceOf(section, HTMLElement);
  assert.isNotNull(section.shadowRoot);
  const rows = section.shadowRoot.querySelectorAll('devtools-header-section-row');
  return Array.from(rows);
};

const getRowsTextFromCategory = (category: HTMLElement) => {
  return getRowsFromCategory(category).map(row => getTextFromRow(row));
};

const getRowHighlightStatus = (container: HTMLElement) => {
  const rows = getRowsFromCategory(container);
  return rows.map(row => {
    const element = row.shadowRoot?.querySelector('.row');
    return element?.classList.contains('header-highlight') || false;
  });
};

describeWithMockConnection('RequestHeadersView', () => {
  let component: NetworkComponents.RequestHeadersView.RequestHeadersView|null|undefined = null;

  beforeEach(() => {
    setUpEnvironment();
    resetRecordedMetrics();
  });

  afterEach(async () => {
    component?.remove();
    await deinitializeGlobalVars();
  });

  it('renders the General section', async () => {
    component = await renderHeadersComponent(defaultRequest);
    assert.isNotNull(component.shadowRoot);

    const generalCategory = component.shadowRoot.querySelector('[aria-label="General"]');
    assert.instanceOf(generalCategory, HTMLElement);

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

  it('status text of a request from cache memory corresponds to the status code', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, 'https://www.example.com' as Platform.DevToolsPath.UrlString,
        '' as Platform.DevToolsPath.UrlString, null, null, null);
    request.statusCode = 200;
    request.setFromMemoryCache();

    component = await renderHeadersComponent(request);
    assert.isNotNull(component.shadowRoot);

    const statusCodeSection = component.shadowRoot.querySelector('.status-with-comment');
    assert.strictEqual('200 OK (from memory cache)', statusCodeSection?.textContent);
  });

  it('renders request and response headers', async () => {
    component = await renderHeadersComponent(defaultRequest);
    assert.isNotNull(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assert.instanceOf(responseHeadersCategory, HTMLElement);
    assert.deepStrictEqual(
        getRowsTextFromCategory(responseHeadersCategory),
        [['age:', '0'], ['cache-control:', 'max-age=600'], ['content-encoding:', 'gzip'], ['content-length:', '661']]);

    const requestHeadersCategory = component.shadowRoot.querySelector('[aria-label="Request Headers"]');
    assert.instanceOf(requestHeadersCategory, HTMLElement);
    assert.deepStrictEqual(
        getRowsTextFromCategory(requestHeadersCategory),
        [[':method:', 'GET'], ['accept-encoding:', 'gzip, deflate, br'], ['cache-control:', 'no-cache']]);
  });

  it('renders early hints headers', async () => {
    component = await renderHeadersComponent(defaultRequest);
    assert.isNotNull(component.shadowRoot);

    const earlyHintsCategory = component.shadowRoot.querySelector('[aria-label="Early Hints Headers"]');
    assert.instanceOf(earlyHintsCategory, HTMLElement);
    assert.deepStrictEqual(getRowsTextFromCategory(earlyHintsCategory), [['link:', '<src="/script.js" as="script">']]);
  });

  it('emits UMA event when a header value is being copied', async () => {
    component = await renderHeadersComponent(defaultRequest);
    assert.isNotNull(component.shadowRoot);

    const generalCategory = component.shadowRoot.querySelector('[aria-label="General"]');
    assert.instanceOf(generalCategory, HTMLElement);

    const spy = sinon.spy(Host.userMetrics, 'actionTaken');
    const headerValue = generalCategory.querySelector('.header-value');
    assert.instanceOf(headerValue, HTMLElement);

    assert.isTrue(spy.notCalled);
    dispatchCopyEvent(headerValue);
    assert.isTrue(spy.calledWith(Host.UserMetrics.Action.NetworkPanelCopyValue));
  });

  it('can switch between source and parsed view', async () => {
    component = await renderHeadersComponent(defaultRequest);
    assert.isNotNull(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assert.instanceOf(responseHeadersCategory, HTMLElement);

    // Switch to viewing source view
    responseHeadersCategory.dispatchEvent(new NetworkComponents.RequestHeadersView.ToggleRawHeadersEvent());
    await coordinator.done();

    const rawHeadersDiv = responseHeadersCategory.querySelector('.raw-headers');
    assert.instanceOf(rawHeadersDiv, HTMLDivElement);
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
    assert.isNotNull(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assert.instanceOf(responseHeadersCategory, HTMLElement);

    // Switch to viewing source view
    responseHeadersCategory.dispatchEvent(new NetworkComponents.RequestHeadersView.ToggleRawHeadersEvent());
    await coordinator.done();

    const rawHeadersDiv = responseHeadersCategory.querySelector('.raw-headers');
    assert.instanceOf(rawHeadersDiv, HTMLDivElement);
    const shortenedRawTextContent = rawHeadersDiv.textContent?.replace(/ {2,}/g, '');
    assert.strictEqual(shortenedRawTextContent?.length, 2896);

    const showMoreButton = responseHeadersCategory.querySelector('devtools-button');
    assert.instanceOf(showMoreButton, HTMLElement);
    assert.strictEqual(showMoreButton.textContent, 'Show more');
    showMoreButton.click();
    await coordinator.done();

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

    component = await renderHeadersComponent(request);
    assert.isNotNull(component.shadowRoot);
    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assert.instanceOf(responseHeadersCategory, HTMLElement);

    const spy = sinon.spy(component, 'render');
    assert.isTrue(spy.notCalled);
    assert.deepStrictEqual(getRowsTextFromCategory(responseHeadersCategory), [['originalname:', 'originalValue']]);

    request.responseHeaders = [{name: 'updatedName', value: 'updatedValue'}];
    assert.isTrue(spy.calledOnce);
    await coordinator.done();
    assert.deepStrictEqual(getRowsTextFromCategory(responseHeadersCategory), [['updatedname:', 'updatedValue']]);
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

    component = await renderHeadersComponent(request);
    assert.isNotNull(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assert.instanceOf(responseHeadersCategory, HTMLElement);
    assert.deepStrictEqual(
        getRowsTextFromCategory(responseHeadersCategory),
        [['devtools:', 'rock'], ['foo:', 'bar'], ['highlightme:', 'some value']]);

    assert.deepStrictEqual(getRowHighlightStatus(responseHeadersCategory), [false, false, false]);
    component.revealHeader(NetworkForward.UIRequestLocation.UIHeaderSection.RESPONSE, 'HiGhLiGhTmE');
    await coordinator.done();
    assert.deepStrictEqual(getRowHighlightStatus(responseHeadersCategory), [false, false, true]);
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

    component = await renderHeadersComponent(request);
    assert.isNotNull(component.shadowRoot);

    const requestHeadersCategory = component.shadowRoot.querySelector('[aria-label="Request Headers"]');
    assert.instanceOf(requestHeadersCategory, HTMLElement);
    assert.deepStrictEqual(
        getRowsTextFromCategory(requestHeadersCategory),
        [['devtools:', 'rock'], ['foo:', 'bar'], ['highlightme:', 'some value']]);

    assert.deepStrictEqual(getRowHighlightStatus(requestHeadersCategory), [false, false, false]);
    component.revealHeader(NetworkForward.UIRequestLocation.UIHeaderSection.REQUEST, 'HiGhLiGhTmE');
    await coordinator.done();
    assert.deepStrictEqual(getRowHighlightStatus(requestHeadersCategory), [false, false, true]);
  });

  it('renders a link to \'.headers\'', async () => {
    const {project} = createFileSystemUISourceCode({
      url: 'file:///path/to/overrides/www.example.com/.headers' as Platform.DevToolsPath.UrlString,
      mimeType: 'text/plain',
      fileSystemPath: 'file:///path/to/overrides',
    });

    await Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().setProject(project);

    component = await renderHeadersComponent(defaultRequest);
    assert.isNotNull(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assert.instanceOf(responseHeadersCategory, HTMLElement);
    assert.isNotNull(responseHeadersCategory.shadowRoot);

    const linkElements = responseHeadersCategory.shadowRoot.querySelectorAll('x-link');
    assert.strictEqual(linkElements.length, 2);

    assert.instanceOf(linkElements[0], HTMLElement);
    assert.strictEqual(linkElements[0].title, 'https://goo.gle/devtools-override');

    assert.instanceOf(linkElements[1], HTMLElement);
    assert.strictEqual(linkElements[1].textContent?.trim(), Persistence.NetworkPersistenceManager.HEADERS_FILENAME);
  });

  it('does not render a link to \'.headers\' if a matching \'.headers\' does not exist', async () => {
    const {project} = createFileSystemUISourceCode({
      url: 'file:///path/to/overrides/www.mismatch.com/.headers' as Platform.DevToolsPath.UrlString,
      mimeType: 'text/plain',
      fileSystemPath: 'file:///path/to/overrides',
    });

    await Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().setProject(project);

    component = await renderHeadersComponent(defaultRequest);
    assert.isNotNull(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assert.instanceOf(responseHeadersCategory, HTMLElement);
    assert.isNotNull(responseHeadersCategory.shadowRoot);

    const linkElement = responseHeadersCategory.shadowRoot.querySelector('x-link');
    assert.isNull(linkElement);
  });

  it('allows enabling header overrides via buttons located next to each header', async () => {
    Common.Settings.Settings.instance().moduleSetting('persistence-network-overrides-enabled').set(false);

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
    assert.isNotNull(component.shadowRoot);
    const responseHeaderSection = component.shadowRoot.querySelector('devtools-response-header-section');
    assert.instanceOf(responseHeaderSection, HTMLElement);
    assert.isNotNull(responseHeaderSection.shadowRoot);
    const headerRow = responseHeaderSection.shadowRoot.querySelector('devtools-header-section-row');
    assert.instanceOf(headerRow, HTMLElement);
    assert.isNotNull(headerRow.shadowRoot);

    const checkRow = (shadowRoot: ShadowRoot, headerName: string, headerValue: string, isEditable: boolean) => {
      assert.strictEqual(shadowRoot.querySelector('.header-name')?.textContent?.trim(), headerName);
      const valueEditableComponent =
          shadowRoot.querySelector<NetworkComponents.EditableSpan.EditableSpan>('.header-value devtools-editable-span');
      if (isEditable) {
        assert.instanceOf(valueEditableComponent, HTMLElement);
        assert.isNotNull(valueEditableComponent.shadowRoot);
        const valueEditable = valueEditableComponent.shadowRoot.querySelector('.editable');
        assert.instanceOf(valueEditable, HTMLSpanElement);
        assert.strictEqual(valueEditable.textContent?.trim(), headerValue);
      } else {
        assert.strictEqual(shadowRoot.querySelector('.header-value')?.textContent?.trim(), headerValue);
        assert.strictEqual(valueEditableComponent, null);
      }
    };

    checkRow(headerRow.shadowRoot, 'foo:', 'bar', false);

    const pencilButton = headerRow.shadowRoot.querySelector('.enable-editing');
    assert.instanceOf(pencilButton, HTMLElement);
    pencilButton.click();
    await coordinator.done();

    checkRow(headerRow.shadowRoot, 'foo:', 'bar', true);
    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.HeaderOverrideEnableEditingClicked));
    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.PersistenceNetworkOverridesEnabled));
  });

  it('records metrics when a new \'.headers\' file is created', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, 'https://www.example.com/' as Platform.DevToolsPath.UrlString,
        '' as Platform.DevToolsPath.UrlString, null, null, null);
    request.responseHeaders = [
      {name: 'foo', value: 'bar'},
    ];
    await createWorkspaceProject('file:///path/to/overrides' as Platform.DevToolsPath.UrlString, []);

    component = await renderHeadersComponent(request);
    assert.isNotNull(component.shadowRoot);
    const responseHeaderSection = component.shadowRoot.querySelector('devtools-response-header-section');
    assert.instanceOf(responseHeaderSection, HTMLElement);
    assert.isNotNull(responseHeaderSection.shadowRoot);
    const headerRow = responseHeaderSection.shadowRoot.querySelector('devtools-header-section-row');
    assert.instanceOf(headerRow, HTMLElement);
    assert.isNotNull(headerRow.shadowRoot);

    const pencilButton = headerRow.shadowRoot.querySelector('.enable-editing');
    assert.instanceOf(pencilButton, HTMLElement);

    assert.isFalse(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.HeaderOverrideFileCreated));

    pencilButton.click();
    await coordinator.done();

    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.HeaderOverrideFileCreated));
  });
});

describeWithEnvironment('RequestHeadersView\'s Category', () => {
  it('can be opened and closed with right/left arrow keys', async () => {
    const component = new NetworkComponents.RequestHeadersView.Category();
    renderElementIntoDOM(component);
    component.data = {
      name: 'general',
      title: 'General' as Common.UIString.LocalizedString,
      loggingContext: 'details-general',
    };
    assert.isNotNull(component.shadowRoot);
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
      loggingContext: 'details-response-headers',
    };
    assert.isNotNull(component.shadowRoot);
    await coordinator.done();
    component.addEventListener(NetworkComponents.RequestHeadersView.ToggleRawHeadersEvent.eventName, () => {
      eventCounter += 1;
    });
    const checkbox = getElementWithinComponent(component, 'input', HTMLInputElement);

    dispatchClickEvent(checkbox);
    assert.strictEqual(eventCounter, 1);
  });
});
