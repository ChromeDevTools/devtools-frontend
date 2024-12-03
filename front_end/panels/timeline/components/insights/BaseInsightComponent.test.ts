// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../../core/common/common.js';
import * as Trace from '../../../../models/trace/trace.js';
import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type {TimelineOverlay} from '../../overlays/OverlaysImpl.js';

import * as Insights from './insights.js';

const {html} = LitHtml;

describeWithEnvironment('BaseInsightComponent', () => {
  const {BaseInsightComponent} = Insights.BaseInsightComponent;
  const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

  class TestInsightComponent extends BaseInsightComponent<Trace.Insights.Types.InsightModel<{}>> {
    override internalName = 'test-insight';
    override createOverlays(): TimelineOverlay[] {
      return [];
    }
    override renderContent(): LitHtml.LitTemplate {
      return html`<div>test content</div>`;
    }
  }
  customElements.define('test-insight-component', TestInsightComponent);

  describe('sidebar insight component rendering', () => {
    it('renders insight title even when not active', async () => {
      const component = new TestInsightComponent();
      component.selected = false;
      component.model = {
        title: 'LCP by Phase' as Common.UIString.LocalizedString,
        description: 'some description' as Common.UIString.LocalizedString,
        category: Trace.Insights.Types.InsightCategory.ALL,
        shouldShow: true,
      };
      renderElementIntoDOM(component);

      await coordinator.done();

      assert.isNotNull(component.shadowRoot);
      const titleElement = component.shadowRoot.querySelector<HTMLElement>('.insight-title');
      assert.isNotNull(titleElement);
      const descElement = component.shadowRoot.querySelector<HTMLElement>('.insight-description');
      assert.isNull(descElement);
      const contentElement = component.shadowRoot.querySelector<HTMLElement>('.insight-content');
      assert.isNull(contentElement);
      assert.deepEqual(titleElement.textContent, 'LCP by Phase');
    });

    it('renders title, description and content when toggled', async () => {
      const component = new TestInsightComponent();
      component.selected = true;
      component.model = {
        title: 'LCP by Phase' as Common.UIString.LocalizedString,
        description: 'some description' as Common.UIString.LocalizedString,
        category: Trace.Insights.Types.InsightCategory.ALL,
        shouldShow: true,
      };
      renderElementIntoDOM(component);

      await coordinator.done();

      assert.isNotNull(component.shadowRoot);
      const titleElement = component.shadowRoot.querySelector<HTMLElement>('.insight-title');
      assert.isNotNull(titleElement);
      assert.deepEqual(titleElement.textContent, 'LCP by Phase');

      const descElement = component.shadowRoot.querySelector<HTMLElement>('.insight-description');
      assert.isNotNull(descElement);
      // It's in the markdown component.
      assert.strictEqual(descElement.children[0].shadowRoot?.textContent?.trim(), 'some description');

      const contentElement = component.shadowRoot.querySelector<HTMLElement>('.insight-content');
      assert.isNotNull(contentElement);
      assert.strictEqual(contentElement.textContent, 'test content');
    });
  });
});
