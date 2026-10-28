// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';

import * as ElementsComponents from './components.js';

describe('AccessibilityTreeNode', () => {
  setupLocaleHooks();
  it('renders role and name correctly for unignored nodes', async () => {
    const component = new ElementsComponents.AccessibilityTreeNode.AccessibilityTreeNode();
    renderElementIntoDOM(component);

    component.name = 'NodeName';
    component.role = 'NodeRole';
    component.ignored = false;
    component.properties = [];

    await component.updateComplete;

    assert.strictEqual(component.contentElement.querySelector('.container')?.textContent, 'NodeRole\xa0"NodeName"');
  });

  it('renders ignored nodes as "ignored"', async () => {
    const component = new ElementsComponents.AccessibilityTreeNode.AccessibilityTreeNode();
    renderElementIntoDOM(component);

    component.name = 'NodeName';
    component.role = 'NodeRole';
    component.ignored = true;
    component.properties = [];

    await component.updateComplete;

    assert.strictEqual(component.contentElement.querySelector('.container')?.textContent, 'Ignored');
  });
});
