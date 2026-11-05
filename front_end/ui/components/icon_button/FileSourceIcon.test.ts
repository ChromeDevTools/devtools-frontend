// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

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

  it('preserves data and renders correctly when cloned', async () => {
    const component = new IconButton.FileSourceIcon.FileSourceIcon();
    component.data = {
      iconType: 'document',
      contentType: 'js',
      hasDotBadge: true,
      isDotPurple: true,
    };

    const clone = component.cloneNode(true) as IconButton.FileSourceIcon.FileSourceIcon;
    assert.deepEqual(clone.data, component.data);

    renderElementIntoDOM(clone);
    assert.isNotNull(clone.shadowRoot);

    const icon = clone.shadowRoot.querySelector('devtools-icon');
    assert.exists(icon);
    assert.strictEqual(icon.getAttribute('name'), 'document');
    assert.isTrue(icon.classList.contains('dot'));
    assert.isTrue(icon.classList.contains('purple'));
    assert.isTrue(icon.classList.contains('js'));
  });
});
