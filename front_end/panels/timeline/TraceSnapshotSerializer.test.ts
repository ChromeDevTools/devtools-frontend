// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, it} from 'mocha';

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {setupIgnoreListManagerEnvironment} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

// eslint-disable-next-line @devtools/es-modules-import
import {captureTraceSnapshot} from './TraceSnapshotSerializer.js';

describeWithEnvironment('TraceSnapshotSerializer', function() {
  beforeEach(() => {
    setupIgnoreListManagerEnvironment();
  });

  it('captures engine insights, flamechart, decorateEntry canvas calls, details, and trees', async function() {
    const parsedTrace =
        await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz', {withModificationsManager: true});
    const snapshot = await captureTraceSnapshot(parsedTrace);

    assert.isEmpty(Object.values(snapshot.invariants).flat());
    assert.isNotEmpty(snapshot.engine.summary);
    assert.isNotEmpty(snapshot.engine.insights);
    assert.isNotEmpty(snapshot.flamechart.main.levels);
    assert.isTrue(Object.values(snapshot.flamechart.main.drawings).some(v => v.startsWith('drawn:')));
    assert.isNotEmpty(snapshot.ui.details);
    assert.includeMembers(Object.keys(snapshot.ui.trees),
                          ['bottomUp', 'bottomUpByCategory', 'callTree', 'eventLog', 'thirdParty', 'bottomUpZoomed']);
    const eventLogRows = JSON.stringify(snapshot.ui.trees.eventLog);
    assert.notInclude(eventLogRows, 'Symbol(uniqueId)');
  });

  it('records getDrawOverride canvas geometry', async function() {
    const clsTrace = await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz', {withModificationsManager: true});
    const clsSnapshot = await captureTraceSnapshot(clsTrace);
    assert.isTrue(Object.values(clsSnapshot.flamechart.main.drawings).some(v => v.startsWith('override pos(')));
    assert.isTrue(Object.values(clsSnapshot.flamechart.network.drawings).some(v => v.startsWith('override pos(')));
    assert.isTrue(Object.values(clsSnapshot.flamechart.network.levels).flat().some(l => l.includes('drawOverride')));
  });

  it('guards marker NaN durations', async function() {
    const marksTrace =
        await TraceLoader.traceEngine(this, 'extension-tracks-and-marks.json.gz', {withModificationsManager: true});
    const marksSnapshot = await captureTraceSnapshot(marksTrace);
    assert.notInclude(JSON.stringify(marksSnapshot.flamechart.main.levels), 'NaN');
  });
});
