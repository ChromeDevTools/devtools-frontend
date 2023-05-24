// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ElementsComponents from '../../../../../../front_end/panels/elements/components/components.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {assertShadowRoot, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';
import {describeWithLocale} from '../../../helpers/EnvironmentHelpers.js';

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
    assertShadowRoot(component.shadowRoot);

    assert.strictEqual(component.shadowRoot.textContent, 'NodeRole\xa0"NodeName"');
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

    assertShadowRoot(component.shadowRoot);

    assert.strictEqual(component.shadowRoot.textContent, 'Ignored');
  });
});
