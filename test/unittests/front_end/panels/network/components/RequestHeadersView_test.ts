// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as NetworkComponents from '../../../../../../front_end/panels/network/components/components.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import type * as Common from '../../../../../../front_end/core/common/common.js';
import * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import * as Host from '../../../../../../front_end/core/host/host.js';
import * as NetworkForward from '../../../../../../front_end/panels/network/forward/forward.js';

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
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import * as Root from '../../../../../../front_end/core/root/root.js';
import {createTarget, deinitializeGlobalVars} from '../../../helpers/EnvironmentHelpers.js';
import * as Workspace from '../../../../../../front_end/models/workspace/workspace.js';
import * as Persistence from '../../../../../../front_end/models/persistence/persistence.js';
import * as Bindings from '../../../../../../front_end/models/bindings/bindings.js';
import {describeWithMockConnection} from '../../../helpers/MockConnection.js';
import type * as Platform from '../../../../../../front_end/core/platform/platform.js';
import {createFileSystemUISourceCode} from '../../../helpers/UISourceCodeHelpers.js';

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
} as unknown as SDK.NetworkRequest.NetworkRequest;

function setUpEnvironment() {
  createTarget();
  const workspace = Workspace.Workspace.WorkspaceImpl.instance();
  const targetManager = SDK.TargetManager.TargetManager.instance();
  const debuggerWorkspaceBinding =
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({forceNew: true, targetManager, workspace});
  const breakpointManager = Bindings.BreakpointManager.BreakpointManager.instance(
      {forceNew: true, targetManager, workspace, debuggerWorkspaceBinding});
  Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
  Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance({forceNew: true, workspace});
}

async function renderHeadersComponent(request: SDK.NetworkRequest.NetworkRequest) {
  const component = new NetworkComponents.RequestHeadersView.RequestHeadersComponent();
  renderElementIntoDOM(component);
  Object.setPrototypeOf(request, SDK.NetworkRequest.NetworkRequest.prototype);
  component.data = {request} as NetworkComponents.RequestHeadersView.RequestHeadersComponentData;
  await coordinator.done();
  return component;
}

describeWithMockConnection('RequestHeadersView', () => {
  beforeEach(async () => {
    Root.Runtime.experiments.register(Root.Runtime.ExperimentName.HEADER_OVERRIDES, '');
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.HEADER_OVERRIDES);
    await setUpEnvironment();
  });

  afterEach(async () => {
    await deinitializeGlobalVars();
  });

  it('renders the General section', async () => {
    const component = await renderHeadersComponent(defaultRequest);
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
    const component = await renderHeadersComponent(defaultRequest);
    assertShadowRoot(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assertElement(responseHeadersCategory, HTMLElement);
    assert.deepEqual(getCleanTextContentFromElements(responseHeadersCategory, '.header-name'), [
      'age:',
      'cache-control:',
      'content-encoding:',
      'content-length:',
    ]);
    assert.deepEqual(getCleanTextContentFromElements(responseHeadersCategory, '.header-value'), [
      '0',
      'max-age=600',
      'gzip',
      '661',
    ]);

    const requestHeadersCategory = component.shadowRoot.querySelector('[aria-label="Request Headers"]');
    assertElement(requestHeadersCategory, HTMLElement);
    assert.deepEqual(getCleanTextContentFromElements(requestHeadersCategory, '.header-name'), [
      ':method:',
      'accept-encoding:',
      'cache-control:',
    ]);
    assert.deepEqual(getCleanTextContentFromElements(requestHeadersCategory, '.header-value'), [
      'GET',
      'gzip, deflate, br',
      'no-cache',
    ]);
  });

  it('emits UMA event when a header value is being copied', async () => {
    const component = await renderHeadersComponent(defaultRequest);
    assertShadowRoot(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assertElement(responseHeadersCategory, HTMLElement);

    const spy = sinon.spy(Host.userMetrics, 'actionTaken');
    const headerValue = responseHeadersCategory.querySelector('.header-value');
    assertElement(headerValue, HTMLElement);

    assert.isTrue(spy.notCalled);
    dispatchCopyEvent(headerValue);
    assert.isTrue(spy.calledWith(Host.UserMetrics.Action.NetworkPanelCopyValue));
  });

  it('renders detailed reason for blocked requests', async () => {
    const component = await renderHeadersComponent({
      ...defaultRequest,
      wasBlocked: () => true,
      blockedReason: () => Protocol.Network.BlockedReason.CorpNotSameOriginAfterDefaultedToSameOriginByCoep,
    } as unknown as SDK.NetworkRequest.NetworkRequest);
    assertShadowRoot(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assertElement(responseHeadersCategory, HTMLElement);
    assert.strictEqual(
        getCleanTextContentFromElements(responseHeadersCategory, '.header-name')[4],
        'not-setcross-origin-resource-policy:',
    );
    assert.strictEqual(getCleanTextContentFromElements(responseHeadersCategory, '.header-value')[4], '');
    assert.strictEqual(
        getCleanTextContentFromElements(responseHeadersCategory, '.call-to-action')[0],
        'To use this resource from a different origin, the server needs to specify a cross-origin ' +
            'resource policy in the response headers:Cross-Origin-Resource-Policy: same-siteChoose ' +
            'this option if the resource and the document are served from the same site.' +
            'Cross-Origin-Resource-Policy: cross-originOnly choose this option if an arbitrary website ' +
            'including this resource does not impose a security risk.Learn more',
    );
  });

  it('renders provisional headers warning', async () => {
    const component = await renderHeadersComponent({
      ...defaultRequest,
      requestHeadersText: () => undefined,
    } as unknown as SDK.NetworkRequest.NetworkRequest);
    assertShadowRoot(component.shadowRoot);

    const requestHeadersCategory = component.shadowRoot.querySelector('[aria-label="Request Headers"]');
    assertElement(requestHeadersCategory, HTMLElement);
    assert.strictEqual(
        getCleanTextContentFromElements(requestHeadersCategory, '.call-to-action')[0],
        'Provisional headers are shown. Disable cache to see full headers. Learn more',
    );
  });

  it('can switch between source and parsed view', async () => {
    const component = await renderHeadersComponent(defaultRequest);
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

    assert.deepEqual(getCleanTextContentFromElements(responseHeadersCategory, '.header-name'), [
      'age:',
      'cache-control:',
      'content-encoding:',
      'content-length:',
    ]);
    assert.deepEqual(getCleanTextContentFromElements(responseHeadersCategory, '.header-value'), [
      '0',
      'max-age=600',
      'gzip',
      '661',
    ]);
  });

  it('cuts off long raw headers and shows full content on button click', async () => {
    const loremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
    incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
    ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit
    in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
    cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;

    const component = await renderHeadersComponent({
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

  it('displays decoded "x-client-data"-header', async () => {
    const component = await renderHeadersComponent({
      ...defaultRequest,
      requestHeaders: () => [{name: 'x-client-data', value: 'CJa2yQEIpLbJAQiTocsB'}],
    } as unknown as SDK.NetworkRequest.NetworkRequest);
    assertShadowRoot(component.shadowRoot);

    const requestHeadersCategory = component.shadowRoot.querySelector('[aria-label="Request Headers"]');
    assertElement(requestHeadersCategory, HTMLElement);
    assert.strictEqual(
        getCleanTextContentFromElements(requestHeadersCategory, '.header-name')[0],
        'x-client-data:',
    );
    assert.isTrue((getCleanTextContentFromElements(requestHeadersCategory, '.header-value')[0])
                      .startsWith('CJa2yQEIpLbJAQiTocsB'));
    assert.strictEqual(
        getCleanTextContentFromElements(requestHeadersCategory, '.header-value code')[0],
        'message ClientVariations {// Active client experiment variation IDs.repeated int32 variation_id = [3300118, 3300132, 3330195];\n}',
    );
  });

  it('displays info about blocked "Set-Cookie"-headers', async () => {
    const component = await renderHeadersComponent({
      ...defaultRequest,
      sortedResponseHeaders: [{name: 'Set-Cookie', value: 'secure=only; Secure'}],
      blockedResponseCookies: () => [{
        blockedReasons: ['SecureOnly', 'OverwriteSecure'],
        cookieLine: 'secure=only; Secure',
        cookie: null,
      }],
    } as unknown as SDK.NetworkRequest.NetworkRequest);
    assertShadowRoot(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assertElement(responseHeadersCategory, HTMLElement);
    assert.strictEqual(
        getCleanTextContentFromElements(responseHeadersCategory, '.header-name')[0],
        'Set-Cookie:',
    );
    assert.strictEqual(
        getCleanTextContentFromElements(responseHeadersCategory, '.header-value')[0], 'secure=only; Secure');
    const icon = responseHeadersCategory.querySelector('devtools-icon');
    assertElement(icon, HTMLElement);
    assert.strictEqual(
        icon.title,
        'This attempt to set a cookie via a Set-Cookie header was blocked because it had the ' +
            '"Secure" attribute but was not received over a secure connection.\nThis attempt to ' +
            'set a cookie via a Set-Cookie header was blocked because it was not sent over a ' +
            'secure connection and would have overwritten a cookie with the Secure attribute.');
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

    const component = view.element.querySelector('devtools-request-headers');
    assertElement(component, NetworkComponents.RequestHeadersView.RequestHeadersComponent);
    assertShadowRoot(component.shadowRoot);
    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assertElement(responseHeadersCategory, HTMLElement);

    const spy = sinon.spy(component, 'data', ['set']);
    assert.isTrue(spy.set.notCalled);
    assert.deepEqual(getCleanTextContentFromElements(responseHeadersCategory, '.header-name'), ['originalName:']);
    assert.deepEqual(getCleanTextContentFromElements(responseHeadersCategory, '.header-value'), ['originalValue']);

    request.responseHeaders = [{name: 'updatedName', value: 'updatedValue'}];
    assert.isTrue(spy.set.calledOnce);
    assert.deepEqual(getCleanTextContentFromElements(responseHeadersCategory, '.header-name'), ['updatedName:']);
    assert.deepEqual(getCleanTextContentFromElements(responseHeadersCategory, '.header-value'), ['updatedValue']);

    view.detach();
  });

  it('can highlight individual headers', async () => {
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

    const component = view.element.querySelector('devtools-request-headers');
    assertElement(component, NetworkComponents.RequestHeadersView.RequestHeadersComponent);
    assertShadowRoot(component.shadowRoot);
    const responseHeaderRows = component.shadowRoot.querySelectorAll('[aria-label="Response Headers"] .row');
    assertElement(responseHeaderRows[0], HTMLElement);
    assertElement(responseHeaderRows[1], HTMLElement);
    assertElement(responseHeaderRows[2], HTMLElement);

    assert.isFalse(responseHeaderRows[0].classList.contains('header-highlight'));
    assert.isFalse(responseHeaderRows[1].classList.contains('header-highlight'));
    assert.isFalse(responseHeaderRows[2].classList.contains('header-highlight'));
    view.revealHeader(NetworkForward.UIRequestLocation.UIHeaderSection.Response, 'HiGhLiGhTmE');
    assert.isFalse(responseHeaderRows[0].classList.contains('header-highlight'));
    assert.isFalse(responseHeaderRows[1].classList.contains('header-highlight'));
    assert.isTrue(responseHeaderRows[2].classList.contains('header-highlight'));

    view.detach();
  });

  it('renders a link to \'.headers\'', async () => {
    const {project} = createFileSystemUISourceCode({
      url: 'file:///path/to/overrides/www.example.com/.headers' as Platform.DevToolsPath.UrlString,
      mimeType: 'text/plain',
      fileSystemPath: 'file:///path/to/overrides',
    });

    await Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().setProject(project);

    const component = await renderHeadersComponent(defaultRequest);
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

    const component = await renderHeadersComponent(defaultRequest);
    assertShadowRoot(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assertElement(responseHeadersCategory, HTMLElement);
    assertShadowRoot(responseHeadersCategory.shadowRoot);

    const linkElement = responseHeadersCategory.shadowRoot.querySelector('x-link');
    assert.isNull(linkElement);
  });

  it('skips rendering category if there are no headers', async () => {
    const component = await renderHeadersComponent({
      ...defaultRequest,
      sortedResponseHeaders: [],
      requestHeaders: () => [],
    } as unknown as SDK.NetworkRequest.NetworkRequest);
    assertShadowRoot(component.shadowRoot);

    assert.isNull(component.shadowRoot.querySelector('[aria-label="Response Headers"]'));
    assert.isNull(component.shadowRoot.querySelector('[aria-label="Request Headers"]'));
  });

  it('renders provisional headers warning for request headers even if there are no headers', async () => {
    const component = await renderHeadersComponent({
      ...defaultRequest,
      sortedResponseHeaders: [],
      requestHeaders: () => [],
      requestHeadersText: () => undefined,
    } as unknown as SDK.NetworkRequest.NetworkRequest);
    assertShadowRoot(component.shadowRoot);

    assert.isNull(component.shadowRoot.querySelector('[aria-label="Response Headers"]'));
    const requestHeadersCategory = component.shadowRoot.querySelector('[aria-label="Request Headers"]');
    assertElement(requestHeadersCategory, HTMLElement);
    assert.strictEqual(
        getCleanTextContentFromElements(requestHeadersCategory, '.call-to-action')[0],
        'Provisional headers are shown. Disable cache to see full headers. Learn more',
    );
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
