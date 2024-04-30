// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as TraceModel from '../trace.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

describe('LayerTreeHandler', function() {
  // The trace file used here is large because it has all the
  // AdvancedPaintInstrumentation enabled in order to test this handler.
  // Therefore the timeout here is larger to allow for the time required to
  // load the file on the bots.
  this.timeout(20_000);

  beforeEach(() => {
    TraceModel.Handlers.ModelHandlers.Meta.reset();
    TraceModel.Handlers.ModelHandlers.LayerTree.reset();
    TraceModel.Handlers.ModelHandlers.Meta.initialize();
    TraceModel.Handlers.ModelHandlers.LayerTree.initialize();
  });

  it('creates a relationship between paint events and the snapshot event', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev-with-advanced-instrumentation.json.gz');

    for (const event of events) {
      TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
      TraceModel.Handlers.ModelHandlers.LayerTree.handleEvent(event);
    }
    await TraceModel.Handlers.ModelHandlers.Meta.finalize();
    await TraceModel.Handlers.ModelHandlers.LayerTree.finalize();

    const data = TraceModel.Handlers.ModelHandlers.LayerTree.data();

    assert.lengthOf(data.paints, 49);
    assert.strictEqual(data.paintsToSnapshots.size, 35);
    // Check that one expected pair got created
    const paintEvent = data.paints.find(paint => {
      return paint.ts === 42482841188;
    });
    const snapshotEvent = data.snapshots.find(snapshot => {
      return snapshot.id2?.local === '0x10c038b6d80';
    });
    if (!paintEvent || !snapshotEvent) {
      throw new Error('Could not find expected paint and snapshot events');
    }
    assert.strictEqual(data.paintsToSnapshots.get(paintEvent), snapshotEvent);
  });
});
