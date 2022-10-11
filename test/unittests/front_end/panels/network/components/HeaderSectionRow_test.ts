// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../../../../front_end/core/host/host.js';
import * as Platform from '../../../../../../front_end/core/platform/platform.js';
import * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as NetworkComponents from '../../../../../../front_end/panels/network/components/components.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {
  assertElement,
  assertShadowRoot,
  dispatchCopyEvent,
  dispatchKeyDownEvent,
  dispatchPasteEvent,
  getCleanTextContentFromElements,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

async function renderHeaderSectionRow(header: NetworkComponents.HeaderSectionRow.HeaderDescriptor):
    Promise<NetworkComponents.HeaderSectionRow.HeaderSectionRow> {
  const component = new NetworkComponents.HeaderSectionRow.HeaderSectionRow();
  renderElementIntoDOM(component);
  component.data = {header};
  await coordinator.done();
  return component;
}

describeWithEnvironment('HeaderSectionRow', () => {
  it('emits UMA event when a header value is being copied', async () => {
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('some-header-name'),
      value: 'someHeaderValue',
    };
    const component = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);

    const spy = sinon.spy(Host.userMetrics, 'actionTaken');
    const headerValue = component.shadowRoot.querySelector('.header-value');
    assertElement(headerValue, HTMLElement);

    assert.isTrue(spy.notCalled);
    dispatchCopyEvent(headerValue);
    assert.isTrue(spy.calledWith(Host.UserMetrics.Action.NetworkPanelCopyValue));
  });

  it('renders detailed reason for blocked requests', async () => {
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('cross-origin-resource-policy'),
      value: null,
      headerNotSet: true,
      blockedDetails: {
        explanation: () =>
            'To use this resource from a different origin, the server needs to specify a cross-origin resource policy in the response headers:',
        examples: [
          {
            codeSnippet: 'Cross-Origin-Resource-Policy: same-site',
            comment: () => 'Choose this option if the resource and the document are served from the same site.',
          },
          {
            codeSnippet: 'Cross-Origin-Resource-Policy: cross-origin',
            comment: () =>
                'Only choose this option if an arbitrary website including this resource does not impose a security risk.',
          },
        ],
        link: {url: 'https://web.dev/coop-coep/'},
      },
    };
    const component = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);

    const headerName = component.shadowRoot.querySelector('.header-name');
    assertElement(headerName, HTMLDivElement);
    assert.strictEqual(headerName.textContent?.trim(), 'not-set cross-origin-resource-policy:');

    const headerValue = component.shadowRoot.querySelector('.header-value');
    assertElement(headerValue, HTMLDivElement);
    assert.strictEqual(headerValue.textContent?.trim(), '');

    assert.strictEqual(
        getCleanTextContentFromElements(component.shadowRoot, '.call-to-action')[0],
        'To use this resource from a different origin, the server needs to specify a cross-origin ' +
            'resource policy in the response headers:Cross-Origin-Resource-Policy: same-siteChoose ' +
            'this option if the resource and the document are served from the same site.' +
            'Cross-Origin-Resource-Policy: cross-originOnly choose this option if an arbitrary website ' +
            'including this resource does not impose a security risk.Learn more',
    );
  });

  it('displays decoded "x-client-data"-header', async () => {
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('x-client-data'),
      value: 'CJa2yQEIpLbJAQiTocsB',
    };
    const component = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);

    const headerName = component.shadowRoot.querySelector('.header-name');
    assertElement(headerName, HTMLDivElement);
    assert.strictEqual(headerName.textContent?.trim(), 'x-client-data:');

    assert.isTrue(
        (getCleanTextContentFromElements(component.shadowRoot, '.header-value')[0]).startsWith('CJa2yQEIpLbJAQiTocsB'));

    assert.strictEqual(
        getCleanTextContentFromElements(component.shadowRoot, '.header-value code')[0],
        'message ClientVariations {// Active client experiment variation IDs.repeated int32 variation_id = [3300118, 3300132, 3330195];\n}',
    );
  });

  it('displays info about blocked "Set-Cookie"-headers', async () => {
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('set-cookie'),
      value: 'secure=only; Secure',
      setCookieBlockedReasons:
          [Protocol.Network.SetCookieBlockedReason.SecureOnly, Protocol.Network.SetCookieBlockedReason.OverwriteSecure],
    };
    const component = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);

    const headerName = component.shadowRoot.querySelector('.header-name');
    assertElement(headerName, HTMLDivElement);
    assert.strictEqual(headerName.textContent?.trim(), 'set-cookie:');

    const headerValue = component.shadowRoot.querySelector('.header-value');
    assertElement(headerValue, HTMLDivElement);
    assert.strictEqual(headerValue.textContent?.trim(), 'secure=only; Secure');

    const icon = component.shadowRoot.querySelector('devtools-icon');
    assertElement(icon, HTMLElement);

    assert.strictEqual(
        icon.title,
        'This attempt to set a cookie via a Set-Cookie header was blocked because it had the ' +
            '"Secure" attribute but was not received over a secure connection.\nThis attempt to ' +
            'set a cookie via a Set-Cookie header was blocked because it was not sent over a ' +
            'secure connection and would have overwritten a cookie with the Secure attribute.');
  });

  it('can be highlighted', async () => {
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('some-header-name'),
      value: 'someHeaderValue',
      highlight: true,
    };
    const component = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);
    const headerRowElement = component.shadowRoot.querySelector('.row.header-highlight');
    assertElement(headerRowElement, HTMLDivElement);
  });

  it('allows editing header name and header value', async () => {
    const headerName = Platform.StringUtilities.toLowerCaseString('some-header-name');
    const headerValue = 'someHeaderValue';
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: headerName,
      value: headerValue,
      nameEditable: true,
      valueEditable: true,
    };
    const editedHeaderName = 'new-header-name';
    const editedHeaderValue = 'new value for header';

    const component = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);

    let headerValueFromEvent = '';
    let headerNameFromEvent = '';
    let headerEditedEventCount = 0;
    component.addEventListener('headeredited', event => {
      headerEditedEventCount++;
      headerValueFromEvent = event.headerValue;
      headerNameFromEvent = event.headerName;
    });

    let editable = component.shadowRoot.querySelector('.header-name .editable');
    assertElement(editable, HTMLSpanElement);
    editable.focus();
    editable.innerText = editedHeaderName;
    editable.blur();

    assert.strictEqual(headerEditedEventCount, 1);
    assert.strictEqual(headerNameFromEvent, editedHeaderName);
    assert.strictEqual(headerValueFromEvent, headerValue);

    editable = component.shadowRoot.querySelector('.header-value .editable');
    assertElement(editable, HTMLSpanElement);
    editable.focus();
    editable.innerText = editedHeaderValue;
    editable.blur();

    assert.strictEqual(headerEditedEventCount, 2);
    assert.strictEqual(headerNameFromEvent, editedHeaderName);
    assert.strictEqual(headerValueFromEvent, editedHeaderValue);
  });

  it('does not allow setting an emtpy header name', async () => {
    const headerName = Platform.StringUtilities.toLowerCaseString('some-header-name');
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: headerName,
      value: 'someHeaderValue',
      nameEditable: true,
      valueEditable: true,
    };

    const component = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);

    let headerEditedEventCount = 0;
    component.addEventListener('headeredited', () => {
      headerEditedEventCount++;
    });

    const editable = component.shadowRoot.querySelector('.header-name .editable');
    assertElement(editable, HTMLSpanElement);
    editable.focus();
    editable.innerText = '';
    editable.blur();

    assert.strictEqual(headerEditedEventCount, 0);
    assert.strictEqual(editable.innerText, 'Some-Header-Name');
  });

  it('resets edited value on escape key', async () => {
    const originalHeaderValue = 'someHeaderValue';
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('some-header-name'),
      value: originalHeaderValue,
      valueEditable: true,
    };

    const component = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);

    let eventCount = 0;
    component.addEventListener('headervaluechanged', () => {
      eventCount++;
    });

    const editable = component.shadowRoot.querySelector('.editable');
    assertElement(editable, HTMLSpanElement);
    editable.focus();
    editable.innerText = 'new value for header';
    dispatchKeyDownEvent(editable, {key: 'Escape', bubbles: true});

    assert.strictEqual(eventCount, 0);
    assert.strictEqual(editable.innerText, originalHeaderValue);
  });

  it('confirms edited value and exits editing mode on "Enter"-key', async () => {
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('some-header-name'),
      value: 'someHeaderValue',
      valueEditable: true,
    };
    const editedHeaderValue = 'new value for header';

    const component = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);

    let headerValueFromEvent = '';
    let eventCount = 0;
    component.addEventListener('headeredited', event => {
      headerValueFromEvent = event.headerValue;
      eventCount++;
    });

    const editable = component.shadowRoot.querySelector('.editable');
    assertElement(editable, HTMLSpanElement);
    editable.focus();
    editable.innerText = editedHeaderValue;
    dispatchKeyDownEvent(editable, {key: 'Enter', bubbles: true});

    assert.strictEqual(headerValueFromEvent, editedHeaderValue);
    assert.strictEqual(eventCount, 1);
  });

  it('removes formatting for pasted content', async () => {
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('some-header-name'),
      value: 'someHeaderValue',
      valueEditable: true,
    };

    const component = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);

    let headerValueFromEvent = '';
    component.addEventListener('headeredited', event => {
      headerValueFromEvent = event.headerValue;
    });

    const editable = component.shadowRoot.querySelector('.editable');
    assertElement(editable, HTMLSpanElement);
    editable.focus();
    const dt = new DataTransfer();
    dt.setData('text/plain', 'foo\nbar');
    dt.setData('text/html', 'This is <b>bold</b>');
    dispatchPasteEvent(editable, {clipboardData: dt, bubbles: true});
    editable.blur();

    assert.strictEqual(headerValueFromEvent, 'foo bar');
  });
});
