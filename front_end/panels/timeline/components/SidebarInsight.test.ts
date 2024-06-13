// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as TimelineComponents from './components.js';

describeWithEnvironment('SidebarInsight', () => {
  const {SidebarInsight} = TimelineComponents.SidebarInsight;
  const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

  it('renders insight title', async () => {
    const component = new SidebarInsight();
    component.data = {title: 'LCP by Phase'};
    renderElementIntoDOM(component);

    await coordinator.done();

    assert.isNotNull(component.shadowRoot);
    const titleElement = component.shadowRoot.querySelector<HTMLElement>('.insight-title');
    assert.isNotNull(titleElement);
    assert.deepEqual(titleElement.textContent, 'LCP by Phase');
  });
});
