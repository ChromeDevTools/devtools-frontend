// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Protocol from '../../../generated/protocol.js';
import {
  dispatchCopyEvent,
  dispatchInputEvent,
  dispatchKeyDownEvent,
  dispatchPasteEvent,
  getCleanTextContentFromElements,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as NetworkComponents from './components.js';
import {type EditableSpan} from './EditableSpan.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

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
  assert.isNotNull(component.shadowRoot);

  let nameEditable: HTMLSpanElement|null = null;
  const nameEditableComponent = component.shadowRoot.querySelector<NetworkComponents.EditableSpan.EditableSpan>(
      '.header-name devtools-editable-span');
  if (nameEditableComponent) {
    assert.instanceOf(nameEditableComponent, HTMLElement);
    assert.isNotNull(nameEditableComponent.shadowRoot);
    nameEditable = nameEditableComponent.shadowRoot.querySelector('.editable');
    assert.instanceOf(nameEditable, HTMLSpanElement);
  }

  let valueEditable: HTMLSpanElement|null = null;
  const valueEditableComponent = component.shadowRoot.querySelector<NetworkComponents.EditableSpan.EditableSpan>(
      '.header-value devtools-editable-span');
  if (valueEditableComponent) {
    assert.instanceOf(valueEditableComponent, HTMLElement);
    assert.isNotNull(valueEditableComponent.shadowRoot);
    valueEditable = valueEditableComponent.shadowRoot.querySelector('.editable');
    assert.instanceOf(valueEditable, HTMLSpanElement);
  }

  return {component, nameEditable, valueEditable, scrollIntoViewSpy};
}

const hasReloadPrompt = (shadowRoot: ShadowRoot) => {
  return Boolean(
      shadowRoot.querySelector('devtools-icon[title="Refresh the page/request for these changes to take effect"]'));
};

describeWithEnvironment('HeaderSectionRow', () => {
  it('emits UMA event when a header value is being copied', async () => {
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('some-header-name'),
      value: 'someHeaderValue',
      valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.DISABLED,
    };
    const {component, scrollIntoViewSpy} = await renderHeaderSectionRow(headerData);
    assert.isNotNull(component.shadowRoot);
    assert.isTrue(scrollIntoViewSpy.notCalled);

    const spy = sinon.spy(Host.userMetrics, 'actionTaken');
    const headerValue = component.shadowRoot.querySelector('.header-value');
    assert.instanceOf(headerValue, HTMLElement);

    assert.isTrue(spy.notCalled);
    dispatchCopyEvent(headerValue);
    assert.isTrue(spy.calledWith(Host.UserMetrics.Action.NetworkPanelCopyValue));
  });

  it('renders detailed reason for blocked requests', async () => {
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('cross-origin-resource-policy'),
      value: null,
      valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.DISABLED,
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
    assert.isNotNull(component.shadowRoot);

    const headerName = component.shadowRoot.querySelector('.header-name');
    assert.instanceOf(headerName, HTMLDivElement);
    const regex = /^\s*not-set\s*cross-origin-resource-policy:\s*$/;
    assert.isTrue(regex.test(headerName.textContent || ''));

    const headerValue = component.shadowRoot.querySelector('.header-value');
    assert.instanceOf(headerValue, HTMLDivElement);
    assert.strictEqual(headerValue.textContent?.trim(), '');

    assert.strictEqual(
        getCleanTextContentFromElements(component.shadowRoot, '.call-to-action')[0],
        'To use this resource from a different origin, the server needs to specify a cross-origin ' +
            'resource policy in the response headers: Cross-Origin-Resource-Policy: same-site Choose ' +
            'this option if the resource and the document are served from the same site. ' +
            'Cross-Origin-Resource-Policy: cross-origin Only choose this option if an arbitrary website ' +
            'including this resource does not impose a security risk. Learn more',
    );
  });

  it('displays decoded "x-client-data"-header', async () => {
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('x-client-data'),
      value: 'CJa2yQEIpLbJAQiTocsB',
      valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.DISABLED,
    };
    const {component} = await renderHeaderSectionRow(headerData);
    assert.isNotNull(component.shadowRoot);

    const headerName = component.shadowRoot.querySelector('.header-name');
    assert.instanceOf(headerName, HTMLDivElement);
    assert.strictEqual(headerName.textContent?.trim(), 'x-client-data:');

    const headerValue = component.shadowRoot.querySelector('.header-value');
    assert.instanceOf(headerValue, HTMLDivElement);
    assert.isTrue(headerValue.classList.contains('flex-columns'));

    assert.isTrue(
        (getCleanTextContentFromElements(component.shadowRoot, '.header-value')[0]).startsWith('CJa2yQEIpLbJAQiTocsB'));

    assert.strictEqual(
        getCleanTextContentFromElements(component.shadowRoot, '.header-value code')[0],
        'message ClientVariations { // Active Google-visible variation IDs on this client. These are reported for analysis, but do not directly affect any server-side behavior. repeated int32 variation_id = [3300118, 3300132, 3330195];\n}',
    );
  });

  it('displays info about blocked "Set-Cookie"-headers', async () => {
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('set-cookie'),
      value: 'secure=only; Secure',
      valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.DISABLED,
      setCookieBlockedReasons:
          [Protocol.Network.SetCookieBlockedReason.SecureOnly, Protocol.Network.SetCookieBlockedReason.OverwriteSecure],
    };
    const {component} = await renderHeaderSectionRow(headerData);
    assert.isNotNull(component.shadowRoot);

    const headerName = component.shadowRoot.querySelector('.header-name');
    assert.instanceOf(headerName, HTMLDivElement);
    assert.strictEqual(headerName.textContent?.trim(), 'set-cookie:');

    const headerValue = component.shadowRoot.querySelector('.header-value');
    assert.instanceOf(headerValue, HTMLDivElement);
    assert.strictEqual(headerValue.textContent?.trim(), 'secure=only; Secure');

    const icon = component.shadowRoot.querySelector('devtools-icon');
    assert.instanceOf(icon, HTMLElement);

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
      valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.DISABLED,
      highlight: true,
    };
    const {component, scrollIntoViewSpy} = await renderHeaderSectionRow(headerData);
    assert.isNotNull(component.shadowRoot);
    const headerRowElement = component.shadowRoot.querySelector('.row.header-highlight');
    assert.instanceOf(headerRowElement, HTMLDivElement);
    assert.isTrue(scrollIntoViewSpy.calledOnce);
  });

  it('allows editing header name and header value', async () => {
    const originalHeaderName = Platform.StringUtilities.toLowerCaseString('some-header-name');
    const originalHeaderValue = 'someHeaderValue';
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: originalHeaderName,
      value: originalHeaderValue,
      nameEditable: true,
      valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.ENABLED,
    };
    const editedHeaderName = 'new-header-name';
    const editedHeaderValue = 'new value for header';

    const {component, nameEditable, valueEditable} = await renderHeaderSectionRow(headerData);
    assert.isNotNull(component.shadowRoot);

    let headerValueFromEvent = '';
    let headerNameFromEvent = '';
    let headerEditedEventCount = 0;
    component.addEventListener('headeredited', event => {
      headerEditedEventCount++;
      headerValueFromEvent = event.headerValue;
      headerNameFromEvent = event.headerName;
    });

    assert.instanceOf(nameEditable, HTMLSpanElement);
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

    assert.instanceOf(valueEditable, HTMLSpanElement);
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
      valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.ENABLED,
    };

    const {component, nameEditable} = await renderHeaderSectionRow(headerData);
    assert.isNotNull(component.shadowRoot);

    let headerEditedEventCount = 0;
    component.addEventListener('headeredited', () => {
      headerEditedEventCount++;
    });

    assert.instanceOf(nameEditable, HTMLElement);
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
      valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.ENABLED,
    };

    const {component, valueEditable} = await renderHeaderSectionRow(headerData);
    assert.isNotNull(component.shadowRoot);

    let eventCount = 0;
    component.addEventListener('headeredited', () => {
      eventCount++;
    });

    assert.instanceOf(valueEditable, HTMLElement);
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
      valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.ENABLED,
    };
    const editedHeaderValue = 'new value for header';

    const {component, valueEditable} = await renderHeaderSectionRow(headerData);
    assert.isNotNull(component.shadowRoot);

    let headerValueFromEvent = '';
    let eventCount = 0;
    component.addEventListener('headeredited', event => {
      headerValueFromEvent = event.headerValue;
      eventCount++;
    });

    assert.instanceOf(valueEditable, HTMLElement);
    valueEditable.focus();
    valueEditable.innerText = editedHeaderValue;
    dispatchKeyDownEvent(valueEditable, {key: 'Enter', bubbles: true});

    assert.strictEqual(headerValueFromEvent, editedHeaderValue);
    assert.strictEqual(eventCount, 1);
  });

  it('adds and removes `header-overridden` class correctly', async () => {
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: Platform.StringUtilities.toLowerCaseString('some-header-name'),
      value: 'someHeaderValue',
      originalValue: 'someHeaderValue',
      valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.ENABLED,
      highlight: true,
    };

    const {component, valueEditable} = await renderHeaderSectionRow(headerData);
    assert.isNotNull(component.shadowRoot);
    assert.instanceOf(valueEditable, HTMLElement);
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
      valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.ENABLED,
    };

    const {component, valueEditable} = await renderHeaderSectionRow(headerData);
    assert.isNotNull(component.shadowRoot);
    assert.instanceOf(valueEditable, HTMLElement);
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
      valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.ENABLED,
    };

    const {component, nameEditable} = await renderHeaderSectionRow(headerData);
    assert.isNotNull(component.shadowRoot);
    assert.instanceOf(nameEditable, HTMLElement);
    const row = component.shadowRoot.querySelector('.row');
    assert.instanceOf(row, HTMLDivElement);
    assert.strictEqual(row.querySelector('devtools-icon.disallowed-characters'), null);
    assert.isTrue(hasReloadPrompt(component.shadowRoot));

    nameEditable.focus();
    nameEditable.innerText = '*';
    dispatchInputEvent(nameEditable, {inputType: 'insertText', data: '*', bubbles: true, composed: true});
    await coordinator.done();
    assert.instanceOf(row.querySelector('devtools-icon.disallowed-characters'), HTMLElement);
    assert.isTrue(hasReloadPrompt(component.shadowRoot));

    dispatchKeyDownEvent(nameEditable, {key: 'Escape', bubbles: true, composed: true});
    await coordinator.done();
    assert.strictEqual(row.querySelector('devtools-icon.disallowed-characters'), null);
    assert.isTrue(hasReloadPrompt(component.shadowRoot));
  });

  it('split header name and value on pasted content', async () => {
    const originalHeaderName = Platform.StringUtilities.toLowerCaseString('some-header-name');
    const originalHeaderValue = 'someHeaderValue';
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: originalHeaderName,
      value: originalHeaderValue,
      nameEditable: true,
      valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.ENABLED,
    };
    const editedHeaderName = 'permissions-Policy: unload=(https://xyz.com)';

    const {component, nameEditable, valueEditable} = await renderHeaderSectionRow(headerData);
    assert.isNotNull(component.shadowRoot);
    assert.instanceOf(nameEditable, HTMLElement);
    assert.instanceOf(valueEditable, HTMLElement);

    let headerValueFromEvent = '';
    let headerNameFromEvent = '';
    let headerEditedEventCount = 0;

    component.addEventListener('headeredited', event => {
      headerValueFromEvent = event.headerValue;
      headerNameFromEvent = event.headerName;
      headerEditedEventCount++;
    });

    const dt = new DataTransfer();
    dt.setData('text/plain', editedHeaderName);

    // update name on blur
    nameEditable.focus();
    dispatchPasteEvent(nameEditable, {clipboardData: dt, bubbles: true, composed: true});
    nameEditable.blur();

    await coordinator.done();
    assert.strictEqual(headerEditedEventCount, 1);
    assert.strictEqual(headerNameFromEvent, 'permissions-policy');
    assert.strictEqual(headerValueFromEvent, 'someHeaderValue');

    // update value on blur
    valueEditable.blur();
    await coordinator.done();
    assert.strictEqual(headerEditedEventCount, 2);
    assert.strictEqual(headerNameFromEvent, 'permissions-policy');
    assert.strictEqual(headerValueFromEvent, 'unload=(https://xyz.com)');

    // final value on UI
    const nameEl = component.shadowRoot.querySelector('.header-name devtools-editable-span') as EditableSpan;
    const valueEl = component.shadowRoot.querySelector('.header-value devtools-editable-span') as EditableSpan;

    assert.strictEqual(nameEl.value, 'Permissions-Policy');
    assert.strictEqual(valueEl.value, 'unload=(https://xyz.com)');
  });

  it('set and revert pasted header name on escape', async () => {
    const originalHeaderName = Platform.StringUtilities.toLowerCaseString('some-header-name');
    const originalHeaderValue = 'someHeaderValue';
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: originalHeaderName,
      value: originalHeaderValue,
      nameEditable: true,
      valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.ENABLED,
    };
    const editedHeaderName = ':abc';

    const {component, nameEditable, valueEditable} = await renderHeaderSectionRow(headerData);
    assert.isNotNull(component.shadowRoot);
    assert.instanceOf(nameEditable, HTMLElement);
    assert.instanceOf(valueEditable, HTMLElement);

    let headerEditedEventCount = 0;

    component.addEventListener('headeredited', () => {
      headerEditedEventCount++;
    });

    const dt = new DataTransfer();
    dt.setData('text/plain', editedHeaderName);

    nameEditable.focus();
    dispatchPasteEvent(nameEditable, {clipboardData: dt, bubbles: true, composed: true});

    const nameEl = component.shadowRoot.querySelector('.header-name devtools-editable-span') as EditableSpan;
    const valueEl = component.shadowRoot.querySelector('.header-value devtools-editable-span') as EditableSpan;

    await coordinator.done();
    assert.strictEqual(nameEl.value, ':Abc');
    assert.strictEqual(valueEl.value, originalHeaderValue);

    dispatchKeyDownEvent(nameEditable, {key: 'Escape', bubbles: true, composed: true});

    await coordinator.done();
    assert.strictEqual(headerEditedEventCount, 0);
    assert.strictEqual(nameEl.value, 'Some-Header-Name');
  });

  it('revert pasted header name and value on escape', async () => {
    const originalHeaderName = Platform.StringUtilities.toLowerCaseString('some-header-name');
    const originalHeaderValue = 'someHeaderValue';
    const headerData: NetworkComponents.HeaderSectionRow.HeaderDescriptor = {
      name: originalHeaderName,
      value: originalHeaderValue,
      nameEditable: true,
      valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.ENABLED,
    };
    const editedHeaderName = 'permissions-Policy: unload=(https://xyz.com)';

    const {component, nameEditable, valueEditable} = await renderHeaderSectionRow(headerData);
    assert.isNotNull(component.shadowRoot);
    assert.instanceOf(nameEditable, HTMLElement);
    assert.instanceOf(valueEditable, HTMLElement);

    let headerEditedEventCount = 0;

    component.addEventListener('headeredited', () => {
      headerEditedEventCount++;
    });

    const dt = new DataTransfer();
    dt.setData('text/plain', editedHeaderName);

    nameEditable.focus();
    dispatchPasteEvent(nameEditable, {clipboardData: dt, bubbles: true, composed: true});

    const nameEl = component.shadowRoot.querySelector('.header-name devtools-editable-span') as EditableSpan;
    const valueEl = component.shadowRoot.querySelector('.header-value devtools-editable-span') as EditableSpan;

    await coordinator.done();
    assert.strictEqual(nameEl.value, 'Permissions-Policy');
    assert.strictEqual(valueEl.value, 'unload=(https://xyz.com)');

    dispatchKeyDownEvent(valueEditable, {key: 'Escape', bubbles: true, composed: true});

    await coordinator.done();
    assert.strictEqual(headerEditedEventCount, 0);
    assert.strictEqual(nameEl.value, 'Some-Header-Name');
    assert.strictEqual(valueEl.value, 'someHeaderValue');
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
      valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.ENABLED,
    };

    const {component} = await renderHeaderSectionRow(headerData);
    assert.isNotNull(component.shadowRoot);

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
      valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.ENABLED,
    };
    const editedHeaderName = ' new-header-name ';
    const editedHeaderValue = ' new value for header ';

    const {component, nameEditable, valueEditable} = await renderHeaderSectionRow(headerData);
    assert.isNotNull(component.shadowRoot);

    let headerValueFromEvent = '';
    let headerNameFromEvent = '';
    let headerEditedEventCount = 0;
    component.addEventListener('headeredited', event => {
      headerEditedEventCount++;
      headerValueFromEvent = event.headerValue;
      headerNameFromEvent = event.headerName;
    });

    assert.instanceOf(nameEditable, HTMLElement);
    nameEditable.focus();
    nameEditable.innerText = editedHeaderName;
    nameEditable.blur();

    assert.strictEqual(headerEditedEventCount, 1);
    assert.strictEqual(headerNameFromEvent, editedHeaderName.trim());
    assert.strictEqual(headerValueFromEvent, originalHeaderValue);

    assert.instanceOf(valueEditable, HTMLElement);
    valueEditable.focus();
    valueEditable.innerText = editedHeaderValue;
    valueEditable.blur();

    assert.strictEqual(headerEditedEventCount, 2);
    assert.strictEqual(headerNameFromEvent, editedHeaderName.trim());
    assert.strictEqual(headerValueFromEvent, editedHeaderValue.trim());
  });
});
