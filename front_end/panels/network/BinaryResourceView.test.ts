// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import {assertScreenshot, doubleRaf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Network from './network.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('BinaryResourceView', () => {
  it('renders the hex view correctly', async () => {
    const base64content = btoa('hello world');
    const contentData = TextUtils.StreamingContentData.StreamingContentData.from(
        new TextUtils.ContentData.ContentData(base64content, true, 'application/octet-stream'));
    const view = new Network.BinaryResourceView.BinaryResourceView(
        contentData,
        urlString`http://example.com`,
        Common.ResourceType.resourceTypes.XHR,
    );
    renderElementIntoDOM(view, {width: 400, height: 400, includeCommonStyles: true});

    await doubleRaf();

    await assertScreenshot('network/binary_resource_view_hex.png');

    view.detach();
  });

  it('renders the base64 view correctly', async () => {
    const base64content = btoa('hello world');
    const contentData = TextUtils.StreamingContentData.StreamingContentData.from(
        new TextUtils.ContentData.ContentData(base64content, true, 'application/octet-stream'));
    const view = new Network.BinaryResourceView.BinaryResourceView(
        contentData,
        urlString`http://example.com`,
        Common.ResourceType.resourceTypes.XHR,
    );
    renderElementIntoDOM(view, {width: 400, height: 400, includeCommonStyles: true});

    const combobox = view.element.querySelector('select');
    assert.isOk(combobox);
    combobox.value = 'base64';
    combobox.dispatchEvent(new Event('change'));

    await doubleRaf();

    await assertScreenshot('network/binary_resource_view_base64.png');

    view.detach();
  });

  it('renders the utf8 view correctly', async () => {
    const base64content = btoa('hello world');
    const contentData = TextUtils.StreamingContentData.StreamingContentData.from(
        new TextUtils.ContentData.ContentData(base64content, true, 'application/octet-stream'));
    const view = new Network.BinaryResourceView.BinaryResourceView(
        contentData,
        urlString`http://example.com`,
        Common.ResourceType.resourceTypes.XHR,
    );
    renderElementIntoDOM(view, {width: 400, height: 400, includeCommonStyles: true});

    const combobox = view.element.querySelector('select');
    assert.isOk(combobox);
    combobox.value = 'utf8';
    combobox.dispatchEvent(new Event('change'));

    await doubleRaf();

    await assertScreenshot('network/binary_resource_view_utf8.png');

    view.detach();
  });

  it('renders the default hex view', async () => {
    const base64content = btoa('hello world');
    const contentData = TextUtils.StreamingContentData.StreamingContentData.from(
        new TextUtils.ContentData.ContentData(base64content, true, 'application/octet-stream'));
    const view = new Network.BinaryResourceView.BinaryResourceView(
        contentData,
        urlString`http://example.com`,
        Common.ResourceType.resourceTypes.XHR,
    );
    renderElementIntoDOM(view);

    await doubleRaf();

    const combobox = view.element.querySelector('select');

    assert.isNotNull(combobox);
    assert.strictEqual(combobox?.value, 'hex');

    view.detach();
  });

  it('updates state when dropdown changes', async () => {
    const base64content = btoa('hello world');
    const contentData = TextUtils.StreamingContentData.StreamingContentData.from(
        new TextUtils.ContentData.ContentData(base64content, true, 'application/octet-stream'));
    const view = new Network.BinaryResourceView.BinaryResourceView(
        contentData,
        urlString`http://example.com`,
        Common.ResourceType.resourceTypes.XHR,
    );
    renderElementIntoDOM(view);

    await doubleRaf();

    const combobox = view.element.querySelector('select');

    assert.isOk(combobox);
    combobox.value = 'utf8';
    combobox.dispatchEvent(new Event('change'));

    assert.strictEqual(Common.Settings.Settings.instance().createSetting('binary-view-type', 'hex').get(), 'utf8');

    view.detach();
  });

  it('copies to clipboard on copy button click', async () => {
    const base64content = btoa('hello world');
    const contentData = TextUtils.StreamingContentData.StreamingContentData.from(
        new TextUtils.ContentData.ContentData(base64content, true, 'application/octet-stream'));
    const view = new Network.BinaryResourceView.BinaryResourceView(
        contentData,
        urlString`http://example.com`,
        Common.ResourceType.resourceTypes.XHR,
    );
    renderElementIntoDOM(view);

    await doubleRaf();

    let copiedText = '';
    const copyTextStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'copyText')
                             .callsFake((text?: string|null) => {
                               copiedText = text || '';
                             });

    const copyButton = view.element.querySelector('devtools-button[title="Copy to clipboard"]') as HTMLElement;
    assert.isNotNull(copyButton);
    copyButton.click();

    sinon.assert.calledOnce(copyTextStub);
    // hex string of 'hello world'
    const expectedHex = '68656c6c6f20776f726c64';
    assert.strictEqual(copiedText, expectedHex);
    view.detach();
  });
});
