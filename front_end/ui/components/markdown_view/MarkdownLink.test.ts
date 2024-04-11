// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../core/platform/platform.js';
import {
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import * as UI from '../../legacy/legacy.js';

import * as MarkdownView from './markdown_view.js';

describe('MarkdownLink', () => {
  before(async () => {
    MarkdownView.MarkdownLinksMap.markdownLinks.set('test-link', 'http://exampleLink');
  });
  it('renders link correctly', () => {
    const component = new MarkdownView.MarkdownLink.MarkdownLink();
    component.data = {key: 'test-link', title: 'Test link'};
    renderElementIntoDOM(component);
    assert.isNotNull(component.shadowRoot);
    const linkComponent = getElementWithinComponent(component, 'x-link', UI.XLink.XLink);
    assert.isNotNull(linkComponent);
    assert.strictEqual(linkComponent.textContent, 'Test link');
    assert.strictEqual(linkComponent.href, 'http://examplelink/' as Platform.DevToolsPath.UrlString);
  });
});
