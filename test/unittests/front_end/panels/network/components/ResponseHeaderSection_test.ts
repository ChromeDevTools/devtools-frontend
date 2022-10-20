// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as NetworkComponents from '../../../../../../front_end/panels/network/components/components.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {
  assertElement,
  assertShadowRoot,
  dispatchFocusOutEvent,
  getCleanTextContentFromElements,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import {setUpEnvironment} from '../../../helpers/OverridesHelpers.js';
import type * as Platform from '../../../../../../front_end/core/platform/platform.js';
import {createWorkspaceProject} from '../../../helpers/OverridesHelpers.js';
import * as Workspace from '../../../../../../front_end/models/workspace/workspace.js';
import type * as Persistence from '../../../../../../front_end/models/persistence/persistence.js';
import * as Root from '../../../../../../front_end/core/root/root.js';
import * as Common from '../../../../../../front_end/core/common/common.js';

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
  component.data = {request};
  await coordinator.done();
  assertElement(component, HTMLElement);
  assertShadowRoot(component.shadowRoot);
  return component;
}

function editHeaderRow(
    component: NetworkComponents.ResponseHeaderSection.ResponseHeaderSection, index: number,
    headerAttribute: HeaderAttribute, newValue: string) {
  assertShadowRoot(component.shadowRoot);
  const rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');
  assert.isTrue(rows.length >= index + 1, 'Trying to edit row with index greater than # of rows.');
  const row = rows[index];
  assertShadowRoot(row.shadowRoot);
  const selector =
      headerAttribute === HeaderAttribute.HeaderName ? '.header-name .editable' : '.header-value .editable';
  const editable = row.shadowRoot.querySelector(selector);
  assertElement(editable, HTMLSpanElement);
  editable.textContent = newValue;
  dispatchFocusOutEvent(editable, {bubbles: true});
}

function removeHeaderRow(component: NetworkComponents.ResponseHeaderSection.ResponseHeaderSection): void {
  assertShadowRoot(component.shadowRoot);
  const row = component.shadowRoot.querySelector('devtools-header-section-row');
  assertElement(row, HTMLElement);
  assertShadowRoot(row.shadowRoot);
  const button = row.shadowRoot.querySelector('.remove-header');
  assertElement(button, HTMLElement);
  button.click();
}

async function setupHeaderEditing(
    headerOverridesFileContent: string, actualHeaders: SDK.NetworkRequest.NameValue[],
    originalHeaders: SDK.NetworkRequest.NameValue[]) {
  const request = {
    sortedResponseHeaders: actualHeaders,
    originalResponseHeaders: originalHeaders,
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
    isOverride: boolean, isNameEditable: boolean, isValueEditable: boolean): void {
  assertShadowRoot(row.shadowRoot);
  assert.strictEqual(row.shadowRoot.querySelector('.header-name')?.textContent?.trim(), headerName);
  assert.strictEqual(row.shadowRoot.querySelector('.header-value')?.textContent?.trim(), headerValue);
  assert.strictEqual(row.shadowRoot.querySelector('.row')?.classList.contains('header-overridden'), isOverride);
  const nameEditable = row.shadowRoot.querySelector('.header-name .editable');
  assert.strictEqual(Boolean(nameEditable), isNameEditable);
  const valueEditable = row.shadowRoot.querySelector('.header-value .editable');
  assert.strictEqual(Boolean(valueEditable), isValueEditable);
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
    Root.Runtime.experiments.register(Root.Runtime.ExperimentName.HEADER_OVERRIDES, '');
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.HEADER_OVERRIDES);
  });

  beforeEach(async () => {
    await setUpEnvironment();
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
      url: () => 'https://www.example.com/',
      getAssociatedData: () => null,
      setAssociatedData: () => {},
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    const component = await renderResponseHeaderSection(request);
    assertShadowRoot(component.shadowRoot);

    const row = component.shadowRoot.querySelectorAll('devtools-header-section-row')[1];
    assertElement(row, HTMLElement);
    assertShadowRoot(row.shadowRoot);

    assert.strictEqual(
        row.shadowRoot.querySelector('.header-name')?.textContent?.trim(), 'not-set cross-origin-resource-policy:');
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
        {name: 'is-in-original-headers', value: 'not an override'},
        {name: 'not-in-original-headers', value: 'is an override'},
        {name: 'duplicate-in-actual-headers', value: 'first'},
        {name: 'duplicate-in-actual-headers', value: 'second'},
        {name: 'duplicate-in-original-headers', value: 'two'},
        {name: 'duplicate-both-no-mismatch', value: 'foo'},
        {name: 'duplicate-both-no-mismatch', value: 'bar'},
        {name: 'duplicate-both-with-mismatch', value: 'Chrome'},
        {name: 'duplicate-both-with-mismatch', value: 'DevTools'},
        {name: 'triplicate', value: '1'},
        {name: 'triplicate', value: '2'},
        {name: 'triplicate', value: '2'},
      ],
      blockedResponseCookies: () => [],
      wasBlocked: () => false,
      originalResponseHeaders: [
        {name: 'is-in-original-headers', value: 'not an override'},
        {name: 'duplicate-in-actual-headers', value: 'first'},
        {name: 'duplicate-in-original-headers', value: 'one'},
        {name: 'duplicate-in-original-headers', value: 'two'},
        {name: 'duplicate-both-no-mismatch', value: 'foo'},
        {name: 'duplicate-both-no-mismatch', value: 'bar'},
        {name: 'duplicate-both-with-mismatch', value: 'Chrome'},
        {name: 'duplicate-both-with-mismatch', value: 'Canary'},
        {name: 'triplicate', value: '1'},
        {name: 'triplicate', value: '1'},
        {name: 'triplicate', value: '2'},
      ],
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
    checkRow(rows[0].shadowRoot, 'is-in-original-headers:', 'not an override', false);
    assertShadowRoot(rows[1].shadowRoot);
    checkRow(rows[1].shadowRoot, 'not-in-original-headers:', 'is an override', true);
    assertShadowRoot(rows[2].shadowRoot);
    checkRow(rows[2].shadowRoot, 'duplicate-in-actual-headers:', 'first', true);
    assertShadowRoot(rows[3].shadowRoot);
    checkRow(rows[3].shadowRoot, 'duplicate-in-actual-headers:', 'second', true);
    assertShadowRoot(rows[4].shadowRoot);
    checkRow(rows[4].shadowRoot, 'duplicate-in-original-headers:', 'two', true);
    assertShadowRoot(rows[5].shadowRoot);
    checkRow(rows[5].shadowRoot, 'duplicate-both-no-mismatch:', 'foo', false);
    assertShadowRoot(rows[6].shadowRoot);
    checkRow(rows[6].shadowRoot, 'duplicate-both-no-mismatch:', 'bar', false);
    assertShadowRoot(rows[7].shadowRoot);
    checkRow(rows[7].shadowRoot, 'duplicate-both-with-mismatch:', 'Chrome', true);
    assertShadowRoot(rows[8].shadowRoot);
    checkRow(rows[8].shadowRoot, 'duplicate-both-with-mismatch:', 'DevTools', true);
    assertShadowRoot(rows[9].shadowRoot);
    checkRow(rows[9].shadowRoot, 'triplicate:', '1', true);
    assertShadowRoot(rows[10].shadowRoot);
    checkRow(rows[10].shadowRoot, 'triplicate:', '2', true);
    assertShadowRoot(rows[11].shadowRoot);
    checkRow(rows[11].shadowRoot, 'triplicate:', '2', true);
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
        {name: 'server', value: 'overridden server'},
        {name: 'cache-control', value: 'max-age=600'},
      ],
      blockedResponseCookies: () => [],
      wasBlocked: () => false,
      originalResponseHeaders: [
        {name: 'server', value: 'original server'},
        {name: 'cache-control', value: 'max-age=600'},
      ],
      url: () => 'https://www.example.com/',
      getAssociatedData: () => null,
      setAssociatedData: () => {},
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    const component = await renderResponseHeaderSection(request);
    assertShadowRoot(component.shadowRoot);
    const rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');

    const checkRow =
        (shadowRoot: ShadowRoot, headerName: string, headerValue: string, isOverride: boolean, isEditable: boolean):
            void => {
              assert.strictEqual(shadowRoot.querySelector('.header-name')?.textContent?.trim(), headerName);
              assert.strictEqual(shadowRoot.querySelector('.header-value')?.textContent?.trim(), headerValue);
              assert.strictEqual(shadowRoot.querySelector('.row')?.classList.contains('header-overridden'), isOverride);
              const editable = shadowRoot.querySelector('.editable');
              if (isEditable) {
                assertElement(editable, HTMLSpanElement);
              } else {
                assert.strictEqual(editable, null);
              }
            };

    assertShadowRoot(rows[0].shadowRoot);
    checkRow(rows[0].shadowRoot, 'server:', 'overridden server', true, true);
    assertShadowRoot(rows[1].shadowRoot);
    checkRow(rows[1].shadowRoot, 'cache-control:', 'max-age=600', false, true);

    Common.Settings.Settings.instance().moduleSetting('persistenceNetworkOverridesEnabled').set(false);
    component.data = {request};
    await coordinator.done();

    checkRow(rows[0].shadowRoot, 'server:', 'overridden server', true, false);
    checkRow(rows[1].shadowRoot, 'cache-control:', 'max-age=600', false, false);

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
        {name: 'server', value: 'overridden server'},
        {name: 'cache-control', value: 'max-age=600'},
      ],
      blockedResponseCookies: () => [],
      wasBlocked: () => false,
      originalResponseHeaders: [
        {name: 'server', value: 'original server'},
        {name: 'cache-control', value: 'max-age=600'},
      ],
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

    const checkRow = (shadowRoot: ShadowRoot, headerName: string, headerValue: string, isOverride: boolean): void => {
      assert.strictEqual(shadowRoot.querySelector('.header-name')?.textContent?.trim(), headerName);
      assert.strictEqual(shadowRoot.querySelector('.header-value')?.textContent?.trim(), headerValue);
      assert.strictEqual(shadowRoot.querySelector('.row')?.classList.contains('header-overridden'), isOverride);
      const editable = shadowRoot.querySelector('.editable');
      assert.isNull(editable);
    };

    assertShadowRoot(rows[0].shadowRoot);
    checkRow(rows[0].shadowRoot, 'server:', 'overridden server', true);
    assertShadowRoot(rows[1].shadowRoot);
    checkRow(rows[1].shadowRoot, 'cache-control:', 'max-age=600', false);
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
      {name: 'server', value: 'overridden server'},
      {name: 'cache-control', value: 'max-age=600'},
    ];

    const originalHeaders = [
      {name: 'server', value: 'original server'},
      {name: 'cache-control', value: 'max-age=600'},
    ];

    const {component, spy} = await setupHeaderEditing(headerOverridesFileContent, actualHeaders, originalHeaders);
    editHeaderRow(component, 1, HeaderAttribute.HeaderValue, 'max-age=9999');

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
      {name: 'server', value: 'overridden server'},
      {name: 'cache-control', value: 'max-age=600'},
    ];

    const originalHeaders = [
      {name: 'server', value: 'original server'},
      {name: 'cache-control', value: 'max-age=600'},
    ];

    const {component, spy} = await setupHeaderEditing(headerOverridesFileContent, actualHeaders, originalHeaders);
    editHeaderRow(component, 0, HeaderAttribute.HeaderValue, 'edited value');

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
  });

  it('can remove header overrides', async () => {
    const headerOverridesFileContent = `[
      {
        "applyTo": "index.html",
        "headers": [
          {
            "name": "server",
            "value": "overridden server"
          },
          {
            "name": "cache-control",
            "value": "max-age=9999"
          }
        ]
      }
    ]`;

    const actualHeaders = [
      {name: 'server', value: 'overridden server'},
      {name: 'cache-control', value: 'max-age=9999'},
    ];

    const originalHeaders = [
      {name: 'server', value: 'original server'},
      {name: 'cache-control', value: 'max-age=600'},
    ];

    const {component, spy} = await setupHeaderEditing(headerOverridesFileContent, actualHeaders, originalHeaders);
    removeHeaderRow(component);

    const expected = [{
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
    removeHeaderRow(component);

    const expected: Persistence.NetworkPersistenceManager.HeaderOverride[] = [];
    assert.strictEqual(spy.callCount, 1);
    assert.isTrue(spy.calledOnceWith(JSON.stringify(expected, null, 2)));
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

    editHeaderRow(component, 1, HeaderAttribute.HeaderName, 'foo');
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

    editHeaderRow(component, 1, HeaderAttribute.HeaderValue, 'bar');
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
      {name: 'server', value: 'overridden server'},
      {name: 'cache-control', value: 'max-age=600'},
    ];

    const originalHeaders = [
      {name: 'server', value: 'original server'},
      {name: 'cache-control', value: 'max-age=600'},
    ];

    const {component, spy} = await setupHeaderEditing(headerOverridesFileContent, actualHeaders, originalHeaders);
    editHeaderRow(component, 0, HeaderAttribute.HeaderValue, 'edited server');
    editHeaderRow(component, 1, HeaderAttribute.HeaderValue, 'edited cache-control');

    const expected = [{
      applyTo: 'index.html',
      headers: [
        {
          name: 'server',
          value: 'edited server',
        },
        {
          name: 'cache-control',
          value: 'edited cache-control',
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
    editHeaderRow(component, 0, HeaderAttribute.HeaderValue, 'third value');

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

    editHeaderRow(component, 1, HeaderAttribute.HeaderValue, 'fourth value');
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
    editHeaderRow(component, 1, HeaderAttribute.HeaderValue, 'fifth value');

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

    editHeaderRow(component, 0, HeaderAttribute.HeaderValue, 'sixth value');
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

    editHeaderRow(component, 0, HeaderAttribute.HeaderValue, 'unit test');
    editHeaderRow(component, 1, HeaderAttribute.HeaderName, 'foo');
    editHeaderRow(component, 1, HeaderAttribute.HeaderValue, 'bar');
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
    const addHeaderButton = component.shadowRoot.querySelector('.add-header-button');
    assertElement(addHeaderButton, HTMLElement);
    addHeaderButton.click();
    await coordinator.done();

    editHeaderRow(component, 0, HeaderAttribute.HeaderValue, 'unit test');

    component.remove();
    Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL = () => null;

    const component2 = await renderResponseHeaderSection(request);
    assertShadowRoot(component2.shadowRoot);
    const rows = component2.shadowRoot.querySelectorAll('devtools-header-section-row');
    assert.strictEqual(rows.length, 1);
    checkHeaderSectionRow(rows[0], 'server:', 'overridden server', true, false, false);
  });
});
