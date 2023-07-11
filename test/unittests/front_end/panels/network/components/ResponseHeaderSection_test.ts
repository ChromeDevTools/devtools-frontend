// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../../../../front_end/core/host/host.js';
import * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as NetworkComponents from '../../../../../../front_end/panels/network/components/components.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {
  assertElement,
  assertShadowRoot,
  dispatchInputEvent,
  getCleanTextContentFromElements,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import {createWorkspaceProject, setUpEnvironment} from '../../../helpers/OverridesHelpers.js';

import type * as Platform from '../../../../../../front_end/core/platform/platform.js';
import * as Workspace from '../../../../../../front_end/models/workspace/workspace.js';
import type * as Persistence from '../../../../../../front_end/models/persistence/persistence.js';
import * as Root from '../../../../../../front_end/core/root/root.js';
import * as Common from '../../../../../../front_end/core/common/common.js';
import * as NetworkForward from '../../../../../../front_end/panels/network/forward/forward.js';
import {recordedMetricsContain, resetRecordedMetrics} from '../../../helpers/UserMetricsHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

const enum HeaderAttribute {
  HeaderName = 'HeaderName',
  HeaderValue = 'HeaderValue',
}

async function renderResponseHeaderSection(request: SDK.NetworkRequest.NetworkRequest):
    Promise<NetworkComponents.ResponseHeaderSection.ResponseHeaderSection> {
  const component = new NetworkComponents.ResponseHeaderSection.ResponseHeaderSection();
  renderElementIntoDOM(component);
  Object.setPrototypeOf(request, SDK.NetworkRequest.NetworkRequest.prototype);
  component.data = {
    request,
    toReveal: {section: NetworkForward.UIRequestLocation.UIHeaderSection.Response, header: 'highlighted-header'},
  };
  await coordinator.done();
  assertElement(component, HTMLElement);
  assertShadowRoot(component.shadowRoot);
  return component;
}

async function editHeaderRow(
    component: NetworkComponents.ResponseHeaderSection.ResponseHeaderSection, index: number,
    headerAttribute: HeaderAttribute, newValue: string) {
  assertShadowRoot(component.shadowRoot);
  const rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');
  assert.isTrue(rows.length >= index + 1, 'Trying to edit row with index greater than # of rows.');
  const row = rows[index];
  assertShadowRoot(row.shadowRoot);
  const selector = headerAttribute === HeaderAttribute.HeaderName ? '.header-name' : '.header-value';
  const editableComponent = row.shadowRoot.querySelector(`${selector} devtools-editable-span`);
  assertElement(editableComponent, HTMLElement);
  assertShadowRoot(editableComponent.shadowRoot);
  const editable = editableComponent.shadowRoot.querySelector('.editable');
  assertElement(editable, HTMLSpanElement);
  editable.focus();
  editable.innerText = newValue;
  dispatchInputEvent(editable, {inputType: 'insertText', data: newValue, bubbles: true, composed: true});
  editable.blur();
  await coordinator.done();
}

async function removeHeaderRow(
    component: NetworkComponents.ResponseHeaderSection.ResponseHeaderSection, index: number): Promise<void> {
  assertShadowRoot(component.shadowRoot);
  const row = component.shadowRoot.querySelectorAll('devtools-header-section-row')[index];
  assertElement(row, HTMLElement);
  assertShadowRoot(row.shadowRoot);
  const button = row.shadowRoot.querySelector('.remove-header');
  assertElement(button, HTMLElement);
  button.click();
  await coordinator.done();
}

async function setupHeaderEditing(
    headerOverridesFileContent: string, actualHeaders: SDK.NetworkRequest.NameValue[],
    originalHeaders: SDK.NetworkRequest.NameValue[]) {
  const request = {
    sortedResponseHeaders: actualHeaders,
    originalResponseHeaders: originalHeaders,
    setCookieHeaders: [],
    blockedResponseCookies: () => [],
    wasBlocked: () => false,
    url: () => 'https://www.example.com/',
    getAssociatedData: () => null,
    setAssociatedData: () => {},
  } as unknown as SDK.NetworkRequest.NetworkRequest;

  return setupHeaderEditingWithRequest(headerOverridesFileContent, request);
}

async function setupHeaderEditingWithRequest(
    headerOverridesFileContent: string, request: SDK.NetworkRequest.NetworkRequest) {
  const networkPersistenceManager =
      await createWorkspaceProject('file:///path/to/overrides' as Platform.DevToolsPath.UrlString, [
        {
          name: '.headers',
          path: 'www.example.com/',
          content: headerOverridesFileContent,
        },
      ]);

  const project = networkPersistenceManager.project();
  let spy = sinon.spy();
  if (project) {
    const uiSourceCode = project.uiSourceCodeForURL(
        'file:///path/to/overrides/www.example.com/.headers' as Platform.DevToolsPath.UrlString);
    if (uiSourceCode) {
      spy = sinon.spy(uiSourceCode, 'setWorkingCopy');
    }
  }

  const component = await renderResponseHeaderSection(request);
  assertShadowRoot(component.shadowRoot);
  return {component, spy};
}

function checkHeaderSectionRow(
    row: NetworkComponents.HeaderSectionRow.HeaderSectionRow, headerName: string, headerValue: string,
    isOverride: boolean, isNameEditable: boolean, isValueEditable: boolean, isHighlighted: boolean = false,
    isDeleted: boolean = false): void {
  assertShadowRoot(row.shadowRoot);
  const rowElement = row.shadowRoot.querySelector('.row');
  assert.strictEqual(rowElement?.classList.contains('header-overridden'), isOverride);
  assert.strictEqual(rowElement?.classList.contains('header-highlight'), isHighlighted);
  assert.strictEqual(rowElement?.classList.contains('header-deleted'), isDeleted);

  const nameEditableComponent =
      row.shadowRoot.querySelector<NetworkComponents.EditableSpan.EditableSpan>('.header-name devtools-editable-span');
  if (isNameEditable) {
    assertElement(nameEditableComponent, HTMLElement);
    assertShadowRoot(nameEditableComponent.shadowRoot);
    const nameEditable = nameEditableComponent.shadowRoot.querySelector('.editable');
    assertElement(nameEditable, HTMLSpanElement);
    const textContent =
        nameEditable.textContent?.trim() + (row.shadowRoot.querySelector('.header-name')?.textContent || '').trim();
    assert.strictEqual(textContent, headerName);
  } else {
    assert.strictEqual(nameEditableComponent, null);
    assert.strictEqual(row.shadowRoot.querySelector('.header-name')?.textContent?.trim(), headerName);
  }

  const valueEditableComponent =
      row.shadowRoot.querySelector<NetworkComponents.EditableSpan.EditableSpan>('.header-value devtools-editable-span');
  if (isValueEditable) {
    assertElement(valueEditableComponent, HTMLElement);
    assertShadowRoot(valueEditableComponent.shadowRoot);
    const valueEditable = valueEditableComponent.shadowRoot.querySelector('.editable');
    assertElement(valueEditable, HTMLSpanElement);
    assert.strictEqual(valueEditable.textContent?.trim(), headerValue);
  } else {
    assert.strictEqual(valueEditableComponent, null);
    assert.strictEqual(row.shadowRoot.querySelector('.header-value')?.textContent?.trim(), headerValue);
  }
}

function isRowFocused(
    component: NetworkComponents.ResponseHeaderSection.ResponseHeaderSection, rowIndex: number): boolean {
  assertShadowRoot(component.shadowRoot);
  const rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');
  assert.isTrue(rows.length > rowIndex);
  return Boolean(rows[rowIndex].shadowRoot?.activeElement);
}

describeWithEnvironment('ResponseHeaderSection', () => {
  before(() => {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.HEADER_OVERRIDES);
  });

  beforeEach(async () => {
    await setUpEnvironment();
    resetRecordedMetrics();
  });

  it('renders detailed reason for blocked requests', async () => {
    const request = {
      sortedResponseHeaders: [
        {name: 'content-length', value: '661'},
      ],
      blockedResponseCookies: () => [],
      wasBlocked: () => true,
      blockedReason: () => Protocol.Network.BlockedReason.CorpNotSameOriginAfterDefaultedToSameOriginByCoep,
      originalResponseHeaders: [],
      setCookieHeaders: [],
      url: () => 'https://www.example.com/',
      getAssociatedData: () => null,
      setAssociatedData: () => {},
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    const component = await renderResponseHeaderSection(request);
    assertShadowRoot(component.shadowRoot);

    const row = component.shadowRoot.querySelectorAll('devtools-header-section-row')[1];
    assertElement(row, HTMLElement);
    assertShadowRoot(row.shadowRoot);

    const regex = /^\s*not-set\s*cross-origin-resource-policy:\s*$/;
    assert.isTrue(regex.test(row.shadowRoot.querySelector('.header-name')?.textContent || ''));
    assert.strictEqual(row.shadowRoot.querySelector('.header-value')?.textContent?.trim(), '');
    assert.strictEqual(
        getCleanTextContentFromElements(row.shadowRoot, '.call-to-action')[0],
        'To use this resource from a different origin, the server needs to specify a cross-origin ' +
            'resource policy in the response headers:Cross-Origin-Resource-Policy: same-siteChoose ' +
            'this option if the resource and the document are served from the same site.' +
            'Cross-Origin-Resource-Policy: cross-originOnly choose this option if an arbitrary website ' +
            'including this resource does not impose a security risk.Learn more',
    );
  });

  it('displays info about blocked "Set-Cookie"-headers', async () => {
    const request = {
      sortedResponseHeaders: [{name: 'Set-Cookie', value: 'secure=only; Secure'}],
      blockedResponseCookies: () => [{
        blockedReasons: ['SecureOnly', 'OverwriteSecure'],
        cookieLine: 'secure=only; Secure',
        cookie: null,
      }],
      wasBlocked: () => false,
      originalResponseHeaders: [],
      setCookieHeaders: [],
      url: () => 'https://www.example.com/',
      getAssociatedData: () => null,
      setAssociatedData: () => {},
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    const component = await renderResponseHeaderSection(request);
    assertShadowRoot(component.shadowRoot);

    const row = component.shadowRoot.querySelector('devtools-header-section-row');
    assertElement(row, HTMLElement);
    assertShadowRoot(row.shadowRoot);

    assert.strictEqual(row.shadowRoot.querySelector('.header-name')?.textContent?.trim(), 'set-cookie:');
    assert.strictEqual(row.shadowRoot.querySelector('.header-value')?.textContent?.trim(), 'secure=only; Secure');

    const icon = row.shadowRoot.querySelector('devtools-icon');
    assertElement(icon, HTMLElement);
    assert.strictEqual(
        icon.title,
        'This attempt to set a cookie via a Set-Cookie header was blocked because it had the ' +
            '"Secure" attribute but was not received over a secure connection.\nThis attempt to ' +
            'set a cookie via a Set-Cookie header was blocked because it was not sent over a ' +
            'secure connection and would have overwritten a cookie with the Secure attribute.');
  });

  it('marks overridden headers', async () => {
    const request = {
      sortedResponseHeaders: [
        {name: 'duplicate-both-no-mismatch', value: 'foo'},
        {name: 'duplicate-both-no-mismatch', value: 'bar'},
        {name: 'duplicate-both-with-mismatch', value: 'Chrome'},
        {name: 'duplicate-both-with-mismatch', value: 'DevTools'},
        {name: 'duplicate-in-actual-headers', value: 'first'},
        {name: 'duplicate-in-actual-headers', value: 'second'},
        {name: 'duplicate-in-original-headers', value: 'two'},
        {name: 'is-in-original-headers', value: 'not an override'},
        {name: 'not-in-original-headers', value: 'is an override'},
        {name: 'triplicate', value: '1'},
        {name: 'triplicate', value: '2'},
        {name: 'triplicate', value: '2'},
        {name: 'xyz', value: 'contains \tab'},
      ],
      blockedResponseCookies: () => [],
      wasBlocked: () => false,
      originalResponseHeaders: [
        {name: 'duplicate-both-no-mismatch', value: 'foo'},
        {name: 'duplicate-both-no-mismatch', value: 'bar'},
        {name: 'duplicate-both-with-mismatch', value: 'Chrome'},
        {name: 'duplicate-both-with-mismatch', value: 'Canary'},
        {name: 'duplicate-in-actual-headers', value: 'first'},
        {name: 'duplicate-in-original-headers', value: 'one'},
        {name: 'duplicate-in-original-headers', value: 'two'},
        {name: 'is-in-original-headers', value: 'not an override'},
        {name: 'triplicate', value: '1'},
        {name: 'triplicate', value: '1'},
        {name: 'triplicate', value: '2'},
        {name: 'xyz', value: 'contains \tab'},
      ],
      setCookieHeaders: [],
      url: () => 'https://www.example.com/',
      getAssociatedData: () => null,
      setAssociatedData: () => {},
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    const component = await renderResponseHeaderSection(request);
    assertShadowRoot(component.shadowRoot);
    const rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');

    const checkRow = (shadowRoot: ShadowRoot, headerName: string, headerValue: string, isOverride: boolean): void => {
      assert.strictEqual(shadowRoot.querySelector('.header-name')?.textContent?.trim(), headerName);
      assert.strictEqual(shadowRoot.querySelector('.header-value')?.textContent?.trim(), headerValue);
      assert.strictEqual(shadowRoot.querySelector('.row')?.classList.contains('header-overridden'), isOverride);
    };

    assertShadowRoot(rows[0].shadowRoot);
    checkRow(rows[0].shadowRoot, 'duplicate-both-no-mismatch:', 'foo', false);
    assertShadowRoot(rows[1].shadowRoot);
    checkRow(rows[1].shadowRoot, 'duplicate-both-no-mismatch:', 'bar', false);
    assertShadowRoot(rows[2].shadowRoot);
    checkRow(rows[2].shadowRoot, 'duplicate-both-with-mismatch:', 'Chrome', true);
    assertShadowRoot(rows[3].shadowRoot);
    checkRow(rows[3].shadowRoot, 'duplicate-both-with-mismatch:', 'DevTools', true);
    assertShadowRoot(rows[4].shadowRoot);
    checkRow(rows[4].shadowRoot, 'duplicate-in-actual-headers:', 'first', true);
    assertShadowRoot(rows[5].shadowRoot);
    checkRow(rows[5].shadowRoot, 'duplicate-in-actual-headers:', 'second', true);
    assertShadowRoot(rows[6].shadowRoot);
    checkRow(rows[6].shadowRoot, 'duplicate-in-original-headers:', 'two', true);
    assertShadowRoot(rows[7].shadowRoot);
    checkRow(rows[7].shadowRoot, 'is-in-original-headers:', 'not an override', false);
    assertShadowRoot(rows[8].shadowRoot);
    checkRow(rows[8].shadowRoot, 'not-in-original-headers:', 'is an override', true);
    assertShadowRoot(rows[9].shadowRoot);
    checkRow(rows[9].shadowRoot, 'triplicate:', '1', true);
    assertShadowRoot(rows[10].shadowRoot);
    checkRow(rows[10].shadowRoot, 'triplicate:', '2', true);
    assertShadowRoot(rows[11].shadowRoot);
    checkRow(rows[11].shadowRoot, 'triplicate:', '2', true);
    assertShadowRoot(rows[12].shadowRoot);
    checkRow(rows[12].shadowRoot, 'xyz:', 'contains  ab', false);
  });

  it('correctly sets headers as "editable" when matching ".headers" file exists and setting is turned on', async () => {
    await createWorkspaceProject('file:///path/to/overrides' as Platform.DevToolsPath.UrlString, [
      {
        name: '.headers',
        path: 'www.example.com/',
        content: `[
          {
            "applyTo": "index.html",
            "headers": [{
              "name": "server",
              "value": "overridden server"
            }]
          }
        ]`,
      },
    ]);

    const request = {
      sortedResponseHeaders: [
        {name: 'cache-control', value: 'max-age=600'},
        {name: 'server', value: 'overridden server'},
      ],
      blockedResponseCookies: () => [],
      wasBlocked: () => false,
      originalResponseHeaders: [
        {name: 'cache-control', value: 'max-age=600'},
        {name: 'server', value: 'original server'},
      ],
      setCookieHeaders: [],
      url: () => 'https://www.example.com/',
      getAssociatedData: () => null,
      setAssociatedData: () => {},
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    const component = await renderResponseHeaderSection(request);
    assertShadowRoot(component.shadowRoot);
    const rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');

    checkHeaderSectionRow(rows[0], 'cache-control:', 'max-age=600', false, false, true);
    checkHeaderSectionRow(rows[1], 'server:', 'overridden server', true, false, true);

    Common.Settings.Settings.instance().moduleSetting('persistenceNetworkOverridesEnabled').set(false);
    component.data = {request};
    await coordinator.done();

    checkHeaderSectionRow(rows[0], 'cache-control:', 'max-age=600', false, false, false);
    checkHeaderSectionRow(rows[1], 'server:', 'overridden server', true, false, false);

    Common.Settings.Settings.instance().moduleSetting('persistenceNetworkOverridesEnabled').set(true);
  });

  it('does not set headers as "editable" when matching ".headers" file cannot be parsed correctly', async () => {
    await createWorkspaceProject('file:///path/to/overrides' as Platform.DevToolsPath.UrlString, [
      {
        name: '.headers',
        path: 'www.example.com/',
        // 'headers' contains the invalid key 'no-name' and will therefore
        // cause a parsing error.
        content: `[
          {
            "applyTo": "index.html",
            "headers": [{
              "no-name": "server",
              "value": "overridden server"
            }]
          }
        ]`,
      },
    ]);

    const request = {
      sortedResponseHeaders: [
        {name: 'cache-control', value: 'max-age=600'},
        {name: 'server', value: 'overridden server'},
      ],
      blockedResponseCookies: () => [],
      wasBlocked: () => false,
      originalResponseHeaders: [
        {name: 'cache-control', value: 'max-age=600'},
        {name: 'server', value: 'original server'},
      ],
      setCookieHeaders: [],
      url: () => 'https://www.example.com/',
      getAssociatedData: () => null,
      setAssociatedData: () => {},
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    // A console error is emitted when '.headers' cannot be parsed correctly.
    // We don't need that noise in the test output.
    sinon.stub(console, 'error');

    const component = await renderResponseHeaderSection(request);
    assertShadowRoot(component.shadowRoot);
    const rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');

    assertShadowRoot(rows[0].shadowRoot);
    checkHeaderSectionRow(rows[0], 'cache-control:', 'max-age=600', false, false, false);
    assertShadowRoot(rows[1].shadowRoot);
    checkHeaderSectionRow(rows[1], 'server:', 'overridden server', true, false, false);
  });

  it('can edit original headers', async () => {
    const headerOverridesFileContent = `[
      {
        "applyTo": "index.html",
        "headers": [{
          "name": "server",
          "value": "overridden server"
        }]
      }
    ]`;

    const actualHeaders = [
      {name: 'cache-control', value: 'max-age=600'},
      {name: 'server', value: 'overridden server'},
    ];

    const originalHeaders = [
      {name: 'cache-control', value: 'max-age=600'},
      {name: 'server', value: 'original server'},
    ];

    const {component, spy} = await setupHeaderEditing(headerOverridesFileContent, actualHeaders, originalHeaders);
    await editHeaderRow(component, 0, HeaderAttribute.HeaderValue, 'max-age=9999');

    const expected = [{
      applyTo: 'index.html',
      headers: [
        {
          name: 'server',
          value: 'overridden server',
        },
        {
          name: 'cache-control',
          value: 'max-age=9999',
        },
      ],
    }];
    assert.isTrue(spy.calledOnceWith(JSON.stringify(expected, null, 2)));
    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.HeaderOverrideHeaderEdited));
  });

  it('can handle tab-character in header value', async () => {
    const headers = [
      {name: 'foo', value: 'syn\tax'},
    ];
    const {component, spy} = await setupHeaderEditing('[]', headers, headers);
    assertShadowRoot(component.shadowRoot);

    const rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');
    assert.strictEqual(rows.length, 1);
    checkHeaderSectionRow(rows[0], 'foo:', 'syn ax', false, false, true);

    await editHeaderRow(component, 0, HeaderAttribute.HeaderValue, 'syn ax');
    assert.isTrue(spy.notCalled);
    checkHeaderSectionRow(rows[0], 'foo:', 'syn ax', false, false, true);

    await editHeaderRow(component, 0, HeaderAttribute.HeaderValue, 'syntax');
    const expected = [{
      applyTo: 'index.html',
      headers: [
        {
          name: 'foo',
          value: 'syntax',
        },
      ],
    }];
    assert.isTrue(spy.calledOnceWith(JSON.stringify(expected, null, 2)));
    checkHeaderSectionRow(rows[0], 'foo:', 'syntax', true, false, true);
  });

  it('can edit overridden headers', async () => {
    const headerOverridesFileContent = `[
      {
        "applyTo": "index.html",
        "headers": [{
          "name": "server",
          "value": "overridden server"
        }]
      }
    ]`;

    const actualHeaders = [
      {name: 'cache-control', value: 'max-age=600'},
      {name: 'server', value: 'overridden server'},
    ];

    const originalHeaders = [
      {name: 'cache-control', value: 'max-age=600'},
      {name: 'server', value: 'original server'},
    ];

    const {component, spy} = await setupHeaderEditing(headerOverridesFileContent, actualHeaders, originalHeaders);
    await editHeaderRow(component, 1, HeaderAttribute.HeaderValue, 'edited value');

    const expected = [{
      applyTo: 'index.html',
      headers: [
        {
          name: 'server',
          value: 'edited value',
        },
      ],
    }];
    assert.isTrue(spy.calledOnceWith(JSON.stringify(expected, null, 2)));
    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.HeaderOverrideHeaderEdited));
  });

  it('can remove header overrides', async () => {
    const headerOverridesFileContent = `[
      {
        "applyTo": "index.html",
        "headers": [
          {
            "name": "highlighted-header",
            "value": "overridden highlighted-header"
          },
          {
            "name": "cache-control",
            "value": "max-age=9999"
          },
          {
            "name": "added",
            "value": "foo"
          }
        ]
      }
    ]`;

    const actualHeaders = [
      {name: 'added', value: 'foo'},
      {name: 'cache-control', value: 'max-age=9999'},
      {name: 'highlighted-header', value: 'overridden highlighted-header'},
    ];

    const originalHeaders = [
      {name: 'cache-control', value: 'max-age=600'},
      {name: 'highlighted-header', value: 'original highlighted-header'},
    ];

    const {component, spy} = await setupHeaderEditing(headerOverridesFileContent, actualHeaders, originalHeaders);
    assertShadowRoot(component.shadowRoot);
    let rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');
    assert.strictEqual(rows.length, 3);
    checkHeaderSectionRow(rows[0], 'added:', 'foo', true, false, true);
    checkHeaderSectionRow(rows[1], 'cache-control:', 'max-age=9999', true, false, true);
    checkHeaderSectionRow(rows[2], 'highlighted-header:', 'overridden highlighted-header', true, false, true, true);
    await removeHeaderRow(component, 2);

    let expected = [{
      applyTo: 'index.html',
      headers: [
        {
          name: 'cache-control',
          value: 'max-age=9999',
        },
        {
          name: 'added',
          value: 'foo',
        },
      ],
    }];
    assert.strictEqual(spy.callCount, 1);
    assert.isTrue(spy.calledOnceWith(JSON.stringify(expected, null, 2)));
    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.HeaderOverrideHeaderRemoved));

    rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');
    assert.strictEqual(rows.length, 3);
    checkHeaderSectionRow(rows[0], 'added:', 'foo', true, false, true);
    checkHeaderSectionRow(rows[1], 'cache-control:', 'max-age=9999', true, false, true);
    checkHeaderSectionRow(
        rows[2], 'highlighted-header:', 'overridden highlighted-header', true, false, false, true, true);

    spy.resetHistory();
    await removeHeaderRow(component, 0);

    expected = [{
      applyTo: 'index.html',
      headers: [
        {
          name: 'cache-control',
          value: 'max-age=9999',
        },
      ],
    }];
    assert.strictEqual(spy.callCount, 1);
    assert.isTrue(spy.calledOnceWith(JSON.stringify(expected, null, 2)));
    rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');
    assert.strictEqual(rows.length, 3);
    checkHeaderSectionRow(rows[0], 'added:', 'foo', true, false, false, false, true);
    checkHeaderSectionRow(rows[1], 'cache-control:', 'max-age=9999', true, false, true);
    checkHeaderSectionRow(
        rows[2], 'highlighted-header:', 'overridden highlighted-header', true, false, false, true, true);
  });

  it('can remove the last header override', async () => {
    const headerOverridesFileContent = `[
      {
        "applyTo": "index.html",
        "headers": [
          {
            "name": "server",
            "value": "overridden server"
          }
        ]
      }
    ]`;

    const actualHeaders = [
      {name: 'server', value: 'overridden server'},
    ];

    const originalHeaders = [
      {name: 'server', value: 'original server'},
    ];

    const {component, spy} = await setupHeaderEditing(headerOverridesFileContent, actualHeaders, originalHeaders);
    await removeHeaderRow(component, 0);

    const expected: Persistence.NetworkPersistenceManager.HeaderOverride[] = [];
    assert.strictEqual(spy.callCount, 1);
    assert.isTrue(spy.calledOnceWith(JSON.stringify(expected, null, 2)));
    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.HeaderOverrideHeaderRemoved));
  });

  it('can handle non-breaking spaces when removing header overrides', async () => {
    const headerOverridesFileContent = `[
      {
        "applyTo": "index.html",
        "headers": [
          {
            "name": "added",
            "value": "space\xa0between"
          }
        ]
      }
    ]`;

    const actualHeaders = [
      {name: 'added', value: 'space between'},
      {name: 'cache-control', value: 'max-age=600'},
    ];

    const originalHeaders = [
      {name: 'cache-control', value: 'max-age=600'},
    ];

    const {component, spy} = await setupHeaderEditing(headerOverridesFileContent, actualHeaders, originalHeaders);
    assertShadowRoot(component.shadowRoot);
    let rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');
    assert.strictEqual(rows.length, 2);
    checkHeaderSectionRow(rows[0], 'added:', 'space between', true, false, true);
    checkHeaderSectionRow(rows[1], 'cache-control:', 'max-age=600', false, false, true);
    await removeHeaderRow(component, 0);

    const expected: Persistence.NetworkPersistenceManager.HeaderOverride[] = [];
    assert.strictEqual(spy.callCount, 1);
    assert.isTrue(spy.calledOnceWith(JSON.stringify(expected, null, 2)));

    rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');
    assert.strictEqual(rows.length, 2);
    checkHeaderSectionRow(rows[0], 'added:', 'space between', true, false, false, false, true);
    checkHeaderSectionRow(rows[1], 'cache-control:', 'max-age=600', false, false, true);
  });

  it('does not generate header overrides which have "applyTo" but empty "headers" array', async () => {
    const actualHeaders = [
      {name: 'server', value: 'original server'},
    ];
    const {component, spy} = await setupHeaderEditing('[]', actualHeaders, actualHeaders);
    await editHeaderRow(component, 0, HeaderAttribute.HeaderValue, 'overridden server');

    const expected = [{
      applyTo: 'index.html',
      headers: [
        {
          name: 'server',
          value: 'overridden server',
        },
      ],
    }];
    assert.strictEqual(spy.callCount, 1);
    assert.isTrue(spy.calledOnceWith(JSON.stringify(expected, null, 2)));

    spy.resetHistory();
    await editHeaderRow(component, 0, HeaderAttribute.HeaderValue, 'original server');
    assert.strictEqual(spy.callCount, 1);
    assert.isTrue(spy.calledOnceWith(JSON.stringify([], null, 2)));
  });

  it('can add headers', async () => {
    const headerOverridesFileContent = `[
      {
        "applyTo": "index.html",
        "headers": [{
          "name": "server",
          "value": "overridden server"
        }]
      }
    ]`;
    const actualHeaders = [{name: 'server', value: 'overridden server'}];
    const originalHeaders = [{name: 'server', value: 'original server'}];

    const {component, spy} = await setupHeaderEditing(headerOverridesFileContent, actualHeaders, originalHeaders);
    assertShadowRoot(component.shadowRoot);
    const addHeaderButton = component.shadowRoot.querySelector('.add-header-button');
    assertElement(addHeaderButton, HTMLElement);
    addHeaderButton.click();
    await coordinator.done();

    let expected = [{
      applyTo: 'index.html',
      headers: [
        {
          name: 'server',
          value: 'overridden server',
        },
        {
          name: 'header-name',
          value: 'header value',
        },
      ],
    }];
    assert.isTrue(spy.getCall(-1).calledWith(JSON.stringify(expected, null, 2)));

    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
        Host.UserMetrics.Action.HeaderOverrideHeaderAdded));

    await editHeaderRow(component, 1, HeaderAttribute.HeaderName, 'foo');
    expected = [{
      applyTo: 'index.html',
      headers: [
        {
          name: 'server',
          value: 'overridden server',
        },
        {
          name: 'foo',
          value: 'header value',
        },
      ],
    }];
    assert.isTrue(spy.getCall(-1).calledWith(JSON.stringify(expected, null, 2)));

    await editHeaderRow(component, 1, HeaderAttribute.HeaderValue, 'bar');
    expected = [{
      applyTo: 'index.html',
      headers: [
        {
          name: 'server',
          value: 'overridden server',
        },
        {
          name: 'foo',
          value: 'bar',
        },
      ],
    }];
    assert.isTrue(spy.getCall(-1).calledWith(JSON.stringify(expected, null, 2)));
  });

  it('can remove a newly added header', async () => {
    const actualHeaders = [
      {name: 'server', value: 'original server'},
    ];
    const {component, spy} = await setupHeaderEditing('[]', actualHeaders, actualHeaders);
    assertShadowRoot(component.shadowRoot);
    const addHeaderButton = component.shadowRoot.querySelector('.add-header-button');
    assertElement(addHeaderButton, HTMLElement);
    addHeaderButton.click();
    await coordinator.done();

    const expected = [{
      applyTo: 'index.html',
      headers: [
        {
          name: 'header-name',
          value: 'header value',
        },
      ],
    }];
    assert.isTrue(spy.getCall(-1).calledWith(JSON.stringify(expected, null, 2)));
    let rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');
    assert.strictEqual(rows.length, 2);
    checkHeaderSectionRow(rows[0], 'server:', 'original server', false, false, true);
    checkHeaderSectionRow(rows[1], 'header-name:', 'header value', true, true, true);

    spy.resetHistory();
    await removeHeaderRow(component, 1);

    assert.strictEqual(spy.callCount, 1);
    assert.isTrue(spy.calledOnceWith(JSON.stringify([], null, 2)));
    rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');
    assert.strictEqual(rows.length, 2);
    checkHeaderSectionRow(rows[0], 'server:', 'original server', false, false, true);
    checkHeaderSectionRow(rows[1], 'header-name:', 'header value', true, false, false, false, true);
  });

  it('renders headers as (not) editable depending on overall overrides setting', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        'https://www.example.com/index.html' as Platform.DevToolsPath.UrlString, '' as Platform.DevToolsPath.UrlString,
        null, null, null);
    request.responseHeaders = [{name: 'server', value: 'overridden server'}];
    request.originalResponseHeaders = [{name: 'server', value: 'original server'}];

    const {component} = await setupHeaderEditingWithRequest('[]', request);
    assertShadowRoot(component.shadowRoot);
    const addHeaderButton = component.shadowRoot.querySelector('.add-header-button');
    assertElement(addHeaderButton, HTMLElement);
    addHeaderButton.click();
    await coordinator.done();

    let rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');
    assert.strictEqual(rows.length, 2);
    checkHeaderSectionRow(rows[0], 'server:', 'overridden server', true, false, true);
    checkHeaderSectionRow(rows[1], 'header-name:', 'header value', true, true, true);

    component.remove();
    Common.Settings.Settings.instance().moduleSetting('persistenceNetworkOverridesEnabled').set(false);
    const component2 = await renderResponseHeaderSection(request);
    assertShadowRoot(component2.shadowRoot);

    rows = component2.shadowRoot.querySelectorAll('devtools-header-section-row');
    assert.strictEqual(rows.length, 2);
    checkHeaderSectionRow(rows[0], 'server:', 'overridden server', true, false, false);
    checkHeaderSectionRow(rows[1], 'header-name:', 'header value', true, false, false);

    component2.remove();
    Common.Settings.Settings.instance().moduleSetting('persistenceNetworkOverridesEnabled').set(true);
    const component3 = await renderResponseHeaderSection(request);
    assertShadowRoot(component3.shadowRoot);

    rows = component3.shadowRoot.querySelectorAll('devtools-header-section-row');
    assert.strictEqual(rows.length, 2);
    checkHeaderSectionRow(rows[0], 'server:', 'overridden server', true, false, true);
    checkHeaderSectionRow(rows[1], 'header-name:', 'header value', true, true, true);
  });

  it('can edit multiple headers', async () => {
    const headerOverridesFileContent = `[
      {
        "applyTo": "index.html",
        "headers": [{
          "name": "server",
          "value": "overridden server"
        }]
      }
    ]`;

    const actualHeaders = [
      {name: 'cache-control', value: 'max-age=600'},
      {name: 'server', value: 'overridden server'},
    ];

    const originalHeaders = [
      {name: 'cache-control', value: 'max-age=600'},
      {name: 'server', value: 'original server'},
    ];

    const {component, spy} = await setupHeaderEditing(headerOverridesFileContent, actualHeaders, originalHeaders);
    await editHeaderRow(component, 0, HeaderAttribute.HeaderValue, 'edited cache-control');
    await editHeaderRow(component, 1, HeaderAttribute.HeaderValue, 'edited server');

    const expected = [{
      applyTo: 'index.html',
      headers: [
        {
          name: 'cache-control',
          value: 'edited cache-control',
        },
        {
          name: 'server',
          value: 'edited server',
        },
      ],
    }];
    assert.isTrue(spy.lastCall.calledWith(JSON.stringify(expected, null, 2)));
  });

  it('can edit multiple headers which have the same name', async () => {
    const headerOverridesFileContent = '[]';

    const actualHeaders = [
      {name: 'link', value: 'first value'},
      {name: 'link', value: 'second value'},
    ];

    const originalHeaders = [
      {name: 'link', value: 'first value'},
      {name: 'link', value: 'second value'},
    ];

    const {component, spy} = await setupHeaderEditing(headerOverridesFileContent, actualHeaders, originalHeaders);
    await editHeaderRow(component, 0, HeaderAttribute.HeaderValue, 'third value');

    let expected = [{
      applyTo: 'index.html',
      headers: [
        {
          name: 'link',
          value: 'third value',
        },
      ],
    }];
    assert.isTrue(spy.lastCall.calledWith(JSON.stringify(expected, null, 2)));

    await editHeaderRow(component, 1, HeaderAttribute.HeaderValue, 'fourth value');
    expected = [{
      applyTo: 'index.html',
      headers: [
        {
          name: 'link',
          value: 'third value',
        },
        {
          name: 'link',
          value: 'fourth value',
        },
      ],
    }];
    assert.isTrue(spy.lastCall.calledWith(JSON.stringify(expected, null, 2)));
  });

  it('can edit multiple headers which have the same name and which are already overridden', async () => {
    const headerOverridesFileContent = `[
      {
        "applyTo": "index.html",
        "headers": [
          {
            "name": "link",
            "value": "third value"
          },
          {
            "name": "link",
            "value": "fourth value"
          }
        ]
      }
    ]`;

    const actualHeaders = [
      {name: 'link', value: 'third value'},
      {name: 'link', value: 'fourth value'},
    ];

    const originalHeaders = [
      {name: 'link', value: 'first value'},
      {name: 'link', value: 'second value'},
    ];

    const {component, spy} = await setupHeaderEditing(headerOverridesFileContent, actualHeaders, originalHeaders);
    await editHeaderRow(component, 1, HeaderAttribute.HeaderValue, 'fifth value');

    let expected = [{
      applyTo: 'index.html',
      headers: [
        {
          name: 'link',
          value: 'third value',
        },
        {
          name: 'link',
          value: 'fifth value',
        },
      ],
    }];
    assert.isTrue(spy.lastCall.calledWith(JSON.stringify(expected, null, 2)));

    await editHeaderRow(component, 0, HeaderAttribute.HeaderValue, 'sixth value');
    expected = [{
      applyTo: 'index.html',
      headers: [
        {
          name: 'link',
          value: 'sixth value',
        },
        {
          name: 'link',
          value: 'fifth value',
        },
      ],
    }];
    assert.isTrue(spy.lastCall.calledWith(JSON.stringify(expected, null, 2)));
  });

  it('persists edits to header overrides and resurfaces them upon component (re-)creation', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        'https://www.example.com/index.html' as Platform.DevToolsPath.UrlString, '' as Platform.DevToolsPath.UrlString,
        null, null, null);
    request.responseHeaders = [{name: 'server', value: 'overridden server'}];
    request.originalResponseHeaders = [{name: 'server', value: 'original server'}];

    const headerOverridesFileContent = `[
      {
        "applyTo": "index.html",
        "headers": [{
          "name": "server",
          "value": "overridden server"
        }]
      }
    ]`;

    const {component, spy} = await setupHeaderEditingWithRequest(headerOverridesFileContent, request);
    assertShadowRoot(component.shadowRoot);
    const addHeaderButton = component.shadowRoot.querySelector('.add-header-button');
    assertElement(addHeaderButton, HTMLElement);
    addHeaderButton.click();
    await coordinator.done();

    await editHeaderRow(component, 0, HeaderAttribute.HeaderValue, 'unit test');
    await editHeaderRow(component, 1, HeaderAttribute.HeaderName, 'foo');
    await editHeaderRow(component, 1, HeaderAttribute.HeaderValue, 'bar');
    const expected = [{
      applyTo: 'index.html',
      headers: [
        {
          name: 'server',
          value: 'unit test',
        },
        {
          name: 'foo',
          value: 'bar',
        },
      ],
    }];
    assert.isTrue(spy.getCall(-1).calledWith(JSON.stringify(expected, null, 2)));

    component.remove();
    const component2 = await renderResponseHeaderSection(request);
    assertShadowRoot(component2.shadowRoot);

    const rows = component2.shadowRoot.querySelectorAll('devtools-header-section-row');
    assert.strictEqual(rows.length, 2);
    checkHeaderSectionRow(rows[0], 'server:', 'unit test', true, false, true);
    checkHeaderSectionRow(rows[1], 'foo:', 'bar', true, true, true);
  });

  it('focuses on newly added header rows on initial render', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        'https://www.example.com/index.html' as Platform.DevToolsPath.UrlString, '' as Platform.DevToolsPath.UrlString,
        null, null, null);
    request.responseHeaders = [{name: 'server', value: 'overridden server'}];
    request.originalResponseHeaders = [{name: 'server', value: 'original server'}];

    const headerOverridesFileContent = `[
      {
        "applyTo": "index.html",
        "headers": [{
          "name": "server",
          "value": "overridden server"
        }]
      }
    ]`;

    const {component} = await setupHeaderEditingWithRequest(headerOverridesFileContent, request);
    assertShadowRoot(component.shadowRoot);
    const addHeaderButton = component.shadowRoot.querySelector('.add-header-button');
    assertElement(addHeaderButton, HTMLElement);
    addHeaderButton.click();
    await coordinator.done();
    assert.isFalse(isRowFocused(component, 0));
    assert.isTrue(isRowFocused(component, 1));

    component.remove();
    const component2 = await renderResponseHeaderSection(request);
    assertShadowRoot(component2.shadowRoot);
    assert.isFalse(isRowFocused(component2, 0));
    assert.isFalse(isRowFocused(component2, 1));
  });

  it('can handle removal of ".headers" file', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        'https://www.example.com/index.html' as Platform.DevToolsPath.UrlString, '' as Platform.DevToolsPath.UrlString,
        null, null, null);
    request.responseHeaders = [{name: 'server', value: 'overridden server'}];
    request.originalResponseHeaders = [{name: 'server', value: 'original server'}];

    const headerOverridesFileContent = `[
      {
        "applyTo": "index.html",
        "headers": [{
          "name": "server",
          "value": "overridden server"
        }]
      }
    ]`;

    const {component} = await setupHeaderEditingWithRequest(headerOverridesFileContent, request);
    assertShadowRoot(component.shadowRoot);
    let addHeaderButton = component.shadowRoot.querySelector('.add-header-button');
    assertElement(addHeaderButton, HTMLElement);
    addHeaderButton.click();
    await coordinator.done();

    await editHeaderRow(component, 0, HeaderAttribute.HeaderValue, 'unit test');

    sinon.stub(Workspace.Workspace.WorkspaceImpl.instance(), 'uiSourceCodeForURL').callsFake(() => null);

    component.data = {request};
    await coordinator.done();

    const rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');
    assert.strictEqual(rows.length, 1);
    checkHeaderSectionRow(rows[0], 'server:', 'overridden server', true, false, false);
    addHeaderButton = component.shadowRoot.querySelector('.add-header-button');
    assert.isNull(addHeaderButton);
  });

  it('handles rendering and editing \'set-cookie\' headers', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        'https://www.example.com/index.html' as Platform.DevToolsPath.UrlString, '' as Platform.DevToolsPath.UrlString,
        null, null, null);
    request.responseHeaders = [
      {name: 'Cache-Control', value: 'max-age=600'},
      {name: 'Z-Header', value: 'zzz'},
    ];
    request.originalResponseHeaders = [
      {name: 'Set-Cookie', value: 'bar=original'},
      {name: 'Set-Cookie', value: 'foo=original'},
      {name: 'Set-Cookie', value: 'malformed'},
      {name: 'Cache-Control', value: 'max-age=600'},
      {name: 'Z-header', value: 'zzz'},
    ];
    request.setCookieHeaders = [
      {name: 'Set-Cookie', value: 'bar=original'},
      {name: 'Set-Cookie', value: 'foo=overridden'},
      {name: 'Set-Cookie', value: 'user=12345'},
      {name: 'Set-Cookie', value: 'malformed'},
      {name: 'Set-Cookie', value: 'wrong format'},
    ];

    const headerOverridesFileContent = `[
      {
        "applyTo": "index.html",
        "headers": [
          {
            "name": "set-cookie",
            "value": "foo=overridden"
          },
          {
            "name": "set-cookie",
            "value": "user=12345"
          },
          {
            "name": "set-cookie",
            "value": "wrong format"
          }
        ]
      }
    ]`;

    const {component, spy} = await setupHeaderEditingWithRequest(headerOverridesFileContent, request);
    assertShadowRoot(component.shadowRoot);
    const rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');
    assert.strictEqual(rows.length, 7);
    assertShadowRoot(rows[0].shadowRoot);
    checkHeaderSectionRow(rows[0], 'cache-control:', 'max-age=600', false, false, true);
    assertShadowRoot(rows[1].shadowRoot);
    checkHeaderSectionRow(rows[1], 'set-cookie:', 'bar=original', false, false, true);
    assertShadowRoot(rows[2].shadowRoot);
    checkHeaderSectionRow(rows[2], 'set-cookie:', 'foo=overridden', true, false, true);
    assertShadowRoot(rows[3].shadowRoot);
    checkHeaderSectionRow(rows[3], 'set-cookie:', 'user=12345', true, false, true);
    assertShadowRoot(rows[4].shadowRoot);
    checkHeaderSectionRow(rows[4], 'set-cookie:', 'malformed', false, false, true);
    assertShadowRoot(rows[5].shadowRoot);
    checkHeaderSectionRow(rows[5], 'set-cookie:', 'wrong format', true, false, true);
    assertShadowRoot(rows[6].shadowRoot);
    checkHeaderSectionRow(rows[6], 'z-header:', 'zzz', false, false, true);

    await editHeaderRow(component, 2, HeaderAttribute.HeaderValue, 'foo=edited');
    const expected = [{
      applyTo: 'index.html',
      headers: [
        {
          name: 'set-cookie',
          value: 'user=12345',
        },
        {
          name: 'set-cookie',
          value: 'wrong format',
        },
        {
          name: 'set-cookie',
          value: 'foo=edited',
        },
      ],
    }];
    assert.isTrue(spy.getCall(-1).calledWith(JSON.stringify(expected, null, 2)));

    await editHeaderRow(component, 1, HeaderAttribute.HeaderValue, 'bar=edited');
    expected[0].headers.push({name: 'set-cookie', value: 'bar=edited'});
    assert.isTrue(spy.getCall(-1).calledWith(JSON.stringify(expected, null, 2)));
  });

  it('ignores capitalisation of the `set-cookie` header when marking as overridden', async () => {
    const request = {
      sortedResponseHeaders: [
        {name: 'set-cookie', value: 'user=123'},
      ],
      blockedResponseCookies: () => [],
      wasBlocked: () => false,
      originalResponseHeaders: [
        {name: 'Set-Cookie', value: 'user=123'},
      ],
      setCookieHeaders: [],
      url: () => 'https://www.example.com/',
      getAssociatedData: () => null,
      setAssociatedData: () => {},
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    const component = await renderResponseHeaderSection(request);
    assertShadowRoot(component.shadowRoot);
    const rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');

    assertShadowRoot(rows[0].shadowRoot);
    assert.strictEqual(rows[0].shadowRoot.querySelector('.header-name')?.textContent?.trim(), 'set-cookie:');
    assert.strictEqual(rows[0].shadowRoot.querySelector('.header-value')?.textContent?.trim(), 'user=123');
    assert.strictEqual(rows[0].shadowRoot.querySelector('.row')?.classList.contains('header-overridden'), false);
  });

  it('does not mark unset headers (which cause the request to be blocked) as overridden', async () => {
    const request = {
      sortedResponseHeaders: [
        {name: 'abc', value: 'def'},
      ],
      blockedResponseCookies: () => [],
      wasBlocked: () => true,
      blockedReason: () => Protocol.Network.BlockedReason.CoepFrameResourceNeedsCoepHeader,
      originalResponseHeaders: [
        {name: 'abc', value: 'def'},
      ],
      setCookieHeaders: [],
      url: () => 'https://www.example.com/',
      getAssociatedData: () => null,
      setAssociatedData: () => {},
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    const component = await renderResponseHeaderSection(request);
    assertShadowRoot(component.shadowRoot);
    const rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');

    const checkRow = (shadowRoot: ShadowRoot, headerName: string, headerValue: string, isOverride: boolean): void => {
      assert.deepEqual(getCleanTextContentFromElements(shadowRoot, '.header-name'), [headerName]);
      assert.strictEqual(shadowRoot.querySelector('.header-value')?.textContent?.trim(), headerValue);
      assert.strictEqual(shadowRoot.querySelector('.row')?.classList.contains('header-overridden'), isOverride);
    };

    assertShadowRoot(rows[0].shadowRoot);
    checkRow(rows[0].shadowRoot, 'abc:', 'def', false);
    assertShadowRoot(rows[1].shadowRoot);
    checkRow(rows[1].shadowRoot, 'not-setcross-origin-embedder-policy:', '', false);
  });
});
