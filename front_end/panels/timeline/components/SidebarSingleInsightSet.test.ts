// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import {getCleanTextContentFromElements, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as Components from './components.js';
import type * as InsightComponents from './insights/insights.js';

type BaseInsightComponent =
    InsightComponents.BaseInsightComponent.BaseInsightComponent<Trace.Insights.Types.InsightModel>;

function getUserVisibleInsights(component: Components.SidebarSingleInsightSet.SidebarSingleInsightSet): string[] {
  assert.isOk(component.shadowRoot);
  return [...component.shadowRoot.querySelectorAll<BaseInsightComponent>('[data-insight-name]')]
      .flatMap(component => getCleanTextContentFromElements(component.shadowRoot!, '.insight-title'))
      .filter(Boolean);
}

function getPassedInsights(component: Components.SidebarSingleInsightSet.SidebarSingleInsightSet): string[] {
  assert.isOk(component.shadowRoot);
  const passedInsightsSection = component.shadowRoot.querySelector<HTMLDetailsElement>('.passed-insights-section');
  assert.isOk(passedInsightsSection);
  passedInsightsSection.open = true;
  return [
    ...passedInsightsSection.querySelectorAll<BaseInsightComponent>('.passed-insights-section [data-insight-name]')
  ].flatMap(component => getCleanTextContentFromElements(component.shadowRoot!, '.insight-title'));
}

describeWithEnvironment('SidebarSingleInsightSet', () => {
  it('renders a list of insights', async function() {
    const {insights, metadata, parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');

    assert.isOk(insights);
    // only one navigation in this trace.
    assert.strictEqual(insights.size, 1);
    // This is the navigationID from this trace.
    const navigationId = '8463DF94CD61B265B664E7F768183DE3';
    assert.isTrue(insights.has(navigationId));

    const component = new Components.SidebarSingleInsightSet.SidebarSingleInsightSet();
    renderElementIntoDOM(component);
    component.data = {
      insights,
      insightSetKey: navigationId,
      activeCategory: Trace.Insights.Types.InsightCategory.ALL,
      activeInsight: null,
      parsedTrace,
      traceMetadata: metadata,
    };
    await RenderCoordinator.done();

    const userVisibleTitles = getUserVisibleInsights(component);
    assert.deepEqual(userVisibleTitles, [
      'LCP breakdown',
      'LCP request discovery',
      'Render blocking requests',
      'Document request latency',
      '3rd parties',
    ]);

    const passedInsightTitles = getPassedInsights(component);
    assert.deepEqual(passedInsightTitles, [
      'INP breakdown',
      'Layout shift culprits',
      'Network dependency tree',
      'Improve image delivery',
      'Font display',
      'Optimize viewport for mobile',
      'Optimize DOM size',
      'Duplicated JavaScript',
      'CSS Selector costs',
      'Forced reflow',
      'Use efficient cache lifetimes',
      'Modern HTTP',
      'Legacy JavaScript',
    ]);
  });

  it('does not render experimental insights by default', async function() {
    const {parsedTrace, metadata, insights} = await TraceLoader.traceEngine(this, 'font-display.json.gz');
    const component = new Components.SidebarSingleInsightSet.SidebarSingleInsightSet();
    renderElementIntoDOM(component);
    const firstNavigation = parsedTrace.Meta.mainFrameNavigations.at(0)?.args.data?.navigationId;
    assert.isOk(firstNavigation);
    component.data = {
      insights,
      insightSetKey: firstNavigation,
      activeCategory: Trace.Insights.Types.InsightCategory.ALL,
      activeInsight: null,
      parsedTrace,
      traceMetadata: metadata,
    };
    await RenderCoordinator.done();
    const userVisibleTitles = getUserVisibleInsights(component);
    // Does not include "font display", which is experimental.
    assert.deepEqual(userVisibleTitles, [
      'LCP breakdown',
      'Layout shift culprits',
      'Network dependency tree',
      'Improve image delivery',
      'Font display',
      '3rd parties',
      'Use efficient cache lifetimes',
    ]);

    const passedInsightTitles = getPassedInsights(component);
    // Does not include "font display", which is experimental.
    assert.deepEqual(passedInsightTitles, [
      'INP breakdown',
      'LCP request discovery',
      'Render blocking requests',
      'Document request latency',
      'Optimize viewport for mobile',
      'Optimize DOM size',
      'Duplicated JavaScript',
      'CSS Selector costs',
      'Forced reflow',
      'Modern HTTP',
      'Legacy JavaScript',
    ]);
  });

  it('will render the active insight fully', async function() {
    const {insights, metadata, parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');

    assert.isOk(insights);
    // only one navigation in this trace.
    assert.strictEqual(insights.size, 1);
    // This is the navigationID from this trace.
    const navigationId = '8463DF94CD61B265B664E7F768183DE3';
    assert.isTrue(insights.has(navigationId));

    const model = insights.get(navigationId)?.model.LCPBreakdown;
    if (!model) {
      throw new Error('missing LCPBreakdown model');
    }

    const component = new Components.SidebarSingleInsightSet.SidebarSingleInsightSet();
    renderElementIntoDOM(component);
    component.data = {
      insights,
      insightSetKey: navigationId,
      activeCategory: Trace.Insights.Types.InsightCategory.ALL,
      activeInsight: {
        model,
        insightSetKey: navigationId,
      },
      parsedTrace,
      traceMetadata: metadata,
    };
    await RenderCoordinator.done();

    const expandedInsight =
        [...component.shadowRoot!.querySelectorAll<BaseInsightComponent>('[data-insight-name]')].find(insight => {
          return insight.selected;
        });
    assert.isOk(expandedInsight);
    assert.strictEqual(expandedInsight.model?.title, 'LCP breakdown');
  });
});
