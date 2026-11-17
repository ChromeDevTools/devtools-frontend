// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import * as Common from '../../core/common/common.js';
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

  describe('chooses the preview view for the received data', () => {
    const RESOURCE_TYPES = [
      Common.ResourceType.resourceTypes.XHR,
      Common.ResourceType.resourceTypes.Fetch,
      Common.ResourceType.resourceTypes.Document,
      Common.ResourceType.resourceTypes.Other,
    ];

    function getViewName(previewer: UI.Widget.AnyWidget|null): string {
      if (!previewer) {
        return '** NONE **';
      }
      if (previewer instanceof SourceFrame.ResourceSourceFrame.SearchableContainer) {
        return 'SearchableContainer > ' + getViewName(previewer.children()[0]);
      }
      if (previewer instanceof UI.SearchableView.SearchableView) {
        const {searchProvider} = previewer;
        assert.instanceOf(searchProvider, UI.Widget.Widget);
        return 'SearchableView > ' + getViewName(searchProvider);
      }
      if (previewer instanceof SourceFrame.JSONView.JSONView) {
        return 'JSONView';
      }
      if (previewer instanceof SourceFrame.XMLView.XMLView) {
        return 'XMLView';
      }
      if (previewer instanceof Network.RequestHTMLView.RequestHTMLView) {
        return 'RequestHTMLView';
      }
      if (previewer instanceof SourceFrame.ImageView.ImageView) {
        return 'ImageView';
      }
      if (previewer instanceof SourceFrame.ResourceSourceFrame.ResourceSourceFrame) {
        return 'ResourceSourceFrame';
      }
      if (previewer instanceof UI.EmptyWidget.EmptyWidget) {
        return 'EmptyWidget';
      }
      assert.fail(`Unexpected preview widget: ${previewer.constructor.name}`);
    }

    /**
     * Shows a RequestPreviewView for a request with the given MIME type,
     * content, and status code once for each of the resource types above, and
     * returns the name of the chosen preview view for each resource type.
     */
    async function getViewNames(mimeType: string, content: string,
                                statusCode: number): Promise<Record<string, string>> {
      const viewNames: Record<string, string> = {};
      for (const resourceType of RESOURCE_TYPES) {
        const request = createNetworkRequest({
          url: 'http://localhost',
          documentURL: '',
          resourceType,
          mimeType,
          contentData: async () => new TextUtils.ContentData.ContentData(content, false, mimeType),
          statusCode,
        });
        const previewView = new Network.RequestPreviewView.RequestPreviewView(request);
        renderElementIntoDOM(previewView);
        const contentView = await previewView.contentViewPromise;
        await UI.Widget.Widget.allUpdatesComplete;
        viewNames[resourceType.name()] = getViewName(contentView);
        previewView.detach();
      }
      return viewNames;
    }

    it('uses a JSON view for simple JSON', async () => {
      assert.deepEqual(await getViewNames('application/json', '[533,3223]', 200), {
        xhr: 'SearchableView > JSONView',
        fetch: 'SearchableView > JSONView',
        document: 'SearchableView > JSONView',
        other: 'SearchableView > JSONView',
      });
    });

    it('uses a JSON view for JSON with a JSON MIME type', async () => {
      assert.deepEqual(await getViewNames('application/vnd.document+json', '{"foo0foo": 123}', 200), {
        xhr: 'SearchableView > JSONView',
        fetch: 'SearchableView > JSONView',
        document: 'SearchableView > JSONView',
        other: 'SearchableView > JSONView',
      });
    });

    it('uses an XML view for simple XML', async () => {
      assert.deepEqual(await getViewNames('text/xml', '<bar><foo/></bar>', 200), {
        xhr: 'SearchableView > XMLView',
        fetch: 'SearchableView > XMLView',
        document: 'SearchableView > XMLView',
        other: 'SearchableView > XMLView',
      });
    });

    it('uses a JSON view for JSON with an XML MIME type', async () => {
      assert.deepEqual(await getViewNames('text/xml', '{"foo0": "barr", "barr": "fooo"}', 200), {
        xhr: 'SearchableView > JSONView',
        fetch: 'SearchableView > JSONView',
        document: 'SearchableView > JSONView',
        other: 'SearchableView > JSONView',
      });
    });

    it('uses a JSON view for JSON with an HTML MIME type', async () => {
      assert.deepEqual(await getViewNames('text/html', '{"hi": "hi"}', 200), {
        xhr: 'SearchableView > JSONView',
        fetch: 'SearchableView > JSONView',
        document: 'SearchableView > JSONView',
        other: 'SearchableView > JSONView',
      });
    });

    it('uses a JSON view for JSON with a text MIME type', async () => {
      assert.deepEqual(await getViewNames('text/plain', '{"hi": "hi"}', 200), {
        xhr: 'SearchableView > JSONView',
        fetch: 'SearchableView > JSONView',
        document: 'SearchableView > JSONView',
        other: 'SearchableView > JSONView',
      });
    });

    it('uses an HTML view for HTML with a 500 status code', async () => {
      assert.deepEqual(await getViewNames('text/html', 'This\n<b>is a </b><br /><br />test.', 500), {
        xhr: 'RequestHTMLView',
        fetch: 'RequestHTMLView',
        document: 'RequestHTMLView',
        other: 'RequestHTMLView',
      });
    });

    it('uses an HTML view for HTML with a plain text MIME type', async () => {
      assert.deepEqual(await getViewNames('text/plain', 'This\n<b>is a </b><br /><br />test.', 200), {
        xhr: 'RequestHTMLView',
        fetch: 'RequestHTMLView',
        document: 'RequestHTMLView',
        other: 'RequestHTMLView',
      });
    });

    it('uses a source view for XML with an unknown MIME type', async () => {
      assert.deepEqual(await getViewNames('text/foobar', '<bar><foo/></bar>', 200), {
        xhr: 'SearchableContainer > SearchableView > ResourceSourceFrame',
        fetch: 'SearchableContainer > SearchableView > ResourceSourceFrame',
        document: 'SearchableContainer > SearchableView > ResourceSourceFrame',
        other: 'SearchableContainer > SearchableView > ResourceSourceFrame',
      });
    });

    it('uses an XML view for XML with a 500 status code', async () => {
      assert.deepEqual(await getViewNames('text/xml', '<bar><foo/></bar>', 500), {
        xhr: 'SearchableView > XMLView',
        fetch: 'SearchableView > XMLView',
        document: 'SearchableView > XMLView',
        other: 'SearchableView > XMLView',
      });
    });

    it('uses a source view for a 500 response with an unknown text MIME type', async () => {
      assert.deepEqual(await getViewNames('text/foobar', 'Foo Bar', 500), {
        xhr: 'SearchableContainer > SearchableView > ResourceSourceFrame',
        fetch: 'SearchableContainer > SearchableView > ResourceSourceFrame',
        document: 'SearchableContainer > SearchableView > ResourceSourceFrame',
        other: 'SearchableContainer > SearchableView > ResourceSourceFrame',
      });
    });

    it('uses an image view for a binary image file', async () => {
      assert.deepEqual(await getViewNames('image/png', 'Bin\0ary\x01 File\0\0', 200), {
        xhr: 'ImageView',
        fetch: 'ImageView',
        document: 'ImageView',
        other: 'ImageView',
      });
    });

    it('uses an image view for a blank image file', async () => {
      assert.deepEqual(await getViewNames('image/png', '', 200), {
        xhr: 'ImageView',
        fetch: 'ImageView',
        document: 'ImageView',
        other: 'ImageView',
      });
    });
  });
});
