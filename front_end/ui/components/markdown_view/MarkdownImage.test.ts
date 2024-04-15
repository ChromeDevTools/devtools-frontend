// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import * as IconButton from '../icon_button/icon_button.js';
import * as Coordinator from '../render_coordinator/render_coordinator.js';

import * as MarkdownView from './markdown_view.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describe('MarkdownImage', () => {
  const imageSource = 'Images/lighthouse_logo.svg';
  before(async () => {
    MarkdownView.MarkdownImagesMap.markdownImages.set('test-icon', {
      src: new URL('../../../Images/review.svg', import.meta.url).toString(),
      width: '20px',
      height: '20px',
      isIcon: true,
    });
    MarkdownView.MarkdownImagesMap.markdownImages.set('test-image', {
      src: new URL(`../../../${imageSource}`, import.meta.url).toString(),
      width: '100px',
      height: '100px',
      isIcon: false,
    });
  });
  it('renders icon correctly', async () => {
    const component = new MarkdownView.MarkdownImage.MarkdownImage();
    component.data = {key: 'test-icon', title: 'Test icon'};
    renderElementIntoDOM(component);
    await coordinator.done();
    assert.isNotNull(component.shadowRoot);
    const iconComponent = getElementWithinComponent(component, 'devtools-icon', IconButton.Icon.Icon);
    assert.isNotNull(iconComponent);
    const boundingClient = iconComponent.getBoundingClientRect();
    assert.strictEqual(boundingClient.width, 20);
    assert.strictEqual(boundingClient.height, 20);
  });
  it('renders image correctly', () => {
    const component = new MarkdownView.MarkdownImage.MarkdownImage();
    const markdownImageTitle = 'Test image';
    const markdownImageKey = 'test-image';
    component.data = {key: markdownImageKey, title: markdownImageTitle};
    renderElementIntoDOM(component);
    assert.isNotNull(component.shadowRoot);
    const imageComponent = getElementWithinComponent(component, 'img', HTMLImageElement);
    assert.isNotNull(imageComponent);
    assert.include(imageComponent.src, imageSource);
    assert.strictEqual(imageComponent.alt, markdownImageTitle);
    assert.strictEqual(imageComponent.width, 100);
    assert.strictEqual(imageComponent.height, 100);
  });
});
