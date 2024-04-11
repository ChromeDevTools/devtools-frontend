// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import * as Coordinator from '../render_coordinator/render_coordinator.js';

import * as TwoStatesCounter from './two_states_counter.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const ACTIVE_SELECTOR = '.active';
const INACTIVE_SELECTOR = '.inactive';

async function renderCounter(data: TwoStatesCounter.TwoStatesCounter.TwoStatesCounterData) {
  const counter = new TwoStatesCounter.TwoStatesCounter.TwoStatesCounter();
  renderElementIntoDOM(counter);

  counter.data = data;
  await coordinator.done();
  return counter;
}

function assertContentAndTitleForPart(
    counter: TwoStatesCounter.TwoStatesCounter.TwoStatesCounter, selector: string, content: string, title?: string) {
  assert.isNotNull(counter.shadowRoot);
  const activeCount = counter.shadowRoot.querySelector(selector);
  assert.instanceOf(activeCount, HTMLSpanElement);
  assert.strictEqual(activeCount.textContent?.trim(), `${content}`);
  assert.strictEqual(activeCount.title, title ? `${title}` : '');
}

describe('TwoStatesCounter', () => {
  it('renders a counter with active count only', async () => {
    const data = {active: 3, inactive: 0, activeTitle: 'Num active'} as
        TwoStatesCounter.TwoStatesCounter.TwoStatesCounterData;
    const counter = await renderCounter(data);
    assert.isNotNull(counter.shadowRoot);

    assertContentAndTitleForPart(counter, ACTIVE_SELECTOR, `${data.active}`, data.activeTitle);
    assert.isNull(counter.shadowRoot.querySelector(INACTIVE_SELECTOR));
  });

  it('renders a counter with inactive count only', async () => {
    const data = {active: 0, inactive: 10, inactiveTitle: 'Num inactive'} as
        TwoStatesCounter.TwoStatesCounter.TwoStatesCounterData;
    const counter = await renderCounter(data);
    assert.isNotNull(counter.shadowRoot);

    assertContentAndTitleForPart(counter, INACTIVE_SELECTOR, `${data.inactive}`, data.inactiveTitle);
    assert.isNull(counter.shadowRoot.querySelector(ACTIVE_SELECTOR));
  });

  it('renders a counter with active and inactive counts', async () => {
    const data = {active: 2, inactive: 3, activeTitle: 'Num active', inactiveTitle: 'Num inactive'} as
        TwoStatesCounter.TwoStatesCounter.TwoStatesCounterData;
    const counter = await renderCounter(data);
    assert.isNotNull(counter.shadowRoot);

    assertContentAndTitleForPart(counter, ACTIVE_SELECTOR, `${data.active}`, data.activeTitle);
    assertContentAndTitleForPart(counter, INACTIVE_SELECTOR, `${data.inactive}`, data.inactiveTitle);
  });

  it('renders nothing if both counts are zero', async () => {
    const data = {active: 0, inactive: 0, inactiveTitle: 'Num inactive'} as
        TwoStatesCounter.TwoStatesCounter.TwoStatesCounterData;
    const counter = await renderCounter(data);
    assert.isNotNull(counter.shadowRoot);

    assert.isNull(counter.shadowRoot.querySelector(INACTIVE_SELECTOR));
    assert.isNull(counter.shadowRoot.querySelector(ACTIVE_SELECTOR));
  });
});
