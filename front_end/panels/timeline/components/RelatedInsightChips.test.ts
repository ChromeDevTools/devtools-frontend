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

import * as Components from './components.js';

describeWithEnvironment('RelatedInsightChips', () => {
  // Event doesn't matter, so let's keep this test quick and avoid parsing a trace.
  const FAKE_EVENT = {} as unknown as Trace.Types.Events.Event;

  async function renderComponent(relatedMap: Components.RelatedInsightChips.EventToRelatedInsightsMap):
      Promise<HTMLElement> {
    const component = new Components.RelatedInsightChips.RelatedInsightChips();
    renderElementIntoDOM(component);
    component.activeEvent = FAKE_EVENT;
    component.eventToInsightsMap = relatedMap;
    await component.updateComplete;
    return component.contentElement;
  }

  it('renders nothing if the event has no insights', async () => {
    const output = await renderComponent(new Map());
    assert.strictEqual(output.childElementCount, 0);
  });

  it('renders a chip for each insight the given event is associated with', async () => {
    const relatedInsight: Components.RelatedInsightChips.RelatedInsight = {
      insightLabel: 'Some fake insight',
      activateInsight: () => {},
      messages: [],
    };
    const relatedMap: Components.RelatedInsightChips.EventToRelatedInsightsMap = new Map();
    relatedMap.set(FAKE_EVENT, [relatedInsight]);

    const element = await renderComponent(relatedMap);
    const chips = element.querySelectorAll<HTMLElement>('li.insight-chip');
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

    const element = await renderComponent(relatedMap);
    const regularChips = element.querySelectorAll<HTMLElement>('li.insight-chip');
    assert.lengthOf(regularChips, 1);

    const optimizationChips = element.querySelectorAll<HTMLElement>('li.insight-message-box');
    assert.lengthOf(optimizationChips, 2);

    const text1 = getCleanTextContentFromElements(optimizationChips[0], 'button');
    assert.deepEqual(text1, ['Insight: Some fake insight\nMessage 1']);
    const text2 = getCleanTextContentFromElements(optimizationChips[1], 'button');
    assert.deepEqual(text2, ['Insight: Some fake insight\nMessage 2']);
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
    const element = await renderComponent(relatedMap);

    const button = element.querySelector('button');
    assert.isOk(button);
    dispatchClickEvent(button);
    sinon.assert.called(activateStub);
  });
});
