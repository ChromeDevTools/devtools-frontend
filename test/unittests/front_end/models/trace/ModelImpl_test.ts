// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../front_end/models/trace/trace.js';

const {assert} = chai;

import {loadEventsFromTraceFile} from '../../helpers/TraceHelpers.js';

describe('TraceModel', async function() {
  it('dispatches an end event when the trace is done', function(done) {
    const model = TraceModel.TraceModel.Model.createWithAllHandlers();
    const events: string[] = [];

    model.addEventListener(TraceModel.TraceModel.ModelUpdateEvent.eventName, (evt: Event) => {
      const updateEvent = evt as TraceModel.TraceModel.ModelUpdateEvent;
      if (TraceModel.TraceModel.isModelUpdateDataComplete(updateEvent.data)) {
        events.push('done');
      }

      assert.deepEqual(events, ['done']);
      done();
    });

    void loadEventsFromTraceFile(this, 'basic.json.gz').then(events => model.parse(events));
  });

  it('supports parsing a generic trace that has no browser specific details', async function() {
    const model = TraceModel.TraceModel.Model.createWithAllHandlers();
    const file1 = await loadEventsFromTraceFile(this, 'generic-about-tracing-trace.json.gz');
    await model.parse(file1);
    assert.strictEqual(model.size(), 1);
  });

  it('supports being given a set of handlers to run and will run just those and the Meta handler', async function() {
    const model = new TraceModel.TraceModel.Model({
      Animation: TraceModel.Handlers.ModelHandlers.Animation,
    });
    const file1 = await loadEventsFromTraceFile(this, 'animation.json.gz');
    await model.parse(file1);
    assert.deepEqual(Object.keys(model.traceParsedData(0) || {}), ['Meta', 'Animation']);
  });

  it('supports parsing multiple traces', async function() {
    const model = TraceModel.TraceModel.Model.createWithAllHandlers();
    const file1 = await loadEventsFromTraceFile(this, 'basic.json.gz');
    const file2 = await loadEventsFromTraceFile(this, 'slow-interaction-keydown.json.gz');

    await model.parse(file1);
    model.reset();
    await model.parse(file2);
    model.reset();

    assert.strictEqual(model.size(), 2);
    assert.isNotNull(model.traceParsedData(0));
    assert.isNotNull(model.traceParsedData(1));
  });

  it('supports deleting traces', async function() {
    const model = TraceModel.TraceModel.Model.createWithAllHandlers();
    const file1 = await loadEventsFromTraceFile(this, 'basic.json.gz');
    const file2 = await loadEventsFromTraceFile(this, 'slow-interaction-keydown.json.gz');

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
    const model = TraceModel.TraceModel.Model.createWithAllHandlers();
    const traceFiles = [
      await loadEventsFromTraceFile(this, 'threejs-gpu.json.gz'),
      await loadEventsFromTraceFile(this, 'web-dev.json.gz'),
      // Process the previous trace again to test the trace sequencing
      await loadEventsFromTraceFile(this, 'web-dev.json.gz'),
      await loadEventsFromTraceFile(this, 'multiple-navigations.json.gz'),
      await loadEventsFromTraceFile(this, 'basic.json.gz'),
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
