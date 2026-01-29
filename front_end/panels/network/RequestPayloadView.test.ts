// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import {render} from '../../ui/lit/lit.js';

import * as Network from './network.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('RequestPayloadView', () => {
  it('decodes headers', async () => {
    const encoded = 'Test+%21%40%23%24%25%5E%26*%28%29_%2B+parameters.';
    const parameterElement = document.createDocumentFragment();
    render(Network.RequestPayloadView.RequestPayloadView.formatParameter(encoded, '', true), parameterElement);
    assert.strictEqual(parameterElement.textContent?.trim(), 'Test !@#$%^&*()_+ parameters.');
  });

  it('does not decode headers if decodeParameters is false', async () => {
    const encoded = 'Test+%21%40%23%24%25%5E%26*%28%29_%2B+parameters.';
    const parameterElement = document.createDocumentFragment();
    render(Network.RequestPayloadView.RequestPayloadView.formatParameter(encoded, '', false), parameterElement);
    assert.strictEqual(parameterElement.textContent?.trim(), encoded);
  });

  it('adds the class name to the element', async () => {
    const parameterElement = document.createDocumentFragment();
    render(Network.RequestPayloadView.RequestPayloadView.formatParameter('test', 'test-class', true), parameterElement);
    const div = parameterElement.firstElementChild;
    assert.isNotNull(div);
    assert.isTrue(div?.classList.contains('test-class'));
  });

  it('adds the empty-value class when value is empty', async () => {
    const parameterElement = document.createDocumentFragment();
    render(Network.RequestPayloadView.RequestPayloadView.formatParameter('', '', true), parameterElement);
    const div = parameterElement.firstElementChild;
    assert.isNotNull(div);
    assert.isTrue(div?.classList.contains('empty-value'));
  });

  it('shows error message when decoding fails', async () => {
    const invalidEncoded = '%E0%A4%A';  // Invalid URI sequence
    const parameterElement = document.createDocumentFragment();
    render(Network.RequestPayloadView.RequestPayloadView.formatParameter(invalidEncoded, '', true), parameterElement);
    const errorSpan = parameterElement.querySelector('.payload-decode-error');
    assert.isNotNull(errorSpan);
    assert.strictEqual(errorSpan?.textContent, '(unable to decode value)');
  });

  it('displays query string parameters', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/api?foo=bar&baz=qux`, urlString``,
        null, null, null);
    const view = new Network.RequestPayloadView.RequestPayloadView(request);
    renderElementIntoDOM(view);
    view.wasShown();

    await assertScreenshot('network/request-payload-query-params.png');
  });

  it('displays form data parameters', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/api`, urlString``, null, null, null);
    request.setRequestHeaders([{name: 'Content-Type', value: 'application/x-www-form-urlencoded'}]);
    // Mock requestFormData to return URL-encoded form data.
    sinon.stub(request, 'requestFormData').resolves('foo=bar&baz=qux');

    const view = new Network.RequestPayloadView.RequestPayloadView(request);
    renderElementIntoDOM(view);
    view.wasShown();

    // TODO(crbug.com/407751697) Replace with updateComplete.
    await new Promise(resolve => setTimeout(resolve, 0));
    await assertScreenshot('network/request-payload-data-params.png');
  });

  it('toggles URL decoding', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/api?foo=bar%20baz`, urlString``, null,
        null, null);
    const view = new Network.RequestPayloadView.RequestPayloadView(request);
    renderElementIntoDOM(view);
    view.wasShown();

    const treeOutline = view.element.querySelector<HTMLElement>('.request-payload-tree');
    assert.isNotNull(treeOutline);
    const shadowRoot = treeOutline.shadowRoot;
    assert.isNotNull(shadowRoot);

    const getPayloadValues = () => {
      return Array.from(shadowRoot.querySelectorAll('.payload-value')).map(el => el.textContent).join(' ');
    };

    // Initial state: Decoded
    assert.include(getPayloadValues(), 'bar baz');

    const toggleButton = shadowRoot.querySelectorAll<HTMLElement>('.payload-toggle').item(1);
    assert.exists(toggleButton);
    toggleButton.click();

    // Take the screenshot before checking contents, this forces the widget to render.
    await assertScreenshot('network/request-payload-url-decoding.png');

    // Toggled state: Encoded
    assert.include(getPayloadValues(), 'bar%20baz');
  });

  it('toggles between parsed and source view', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/api?foo=bar`, urlString``, null, null,
        null);
    const view = new Network.RequestPayloadView.RequestPayloadView(request);
    renderElementIntoDOM(view);
    view.wasShown();

    const treeOutline = view.element.querySelector<HTMLElement>('.request-payload-tree');
    const shadowRoot = treeOutline?.shadowRoot;
    assert.exists(shadowRoot);

    const getTextContent = () => {
      const names = Array.from(shadowRoot.querySelectorAll('.payload-name')).map(el => el.textContent);
      const values = Array.from(shadowRoot.querySelectorAll('.payload-value')).map(el => el.textContent);
      return [...names, ...values].join(' ');
    };

    // Initial state: Parsed (foo: bar)
    const initialText = getTextContent();
    assert.include(initialText, 'foo');
    assert.include(initialText, 'bar');

    // Find "View source" button.
    const buttons = shadowRoot.querySelectorAll<HTMLElement>('.payload-toggle');
    const viewSourceButton = Array.from(buttons).find(b => b.textContent?.includes('View source'));
    assert.exists(viewSourceButton);

    viewSourceButton.click();
    await assertScreenshot('network/request-payload-url-source-view.png');

    // Source state: "foo=bar"
    const sourceText = getTextContent();
    assert.include(sourceText, 'foo=bar');

    // Toggle back
    const viewParsedButton = Array.from(shadowRoot.querySelectorAll<HTMLElement>('.payload-toggle'))
                                 .find(b => b.textContent?.includes('View parsed'));
    assert.exists(viewParsedButton);
    viewParsedButton.click();

    const finalText = getTextContent();
    assert.include(finalText, 'foo');
    assert.include(finalText, 'bar');
  });

  it('truncates long source text and in a ShowMore widget', async () => {
    const text = 'A'.repeat(3010);
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/api?foo=${text}`, urlString``, null,
        null, null);
    const view = new Network.RequestPayloadView.RequestPayloadView(request);
    renderElementIntoDOM(view);
    view.wasShown();

    const treeOutline = view.element.querySelector<HTMLElement>('.request-payload-tree');
    assert.exists(treeOutline);
    const shadowRoot = treeOutline?.shadowRoot;
    assert.exists(shadowRoot);

    // Switch to View Source
    const buttons = shadowRoot.querySelectorAll<HTMLElement>('.payload-toggle');
    const viewSourceButton = Array.from(buttons).find(b => b.textContent?.includes('View source'));
    assert.exists(viewSourceButton);
    viewSourceButton.click();

    const payloadValue = shadowRoot.querySelector('.payload-value');
    assert.exists(payloadValue);
    const payloadValueWidget = UI.Widget.Widget.get(payloadValue);
    assert.instanceOf(payloadValueWidget, Network.ShowMoreDetailsWidget.ShowMoreDetailsWidget);
    assert.strictEqual(payloadValueWidget.text, `foo=${text}`);
    await assertScreenshot('network/request-payload-show-more.png');
  });

  it('displays JSON payload and toggles between parsed and source view', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/api`, urlString``, null, null, null);
    request.setRequestHeaders([{name: 'Content-Type', value: 'application/json'}]);
    sinon.stub(request, 'requestFormData').resolves('{"foo": "bar"}');

    const view = new Network.RequestPayloadView.RequestPayloadView(request);
    renderElementIntoDOM(view);
    view.wasShown();

    // TODO(crbug.com/407751697) Replace with updateComplete.
    await new Promise(resolve => setTimeout(resolve, 0));

    const treeOutline = view.element.querySelector<HTMLElement>('.request-payload-tree');
    assert.exists(treeOutline);
    const shadowRoot = treeOutline.shadowRoot;
    assert.exists(shadowRoot);

    const getButton = (text: string) => {
      const buttons = shadowRoot.querySelectorAll<HTMLElement>('.payload-toggle');
      return Array.from(buttons).find(b => b.textContent?.includes(text));
    };

    // Initial state: Parsed.
    // Check that "View source" button exists
    const viewSourceButton = getButton('View source');
    assert.exists(viewSourceButton);
    await assertScreenshot('network/request-payload-json.png');

    // Toggle to source
    viewSourceButton?.click();

    // Check for source text
    const payloadValue = shadowRoot.querySelector('.payload-value');
    assert.exists(payloadValue);
    const payloadValueWidget = UI.Widget.Widget.get(payloadValue);
    assert.instanceOf(payloadValueWidget, Network.ShowMoreDetailsWidget.ShowMoreDetailsWidget);
    assert.strictEqual(payloadValueWidget.text, '{"foo": "bar"}');

    // Check that "View parsed" button exists
    const viewParsedButton = getButton('View parsed');
    assert.exists(viewParsedButton);
    await assertScreenshot('network/request-payload-json-source.png');

    // Click "View parsed"
    viewParsedButton?.click();

    // Check that "View source" button exists again
    assert.exists(getButton('View source'));
    // And check that source text is gone
    assert.isNull(shadowRoot.querySelector('.payload-value'));
  });
});
