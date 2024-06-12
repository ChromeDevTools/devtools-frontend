// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LiveMetrics from '../../../models/live-metrics/live-metrics.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as Components from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithEnvironment('LiveMetricsView', () => {
  beforeEach(async () => {
    LiveMetrics.LiveMetrics.instance({forceNew: true});
  });

  it('should show LCP value', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    LiveMetrics.LiveMetrics.instance().dispatchEventToListeners(LiveMetrics.Events.Status, {
      lcp: {value: 100, rating: 'good'},
      interactions: [],
    });
    await coordinator.done();
    const metricEl = view.shadowRoot?.querySelector('#lcp') as HTMLDivElement;
    const metricValueEl = metricEl.querySelector('.metric-card-value') as HTMLDivElement;
    assert.strictEqual(metricValueEl.className, 'metric-card-value good');
    assert.strictEqual(metricValueEl.innerText, '100 ms');
  });

  it('should show CLS value', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    LiveMetrics.LiveMetrics.instance().dispatchEventToListeners(LiveMetrics.Events.Status, {
      cls: {value: 1.34294789234, rating: 'needs-improvement'},
      interactions: [],
    });
    await coordinator.done();
    const metricEl = view.shadowRoot?.querySelector('#cls') as HTMLDivElement;
    const metricValueEl = metricEl.querySelector('.metric-card-value') as HTMLDivElement;
    assert.strictEqual(metricValueEl.className, 'metric-card-value needs-improvement');
    assert.strictEqual(metricValueEl.innerText, '1.343');
  });

  it('should show INP value', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    LiveMetrics.LiveMetrics.instance().dispatchEventToListeners(
        LiveMetrics.Events.Status, {inp: {value: 2000, rating: 'poor', interactionType: 'pointer'}, interactions: []});
    await coordinator.done();
    const metricEl = view.shadowRoot?.querySelector('#inp') as HTMLDivElement;
    const metricValueEl = metricEl.querySelector('.metric-card-value') as HTMLDivElement;
    assert.strictEqual(metricValueEl.className, 'metric-card-value poor');
    assert.strictEqual(metricValueEl.innerText, '2.00 s');
  });

  it('should show empty metric', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    await coordinator.done();
    const metricEl = view.shadowRoot?.querySelector('#inp') as HTMLDivElement;
    const metricValueEl = metricEl.querySelector('.metric-card-value') as HTMLDivElement;
    assert.strictEqual(metricValueEl.className.trim(), 'metric-card-value waiting');
    assert.strictEqual(metricValueEl.innerText, '-');
  });

  it('should show interactions', async () => {
    const view = new Components.LiveMetricsView.LiveMetricsView();
    renderElementIntoDOM(view);
    LiveMetrics.LiveMetrics.instance().dispatchEventToListeners(LiveMetrics.Events.Status, {
      interactions: [
        {duration: 500, rating: 'poor', interactionType: 'pointer'},
        {duration: 30, rating: 'good', interactionType: 'keyboard'},
      ],
    });
    await coordinator.done();
    const interactionsListEl = view.shadowRoot?.querySelector('.interactions-list') as HTMLDivElement;
    const interactionsEls = interactionsListEl.querySelectorAll('.interaction');
    assert.lengthOf(interactionsEls, 2);

    const typeEl1 = interactionsEls[0].querySelector('.interaction-type') as HTMLDivElement;
    assert.strictEqual(typeEl1.textContent, 'pointer');

    const durationEl1 = interactionsEls[0].querySelector('.interaction-duration') as HTMLDivElement;
    assert.strictEqual(durationEl1.textContent, '500 ms');
    assert.strictEqual(durationEl1.className, 'interaction-duration poor');

    const typeEl2 = interactionsEls[1].querySelector('.interaction-type') as HTMLDivElement;
    assert.strictEqual(typeEl2.textContent, 'keyboard');

    const durationEl2 = interactionsEls[1].querySelector('.interaction-duration') as HTMLDivElement;
    assert.strictEqual(durationEl2.textContent, '30 ms');
    assert.strictEqual(durationEl2.className, 'interaction-duration good');
  });
});
