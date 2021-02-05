// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../../../front_end/ui/ui.js';
import type * as IssuesModule from '../../../../front_end/issues/issues.js';
import {assertShadowRoot, renderElementIntoDOM, getElementWithinComponent} from '../helpers/DOMHelpers.js';

const {assert} = chai;

describe('MarkdownLink', () => {
  let Issues: typeof IssuesModule;
  before(async () => {
    Issues = await import('../../../../front_end/issues/issues.js');
    Issues.MarkdownLinksMap.markdownLinks.set('test-link', 'http://exampleLink');
  });
  it('renders link correctly', () => {
    const component = new Issues.MarkdownLink.MarkdownLink();
    component.data = {key: 'test-link', title: 'Test link'};
    renderElementIntoDOM(component);
    assertShadowRoot(component.shadowRoot);
    const linkComponent = getElementWithinComponent(component, 'x-link', UI.XLink.XLink);
    assert.isNotNull(linkComponent);
    assert.strictEqual(linkComponent.textContent, 'Test link');
    assert.strictEqual(linkComponent.href, 'http://examplelink/');
  });
});
