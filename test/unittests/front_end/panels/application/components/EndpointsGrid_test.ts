// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ApplicationComponents from '../../../../../../front_end/panels/application/components/components.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';

import {assertShadowRoot, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';

const {assert} = chai;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describe('EndpointsGrid', async () => {
  // TODO(crbug.com/1200732): Once endpoint info is displayed, add more tests
  it('displays placeholder text if no data', async () => {
    const component = new ApplicationComponents.EndpointsGrid.EndpointsGrid();
    renderElementIntoDOM(component);
    assertShadowRoot(component.shadowRoot);
    await coordinator.done();

    const placeholder = component.shadowRoot.querySelector('.reporting-placeholder div');
    assert.strictEqual(placeholder?.textContent, 'No endpoints to display');
  });
});
