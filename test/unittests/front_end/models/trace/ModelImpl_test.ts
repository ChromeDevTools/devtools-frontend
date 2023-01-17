// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../front_end/models/trace/trace.js';

const {assert} = chai;

import {loadEventsFromTraceFile, setTraceModelTimeout} from '../../helpers/TraceHelpers.js';

describe('TraceModel', async function() {
  setTraceModelTimeout(this);
  it('dispatches start and end events when parsing model data', function(done) {
    const model = new TraceModel.TraceModel.Model();
    const events: string[] = [];

    model.addEventListener(TraceModel.TraceModel.ModelUpdateEvent.eventName, (evt: Event) => {
      const updateEvent = evt as TraceModel.TraceModel.ModelUpdateEvent;
      if (TraceModel.TraceModel.isModelUpdateEventDataTrace(updateEvent.data)) {
        if (updateEvent.data.data === 'done') {
          events.push('traceProcessor:done');
        }
      } else if (TraceModel.TraceModel.isModelUpdateEventDataGlobal(updateEvent.data)) {
        if (updateEvent.data.data === 'done') {
          events.push('global:done');
        }
      }

      if (events.length === 2) {
        assert.deepEqual(events, [
          'traceProcessor:done',
          'global:done',
        ]);
        done();
      } else if (events.length > 2) {
        assert.fail(`Got unexpectedly more than 2 events: ${events}`);
      }
    });

    void loadEventsFromTraceFile('basic.json.gz').then(events => model.parse(events));
  });

  it('supports parsing multiple traces', async () => {
    const model = new TraceModel.TraceModel.Model();
    const file1 = await loadEventsFromTraceFile('basic.json.gz');
    const file2 = await loadEventsFromTraceFile('slow-interaction-keydown.json.gz');

    await model.parse(file1);
    model.reset();
    await model.parse(file2);
    model.reset();

    assert.strictEqual(model.size(), 2);
    assert.isNotNull(model.traceParsedData(0));
    assert.isNotNull(model.traceParsedData(1));
  });

  it('supports deleting traces', async () => {
    const model = new TraceModel.TraceModel.Model();
    const file1 = await loadEventsFromTraceFile('basic.json.gz');
    const file2 = await loadEventsFromTraceFile('slow-interaction-keydown.json.gz');

    await model.parse(file1);
    model.reset();
    await model.parse(file2);
    model.reset();

    // Test only one trace is deleted.
    assert.strictEqual(model.size(), 2);
    model.deleteTraceByIndex(0);
    assert.strictEqual(model.size(), 1);
    assert.isNotNull(model.traceParsedData(0));

    model.deleteTraceByIndex(0);
    assert.strictEqual(model.size(), 0);
    assert.isNull(model.traceParsedData(0));
  });

  it('names traces using their origin and defaults to "Trace n" when no origin is found', async function() {
    const model = new TraceModel.TraceModel.Model();
    const traceFiles = [
      await loadEventsFromTraceFile('threejs-gpu.json.gz'),
      await loadEventsFromTraceFile('web-dev.json.gz'),
      // Process the previous trace again to test the trace sequencing
      await loadEventsFromTraceFile('web-dev.json.gz'),
      await loadEventsFromTraceFile('multiple-navigations.json.gz'),
      await loadEventsFromTraceFile('basic.json.gz'),
    ];
    for (const traceFile of traceFiles) {
      await model.parse(traceFile);
      model.reset();
    }
    const expectedResults = [
      'threejs.org (1)',
      'web.dev (1)',
      'web.dev (2)',
      'google.com (1)',
      'Trace 5',
    ];
    assert.deepEqual(model.getRecordingsAvailable(), expectedResults);
  });
});
