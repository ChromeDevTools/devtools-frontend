// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as MarkdownView from '../../../../../front_end/ui/components/markdown_view/markdown_view.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {assertShadowRoot, getElementWithinComponent, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';

const {assert} = chai;

describe('MarkdownLink', () => {
  before(async () => {
    MarkdownView.MarkdownLinksMap.markdownLinks.set('test-link', 'http://exampleLink');
  });
  it('renders link correctly', () => {
    const component = new MarkdownView.MarkdownLink.MarkdownLink();
    component.data = {key: 'test-link', title: 'Test link'};
    renderElementIntoDOM(component);
    assertShadowRoot(component.shadowRoot);
    const linkComponent = getElementWithinComponent(component, 'x-link', UI.XLink.XLink);
    assert.isNotNull(linkComponent);
    assert.strictEqual(linkComponent.textContent, 'Test link');
    assert.strictEqual(linkComponent.href, 'http://examplelink/' as Platform.DevToolsPath.UrlString);
  });
});
