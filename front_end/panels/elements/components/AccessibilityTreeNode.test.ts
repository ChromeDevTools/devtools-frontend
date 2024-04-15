// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as ElementsComponents from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithLocale('AccessibilityTreeNode', () => {
  it('renders role and name correctly for unignored nodes', async () => {
    const component = new ElementsComponents.AccessibilityTreeNode.AccessibilityTreeNode();
    renderElementIntoDOM(component);

    component.data = {
      name: 'NodeName',
      role: 'NodeRole',
      ignored: false,
      properties: [],
      id: 'NodeId',
    };

    await coordinator.done();

    assert.strictEqual(component.shadowRoot!.textContent, 'NodeRole\xa0"NodeName"');
  });

  it('renders ignored nodes as "ignored"', async () => {
    const component = new ElementsComponents.AccessibilityTreeNode.AccessibilityTreeNode();
    renderElementIntoDOM(component);

    component.data = {
      name: 'NodeName',
      role: 'NodeRole',
      ignored: true,
      properties: [],
      id: 'NodeId',
    };
    await coordinator.done();

    assert.strictEqual(component.shadowRoot!.textContent, 'Ignored');
  });
});
