// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';

import * as IconButton from './icon_button.js';

const renderFileSourceIconButton = (data: IconButton.FileSourceIcon.FileSourceIconData):
    {component: IconButton.FileSourceIcon.FileSourceIcon, shadowRoot: ShadowRoot} => {
      const component = new IconButton.FileSourceIcon.FileSourceIcon();
      component.data = data;
      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      return {component, shadowRoot: component.shadowRoot};
    };

describe('FileSourceIcon', () => {
  it('returns document icon', async () => {
    const {shadowRoot} = renderFileSourceIconButton({
      iconType: 'document',
      contentType: 'icon',
    });

    const icon = shadowRoot.querySelector('.icon');

    assert.exists(icon);
    assert.strictEqual(icon.getAttribute('name'), 'document');
  });
});
