// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  renderElementIntoDOM,
} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../../../testing/EnvironmentHelpers.js';
import {getInsightOrError} from '../../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../../testing/TraceLoader.js';
import * as RenderCoordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';

import * as Insights from './insights.js';

describeWithEnvironment('INP breakdown component', () => {
  beforeEach(() => {
    // Ensure the environment is setup for AI being supported so we can
    // test the presence of the button being conditional on the insight
    // having a longest interaction event.
    updateHostConfig({
      aidaAvailability: {
        enabled: true,
      },
      devToolsAiAssistancePerformanceAgent: {
        enabled: true,
        insightsEnabled: true,
      }
    });
  });

  it('enables "Ask AI" if the page has an interaction', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
    assert.isOk(parsedTrace.insights);
    const firstInsightSet = parsedTrace.insights.values().next()?.value;
    assert.isOk(firstInsightSet);
    const [firstNav] = parsedTrace.data.Meta.mainFrameNavigations;
    const interactionInsight = getInsightOrError('INPBreakdown', parsedTrace.insights, firstNav);
    assert.isDefined(interactionInsight.longestInteractionEvent);

    const component = new Insights.INPBreakdown.INPBreakdown();
    component.model = interactionInsight;
    component.insightSetKey = firstInsightSet.id;
    component.bounds = parsedTrace.data.Meta.traceBounds;
    component.selected = true;
    renderElementIntoDOM(component);
    await RenderCoordinator.done();
    assert.isOk(component.shadowRoot);

    const button = component.shadowRoot.querySelector('devtools-button[data-insights-ask-ai]');
    assert.instanceOf(button, HTMLElement);
  });

  it('disables "Ask AI" if the page has no interaction', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'unsized-images.json.gz');
    assert.isOk(parsedTrace.insights);
    const firstInsightSet = parsedTrace.insights.values().next()?.value;
    assert.isOk(firstInsightSet);
    const [firstNav] = parsedTrace.data.Meta.mainFrameNavigations;
    const interactionInsight = getInsightOrError('INPBreakdown', parsedTrace.insights, firstNav);
    assert.isUndefined(interactionInsight.longestInteractionEvent);

    const component = new Insights.INPBreakdown.INPBreakdown();
    component.model = interactionInsight;
    component.insightSetKey = firstInsightSet.id;
    component.bounds = parsedTrace.data.Meta.traceBounds;
    component.selected = true;
    renderElementIntoDOM(component);
    await RenderCoordinator.done();
    assert.isOk(component.shadowRoot);

    const button = component.shadowRoot.querySelector('devtools-button[data-insights-ask-ai]');
    assert.isNull(button);
  });
});
