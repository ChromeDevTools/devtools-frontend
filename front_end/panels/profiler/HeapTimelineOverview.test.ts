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
});
