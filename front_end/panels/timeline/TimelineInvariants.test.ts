// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, it} from 'mocha';

import * as Trace from '../../models/trace/trace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {setupIgnoreListManagerEnvironment} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as Timeline from './timeline.js';
// eslint-disable-next-line @devtools/es-modules-import
import {checkTimelineInvariants, type TimelineInvariants} from './TimelineInvariants.js';

const EMPTY_VIOLATIONS: TimelineInvariants = {
  levelPacking: [],
  treeIntegrity: [],
  trackEventOrder: [],
  rebuild: [],
  selectionRoundTrip: [],
  eventsSerializerRoundTrip: [],
  treeViewAccounting: [],
  entriesFilterUndo: [],
};

const FIXTURES = [
  'web-dev-with-commit.json.gz',
  'one-second-interaction.json.gz',
  'extension-tracks-and-marks.json.gz',
  'changing-priority.json.gz',
  'async-js-calls.json.gz',
];

describeWithEnvironment('TimelineInvariants', function() {
  beforeEach(() => {
    setupIgnoreListManagerEnvironment();
  });

  for (const fixture of FIXTURES) {
    it(`holds across ${fixture}`, async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, fixture, {withModificationsManager: true});
      const violations = checkTimelineInvariants({parsedTrace});
      assert.deepEqual(violations, EMPTY_VIOLATIONS, JSON.stringify(violations, null, 2));
    });
  }

  it('flags overlapping entries on the same flame chart level', async function() {
    const parsedTrace =
        await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz', {withModificationsManager: true});
    const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    const mainProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    mainProvider.setModel(parsedTrace, entityMapper);
    const data = mainProvider.timelineData();
    // Force two long bars onto the same level at identical start times.
    const longIndices: number[] = [];
    for (let i = 0; i < data.entryTotalTimes.length && longIndices.length < 2; i++) {
      if (data.entryTotalTimes[i] > 1 && data.entryLevels[i] >= 0) {
        longIndices.push(i);
      }
    }
    assert.lengthOf(longIndices, 2);
    data.entryLevels[longIndices[1]] = data.entryLevels[longIndices[0]];
    data.entryStartTimes[longIndices[1]] = data.entryStartTimes[longIndices[0]];

    const violations = checkTimelineInvariants({parsedTrace, entityMapper, mainProvider});
    assert.isNotEmpty(violations.levelPacking);
  });
});
