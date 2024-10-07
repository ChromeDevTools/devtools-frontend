// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../core/root/root.js';
import {getCleanTextContentFromElements, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as Components from './components.js';
import * as InsightComponents from './insights/insights.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

function getUserVisibleInsights(component: Components.SidebarSingleInsightSet.SidebarSingleInsightSet):
    InsightComponents.SidebarInsight.SidebarInsight[] {
  assert.isOk(component.shadowRoot);
  const insightWrappers = [...component.shadowRoot.querySelectorAll<HTMLDivElement>('[data-single-insight-wrapper]')];

  // We have to jump through some hoops here => each insight is rendered in its
  // own component, but within it they all use the
  // devtools-performance-sidebar-insight component to render the header +
  // body.
  // So we first have to find the specific insight component (e.g.
  // devtools-performance-render-blocking), then look inside its shadow dom for
  // the devtools-performance-sidebar-insight component.
  // If you are here debugging something, I highly recommend loading up
  // DevTools and inspecting the DOM in the Insights sidebar. It will be much
  // easier!
  const userVisibleInsightComponents =
      insightWrappers
          .map(div => {
            const component = div.querySelector('[data-insight-name]');
            assert.instanceOf(component, HTMLElement);
            const insightComponent =
                component.shadowRoot?.querySelector<InsightComponents.SidebarInsight.SidebarInsight>(
                    'devtools-performance-sidebar-insight');
            return insightComponent ?? null;
          })
          .filter(x => x !== null);
  return userVisibleInsightComponents;
}

describeWithEnvironment('SidebarSingleInsightSet', () => {
  it('renders a list of insights', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');

    assert.isOk(insights);
    // only one navigation in this trace.
    assert.strictEqual(insights.size, 1);
    // This is the navigationID from this trace.
    const navigationId = '8463DF94CD61B265B664E7F768183DE3';
    assert.isTrue(insights.has(navigationId));

    const component = new Components.SidebarSingleInsightSet.SidebarSingleInsightSet();
    renderElementIntoDOM(component);
    component.data = {
      parsedTrace,
      insights,
      insightSetKey: navigationId,
      activeCategory: InsightComponents.Types.Category.ALL,
      activeInsight: null,
    };
    await coordinator.done();

    const userVisibleTitles = getUserVisibleInsights(component).flatMap(component => {
      return getCleanTextContentFromElements(component.shadowRoot!, '.insight-title');
    });
    assert.deepEqual(userVisibleTitles, [
      'LCP by phase',
      'LCP request discovery',
      'Render blocking requests',
      'Document request latency',
      'Third parties',
    ]);
  });

  it('does not render experimental insights by default', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'font-display.json.gz');
    const component = new Components.SidebarSingleInsightSet.SidebarSingleInsightSet();
    renderElementIntoDOM(component);
    const firstNavigation = parsedTrace.Meta.mainFrameNavigations.at(0)?.args.data?.navigationId;
    assert.isOk(firstNavigation);
    component.data = {
      parsedTrace,
      insights,
      insightSetKey: firstNavigation,
      activeCategory: InsightComponents.Types.Category.ALL,
      activeInsight: null,
    };
    await coordinator.done();
    const userVisibleTitles = getUserVisibleInsights(component).flatMap(component => {
      return getCleanTextContentFromElements(component.shadowRoot!, '.insight-title');
    });
    // Does not include "font display", which is experimental.
    assert.deepEqual(userVisibleTitles, [
      'LCP by phase',
      'Layout shift culprits',
      'Document request latency',
      'Third parties',
    ]);
  });

  it('renders experimental insights if the experiment is turned on', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'font-display.json.gz');
    const component = new Components.SidebarSingleInsightSet.SidebarSingleInsightSet();
    Root.Runtime.experiments.enableForTest(
        Root.Runtime.ExperimentName.TIMELINE_EXPERIMENTAL_INSIGHTS,
    );
    renderElementIntoDOM(component);
    const firstNavigation = parsedTrace.Meta.mainFrameNavigations.at(0)?.args.data?.navigationId;
    assert.isOk(firstNavigation);
    component.data = {
      parsedTrace,
      insights,
      insightSetKey: firstNavigation,
      activeCategory: InsightComponents.Types.Category.ALL,
      activeInsight: null,
    };
    await coordinator.done();
    const userVisibleTitles = getUserVisibleInsights(component).flatMap(component => {
      return getCleanTextContentFromElements(component.shadowRoot!, '.insight-title');
    });
    // Does not include "font display", which is experimental.
    assert.deepEqual(userVisibleTitles, [
      'LCP by phase',
      'Layout shift culprits',
      'Document request latency',
      'Font display',
      'Third parties',
    ]);
  });

  it('will render the active insight fully', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');

    assert.isOk(insights);
    // only one navigation in this trace.
    assert.strictEqual(insights.size, 1);
    // This is the navigationID from this trace.
    const navigationId = '8463DF94CD61B265B664E7F768183DE3';
    assert.isTrue(insights.has(navigationId));

    const component = new Components.SidebarSingleInsightSet.SidebarSingleInsightSet();
    renderElementIntoDOM(component);
    component.data = {
      parsedTrace,
      insights,
      insightSetKey: navigationId,
      activeCategory: InsightComponents.Types.Category.ALL,
      activeInsight: {
        name: 'lcp-by-phase',
        insightSetKey: navigationId,
        overlays: [],
      },
    };
    await coordinator.done();

    const expandedInsight = getUserVisibleInsights(component).find(insight => {
      return 'insightExpanded' in insight.dataset;
    });
    assert.isOk(expandedInsight);
    assert.strictEqual(expandedInsight.dataset.insightTitle, 'LCP by phase');
  });
});
