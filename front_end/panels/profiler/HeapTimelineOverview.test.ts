// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import * as Profiler from './profiler.js';

describeWithEnvironment('HeapTimelineOverview', () => {
  // Returns how often a theme change makes the overview update.
  function countUpdatesOnThemeChange(overview: Profiler.HeapTimelineOverview.HeapTimelineOverview): number {
    const update = sinon.stub(overview, 'update');
    ThemeSupport.ThemeSupport.instance().dispatchEvent(new ThemeSupport.ThemeChangeEvent());
    update.restore();
    return update.callCount;
  }

  it('only handles theme changes while shown', () => {
    const overview = new Profiler.HeapTimelineOverview.HeapTimelineOverview();
    assert.strictEqual(countUpdatesOnThemeChange(overview), 0);

    for (let i = 0; i < 3; ++i) {
      renderElementIntoDOM(overview);
      assert.strictEqual(countUpdatesOnThemeChange(overview), 1);

      overview.detach();
      assert.strictEqual(countUpdatesOnThemeChange(overview), 0);
    }
  });

  it('updates when shown again after a theme change while hidden', () => {
    const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
    try {
      const overview = new Profiler.HeapTimelineOverview.HeapTimelineOverview();
      renderElementIntoDOM(overview);
      clock.runAll();
      overview.detach();
      ThemeSupport.ThemeSupport.instance().dispatchEvent(new ThemeSupport.ThemeChangeEvent());

      const update = sinon.spy(overview, 'update');
      renderElementIntoDOM(overview);
      clock.runAll();
      sinon.assert.calledOnce(update);
      overview.detach();
    } finally {
      clock.restore();
    }
  });

  it('updates samples and dispatches range changes via samples setter', () => {
    const overview = new Profiler.HeapTimelineOverview.HeapTimelineOverview();
    assert.isFalse(overview.hasEventListeners(Profiler.HeapTimelineOverview.Events.IDS_RANGE_CHANGED));
    const rangeEvents: Profiler.HeapTimelineOverview.IdsRangeChangedEvent[] = [];
    const domRangeEvents: Profiler.HeapTimelineOverview.IdsRangeChangedEvent[] = [];
    overview.addEventListener(Profiler.HeapTimelineOverview.Events.IDS_RANGE_CHANGED, e => rangeEvents.push(e.data));
    overview.element.addEventListener(Profiler.HeapTimelineOverview.Events.IDS_RANGE_CHANGED, event => {
      domRangeEvents.push((event as CustomEvent<Profiler.HeapTimelineOverview.IdsRangeChangedEvent>).detail);
    });

    const samples = new Profiler.HeapTimelineOverview.Samples();
    samples.ids = [10, 20];
    samples.timestamps = [0, 1000];
    samples.sizes = [64, 128];
    samples.max = [64, 128];
    samples.totalTime = 1000;

    overview.samples = samples;
    assert.strictEqual(overview.samples, samples);
    assert.deepEqual(rangeEvents, [{minId: 0, maxId: Infinity, size: 192}]);
    assert.deepEqual(domRangeEvents, [{minId: 0, maxId: Infinity, size: 192}]);
  });

  it('toggles running state via isRunning setter', () => {
    const overview = new Profiler.HeapTimelineOverview.HeapTimelineOverview();
    overview.isRunning = true;
    assert.isTrue(overview.isRunning);
    overview.isRunning = false;
    assert.isFalse(overview.isRunning);
  });
});
