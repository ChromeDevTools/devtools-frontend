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
  dispatchInputEvent,
  dispatchKeyDownEvent,
  dispatchPasteEvent,
  getCleanTextContentFromElements,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

async function renderHeaderSectionRow(header: NetworkComponents.HeaderSectionRow.HeaderDescriptor): Promise<{
  component: NetworkComponents.HeaderSectionRow.HeaderSectionRow,
  nameEditable: HTMLSpanElement | null,
  valueEditable: HTMLSpanElement | null,
  scrollIntoViewSpy: sinon.SinonSpy,
}> {
  const component = new NetworkComponents.HeaderSectionRow.HeaderSectionRow();
  const scrollIntoViewSpy = sinon.spy(component, 'scrollIntoView');
  renderElementIntoDOM(component);
  assert.isTrue(scrollIntoViewSpy.notCalled);
  component.data = {header};
  await coordinator.done();
  assertShadowRoot(component.shadowRoot);

  let nameEditable: HTMLSpanElement|null = null;
  const nameEditableComponent = component.shadowRoot.querySelector<NetworkComponents.EditableSpan.EditableSpan>(
      '.header-name devtools-editable-span');
  if (nameEditableComponent) {
    assertElement(nameEditableComponent, HTMLElement);
    assertShadowRoot(nameEditableComponent.shadowRoot);
    nameEditable = nameEditableComponent.shadowRoot.querySelector('.editable');
    assertElement(nameEditable, HTMLSpanElement);
  }

  let valueEditable: HTMLSpanElement|null = null;
  const valueEditableComponent = component.shadowRoot.querySelector<NetworkComponents.EditableSpan.EditableSpan>(
      '.header-value devtools-editable-span');
  if (valueEditableComponent) {
    assertElement(valueEditableComponent, HTMLElement);
    assertShadowRoot(valueEditableComponent.shadowRoot);
    valueEditable = valueEditableComponent.shadowRoot.querySelector('.editable');
    assertElement(valueEditable, HTMLSpanElement);
  }

  return {component, nameEditable, valueEditable, scrollIntoViewSpy};
}

const hasReloadPrompt = (shadowRoot: ShadowRoot): boolean => {
  return Boolean(
      shadowRoot.querySelector('devtools-icon[title="Refresh the page/request for these changes to take effect"]'));
};

describeWithEnvironment('HeaderSectionRow', () => {
  it('emits UMA event when a header value is being copied', async () => {
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('some-header-name'),
      value: 'someHeaderValue',
    };
    const {component, scrollIntoViewSpy} = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);
    assert.isTrue(scrollIntoViewSpy.notCalled);

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
    const {component} = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);

    const headerName = component.shadowRoot.querySelector('.header-name');
    assertElement(headerName, HTMLDivElement);
    const regex = /^\s*not-set\s*cross-origin-resource-policy:\s*$/;
    assert.isTrue(regex.test(headerName.textContent || ''));

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
    const {component} = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);

    const headerName = component.shadowRoot.querySelector('.header-name');
    assertElement(headerName, HTMLDivElement);
    assert.strictEqual(headerName.textContent?.trim(), 'x-client-data:');

    const headerValue = component.shadowRoot.querySelector('.header-value');
    assertElement(headerValue, HTMLDivElement);
    assert.isTrue(headerValue.classList.contains('flex-columns'));

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
    const {component} = await renderHeaderSectionRow(headerData);
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
    const {component, scrollIntoViewSpy} = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);
    const headerRowElement = component.shadowRoot.querySelector('.row.header-highlight');
    assertElement(headerRowElement, HTMLDivElement);
    assert.isTrue(scrollIntoViewSpy.calledOnce);
  });

  it('allows editing header name and header value', async () => {
    const originalHeaderName = Platform.StringUtilities.toLowerCaseString('some-header-name');
    const originalHeaderValue = 'someHeaderValue';
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: originalHeaderName,
      value: originalHeaderValue,
      nameEditable: true,
      valueEditable: true,
    };
    const editedHeaderName = 'new-header-name';
    const editedHeaderValue = 'new value for header';

    const {component, nameEditable, valueEditable} = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);

    let headerValueFromEvent = '';
    let headerNameFromEvent = '';
    let headerEditedEventCount = 0;
    component.addEventListener('headeredited', event => {
      headerEditedEventCount++;
      headerValueFromEvent = event.headerValue;
      headerNameFromEvent = event.headerName;
    });

    assertElement(nameEditable, HTMLSpanElement);
    assert.isTrue(hasReloadPrompt(component.shadowRoot));
    nameEditable.focus();
    nameEditable.innerText = editedHeaderName;
    dispatchInputEvent(nameEditable, {inputType: 'insertText', data: editedHeaderName, bubbles: true, composed: true});
    nameEditable.blur();
    await coordinator.done();

    assert.strictEqual(headerEditedEventCount, 1);
    assert.strictEqual(headerNameFromEvent, editedHeaderName);
    assert.strictEqual(headerValueFromEvent, originalHeaderValue);
    assert.isTrue(hasReloadPrompt(component.shadowRoot));

    assertElement(valueEditable, HTMLSpanElement);
    valueEditable.focus();
    valueEditable.innerText = editedHeaderValue;
    dispatchInputEvent(
        valueEditable, {inputType: 'insertText', data: editedHeaderValue, bubbles: true, composed: true});
    valueEditable.blur();
    await coordinator.done();

    assert.strictEqual(headerEditedEventCount, 2);
    assert.strictEqual(headerNameFromEvent, editedHeaderName);
    assert.strictEqual(headerValueFromEvent, editedHeaderValue);
    assert.isTrue(hasReloadPrompt(component.shadowRoot));

    nameEditable.focus();
    nameEditable.innerText = originalHeaderName;
    dispatchInputEvent(
        nameEditable, {inputType: 'insertText', data: originalHeaderName, bubbles: true, composed: true});
    nameEditable.blur();
    await coordinator.done();

    assert.strictEqual(headerEditedEventCount, 3);
    assert.strictEqual(headerNameFromEvent, originalHeaderName);
    assert.strictEqual(headerValueFromEvent, editedHeaderValue);
    assert.isTrue(hasReloadPrompt(component.shadowRoot));

    valueEditable.focus();
    valueEditable.innerText = originalHeaderValue;
    dispatchInputEvent(
        valueEditable, {inputType: 'insertText', data: originalHeaderValue, bubbles: true, composed: true});
    valueEditable.blur();
    await coordinator.done();

    assert.strictEqual(headerEditedEventCount, 4);
    assert.strictEqual(headerNameFromEvent, originalHeaderName);
    assert.strictEqual(headerValueFromEvent, originalHeaderValue);
    assert.isTrue(hasReloadPrompt(component.shadowRoot));
  });

  it('does not allow setting an emtpy header name', async () => {
    const headerName = Platform.StringUtilities.toLowerCaseString('some-header-name');
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: headerName,
      value: 'someHeaderValue',
      nameEditable: true,
      valueEditable: true,
    };

    const {component, nameEditable} = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);

    let headerEditedEventCount = 0;
    component.addEventListener('headeredited', () => {
      headerEditedEventCount++;
    });

    assertElement(nameEditable, HTMLElement);
    nameEditable.focus();
    nameEditable.innerText = '';
    nameEditable.blur();

    assert.strictEqual(headerEditedEventCount, 0);
    assert.strictEqual(nameEditable.innerText, 'Some-Header-Name');
  });

  it('resets edited value on escape key', async () => {
    const originalHeaderValue = 'special chars: \'\"\\.,;!?@_-+/=<>()[]{}|*&^%$#§±`~';
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('some-header-name'),
      value: originalHeaderValue,
      originalValue: originalHeaderValue,
      valueEditable: true,
    };

    const {component, valueEditable} = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);

    let eventCount = 0;
    component.addEventListener('headeredited', () => {
      eventCount++;
    });

    assertElement(valueEditable, HTMLElement);
    assert.strictEqual(valueEditable.innerText, originalHeaderValue);
    valueEditable.focus();
    valueEditable.innerText = 'new value for header';
    dispatchKeyDownEvent(valueEditable, {key: 'Escape', bubbles: true, composed: true});

    assert.strictEqual(eventCount, 0);
    assert.strictEqual(valueEditable.innerText, originalHeaderValue);
    const row = component.shadowRoot.querySelector('.row');
    assert.isFalse(row?.classList.contains('header-overridden'));
  });

  it('confirms edited value and exits editing mode on "Enter"-key', async () => {
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('some-header-name'),
      value: 'someHeaderValue',
      valueEditable: true,
    };
    const editedHeaderValue = 'new value for header';

    const {component, valueEditable} = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);

    let headerValueFromEvent = '';
    let eventCount = 0;
    component.addEventListener('headeredited', event => {
      headerValueFromEvent = event.headerValue;
      eventCount++;
    });

    assertElement(valueEditable, HTMLElement);
    valueEditable.focus();
    valueEditable.innerText = editedHeaderValue;
    dispatchKeyDownEvent(valueEditable, {key: 'Enter', bubbles: true});

    assert.strictEqual(headerValueFromEvent, editedHeaderValue);
    assert.strictEqual(eventCount, 1);
  });

  it('removes formatting for pasted content', async () => {
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('some-header-name'),
      value: 'someHeaderValue',
      valueEditable: true,
    };

    const {component, valueEditable} = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);

    let headerValueFromEvent = '';
    component.addEventListener('headeredited', event => {
      headerValueFromEvent = event.headerValue;
    });

    assertElement(valueEditable, HTMLElement);
    valueEditable.focus();
    const dt = new DataTransfer();
    dt.setData('text/plain', 'foo\nbar');
    dt.setData('text/html', 'This is <b>bold</b>');
    dispatchPasteEvent(valueEditable, {clipboardData: dt, bubbles: true});
    valueEditable.blur();

    assert.strictEqual(headerValueFromEvent, 'foo bar');
  });

  it('adds and removes `header-overridden` class correctly', async () => {
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('some-header-name'),
      value: 'someHeaderValue',
      originalValue: 'someHeaderValue',
      valueEditable: true,
      highlight: true,
    };

    const {component, valueEditable} = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);
    assertElement(valueEditable, HTMLElement);
    const row = component.shadowRoot.querySelector('.row');
    assert.isFalse(row?.classList.contains('header-overridden'));
    assert.isTrue(row?.classList.contains('header-highlight'));
    assert.isFalse(hasReloadPrompt(component.shadowRoot));

    valueEditable.focus();
    valueEditable.innerText = 'a';
    dispatchInputEvent(valueEditable, {inputType: 'insertText', data: 'a', bubbles: true, composed: true});
    await coordinator.done();
    assert.isTrue(row?.classList.contains('header-overridden'));
    assert.isFalse(row?.classList.contains('header-highlight'));
    assert.isTrue(hasReloadPrompt(component.shadowRoot));

    dispatchKeyDownEvent(valueEditable, {key: 'Escape', bubbles: true, composed: true});
    await coordinator.done();
    assert.isFalse(component.shadowRoot.querySelector('.row')?.classList.contains('header-overridden'));
  });

  it('adds and removes `header-overridden` class correctly when editing unset headers', async () => {
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('some-header-name'),
      value: null,
      originalValue: null,
      valueEditable: true,
    };

    const {component, valueEditable} = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);
    assertElement(valueEditable, HTMLElement);
    const row = component.shadowRoot.querySelector('.row');
    assert.isFalse(row?.classList.contains('header-overridden'));

    valueEditable.focus();
    valueEditable.innerText = 'a';
    dispatchInputEvent(valueEditable, {inputType: 'insertText', data: 'a', bubbles: true, composed: true});
    await coordinator.done();
    assert.isTrue(row?.classList.contains('header-overridden'));

    dispatchKeyDownEvent(valueEditable, {key: 'Escape', bubbles: true, composed: true});
    await coordinator.done();
    assert.isFalse(component.shadowRoot.querySelector('.row')?.classList.contains('header-overridden'));
  });

  it('shows error-icon when header name contains disallowed characters', async () => {
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('some-header-name'),
      value: 'someHeaderValue',
      originalValue: 'someHeaderValue',
      nameEditable: true,
      valueEditable: true,
    };

    const {component, nameEditable} = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);
    assertElement(nameEditable, HTMLElement);
    const row = component.shadowRoot.querySelector('.row');
    assertElement(row, HTMLDivElement);
    assert.strictEqual(row.querySelector('devtools-icon.disallowed-characters'), null);
    assert.isTrue(hasReloadPrompt(component.shadowRoot));

    nameEditable.focus();
    nameEditable.innerText = '*';
    dispatchInputEvent(nameEditable, {inputType: 'insertText', data: '*', bubbles: true, composed: true});
    await coordinator.done();
    assertElement(row.querySelector('devtools-icon.disallowed-characters'), HTMLElement);
    assert.isTrue(hasReloadPrompt(component.shadowRoot));

    dispatchKeyDownEvent(nameEditable, {key: 'Escape', bubbles: true, composed: true});
    await coordinator.done();
    assert.strictEqual(row.querySelector('devtools-icon.disallowed-characters'), null);
    assert.isTrue(hasReloadPrompt(component.shadowRoot));
  });

  it('recoginzes only alphanumeric characters, dashes, and underscores as valid in header names', () => {
    assert.strictEqual(NetworkComponents.HeaderSectionRow.isValidHeaderName('AlphaNumeric123'), true);
    assert.strictEqual(NetworkComponents.HeaderSectionRow.isValidHeaderName('Alpha Numeric'), false);
    assert.strictEqual(NetworkComponents.HeaderSectionRow.isValidHeaderName('AlphaNumeric123!'), false);
    assert.strictEqual(NetworkComponents.HeaderSectionRow.isValidHeaderName('With-dashes_and_underscores'), true);
    assert.strictEqual(NetworkComponents.HeaderSectionRow.isValidHeaderName('no*'), false);
  });

  it('allows removing a header override', async () => {
    const headerName = Platform.StringUtilities.toLowerCaseString('some-header-name');
    const headerValue = 'someHeaderValue';
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: headerName,
      value: headerValue,
      valueEditable: true,
    };

    const {component} = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);

    let headerValueFromEvent = '';
    let headerNameFromEvent = '';
    let headerRemovedEventCount = 0;

    component.addEventListener('headerremoved', event => {
      headerRemovedEventCount++;
      headerValueFromEvent = (event as NetworkComponents.HeaderSectionRow.HeaderRemovedEvent).headerValue;
      headerNameFromEvent = (event as NetworkComponents.HeaderSectionRow.HeaderRemovedEvent).headerName;
    });

    const removeHeaderButton = component.shadowRoot.querySelector('.remove-header') as HTMLElement;
    removeHeaderButton.click();

    assert.strictEqual(headerRemovedEventCount, 1);
    assert.strictEqual(headerNameFromEvent, headerName);
    assert.strictEqual(headerValueFromEvent, headerValue);
  });

  it('removes leading/trailing whitespace when editing header names/values', async () => {
    const originalHeaderName = Platform.StringUtilities.toLowerCaseString('some-header-name');
    const originalHeaderValue = 'someHeaderValue';
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: originalHeaderName,
      value: originalHeaderValue,
      nameEditable: true,
      valueEditable: true,
    };
    const editedHeaderName = ' new-header-name ';
    const editedHeaderValue = ' new value for header ';

    const {component, nameEditable, valueEditable} = await renderHeaderSectionRow(headerData);
    assertShadowRoot(component.shadowRoot);

    let headerValueFromEvent = '';
    let headerNameFromEvent = '';
    let headerEditedEventCount = 0;
    component.addEventListener('headeredited', event => {
      headerEditedEventCount++;
      headerValueFromEvent = event.headerValue;
      headerNameFromEvent = event.headerName;
    });

    assertElement(nameEditable, HTMLElement);
    nameEditable.focus();
    nameEditable.innerText = editedHeaderName;
    nameEditable.blur();

    assert.strictEqual(headerEditedEventCount, 1);
    assert.strictEqual(headerNameFromEvent, editedHeaderName.trim());
    assert.strictEqual(headerValueFromEvent, originalHeaderValue);

    assertElement(valueEditable, HTMLElement);
    valueEditable.focus();
    valueEditable.innerText = editedHeaderValue;
    valueEditable.blur();

    assert.strictEqual(headerEditedEventCount, 2);
    assert.strictEqual(headerNameFromEvent, editedHeaderName.trim());
    assert.strictEqual(headerValueFromEvent, editedHeaderValue.trim());
  });
});
