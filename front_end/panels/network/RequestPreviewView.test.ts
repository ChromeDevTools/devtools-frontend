// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {createNetworkRequest} from '../../testing/NetworkRequestHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Network from './network.js';

async function contentData(): Promise<TextUtils.ContentData.ContentData> {
  const content = '<style> p { color: red; }</style><link rel="stylesheet" ref="http://devtools-frontend.test/style">';
  return new TextUtils.ContentData.ContentData(content, false, 'text/css');
}

async function renderPreviewView(request: SDK.NetworkRequest.NetworkRequest):
    Promise<Network.RequestPreviewView.RequestPreviewView> {
  const component = new Network.RequestPreviewView.RequestPreviewView(request);
  renderElementIntoDOM(component);
  await component.updateComplete;
  return component;
}

describe('RequestPreviewView', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  it('prevents previewed html from making same-site requests', async () => {
    const request = createNetworkRequest({
      url: 'http://devtools-frontend.test/content',
      contentData,
      mimeType: Platform.MimeType.MimeType.HTML,
    });
    const component = await renderPreviewView(request);
    const widget = await component.contentViewPromise;
    assert.exists(widget);
    await widget.updateComplete;
    const frame = widget.contentElement.querySelector('iframe');
    assert.isNotNull(frame);
    assert.strictEqual(frame?.getAttribute('csp'), 'default-src \'none\';img-src data:;style-src \'unsafe-inline\'');
  });

  it('does add utf-8 charset to the data URL for the HTML preview for already decoded content', async () => {
    const request = createNetworkRequest({
      url: 'http://devtools-frontend.test/index.html',
      contentData: new TextUtils.ContentData.ContentData('<!DOCTYPE html>\n<p>Iñtërnâtiônàlizætiøn☃𝌆</p>', false,
                                                         'text/html', 'utf-16'),
      mimeType: Platform.MimeType.MimeType.HTML,
      charset: 'utf-16',
    });

    assert.strictEqual(request.charset(), 'utf-16');

    const component = await renderPreviewView(request);
    const widget = await component.contentViewPromise;
    assert.exists(widget);
    await widget.updateComplete;
    const frame = widget.contentElement.querySelector('iframe');
    assert.exists(frame);

    assert.include(frame.src, 'charset=utf-8');
    assert.notInclude(frame.src, ' base64');
  });

  it('does add the correct charset to the data URL for the HTML preview for base64 content', async () => {
    // UTF-16 + base64 encoded "<!DOCTYPE html>\n<p>Iñtërnâtiônàlizætiøn☃𝌆</p>".
    const request = createNetworkRequest({
      url: 'http://devtools-frontend.test/index.html',
      contentData: new TextUtils.ContentData.ContentData(
          '//48ACEARABPAEMAVABZAFAARQAgAGgAdABtAGwAPgAKADwAcAA+AEkA8QB0AOsAcgBuAOIAdABpAPQAbgDgAGwAaQB6AOYAdABpAPgAbgADJjTYBt88AC8AcAA+AAoA',
          true, 'text/html', 'utf-16'),
      mimeType: Platform.MimeType.MimeType.HTML,
      charset: 'utf-16',
    });

    assert.strictEqual(request.charset(), 'utf-16');

    const component = await renderPreviewView(request);
    const widget = await component.contentViewPromise;
    assert.exists(widget);
    await widget.updateComplete;
    const frame = widget.contentElement.querySelector('iframe');
    assert.exists(frame);

    assert.include(frame.src, 'charset=utf-16');
    assert.include(frame.src, 'base64');
  });

  it('creates a searchable view for json', async () => {
    const request = createNetworkRequest({
      url: 'http://devtools-frontend.test/content',
      contentData: new TextUtils.ContentData.ContentData('{"foo": 42}', false, 'application/json'),
      mimeType: 'application/json',
    });

    const component = await renderPreviewView(request);
    const widget = await component.contentViewPromise;

    assert.instanceOf(widget, UI.SearchableView.SearchableView);
    assert.instanceOf(widget.children()[0], SourceFrame.JSONView.JSONView);
  });

  it('passes htmlDataURL to view on wasShown', async () => {
    const request = createNetworkRequest({
      url: 'http://devtools-frontend.test/content',
      contentData,
      mimeType: Platform.MimeType.MimeType.HTML,
    });
    const view = createViewFunctionStub(Network.RequestPreviewView.RequestPreviewView);
    const component = new Network.RequestPreviewView.RequestPreviewView(request, view);

    component.wasShown();
    const input = await view.nextInput;

    assert.strictEqual(input.request, request);
    assert.isNotNull(input.htmlDataURL);
    assert.include(input.htmlDataURL, 'data:text/css;charset=utf-8,');
    assert.isNull(input.error);
    assert.isNull(input.parsedJSON);
    assert.isNull(input.parsedXML);
  });

  it('passes error to view when response data fails to load', async () => {
    const request = createNetworkRequest({
      url: 'http://devtools-frontend.test/content',
      contentData: () => Promise.resolve({error: 'Network error'}),
      mimeType: Platform.MimeType.MimeType.HTML,
    });
    const view = createViewFunctionStub(Network.RequestPreviewView.RequestPreviewView);
    const component = new Network.RequestPreviewView.RequestPreviewView(request, view);

    component.wasShown();
    const input = await view.nextInput;

    assert.strictEqual(input.request, request);
    assert.strictEqual(input.error, 'Network error');
    assert.isNull(input.htmlDataURL);
    assert.isNull(input.parsedJSON);
    assert.isNull(input.parsedXML);
  });

  it('recreates the preview widget when request changes to another request of the same type', async () => {
    const firstRequest = createNetworkRequest({
      url: 'http://devtools-frontend.test/first.xml',
      contentData: new TextUtils.ContentData.ContentData('<root>1</root>', false, 'application/xml'),
      mimeType: 'application/xml',
    });
    const secondRequest = createNetworkRequest({
      url: 'http://devtools-frontend.test/second.xml',
      contentData: new TextUtils.ContentData.ContentData('<root>2</root>', false, 'application/xml'),
      mimeType: 'application/xml',
    });

    const component = await renderPreviewView(firstRequest);
    const firstWidget = await component.contentViewPromise;
    assert.exists(firstWidget);

    component.request = secondRequest;
    const secondWidget = await component.contentViewPromise;
    assert.exists(secondWidget);
    assert.notStrictEqual(secondWidget, firstWidget);
  });
});
