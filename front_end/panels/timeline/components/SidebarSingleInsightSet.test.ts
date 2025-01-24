// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../core/root/root.js';
import * as Trace from '../../../models/trace/trace.js';
import {getCleanTextContentFromElements, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as Components from './components.js';
import type * as InsightComponents from './insights/insights.js';

type BaseInsightComponent =
    InsightComponents.BaseInsightComponent.BaseInsightComponent<Trace.Insights.Types.InsightModel<{}>>;

function getUserVisibleInsights(component: Components.SidebarSingleInsightSet.SidebarSingleInsightSet):
    BaseInsightComponent[] {
  assert.isOk(component.shadowRoot);
  return [...component.shadowRoot.querySelectorAll<BaseInsightComponent>('[data-insight-name]')];
}

function getPassedInsights(component: Components.SidebarSingleInsightSet.SidebarSingleInsightSet):
    BaseInsightComponent[] {
  assert.isOk(component.shadowRoot);
  return [...component.shadowRoot.querySelectorAll<BaseInsightComponent>(
      '.passed-insights-section [data-insight-name]')];
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

    const userVisibleTitles = getUserVisibleInsights(component).flatMap(component => {
      return getCleanTextContentFromElements(component.shadowRoot!, '.insight-title');
    });
    assert.deepEqual(userVisibleTitles, [
      'LCP by phase',
      'LCP request discovery',
      'Render blocking requests',
      'Document request latency',
      'Third parties',
      'INP by phase',
      'Layout shift culprits',
      'Improve image delivery',
      'Optimize viewport for mobile',
      'Optimize DOM size',
      'CSS Selector costs',
      'Forced reflow',
    ]);

    const passedInsightTitles = getPassedInsights(component).flatMap(component => {
      return getCleanTextContentFromElements(component.shadowRoot!, '.insight-title');
    });
    assert.deepEqual(passedInsightTitles, [
      'INP by phase',
      'Layout shift culprits',
      'Improve image delivery',
      'Optimize viewport for mobile',
      'Optimize DOM size',
      'CSS Selector costs',
      'Forced reflow',
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
    const userVisibleTitles = getUserVisibleInsights(component).flatMap(component => {
      return getCleanTextContentFromElements(component.shadowRoot!, '.insight-title');
    });
    // Does not include "font display", which is experimental.
    assert.deepEqual(userVisibleTitles, [
      'LCP by phase',
      'Layout shift culprits',
      'Improve image delivery',
      'Third parties',
      'INP by phase',
      'LCP request discovery',
      'Render blocking requests',
      'Document request latency',
      'Optimize viewport for mobile',
      'Optimize DOM size',
      'CSS Selector costs',
      'Forced reflow',
    ]);

    const passedInsightTitles = getPassedInsights(component).flatMap(component => {
      return getCleanTextContentFromElements(component.shadowRoot!, '.insight-title');
    });
    // Does not include "font display", which is experimental.
    assert.deepEqual(passedInsightTitles, [
      'INP by phase',
      'LCP request discovery',
      'Render blocking requests',
      'Document request latency',
      'Optimize viewport for mobile',
      'Optimize DOM size',
      'CSS Selector costs',
      'Forced reflow',
    ]);
  });

  it('renders experimental insights if the experiment is turned on', async function() {
    const {parsedTrace, metadata, insights} = await TraceLoader.traceEngine(this, 'font-display.json.gz');
    const component = new Components.SidebarSingleInsightSet.SidebarSingleInsightSet();
    Root.Runtime.experiments.enableForTest(
        Root.Runtime.ExperimentName.TIMELINE_EXPERIMENTAL_INSIGHTS,
    );
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
    const userVisibleTitles = getUserVisibleInsights(component).flatMap(component => {
      return getCleanTextContentFromElements(component.shadowRoot!, '.insight-title');
    });
    // Includes "font display", which is experimental.
    assert.deepEqual(userVisibleTitles, [
      'LCP by phase',
      'Layout shift culprits',
      'Improve image delivery',
      'Font display',
      'Third parties',
      'INP by phase',
      'LCP request discovery',
      'Render blocking requests',
      'Document request latency',
      'Optimize viewport for mobile',
      'Optimize DOM size',
      'CSS Selector costs',
      'Long critical network tree',
      'Forced reflow',
    ]);

    const passedInsightTitles = getPassedInsights(component).flatMap(component => {
      return getCleanTextContentFromElements(component.shadowRoot!, '.insight-title');
    });
    assert.deepEqual(passedInsightTitles, [
      'INP by phase',
      'LCP request discovery',
      'Render blocking requests',
      'Document request latency',
      'Optimize viewport for mobile',
      'Optimize DOM size',
      'CSS Selector costs',
      'Long critical network tree',
      'Forced reflow',
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

    const model = insights.get(navigationId)?.model.LCPPhases;
    if (!model) {
      throw new Error('missing LCPPhases model');
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

    const expandedInsight = getUserVisibleInsights(component).find(insight => {
      return insight.selected;
    });
    assert.isOk(expandedInsight);
    assert.strictEqual(expandedInsight.model?.title, 'LCP by phase');
  });
});
