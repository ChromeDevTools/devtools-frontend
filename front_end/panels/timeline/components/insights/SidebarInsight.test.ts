// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';
import * as InsightsUI from '../../components/insights/insights.js';

describeWithEnvironment('SidebarInsight', () => {
  const {SidebarInsight} = InsightsUI.SidebarInsight;
  const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

  describe('sidebar insight component rendering', () => {
    it('renders insight title', async () => {
      const component = new SidebarInsight();
      component.data = {title: 'LCP by Phase', expanded: true};
      renderElementIntoDOM(component);

      await coordinator.done();

      assert.isNotNull(component.shadowRoot);
      const titleElement = component.shadowRoot.querySelector<HTMLElement>('.insight-title');
      assert.isNotNull(titleElement);
      assert.deepEqual(titleElement.textContent, 'LCP by Phase');
    });

    describe('insight toggling', () => {
      it('renders only insight title when not toggled', async () => {
        const component = new SidebarInsight();
        component.data = {title: 'LCP by Phase', expanded: false};
        renderElementIntoDOM(component);

        await coordinator.done();

        assert.isNotNull(component.shadowRoot);
        const titleElement = component.shadowRoot.querySelector<HTMLElement>('.insight-title');
        assert.isNotNull(titleElement);
        assert.deepEqual(titleElement.textContent, 'LCP by Phase');

        // Should not contain the description and content slots.
        const slotElements = component.shadowRoot.querySelectorAll<HTMLSlotElement>('slot');
        assert.isEmpty(slotElements);
      });

      it('renders title, description and content when toggled', async () => {
        const component = new SidebarInsight();
        component.data = {title: 'LCP by Phase', expanded: true};
        renderElementIntoDOM(component);

        await coordinator.done();

        assert.isNotNull(component.shadowRoot);
        const titleElement = component.shadowRoot.querySelector<HTMLElement>('.insight-title');
        assert.isNotNull(titleElement);
        assert.deepEqual(titleElement.textContent, 'LCP by Phase');

        const slotElements = component.shadowRoot.querySelectorAll<HTMLSlotElement>('slot');
        assert.isNotEmpty(slotElements);

        const descriptionSlot = slotElements[0];
        assert.isNotNull(descriptionSlot);
        assert.strictEqual(descriptionSlot.name, 'insight-description');

        const contentSlot = slotElements[1];
        assert.isNotNull(contentSlot);
        assert.strictEqual(contentSlot.name, 'insight-content');
      });
    });
  });
});
