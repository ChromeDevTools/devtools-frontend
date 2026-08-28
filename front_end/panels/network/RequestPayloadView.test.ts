// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import type * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
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
    const view = new Network.RequestPayloadView.RequestPayloadView();
    view.request = request;
    renderElementIntoDOM(view, {includeCommonStyles: true});
    view.wasShown();

    await assertScreenshot('network/request-payload-query-params.png');
  });

  it('displays form data parameters', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/api`, urlString``, null, null, null);
    request.setRequestHeaders([{name: 'Content-Type', value: 'application/x-www-form-urlencoded'}]);
    // Mock requestFormData to return URL-encoded form data.
    sinon.stub(request, 'requestFormData').resolves('foo=bar&baz=qux');

    const view = new Network.RequestPayloadView.RequestPayloadView();
    view.request = request;
    renderElementIntoDOM(view, {includeCommonStyles: true});
    view.wasShown();

    await view.updateComplete;
    await assertScreenshot('network/request-payload-data-params.png');
  });

  it('toggles URL decoding', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/api?foo=bar%20baz`, urlString``, null,
        null, null);
    const view = new Network.RequestPayloadView.RequestPayloadView();
    view.request = request;
    renderElementIntoDOM(view, {includeCommonStyles: true});
    view.wasShown();

    await view.updateComplete;

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
    await view.updateComplete;

    // Take the screenshot before checking contents, this forces the widget to render.
    await assertScreenshot('network/request-payload-url-decoding.png');

    // Toggled state: Encoded
    assert.include(getPayloadValues(), 'bar%20baz');
  });

  it('toggles between parsed and source view', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/api?foo=bar`, urlString``, null, null,
        null);
    const view = new Network.RequestPayloadView.RequestPayloadView();
    view.request = request;
    renderElementIntoDOM(view, {includeCommonStyles: true});
    view.wasShown();

    await view.updateComplete;

    const treeOutline = view.element.querySelector<HTMLElement>('.request-payload-tree');
    const shadowRoot = treeOutline?.shadowRoot;
    assert.exists(shadowRoot);

    const getTextContent = () => {
      const names = Array.from(shadowRoot.querySelectorAll('.payload-name')).map(el => el.textContent);
      const values = Array.from(shadowRoot.querySelectorAll('.payload-value')).map(el => el.textContent);
      const widgets = Array.from(shadowRoot.querySelectorAll('devtools-widget')).map(el => el.textContent);
      return [...names, ...values, ...widgets].join(' ');
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
    await view.updateComplete;
    await assertScreenshot('network/request-payload-url-source-view.png');

    // Source state: "foo=bar"
    const sourceText = getTextContent();
    assert.include(sourceText, 'foo=bar');

    // Toggle back
    const viewParsedButton = Array.from(shadowRoot.querySelectorAll<HTMLElement>('.payload-toggle'))
                                 .find(b => b.textContent?.includes('View parsed'));
    assert.exists(viewParsedButton);
    viewParsedButton.click();
    await view.updateComplete;

    const finalText = getTextContent();
    assert.include(finalText, 'foo');
    assert.include(finalText, 'bar');
  });

  it('truncates long source text and in a ShowMore widget', async () => {
    const text = 'A'.repeat(3010);
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/api?foo=${text}`, urlString``, null,
        null, null);
    const view = new Network.RequestPayloadView.RequestPayloadView();
    view.request = request;
    renderElementIntoDOM(view, {includeCommonStyles: true});
    view.wasShown();

    await view.updateComplete;

    const treeOutline = view.element.querySelector<HTMLElement>('.request-payload-tree');
    assert.exists(treeOutline);
    const shadowRoot = treeOutline?.shadowRoot;
    assert.exists(shadowRoot);

    // Switch to View Source
    const buttons = shadowRoot.querySelectorAll<HTMLElement>('.payload-toggle');
    const viewSourceButton = Array.from(buttons).find(b => b.textContent?.includes('View source'));
    assert.exists(viewSourceButton);
    viewSourceButton.click();
    await view.updateComplete;

    const payloadValue = shadowRoot.querySelector('devtools-widget');
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

    const view = new Network.RequestPayloadView.RequestPayloadView();
    view.request = request;
    renderElementIntoDOM(view, {includeCommonStyles: true});
    view.wasShown();

    await view.updateComplete;

    const treeOutline = view.element.querySelector<HTMLElement>('.request-payload-tree');
    assert.exists(treeOutline);
    const shadowRoot = treeOutline.shadowRoot;
    assert.exists(shadowRoot);

    const getButton = (text: string) => {
      const buttons = shadowRoot.querySelectorAll<HTMLElement>('li:not(.hidden) .payload-toggle');
      return Array.from(buttons).find(b => b.textContent?.includes(text));
    };

    // Initial state: Parsed.
    // Check that "View source" button exists
    const viewSourceButton = getButton('View source');
    assert.exists(viewSourceButton);
    await assertScreenshot('network/request-payload-json.png');

    // Toggle to source
    viewSourceButton?.click();
    await view.updateComplete;

    // Check for source text
    const payloadValue = shadowRoot.querySelector('devtools-widget');
    assert.exists(payloadValue);
    const payloadValueWidget = UI.Widget.Widget.get(payloadValue);
    assert.instanceOf(payloadValueWidget, Network.ShowMoreDetailsWidget.ShowMoreDetailsWidget);

    // Check that "View parsed" button exists
    const viewParsedButton = getButton('View parsed');
    assert.exists(viewParsedButton);
    await assertScreenshot('network/request-payload-json-source.png');

    // Click "View parsed"
    viewParsedButton?.click();
    await view.updateComplete;

    // Check that "View source" button exists again
    assert.exists(getButton('View source'));
    // And check that source text is gone
    assert.isNull(shadowRoot.querySelector('.payload-value'));
  });

  it('renders read-only object properties for payload', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/api`, urlString``, null, null, null);
    request.setRequestHeaders([{name: 'Content-Type', value: 'application/json'}]);
    sinon.stub(request, 'requestFormData').resolves('{"foo": "bar"}');

    const populateSpy =
        sinon.spy(ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement, 'populateChildrenIfNeeded');

    const view = new Network.RequestPayloadView.RequestPayloadView();
    view.request = request;
    renderElementIntoDOM(view, {includeCommonStyles: true});
    view.wasShown();

    await view.updateComplete;

    // Object properties are rendered asynchronously.
    await populateSpy.returnValues[0];
    await raf();
    await UI.Widget.Widget.allUpdatesComplete;

    const treeOutline = view.element.querySelector<HTMLElement>('.request-payload-tree');
    assert.exists(treeOutline);
    const shadowRoot = treeOutline.shadowRoot;
    assert.exists(shadowRoot);

    const firstChildNode = shadowRoot.querySelector('li.object-properties-section');
    assert.exists(firstChildNode);
    const rootElement = UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(firstChildNode);
    assert.exists(rootElement);
    const firstProperty = rootElement.childAt(0);
    assert.instanceOf(firstProperty, ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement);
    assert.isFalse(firstProperty.editable);
  });

  it('calls onPayloadContextMenu and onPayloadToggle from DEFAULT_VIEW', async () => {
    const object = new SDK.RemoteObject.LocalJSONObject({foo: 'bar'});
    const objectTree = new ObjectUI.ObjectPropertiesSection.ObjectTree(object, {
      readOnly: true,
      propertiesMode: ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED,
    });
    objectTree.expanded = true;

    const onPayloadContextMenu = sinon.spy();
    const onPayloadToggle = sinon.spy();

    const container = document.createElement('div');
    renderElementIntoDOM(container);

    const input: Network.RequestPayloadView.ViewInput = {
      decodeQueryParameters: true,
      setDecodeQueryParameters: sinon.spy(),
      decodeFormParameters: true,
      setDecodeFormParameters: sinon.spy(),
      viewQueryParamSource: false,
      setViewQueryParamSource: sinon.spy(),
      viewFormParamSource: false,
      setViewFormParamSource: sinon.spy(),
      viewJSONPayloadSource: false,
      setViewJSONPayloadSource: sinon.spy(),
      copyValue: sinon.spy(),
      formData: '{"foo": "bar"}',
      formParameters: undefined,
      queryString: null,
      queryParameters: null,
      objectTree,
      onPayloadContextMenu,
      onPayloadToggle,
      binaryPayloadContentData: null,
      requestUrl: urlString`https://example.com/api`,
    };

    Network.RequestPayloadView.DEFAULT_VIEW(input, {}, container);
    await UI.Widget.Widget.allUpdatesComplete;

    const treeOutline = container.querySelector<HTMLElement>('.request-payload-tree');
    assert.exists(treeOutline);
    const shadowRoot = treeOutline.shadowRoot;
    assert.exists(shadowRoot);

    const rootElement = shadowRoot.querySelector<HTMLElement>('li.object-properties-section-root-element');
    assert.exists(rootElement);

    const showStub = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
    rootElement.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, cancelable: true}));

    sinon.assert.calledOnce(onPayloadContextMenu);
    assert.instanceOf(onPayloadContextMenu.firstCall.args[0], UI.ContextMenu.ContextMenu);
    sinon.assert.calledOnce(showStub);

    rootElement.dispatchEvent(new UI.TreeOutline.TreeViewElement.ExpandEvent({expanded: false}));
    sinon.assert.calledWith(onPayloadToggle, false);
  });

  it('handles payload context menu operations in presenter', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/api`, urlString``, null, null, null);
    request.setRequestHeaders([{name: 'Content-Type', value: 'application/json'}]);
    sinon.stub(request, 'requestFormData').resolves('{"outer": {"inner": "val"}}');
    sinon.stub(request, 'formParameters').resolves(null);

    const viewStub = createViewFunctionStub(Network.RequestPayloadView.RequestPayloadView);
    const view = new Network.RequestPayloadView.RequestPayloadView(undefined, viewStub);
    view.request = request;
    renderElementIntoDOM(view);
    view.wasShown();

    const input = await viewStub.nextInput;
    assert.exists(input.objectTree);
    const objectTree = input.objectTree;
    await objectTree.populateChildrenIfNeeded();

    const contextMenu = new UI.ContextMenu.ContextMenu(new MouseEvent('contextmenu'));
    const appendItemSpy = sinon.spy(UI.ContextMenu.Section.prototype, 'appendItem');
    const appendCheckboxItemSpy = sinon.spy(UI.ContextMenu.Section.prototype, 'appendCheckboxItem');

    input.onPayloadContextMenu(contextMenu);

    const copyValueItem = appendItemSpy.args.find(args => args[0] === 'Copy value');
    assert.exists(copyValueItem);

    // Test "Expand recursively"
    const expandRecursivelyItem = appendItemSpy.args.find(args => args[0] === 'Expand recursively');
    assert.exists(expandRecursivelyItem);
    const expandHandler = expandRecursivelyItem[1];
    assert.isFunction(expandHandler);

    await (expandHandler as () => Promise<void>)();
    await view.updateComplete;

    assert.isTrue(objectTree.expanded);
    assert.exists(objectTree.children?.properties);
    assert.isTrue(objectTree.children.properties[0].expanded);

    // Test "Collapse children"
    const collapseChildrenItem = appendItemSpy.args.find(args => args[0] === 'Collapse children');
    assert.exists(collapseChildrenItem);
    const collapseHandler = collapseChildrenItem[1];
    assert.isFunction(collapseHandler);

    collapseHandler();
    await view.updateComplete;

    assert.isFalse(objectTree.expanded);
    assert.exists(objectTree.children?.properties);
    assert.isFalse(objectTree.children.properties[0].expanded);

    // Test "Sort properties alphabetically"
    const sortPropertiesItem = appendCheckboxItemSpy.args.find(args => args[0] === 'Sort properties alphabetically');
    assert.exists(sortPropertiesItem);
    const sortHandler = sortPropertiesItem[1];
    assert.isFunction(sortHandler);

    const initialSort = objectTree.sortPropertiesAlphabetically;
    sortHandler();
    await view.updateComplete;
    assert.strictEqual(objectTree.sortPropertiesAlphabetically, !initialSort);

    // Test "Show all"
    const showAllItem = appendCheckboxItemSpy.args.find(args => args[0] === 'Show all');
    assert.exists(showAllItem);
    const showAllHandler = showAllItem[1];
    assert.isFunction(showAllHandler);

    const initialShowAll = objectTree.includeNullOrUndefinedValues;
    showAllHandler();
    await view.updateComplete;
    assert.strictEqual(objectTree.includeNullOrUndefinedValues, !initialShowAll);

    // Test onPayloadToggle
    input.onPayloadToggle(true);
    assert.isTrue(objectTree.expanded);
    input.onPayloadToggle(false);
    assert.isFalse(objectTree.expanded);
  });

  it('sets binaryPayloadContentData for base64-encoded request bodies', async () => {
    const base64Data = 'SGVsbG8gV29ybGQ=';  // "Hello World" in base64
    const binaryContentData =
        new TextUtils.ContentData.ContentData(base64Data, /* isBase64= */ true, 'application/octet-stream');

    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/api`, urlString``, null, null, null);
    request.setRequestHeaders([
      {name: 'Content-Type', value: 'application/octet-stream'},
      {name: 'Content-Encoding', value: 'gzip'},
    ]);

    sinon.stub(request, 'requestFormData').resolves(base64Data);
    sinon.stub(request, 'formParameters').resolves(null);
    sinon.stub(request, 'requestFormDataContentData').resolves(binaryContentData);

    const viewStub = createViewFunctionStub(Network.RequestPayloadView.RequestPayloadView);
    const view = new Network.RequestPayloadView.RequestPayloadView(undefined, viewStub);
    view.request = request;
    renderElementIntoDOM(view);
    view.wasShown();

    const input = await viewStub.nextInput;
    assert.exists(input.binaryPayloadContentData,
                  'binaryPayloadContentData should be set for base64-encoded request bodies');
    assert.isTrue(input.binaryPayloadContentData.createdFromBase64, 'ContentData should be created from base64');
    assert.strictEqual(input.binaryPayloadContentData.base64, base64Data,
                       'ContentData base64 should match the original encoded data');
    assert.strictEqual(input.requestUrl, 'https://example.com/api');
  });

  it('does not set binaryPayloadContentData for text request bodies', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/api`, urlString``, null, null, null);
    request.setRequestHeaders([{name: 'Content-Type', value: 'application/json'}]);

    const textContentData =
        new TextUtils.ContentData.ContentData('{"foo": "bar"}', /* isBase64= */ false, 'application/json');
    sinon.stub(request, 'requestFormData').resolves('{"foo": "bar"}');
    sinon.stub(request, 'formParameters').resolves(null);
    sinon.stub(request, 'requestFormDataContentData').resolves(textContentData);

    const viewStub = createViewFunctionStub(Network.RequestPayloadView.RequestPayloadView);
    const view = new Network.RequestPayloadView.RequestPayloadView(undefined, viewStub);
    view.request = request;
    renderElementIntoDOM(view);
    view.wasShown();

    const input = await viewStub.nextInput;
    assert.isNull(input.binaryPayloadContentData, 'binaryPayloadContentData should be null for text request bodies');
  });

  it('decodes query string parameters by default even for POST requests with JSON body', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create('requestId' as Protocol.Network.RequestId,
                                                             urlString`https://example.com/api?foo=bar%20baz`,
                                                             urlString``, null, null, null);
    request.setRequestHeaders([{name: 'Content-Type', value: 'application/json'}]);
    sinon.stub(request, 'requestFormData').resolves('{"jsonKey": "jsonVal"}');

    const view = new Network.RequestPayloadView.RequestPayloadView();
    view.request = request;
    renderElementIntoDOM(view, {includeCommonStyles: true});
    view.wasShown();

    await view.updateComplete;

    const treeOutline = view.element.querySelector<HTMLElement>('.request-payload-tree');
    assert.isNotNull(treeOutline);
    const shadowRoot = treeOutline.shadowRoot;
    assert.isNotNull(shadowRoot);

    const getPayloadValues = () => {
      return Array.from(shadowRoot.querySelectorAll('.payload-value')).map(el => el.textContent).join(' ');
    };

    assert.include(getPayloadValues(), 'bar baz');
  });

  it('toggles query parameters and form data independently', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create('requestId' as Protocol.Network.RequestId,
                                                             urlString`https://example.com/api?qFoo=qBar%20qBaz`,
                                                             urlString``, null, null, null);
    request.setRequestHeaders([{name: 'Content-Type', value: 'application/x-www-form-urlencoded'}]);
    sinon.stub(request, 'requestFormData').resolves('fFoo=fBar%20fBaz');

    const view = new Network.RequestPayloadView.RequestPayloadView();
    view.request = request;
    renderElementIntoDOM(view, {includeCommonStyles: true});
    view.wasShown();

    await view.refreshFormDataPromiseForTest;
    await view.updateComplete;

    const treeOutline = view.element.querySelector<HTMLElement>('.request-payload-tree');
    assert.isNotNull(treeOutline);
    const shadowRoot = treeOutline.shadowRoot;
    assert.isNotNull(shadowRoot);

    const getPayloadValues = () => {
      return Array.from(shadowRoot.querySelectorAll('.payload-value')).map(el => el.textContent).join(' ');
    };

    const getButton = (sectionTitle: string, buttonText: string) => {
      const lis = shadowRoot.querySelectorAll('li[role="treeitem"]');
      const section = Array.from(lis).find(li => li.textContent?.includes(sectionTitle));
      if (!section) {
        return null;
      }
      const buttons = section.querySelectorAll<HTMLElement>('.payload-toggle');
      return Array.from(buttons).find(b => b.textContent?.includes(buttonText));
    };

    // Initial state: Both decoded
    assert.include(getPayloadValues(), 'qBar qBaz');
    assert.include(getPayloadValues(), 'fBar fBaz');

    // Find the toggle buttons.
    const getToggles = () => shadowRoot.querySelectorAll<HTMLElement>('.payload-toggle');
    assert.lengthOf(getToggles(), 5);

    // Toggle query parameters decoding (decoded -> encoded)
    const viewUrlEncodedQueryBtn = getButton('Query string parameters', 'View URL-encoded');
    assert.exists(viewUrlEncodedQueryBtn);
    viewUrlEncodedQueryBtn?.click();
    await view.updateComplete;

    // Query param should be encoded, form data should remain decoded
    assert.include(getPayloadValues(), 'qBar%20qBaz');
    assert.include(getPayloadValues(), 'fBar fBaz');

    // Toggle query parameters back (encoded -> decoded)
    const viewDecodedQueryBtn = getButton('Query string parameters', 'View decoded');
    assert.exists(viewDecodedQueryBtn);
    viewDecodedQueryBtn?.click();
    await view.updateComplete;
    assert.include(getPayloadValues(), 'qBar qBaz');

    // Toggle form data decoding (decoded -> encoded)
    const viewUrlEncodedFormBtn = getButton('Form data', 'View URL-encoded');
    assert.exists(viewUrlEncodedFormBtn);
    viewUrlEncodedFormBtn?.click();
    await view.updateComplete;

    // Form data should be encoded, query param should remain decoded
    assert.include(getPayloadValues(), 'qBar qBaz');
    assert.include(getPayloadValues(), 'fBar%20fBaz');
  });

  it('toggles section expansion on click', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create('requestId' as Protocol.Network.RequestId,
                                                             urlString`https://example.com/api?foo=bar`, urlString``,
                                                             null, null, null);
    const view = new Network.RequestPayloadView.RequestPayloadView();
    view.request = request;
    renderElementIntoDOM(view, {includeCommonStyles: true});
    view.wasShown();

    await view.updateComplete;

    const tree = view.element.querySelector('devtools-tree');
    assert.exists(tree);
    const treeOutline = tree.getInternalTreeOutlineForTest();
    const sectionElement = treeOutline.rootElement().childAt(0);
    assert.exists(sectionElement);
    assert.isTrue(sectionElement.toggleOnClick);
    assert.isTrue(sectionElement.expanded);

    // Click on the row (not on the disclosure triangle).
    sectionElement.listItemElement.dispatchEvent(
        new MouseEvent('click', {bubbles: true, cancelable: true, clientX: 100}));
    assert.isFalse(sectionElement.expanded);

    sectionElement.listItemElement.dispatchEvent(
        new MouseEvent('click', {bubbles: true, cancelable: true, clientX: 100}));
    assert.isTrue(sectionElement.expanded);
  });
});
