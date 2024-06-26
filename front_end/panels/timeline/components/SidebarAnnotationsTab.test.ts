// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as TimelineComponents from './components.js';

describeWithEnvironment('SidebarAnnotationsTab', () => {
  const {SidebarAnnotationsTab} = TimelineComponents.SidebarAnnotationsTab;
  const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

  it('renders annotations tab in the sidebar', async () => {
    const component = new SidebarAnnotationsTab();
    renderElementIntoDOM(component);

    await coordinator.done();

    assert.isNotNull(component.shadowRoot);
    const annotationsWrapperElement = component.shadowRoot.querySelector<HTMLElement>('.annotations');
    assert.isNotNull(annotationsWrapperElement);
  });
});
