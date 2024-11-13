// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../core/root/root.js';
import * as Trace from '../../../models/trace/trace.js';
import {getCleanTextContentFromElements, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as Components from './components.js';
import type * as InsightComponents from './insights/insights.js';

type BaseInsightComponent =
    InsightComponents.BaseInsightComponent.BaseInsightComponent<Trace.Insights.Types.InsightModel<{}>>;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

function getUserVisibleInsights(component: Components.SidebarSingleInsightSet.SidebarSingleInsightSet):
    BaseInsightComponent[] {
  assert.isOk(component.shadowRoot);
  return [...component.shadowRoot.querySelectorAll<BaseInsightComponent>('[data-insight-name]')];
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
      activeCategory: Trace.Insights.Types.InsightCategory.ALL,
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
      activeCategory: Trace.Insights.Types.InsightCategory.ALL,
      activeInsight: null,
    };
    await coordinator.done();
    const userVisibleTitles = getUserVisibleInsights(component).flatMap(component => {
      return getCleanTextContentFromElements(component.shadowRoot!, '.insight-title');
    });
    // Does not include "font display", which is experimental.
    assert.deepEqual(userVisibleTitles, [
      'LCP by phase',
      'LCP request discovery',
      'Layout shift culprits',
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
      activeCategory: Trace.Insights.Types.InsightCategory.ALL,
      activeInsight: null,
    };
    await coordinator.done();
    const userVisibleTitles = getUserVisibleInsights(component).flatMap(component => {
      return getCleanTextContentFromElements(component.shadowRoot!, '.insight-title');
    });
    // Does not include "font display", which is experimental.
    assert.deepEqual(userVisibleTitles, [
      'LCP by phase',
      'LCP request discovery',
      'Layout shift culprits',
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

    const model = insights.get(navigationId)?.model.LCPPhases;
    if (!model) {
      throw new Error('missing LCPPhases model');
    }

    const component = new Components.SidebarSingleInsightSet.SidebarSingleInsightSet();
    renderElementIntoDOM(component);
    component.data = {
      parsedTrace,
      insights,
      insightSetKey: navigationId,
      activeCategory: Trace.Insights.Types.InsightCategory.ALL,
      activeInsight: {
        model,
        insightSetKey: navigationId,
      },
    };
    await coordinator.done();

    const expandedInsight = getUserVisibleInsights(component).find(insight => {
      return insight.selected;
    });
    assert.isOk(expandedInsight);
    assert.strictEqual(expandedInsight.model?.title, 'LCP by phase');
  });
});
