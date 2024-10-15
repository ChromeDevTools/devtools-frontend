// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  assertElements,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';

import * as IconButton from './icon_button.js';

const renderFileSourceIconButton = (data: IconButton.FileSourceIcon.FileSourceIconData):
    {component: IconButton.FileSourceIcon.FileSourceIcon, shadowRoot: ShadowRoot} => {
      const component = new IconButton.FileSourceIcon.FileSourceIcon('document');
      component.data = data;
      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      return {component, shadowRoot: component.shadowRoot};
    };

describe('FileSourceIcon', () => {
  it('returns document icon', async () => {
    const {shadowRoot} = renderFileSourceIconButton({
      contentType: 'icon',
    });
    const icons = shadowRoot.querySelectorAll('.icon');

    assertElements(icons, IconButton.Icon.Icon);
    assert.strictEqual(
        icons[0].outerHTML, '<devtools-icon role="presentation" name="document" class="icon"></devtools-icon>');
  });
});
