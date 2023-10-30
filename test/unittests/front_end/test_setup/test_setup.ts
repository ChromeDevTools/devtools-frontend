// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * This file is automatically loaded and run by Karma because it automatically
 * loads and injects all *.js files it finds.
 */
import type * as Common from '../../../../front_end/core/common/common.js';
import * as TraceEngine from '../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../front_end/panels/timeline/timeline.js';
import * as ThemeSupport from '../../../../front_end/ui/legacy/theme_support/theme_support.js';
import {resetTestDOM} from '../helpers/DOMHelpers.js';
import {markStaticTestsLoaded} from '../helpers/RealConnection.js';
import {
  checkForPendingActivity,
  startTrackingAsyncActivity,
  stopTrackingAsyncActivity,
} from '../helpers/TrackAsyncOperations.js';

before(async function() {
  /* Larger than normal timeout because we've seen some slowness on the bots */
  this.timeout(10000);
  // @ts-ignore
  markStaticTestsLoaded({hasOnly: this.test.parent.hasOnly()});
});

beforeEach(() => {
  resetTestDOM();
  // Ensure that no trace data leaks between tests when testing the trace engine.
  for (const handler of Object.values(TraceEngine.Handlers.ModelHandlers)) {
    handler.reset();
  }
  Timeline.SourceMapsResolver.SourceMapsResolver.clearResolvedNodeNames();

  // Some unit tests exercise code that assumes a ThemeSupport instance is available.
  // Run this in a beforeEach in case an individual test overrides it.
  const setting = {
    get() {
      return 'default';
    },
  } as Common.Settings.Setting<string>;
  ThemeSupport.ThemeSupport.instance({forceNew: true, setting});

  startTrackingAsyncActivity();
});

afterEach(async () => {
  await checkForPendingActivity();
  sinon.restore();
  stopTrackingAsyncActivity();
  // Clear out any Sinon stubs or spies between individual tests.
});
