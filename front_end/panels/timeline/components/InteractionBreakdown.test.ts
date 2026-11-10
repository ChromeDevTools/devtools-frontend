// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, it} from 'mocha';

import {assertScreenshot, renderElementIntoDOM, setColorScheme} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

import * as TimelineComponents from './components.js';

describeWithEnvironment('InteractionBreakdown', () => {
  const {InteractionBreakdown} = TimelineComponents.InteractionBreakdown;

  afterEach(() => {
    setColorScheme('light');
  });

  it('renders the breakdowns for an InteractionBreakdown', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
    const longInteraction = parsedTrace.data.UserInteractions.longestInteractionEvent;
    if (!longInteraction) {
      throw new Error('Could not find longest interaction');
    }

    const breakdown = new InteractionBreakdown();
    breakdown.entry = longInteraction;
    renderElementIntoDOM(breakdown);
    await breakdown.updateComplete;
    assert.isNotNull(breakdown.element.shadowRoot);

    const inputDelay = breakdown.element.shadowRoot.querySelector('[data-entry="input-delay"] .value')?.textContent;
    assert.strictEqual(inputDelay, '1\xA0ms');
    const processingDuration =
        breakdown.element.shadowRoot.querySelector('[data-entry="processing-duration"] .value')?.textContent;
    assert.strictEqual(processingDuration, '977\xA0ms');
    const presentationDelay =
        breakdown.element.shadowRoot.querySelector('[data-entry="presentation-delay"] .value')?.textContent;
    assert.strictEqual(presentationDelay, '2\xA0ms');
    assert.strictEqual(getComputedStyle(breakdown.contentElement).display, 'block');
  });

  it('applies display: block to the scoping root via :scope', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
    const longInteraction = parsedTrace.data.UserInteractions.longestInteractionEvent;
    if (!longInteraction) {
      throw new Error('Could not find longest interaction');
    }

    const spanTarget = document.createElement('span');
    renderElementIntoDOM(spanTarget);
    TimelineComponents.InteractionBreakdown.DEFAULT_VIEW({entry: longInteraction}, undefined, spanTarget);

    assert.strictEqual(getComputedStyle(spanTarget).display, 'block');
  });

  it('renders correctly in light and dark theme', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
    const longInteraction = parsedTrace.data.UserInteractions.longestInteractionEvent;
    if (!longInteraction) {
      throw new Error('Could not find longest interaction');
    }

    const breakdown = new InteractionBreakdown();
    breakdown.entry = longInteraction;
    renderElementIntoDOM(breakdown);
    await breakdown.updateComplete;

    setColorScheme('light');
    await assertScreenshot('timeline/interaction_breakdown_light.png');

    setColorScheme('dark');
    await assertScreenshot('timeline/interaction_breakdown_dark.png');
  });
});
