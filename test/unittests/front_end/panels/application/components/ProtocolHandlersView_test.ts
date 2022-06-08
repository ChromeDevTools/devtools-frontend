// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ApplicationComponents from '../../../../../../front_end/panels/application/components/components.js';
import type * as Platform from '../../../../../../front_end/core/platform/platform.js';
import {
  assertElement,
  assertShadowRoot,
  getCleanTextContentFromElements,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

async function renderProtocolHandlersComponent(
    manifestLink: Platform.DevToolsPath.UrlString,
    protocolHandlers: ApplicationComponents.ProtocolHandlersView.ProtocolHandler[]) {
  const component = new ApplicationComponents.ProtocolHandlersView.ProtocolHandlersView();
  renderElementIntoDOM(component);
  component.data = {manifestLink, protocolHandlers};
  return component;
}

describeWithEnvironment('ProtocolHandlersView', () => {
  it('renders view when protocols are detected', async () => {
    const protocols = [
      {
        'protocol': 'web+coffee',
        'url': './?coffee=%s',
      },
      {
        'protocol': 'web+pwinter',
        'url': 'index.html?colors=%s',
      },
      {
        'invalid-protocol': 'this is an invalid protocol entry for testing purposes',
      },
    ];
    const manifestURL = 'https://www.example.com/index.html/manifest-protocol.json' as Platform.DevToolsPath.UrlString;
    const component = await renderProtocolHandlersComponent(
        manifestURL, protocols as ApplicationComponents.ProtocolHandlersView.ProtocolHandler[]);
    assertShadowRoot(component.shadowRoot);

    const statusElement = component.shadowRoot.querySelector('.protocol-handlers-row.status');
    assertElement(statusElement, HTMLElement);

    // Tests if status message for when protocols are detected in the manifest is rendering
    const protocolsDetectedMessage = getCleanTextContentFromElements(statusElement, 'span');
    const expectedStatusMessage =
        'Found valid protocol handler registration in the manifest. With the app installed, test the registered protocols.';
    assert.deepEqual(protocolsDetectedMessage[0], expectedStatusMessage);

    // Tests if protocols are rendering properly in dropdown
    const selectElement = getElementWithinComponent(component, '.protocol-select', HTMLSelectElement);
    const values = getCleanTextContentFromElements(selectElement, 'option');
    assert.deepEqual(values, ['web+coffee://', 'web+pwinter://']);
  });

  it('renders protocols not detected status message', async () => {
    const protocols: ApplicationComponents.ProtocolHandlersView.ProtocolHandler[] = [];
    const manifestURL = 'https://www.example.com/index.html/manifest-protocol.json' as Platform.DevToolsPath.UrlString;
    const component = await renderProtocolHandlersComponent(
        manifestURL, protocols as ApplicationComponents.ProtocolHandlersView.ProtocolHandler[]);
    assertShadowRoot(component.shadowRoot);

    const noStatusElement = component.shadowRoot.querySelector('.protocol-handlers-row.status');
    assertElement(noStatusElement, HTMLElement);

    const protocolsNotDetectedMessage = getCleanTextContentFromElements(noStatusElement, 'span');
    const expectedStatusMessage =
        'Define protocol handlers in the manifest to register your app as a handler for custom protocols when your app is installed.';
    assert.deepEqual(protocolsNotDetectedMessage[0], expectedStatusMessage);
  });
});
