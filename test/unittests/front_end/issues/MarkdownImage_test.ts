// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as IssuesModule from '../../../../front_end/issues/issues.js';
import {assertShadowRoot, renderElementIntoDOM, getElementWithinComponent} from '../helpers/DOMHelpers.js';
import * as Components from '../../../../front_end/ui/components/components.js';

const {assert} = chai;

describe('MarkdownImage', () => {
  let Issues: typeof IssuesModule;
  const imageSource = 'Images/lighthouse_logo.svg';
  before(async () => {
    Issues = await import('../../../../front_end/issues/issues.js');
    Issues.MarkdownImagesMap.markdownImages.set('test-icon', {
      src: 'Images/feedback_thin_16x16_icon.svg',
      isIcon: true,
    });
    Issues.MarkdownImagesMap.markdownImages.set('test-image', {
      src: imageSource,
      width: '100px',
      height: '100px',
      isIcon: false,
    });
  });
  it('renders icon correctly', () => {
    const component = new Issues.MarkdownImage.MarkdownImage();
    component.data = {key: 'test-icon', title: 'Test icon'};
    renderElementIntoDOM(component);

    assertShadowRoot(component.shadowRoot);
    assert.isNotNull(getElementWithinComponent(component, 'devtools-icon', Components.Icon.Icon));
  });
  it('renders image correctly', () => {
    const component = new Issues.MarkdownImage.MarkdownImage();
    const markdownImageTitle = 'Test image';
    const markdownImageKey = 'test-image';
    component.data = {key: markdownImageKey, title: markdownImageTitle};
    renderElementIntoDOM(component);
    assertShadowRoot(component.shadowRoot);
    const imageComponent = getElementWithinComponent(component, 'img', HTMLImageElement);
    assert.isNotNull(imageComponent);
    assert.include(imageComponent.src, imageSource);
    assert.strictEqual(imageComponent.alt, markdownImageTitle);
    assert.strictEqual(imageComponent.width, 100);
    assert.strictEqual(imageComponent.height, 100);
  });
});
