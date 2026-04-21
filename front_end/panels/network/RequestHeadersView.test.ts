// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Persistence from '../../models/persistence/persistence.js';
import {
  assertScreenshot,
  dispatchCopyEvent,
  dispatchKeyDownEvent,
  getCleanTextContentFromElements,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createWorkspaceProject, setUpEnvironment} from '../../testing/OverridesHelpers.js';
import {createFileSystemUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import {
  recordedMetricsContain,
  resetRecordedMetrics,
} from '../../testing/UserMetricsHelpers.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

import type * as NetworkComponents from './components/components.js';
import * as NetworkForward from './forward/forward.js';
import * as Network from './network.js';

const {urlString} = Platform.DevToolsPath;
const defaultRequest = {
  statusCode: 200,
  statusText: 'OK',
  getInferredStatusText: () => 'OK',
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
  cached: () => true,
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
  const component = new Network.RequestHeadersView.RequestHeadersView();
  component.request = request;
  renderElementIntoDOM(component);
  await UI.Widget.Widget.allUpdatesComplete;
  await RenderCoordinator.done();
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

const getRowsFromCategory = (category: HTMLDetailsElement) => {
  const section = category.lastElementChild;
  assert.instanceOf(section, HTMLElement);
  const rows = (section.shadowRoot ?? section).querySelectorAll('devtools-header-section-row');
  return Array.from(rows);
};

const getRowsTextFromCategory = (category: HTMLDetailsElement) => {
  return getRowsFromCategory(category).map(row => getTextFromRow(row));
};

const getRowHighlightStatus = (container: HTMLDetailsElement) => {
  const rows = getRowsFromCategory(container);
  return rows.map(row => {
    const element = row.shadowRoot?.querySelector('.row');
    return element?.classList.contains('header-highlight') || false;
  });
};

describeWithMockConnection('RequestHeadersView', () => {
  let component: Network.RequestHeadersView.RequestHeadersView|null|undefined = null;

  beforeEach(() => {
    setUpEnvironment();
    resetRecordedMetrics();
  });

  it('renders the General section', async () => {
    component = await renderHeadersComponent(defaultRequest);

    const generalCategory = component.contentElement.querySelector('[aria-label="General"]');
    assert.instanceOf(generalCategory, HTMLElement);

    const names = getCleanTextContentFromElements(generalCategory, '.header-name');
    assert.deepEqual(names, [
      'Request URL',
      'Request Method',
      'Status Code',
      'Remote Address',
      'Referrer Policy',
    ]);

    const values = getCleanTextContentFromElements(generalCategory, '.header-value');
    assert.deepEqual(values, [
      'https://www.example.com/index.html',
      'GET',
      '200 OK (from memory cache)',
      '199.36.158.100:443',
      'strict-origin-when-cross-origin',
    ]);

    await assertScreenshot('network/request-headers-view-general.png');
  });

  it('status text of a request from cache memory corresponds to the status code', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com`, urlString``, null, null, null);
    request.statusCode = 200;
    request.setFromMemoryCache();

    component = await renderHeadersComponent(request);

    const statusCodeSection = component.contentElement.querySelector('.status-with-comment');
    assert.strictEqual('200 OK (from memory cache)', statusCodeSection?.textContent);
  });

  it('renders request and response headers', async () => {
    component = await renderHeadersComponent(defaultRequest);

    const responseHeadersCategory = component.contentElement.querySelector('[aria-label="Response headers"]');
    assert.instanceOf(responseHeadersCategory, HTMLDetailsElement);
    assert.deepEqual(
        getRowsTextFromCategory(responseHeadersCategory),
        [['age', '0'], ['cache-control', 'max-age=600'], ['content-encoding', 'gzip'], ['content-length', '661']]);

    const requestHeadersCategory = component.contentElement.querySelector('[aria-label="Request Headers"]');
    assert.instanceOf(requestHeadersCategory, HTMLDetailsElement);
    assert.deepEqual(
        getRowsTextFromCategory(requestHeadersCategory),
        [[':method', 'GET'], ['accept-encoding', 'gzip, deflate, br'], ['cache-control', 'no-cache']]);
    await assertScreenshot('network/request-headers-view-response.png');
  });

  it('renders early hints headers', async () => {
    component = await renderHeadersComponent(defaultRequest);

    const earlyHintsCategory = component.contentElement.querySelector('[aria-label="Early hints headers"]');
    assert.instanceOf(earlyHintsCategory, HTMLDetailsElement);
    assert.deepEqual(getRowsTextFromCategory(earlyHintsCategory), [['link', '<src="/script.js" as="script">']]);
    await assertScreenshot('network/request-headers-view-early-hints.png');
  });

  it('emits UMA event when a header value is being copied', async () => {
    component = await renderHeadersComponent(defaultRequest);

    const generalCategory = component.contentElement.querySelector('[aria-label="General"]');
    assert.instanceOf(generalCategory, HTMLElement);

    const spy = sinon.spy(Host.userMetrics, 'actionTaken');
    const headerValue = generalCategory.querySelector('.header-value');
    assert.instanceOf(headerValue, HTMLElement);

    sinon.assert.notCalled(spy);
    dispatchCopyEvent(headerValue);
    sinon.assert.calledWith(spy, Host.UserMetrics.Action.NetworkPanelCopyValue);
  });

  it('can switch between source and parsed view', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    Network.RequestHeadersView.DEFAULT_VIEW(
        {
          showRequestHeadersText: false,
          showResponseHeadersText: true,
          request: defaultRequest,
          toggleShowRawResponseHeaders: function(): void {
            throw new Error('Function not implemented.');
          },
          toggleShowRawRequestHeaders: function(): void {
            throw new Error('Function not implemented.');
          }
        },
        {}, container);
    await UI.Widget.Widget.allUpdatesComplete;
    await RenderCoordinator.done();

    const rawHeadersDiv = container.querySelector('.raw-headers');
    assert.exists(rawHeadersDiv);
    const rawTextContent = rawHeadersDiv.textContent?.replace(/ {2,}/g, '');
    assert.strictEqual(
        rawTextContent,
        'HTTP/1.1 200 OK\nage: 0\ncache-control: max-age=600\ncontent-encoding: gzip\ncontent-length: 661\n');

    Network.RequestHeadersView.DEFAULT_VIEW(
        {
          showRequestHeadersText: false,
          showResponseHeadersText: false,
          request: defaultRequest,
          toggleShowRawResponseHeaders: function(): void {
            throw new Error('Function not implemented.');
          },
          toggleShowRawRequestHeaders: function(): void {
            throw new Error('Function not implemented.');
          }
        },
        {}, container);
    await UI.Widget.Widget.allUpdatesComplete;
    await RenderCoordinator.done();

    const category = container.querySelector('[aria-label="Response headers"]');
    assert.instanceOf(category, HTMLDetailsElement);
    assert.deepEqual(
        getRowsTextFromCategory(category),
        [['age', '0'], ['cache-control', 'max-age=600'], ['content-encoding', 'gzip'], ['content-length', '661']]);
  });

  it('cuts off long raw headers and shows full content on button click', async () => {
    const loremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
    incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
    ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit
    in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
    cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`.repeat(10);

    defaultRequest.responseHeadersText = loremIpsum;
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    Network.RequestHeadersView.DEFAULT_VIEW(
        {
          showRequestHeadersText: false,
          showResponseHeadersText: true,
          request: defaultRequest,
          toggleShowRawResponseHeaders: function(): void {
            throw new Error('Function not implemented.');
          },
          toggleShowRawRequestHeaders: function(): void {
            throw new Error('Function not implemented.');
          }
        },
        {}, container);
    await UI.Widget.Widget.allUpdatesComplete;
    await RenderCoordinator.done();

    const responseHeadersCategory = container.querySelector('[aria-label="Response headers"]');
    assert.instanceOf(responseHeadersCategory, HTMLElement);

    const rawHeadersDiv = responseHeadersCategory.querySelector('.raw-headers');
    assert.exists(rawHeadersDiv);
    const shortenedRawTextContent = rawHeadersDiv.textContent?.replace(/ {2,}/g, '');
    assert.strictEqual(shortenedRawTextContent?.length, 2905);

    const showMoreButton = responseHeadersCategory.querySelector('devtools-button');
    assert.instanceOf(showMoreButton, HTMLElement);
    assert.strictEqual(showMoreButton.textContent, 'Show more');
    showMoreButton.click();
    await UI.Widget.Widget.allUpdatesComplete;
    await RenderCoordinator.done();

    const noMoreShowMoreButton = responseHeadersCategory.querySelector('devtools-button');
    assert.isNull(noMoreShowMoreButton);

    const fullRawTextContent = rawHeadersDiv.textContent?.replace(/ {2,}/g, '');
    assert.strictEqual(fullRawTextContent?.length, 4450);
  });

  it('re-renders on request headers update', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/foo.html`, urlString``, null, null,
        null);
    request.responseHeaders = [{name: 'originalName', value: 'originalValue'}];

    component = await renderHeadersComponent(request);
    const responseHeadersCategory = component.contentElement.querySelector('[aria-label="Response headers"]');
    assert.instanceOf(responseHeadersCategory, HTMLDetailsElement);

    assert.deepEqual(getRowsTextFromCategory(responseHeadersCategory), [['originalname', 'originalValue']]);

    request.responseHeaders = [{name: 'updatedName', value: 'updatedValue'}];
    await UI.Widget.Widget.allUpdatesComplete;
    await RenderCoordinator.done();
    await component.updateComplete;
    assert.deepEqual(getRowsTextFromCategory(responseHeadersCategory), [['updatedname', 'updatedValue']]);
  });

  it('can highlight individual response headers', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/foo.html`, urlString``, null, null,
        null);
    request.responseHeaders = [
      {name: 'foo', value: 'bar'},
      {name: 'highlightMe', value: 'some value'},
      {name: 'DevTools', value: 'rock'},
    ];

    component = await renderHeadersComponent(request);

    const responseHeadersCategory = component.contentElement.querySelector('[aria-label="Response headers"]');
    assert.instanceOf(responseHeadersCategory, HTMLDetailsElement);
    assert.deepEqual(
        getRowsTextFromCategory(responseHeadersCategory),
        [['devtools', 'rock'], ['foo', 'bar'], ['highlightme', 'some value']]);

    assert.deepEqual(getRowHighlightStatus(responseHeadersCategory), [false, false, false]);
    component.revealHeader(NetworkForward.UIRequestLocation.UIHeaderSection.RESPONSE, 'HiGhLiGhTmE');
    await UI.Widget.Widget.allUpdatesComplete;
    await RenderCoordinator.done();
    assert.deepEqual(getRowHighlightStatus(responseHeadersCategory), [false, false, true]);
    await assertScreenshot('network/request-headers-view-early-highlight.png');
  });

  it('can highlight individual request headers', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/foo.html`, urlString``, null, null,
        null);
    request.setRequestHeaders([
      {name: 'foo', value: 'bar'},
      {name: 'highlightMe', value: 'some value'},
      {name: 'DevTools', value: 'rock'},
    ]);

    component = await renderHeadersComponent(request);

    const requestHeadersCategory = component.contentElement.querySelector('[aria-label="Request Headers"]');
    assert.instanceOf(requestHeadersCategory, HTMLDetailsElement);
    assert.deepEqual(
        getRowsTextFromCategory(requestHeadersCategory),
        [['devtools', 'rock'], ['foo', 'bar'], ['highlightme', 'some value']]);

    assert.deepEqual(getRowHighlightStatus(requestHeadersCategory), [false, false, false]);
    component.revealHeader(NetworkForward.UIRequestLocation.UIHeaderSection.REQUEST, 'HiGhLiGhTmE');
    await UI.Widget.Widget.allUpdatesComplete;
    await RenderCoordinator.done();
    assert.deepEqual(getRowHighlightStatus(requestHeadersCategory), [false, false, true]);
  });

  it('renders a link to \'.headers\'', async () => {
    const {project} = createFileSystemUISourceCode({
      url: urlString`file:///path/to/overrides/www.example.com/.headers`,
      mimeType: 'text/plain',
      fileSystemPath: 'file:///path/to/overrides',
    });

    await Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().setProject(project);

    component = await renderHeadersComponent(defaultRequest);

    const responseHeadersCategory = component.contentElement.querySelector('[aria-label="Response headers"]');
    assert.instanceOf(responseHeadersCategory, HTMLElement);

    const linkElements = responseHeadersCategory.querySelectorAll('devtools-link');
    assert.lengthOf(linkElements, 2);

    assert.instanceOf(linkElements[0], HTMLElement);
    assert.strictEqual(linkElements[0].title, 'https://goo.gle/devtools-override');

    assert.instanceOf(linkElements[1], HTMLElement);
    assert.strictEqual(linkElements[1].textContent?.trim(), Persistence.NetworkPersistenceManager.HEADERS_FILENAME);
  });

  it('does not render a link to \'.headers\' if a matching \'.headers\' does not exist', async () => {
    const {project} = createFileSystemUISourceCode({
      url: urlString`file:///path/to/overrides/www.mismatch.com/.headers`,
      mimeType: 'text/plain',
      fileSystemPath: 'file:///path/to/overrides',
    });

    await Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().setProject(project);

    component = await renderHeadersComponent(defaultRequest);

    const responseHeadersCategory = component.contentElement.querySelector('[aria-label="Response headers"]');
    assert.instanceOf(responseHeadersCategory, HTMLElement);

    const linkElement = responseHeadersCategory.querySelector('devtools-link');
    assert.isNull(linkElement);
  });

  it('allows enabling header overrides via buttons located next to each header', async () => {
    Common.Settings.Settings.instance().moduleSetting('persistence-network-overrides-enabled').set(false);

    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/`, urlString``, null, null, null);
    request.responseHeaders = [
      {name: 'foo', value: 'bar'},
    ];

    await createWorkspaceProject(urlString`file:///path/to/overrides`, [
      {
        name: '.headers',
        path: 'www.example.com/',
        content: '[]',
      },
    ]);

    component = await renderHeadersComponent(request);
    const responseHeaderSection = component.contentElement.querySelector('devtools-response-header-section');
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
        assert.isNull(valueEditableComponent);
      }
    };

    checkRow(headerRow.shadowRoot, 'foo', 'bar', false);

    const pencilButton = headerRow.shadowRoot.querySelector('.enable-editing');
    assert.instanceOf(pencilButton, HTMLElement);
    pencilButton.click();
    await UI.Widget.Widget.allUpdatesComplete;
    await RenderCoordinator.done();

    checkRow(headerRow.shadowRoot, 'foo', 'bar', true);
    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.HeaderOverrideEnableEditingClicked));
    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.PersistenceNetworkOverridesEnabled));
  });

  it('records metrics when a new \'.headers\' file is created', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/`, urlString``, null, null, null);
    request.responseHeaders = [
      {name: 'foo', value: 'bar'},
    ];
    await createWorkspaceProject(urlString`file:///path/to/overrides`, []);

    component = await renderHeadersComponent(request);
    const responseHeaderSection = component.contentElement.querySelector('devtools-response-header-section');
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
    await UI.Widget.Widget.allUpdatesComplete;
    await RenderCoordinator.done();

    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.HeaderOverrideFileCreated));
  });

  it('categories can be opened and closed with right/left arrow keys', async () => {
    const component = document.createElement('div');
    Lit.render(
        Network.RequestHeadersView.renderCategory({
          name: 'general',
          title: 'General' as Common.UIString.LocalizedString,
          loggingContext: 'details-general',
          contents: Lit.nothing,
        }),
        component);
    renderElementIntoDOM(component);

    const details = component.querySelector('details');
    const summary = component.querySelector('summary');
    assert.exists(details);
    assert.exists(summary);

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
});
