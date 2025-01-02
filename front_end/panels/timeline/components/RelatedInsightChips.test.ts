// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../models/trace/trace.js';
import {
  dispatchClickEvent,
  getCleanTextContentFromElements,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as Components from './components.js';

describeWithEnvironment('RelatedInsightChips', () => {
  // Event doesn't matter, so let's keep this test quick and avoid parsing a trace.
  const FAKE_EVENT = {} as unknown as Trace.Types.Events.Event;

  it('renders nothing if the event has no insights', async () => {
    const component = new Components.RelatedInsightChips.RelatedInsightChips();
    renderElementIntoDOM(component);
    component.activeEvent = FAKE_EVENT;
    component.eventToRelatedInsightsMap = new Map();
    await RenderCoordinator.done();
    assert.isOk(component.shadowRoot);
    assert.strictEqual(component.shadowRoot.childElementCount, 0);
  });

  it('renders a chip for each insight the given event is associated with', async () => {
    const relatedInsight: Components.RelatedInsightChips.RelatedInsight = {
      insightLabel: 'Some fake insight',
      activateInsight: () => {},
      messages: [],
    };
    const relatedMap: Components.RelatedInsightChips.EventToRelatedInsightsMap = new Map();
    relatedMap.set(FAKE_EVENT, [relatedInsight]);

    const component = new Components.RelatedInsightChips.RelatedInsightChips();
    renderElementIntoDOM(component);
    component.activeEvent = FAKE_EVENT;
    component.eventToRelatedInsightsMap = relatedMap;
    await RenderCoordinator.done();
    assert.isOk(component.shadowRoot);

    const chips = component.shadowRoot.querySelectorAll<HTMLElement>('li.insight-chip');
    assert.lengthOf(chips, 1);
    const text = getCleanTextContentFromElements(chips[0], 'button .insight-label');
    assert.deepEqual(text, ['Some fake insight']);
  });

  it('renders any insight messages', async () => {
    const relatedInsight: Components.RelatedInsightChips.RelatedInsight = {
      insightLabel: 'Some fake insight',
      activateInsight: () => {},
      messages: [
        'Message 1',
        'Message 2',
      ],
    };
    const relatedMap: Components.RelatedInsightChips.EventToRelatedInsightsMap = new Map();
    relatedMap.set(FAKE_EVENT, [relatedInsight]);

    const component = new Components.RelatedInsightChips.RelatedInsightChips();
    renderElementIntoDOM(component);
    component.activeEvent = FAKE_EVENT;
    component.eventToRelatedInsightsMap = relatedMap;
    await RenderCoordinator.done();
    assert.isOk(component.shadowRoot);

    const regularChips = component.shadowRoot.querySelectorAll<HTMLElement>('li.insight-chip');
    assert.lengthOf(regularChips, 1);

    const optimizationChips = component.shadowRoot.querySelectorAll<HTMLElement>('li.insight-message-box');
    assert.lengthOf(optimizationChips, 2);

    const text1 = getCleanTextContentFromElements(optimizationChips[0], 'button');
    assert.deepEqual(text1, ['Insight: Some fake insight Message 1']);
    const text2 = getCleanTextContentFromElements(optimizationChips[1], 'button');
    assert.deepEqual(text2, ['Insight: Some fake insight Message 2']);
  });

  it('calls the activateInsight function when the insight is clicked', async () => {
    const activateStub = sinon.stub();
    const relatedInsight: Components.RelatedInsightChips.RelatedInsight = {
      insightLabel: 'Some fake insight',
      activateInsight: () => activateStub(),
      messages: [],
    };
    const relatedMap: Components.RelatedInsightChips.EventToRelatedInsightsMap = new Map();
    relatedMap.set(FAKE_EVENT, [relatedInsight]);

    const component = new Components.RelatedInsightChips.RelatedInsightChips();
    renderElementIntoDOM(component);
    component.activeEvent = FAKE_EVENT;
    component.eventToRelatedInsightsMap = relatedMap;
    await RenderCoordinator.done();
    assert.isOk(component.shadowRoot);

    const button = component.shadowRoot.querySelector('button');
    assert.isOk(button);
    dispatchClickEvent(button);
    assert.isTrue(activateStub.called);
  });
});
