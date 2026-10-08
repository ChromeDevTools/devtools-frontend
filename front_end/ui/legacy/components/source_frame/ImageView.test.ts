// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../core/text_utils/text_utils.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {createContentProviderUISourceCode} from '../../../../testing/UISourceCodeHelpers.js';
import {render} from '../../../lit/lit.js';

import * as SourceFrame from './source_frame.js';

const {urlString} = Platform.DevToolsPath;

// 10x20 red PNG image (81 bytes)
const IMAGE_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAUCAYAAAC07qxWAAAAGElEQVR4nGP4z8DwnxjMMKpwVOGoQhAGAEf2joBDcsOVAAAAAElFTkSuQmCC';

describeWithEnvironment('ImageView', () => {
  it('shows size, dimensions, aspect ratio, and mime type in toolbar items after image loads', async () => {
    const contentData = new TextUtils.ContentData.ContentData(IMAGE_BASE64, true, 'image/png');
    const contentProvider = new TextUtils.StaticContentProvider.StaticContentProvider(
        urlString`http://example.com/image.png`, Common.ResourceType.resourceTypes.Image,
        () => Promise.resolve(contentData));

    const imageView = new SourceFrame.ImageView.ImageView('image/png', contentProvider);

    const toolbarItemsTemplate = await imageView.toolbarItems();
    const toolbarContainer = document.createElement('div');
    render(toolbarItemsTemplate, toolbarContainer);

    const toolbarTexts =
        Array.from(toolbarContainer.querySelectorAll('.toolbar-text')).map(el => el.textContent?.trim());
    assert.include(toolbarTexts, '81\u00a0B');
    assert.include(toolbarTexts, '10 × 20');
    assert.include(toolbarTexts, Platform.NumberUtilities.aspectRatio(10, 20));
    assert.include(toolbarTexts, 'image/png');

    imageView.disposeView();
  });

  it('resolves toolbarItems even when image fails to load', async () => {
    const contentData = new TextUtils.ContentData.ContentData('not-an-image', true, 'image/png');
    const contentProvider = new TextUtils.StaticContentProvider.StaticContentProvider(
        urlString`http://example.com/broken.png`, Common.ResourceType.resourceTypes.Image,
        () => Promise.resolve(contentData));

    const imageView = new SourceFrame.ImageView.ImageView('image/png', contentProvider);

    const toolbarItemsTemplate = await imageView.toolbarItems();
    const toolbarContainer = document.createElement('div');
    render(toolbarItemsTemplate, toolbarContainer);

    const toolbarTexts =
        Array.from(toolbarContainer.querySelectorAll('.toolbar-text')).map(el => el.textContent?.trim());
    assert.include(toolbarTexts, 'image/png');

    imageView.disposeView();
  });

  it('dispatches TOOLBAR_ITEMS_CHANGED when working copy is committed', async () => {
    const {uiSourceCode} = createContentProviderUISourceCode({
      url: urlString`http://example.com/image.png`,
      mimeType: 'image/png',
      content: IMAGE_BASE64,
    });
    const imageView = new SourceFrame.ImageView.ImageView('image/png', uiSourceCode);
    const toolbarItemsPromise = new Promise<void>(resolve => {
      imageView.addEventListener(SourceFrame.ImageView.Events.TOOLBAR_ITEMS_CHANGED, () => resolve());
    });

    uiSourceCode.setWorkingCopy('new-content');
    uiSourceCode.commitWorkingCopy();

    await toolbarItemsPromise;
    imageView.disposeView();
  });

  it('waits for in-flight image load when toolbarItems is called concurrently with wasShown', async () => {
    const contentData = new TextUtils.ContentData.ContentData(IMAGE_BASE64, true, 'image/png');
    const contentProvider = new TextUtils.StaticContentProvider.StaticContentProvider(
        urlString`http://example.com/image.png`, Common.ResourceType.resourceTypes.Image,
        () => Promise.resolve(contentData));

    const imageView = new SourceFrame.ImageView.ImageView('image/png', contentProvider);
    imageView.wasShown();

    const toolbarItemsTemplate = await imageView.toolbarItems();
    const toolbarContainer = document.createElement('div');
    render(toolbarItemsTemplate, toolbarContainer);

    const toolbarTexts =
        Array.from(toolbarContainer.querySelectorAll('.toolbar-text')).map(el => el.textContent?.trim());
    assert.include(toolbarTexts, '81\u00a0B');
    assert.include(toolbarTexts, '10 × 20');
    assert.include(toolbarTexts, Platform.NumberUtilities.aspectRatio(10, 20));
    assert.include(toolbarTexts, 'image/png');

    imageView.disposeView();
  });
});
