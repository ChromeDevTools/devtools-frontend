// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {render} from '../../ui/lit/lit.js';

import * as Accessibility from './accessibility.js';

describe('AccessibilityNodeView view', () => {
  setupLocaleHooks();

  it('formats string newlines in createSimpleValueElement', () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);

    render(
        Accessibility.AccessibilityNodeView.createSimpleValueElement(Protocol.Accessibility.AXValueType.ComputedString,
                                                                     'Line 1\nLine 2'),
        container,
    );
    assert.strictEqual(container.textContent, '"Line 1\u21B5Line 2"');
  });

  it('renders invalid idref in renderRelatedNode', () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);

    render(Accessibility.AccessibilityNodeView.renderRelatedNode({idref: 'missing-id'}, new Map()), container);
    assert.exists(container.querySelector('.invalid devtools-icon'));
    assert.include(container.textContent, 'missing-id');
  });

  it('renders ignored reason in createReasonElement', () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);

    render(Accessibility.AccessibilityNodeView.createReasonElement('presentationalRole', 'presentation'), container);
    assert.strictEqual(container.textContent, 'Element has role=presentation');
  });
});
