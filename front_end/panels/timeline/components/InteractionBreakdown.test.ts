// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertShadowRoot, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as TimelineComponents from './components.js';

describeWithEnvironment('InteractionBreakdown', () => {
  const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
  const {InteractionBreakdown} = TimelineComponents.InteractionBreakdown;

  it('renders the breakdowns for an InteractionBreakdown', async function() {
    const traceData = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
    const longInteraction = traceData.UserInteractions.longestInteractionEvent;
    if (!longInteraction) {
      throw new Error('Could not find longest interaction');
    }

    const breakdown = new InteractionBreakdown();
    breakdown.entry = longInteraction;
    renderElementIntoDOM(breakdown);
    await coordinator.done();
    assertShadowRoot(breakdown.shadowRoot);

    const inputDelay = breakdown.shadowRoot.querySelector('[data-entry="input-delay"] .value')?.textContent;
    assert.strictEqual(inputDelay, '1ms');
    const processingTime = breakdown.shadowRoot.querySelector('[data-entry="processing-time"] .value')?.textContent;
    assert.strictEqual(processingTime, '977ms');
    const presentationDelay =
        breakdown.shadowRoot.querySelector('[data-entry="presentation-delay"] .value')?.textContent;
    assert.strictEqual(presentationDelay, '1.974ms');
  });
});
