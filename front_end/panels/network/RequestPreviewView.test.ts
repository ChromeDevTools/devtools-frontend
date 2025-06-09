// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Network from './network.js';

const {urlString} = Platform.DevToolsPath;

async function contentData(): Promise<TextUtils.ContentData.ContentData> {
  const content = '<style> p { color: red; }</style><link rel="stylesheet" ref="http://devtools-frontend.test/style">';
  return new TextUtils.ContentData.ContentData(content, false, 'text/css');
}

function renderPreviewView(request: SDK.NetworkRequest.NetworkRequest): Network.RequestPreviewView.RequestPreviewView {
  const component = new Network.RequestPreviewView.RequestPreviewView(request);
  const div = document.createElement('div');
  renderElementIntoDOM(div);
  component.markAsRoot();
  component.show(div);
  return component;
}

describeWithLocale('RequestPreviewView', () => {
  it('prevents previewed html from making same-site requests', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`http://devtools-frontend.test/content`, urlString``, null,
        null, null);
    request.setContentDataProvider(contentData);
    request.mimeType = Platform.MimeType.MimeType.HTML;
    const component = renderPreviewView(request);
    const widget = await component.showPreview();
    const frame = widget.contentElement.querySelector('iframe');
    expect(frame).to.be.not.null;
    expect(frame?.getAttribute('csp')).to.eql('default-src \'none\';img-src data:;style-src \'unsafe-inline\'');
    component.detach();
  });

  it('does add utf-8 charset to the data URL for the HTML preview for already decoded content', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`http://devtools-frontend.test/index.html`, urlString``,
        null, null, null);
    request.setContentDataProvider(
        () => Promise.resolve(new TextUtils.ContentData.ContentData(
            '<!DOCTYPE html>\n<p>Iñtërnâtiônàlizætiøn☃𝌆</p>', false, 'text/html', 'utf-16')));
    request.mimeType = Platform.MimeType.MimeType.HTML;
    request.setCharset('utf-16');

    assert.strictEqual(request.charset(), 'utf-16');

    const component = renderPreviewView(request);
    const widget = await component.showPreview();
    const frame = widget.contentElement.querySelector('iframe');
    assert.exists(frame);

    assert.include(frame.src, 'charset=utf-8');
    assert.notInclude(frame.src, ' base64');
  });

  it('does add the correct charset to the data URL for the HTML preview for base64 content', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`http://devtools-frontend.test/index.html`, urlString``,
        null, null, null);
    // UTF-16 + base64 encoded "<!DOCTYPE html>\n<p>Iñtërnâtiônàlizætiøn☃𝌆</p>".
    request.setContentDataProvider(
        () => Promise.resolve(new TextUtils.ContentData.ContentData(
            '//48ACEARABPAEMAVABZAFAARQAgAGgAdABtAGwAPgAKADwAcAA+AEkA8QB0AOsAcgBuAOIAdABpAPQAbgDgAGwAaQB6AOYAdABpAPgAbgADJjTYBt88AC8AcAA+AAoA',
            true, 'text/html', 'utf-16')));
    request.mimeType = Platform.MimeType.MimeType.HTML;
    request.setCharset('utf-16');

    assert.strictEqual(request.charset(), 'utf-16');

    const component = renderPreviewView(request);
    const widget = await component.showPreview();
    const frame = widget.contentElement.querySelector('iframe');
    assert.exists(frame);

    assert.include(frame.src, 'charset=utf-16');
    assert.include(frame.src, 'base64');
  });

  it('creates a searchable view for json', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`http://devtools-frontend.test/content`, urlString``, null,
        null, null);
    request.setContentDataProvider(
        async () => new TextUtils.ContentData.ContentData('{"foo": 42}', false, 'application/json'));
    request.mimeType = 'application/json';

    const component = renderPreviewView(request);
    const widget = await component.showPreview();

    assert.instanceOf(widget, UI.SearchableView.SearchableView);
    assert.instanceOf(widget.children()[0], SourceFrame.JSONView.JSONView);
  });
});
