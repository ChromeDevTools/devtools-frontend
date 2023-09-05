// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as TraceEngine from '../../../../../../front_end/models/trace/trace.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

describe('AuctionWorkletsHandler', function() {
  beforeEach(() => {
    TraceEngine.Handlers.ModelHandlers.AuctionWorklets.reset();
  });

  const expectedPIDsAndTypes = [
    {
      pid: 776435 as TraceEngine.Types.TraceEvents.ProcessID,
      type: TraceEngine.Types.TraceEvents.AuctionWorkletType.SELLER,
    },
    {
      pid: 776436 as TraceEngine.Types.TraceEvents.ProcessID,
      type: TraceEngine.Types.TraceEvents.AuctionWorkletType.BIDDER,
    },
    {
      pid: 776449 as TraceEngine.Types.TraceEvents.ProcessID,
      type: TraceEngine.Types.TraceEvents.AuctionWorkletType.BIDDER,
    },
  ];

  it('parses and finds worklets from the metadata events', async function() {
    const events = await TraceLoader.rawEvents(this, 'fenced-frame-fledge.json.gz');
    for (const event of events) {
      TraceEngine.Handlers.ModelHandlers.AuctionWorklets.handleEvent(event);
    }
    await TraceEngine.Handlers.ModelHandlers.AuctionWorklets.finalize();
    const data = TraceEngine.Handlers.ModelHandlers.AuctionWorklets.data();
    assert.strictEqual(data.worklets.size, 3);

    const actualPIDsAndTypes =
        Array.from(data.worklets.values()).map(worklet => ({pid: worklet.pid, type: worklet.type}));

    assert.deepEqual(actualPIDsAndTypes, expectedPIDsAndTypes);
  });

  it('finds the utility thread for each worklet', async function() {
    const events = await TraceLoader.rawEvents(this, 'fenced-frame-fledge.json.gz');
    for (const event of events) {
      TraceEngine.Handlers.ModelHandlers.AuctionWorklets.handleEvent(event);
    }
    await TraceEngine.Handlers.ModelHandlers.AuctionWorklets.finalize();
    const data = TraceEngine.Handlers.ModelHandlers.AuctionWorklets.data();

    const expectedCrUtilityPIDsAndTIDs = [
      {
        pid: 776435 as TraceEngine.Types.TraceEvents.ProcessID,
        tid: 1 as TraceEngine.Types.TraceEvents.ThreadID,
      },
      {
        pid: 776436 as TraceEngine.Types.TraceEvents.ProcessID,
        tid: 1 as TraceEngine.Types.TraceEvents.ThreadID,
      },
      {
        pid: 776449 as TraceEngine.Types.TraceEvents.ProcessID,
        tid: 1 as TraceEngine.Types.TraceEvents.ThreadID,
      },
    ];

    const actualUtilityPIDsAndTIDs =
        Array.from(data.worklets.values())
            .map(worklet => ({pid: worklet.pid, tid: worklet.args.data.utilityThread.tid}));

    assert.deepEqual(actualUtilityPIDsAndTIDs, expectedCrUtilityPIDsAndTIDs);
  });

  it('finds the AuctionV8HelperThread thread for each worklet', async function() {
    const events = await TraceLoader.rawEvents(this, 'fenced-frame-fledge.json.gz');
    for (const event of events) {
      TraceEngine.Handlers.ModelHandlers.AuctionWorklets.handleEvent(event);
    }
    await TraceEngine.Handlers.ModelHandlers.AuctionWorklets.finalize();
    const data = TraceEngine.Handlers.ModelHandlers.AuctionWorklets.data();

    const expectedAuctionV8PIDsAndTIDs = [
      {
        pid: 776435 as TraceEngine.Types.TraceEvents.ProcessID,
        tid: 6 as TraceEngine.Types.TraceEvents.ThreadID,
      },
      {
        pid: 776436 as TraceEngine.Types.TraceEvents.ProcessID,
        tid: 6 as TraceEngine.Types.TraceEvents.ThreadID,
      },
      {
        pid: 776449 as TraceEngine.Types.TraceEvents.ProcessID,
        tid: 6 as TraceEngine.Types.TraceEvents.ThreadID,
      },
    ];

    const actualAuctionV8PIDsAndTIDs =
        Array.from(data.worklets.values())
            .map(worklet => ({pid: worklet.pid, tid: worklet.args.data.v8HelperThread.tid}));

    assert.deepEqual(actualAuctionV8PIDsAndTIDs, expectedAuctionV8PIDsAndTIDs);
  });

  it('pairs up Running and DoneWith events', async function() {
    // All of these events have a matching pair of events (see
    // AuctionWorkletsHandler for more information on these events.)
    const events = await TraceLoader.rawEvents(this, 'fenced-frame-fledge.json.gz');
    for (const event of events) {
      TraceEngine.Handlers.ModelHandlers.AuctionWorklets.handleEvent(event);
    }
    await TraceEngine.Handlers.ModelHandlers.AuctionWorklets.finalize();
    const data = TraceEngine.Handlers.ModelHandlers.AuctionWorklets.data();
    assert.strictEqual(data.worklets.size, 3);

    for (const worklet of data.worklets.values()) {
      assert.isDefined(worklet.args.data.runningInProcessEvent);
      assert.isDefined(worklet.args.data.doneWithProcessEvent);
    }
  });

  it('can find worklets just from the DoneWith events', async function() {
    const actualEvents = await TraceLoader.rawEvents(this, 'fenced-frame-fledge.json.gz');
    const events = actualEvents.filter(e => {
      // Remove all RunningWith events
      return TraceEngine.Types.TraceEvents.isTraceEventAuctionWorkletRunningInProcess(e) === false;
    });

    for (const event of events) {
      TraceEngine.Handlers.ModelHandlers.AuctionWorklets.handleEvent(event);
    }
    await TraceEngine.Handlers.ModelHandlers.AuctionWorklets.finalize();
    const data = TraceEngine.Handlers.ModelHandlers.AuctionWorklets.data();
    assert.strictEqual(data.worklets.size, 3);

    // The expected data is ordered by PID; this order is correct in the
    // un-modified set of events but because this event removes some events, we
    // sort the found worklets by PID to ensure that the comparison is still
    // successful. We are not interested in the order these events come.
    const actualPIDsAndTypes = Array.from(data.worklets.values())
                                   .sort((a, b) => a.pid - b.pid)
                                   .map(worklet => ({pid: worklet.pid, type: worklet.type}));
    assert.deepEqual(actualPIDsAndTypes, expectedPIDsAndTypes);
  });

  it('can find worklets just from the RunningIn events', async function() {
    const actualEvents = await TraceLoader.rawEvents(this, 'fenced-frame-fledge.json.gz');
    const events = actualEvents.filter(e => {
      // Remove all DoneWith events
      return TraceEngine.Types.TraceEvents.isTraceEventAuctionWorkletDoneWithProcess(e) === false;
    });

    for (const event of events) {
      TraceEngine.Handlers.ModelHandlers.AuctionWorklets.handleEvent(event);
    }
    await TraceEngine.Handlers.ModelHandlers.AuctionWorklets.finalize();
    const data = TraceEngine.Handlers.ModelHandlers.AuctionWorklets.data();
    assert.strictEqual(data.worklets.size, 3);

    // The expected data is ordered by PID; this order is correct in the
    // un-modified set of events but because this event removes some events, we
    // sort the found worklets by PID to ensure that the comparison is still
    // successful. We are not interested in the order these events come.
    const actualPIDsAndTypes = Array.from(data.worklets.values())
                                   .sort((a, b) => a.pid - b.pid)
                                   .map(worklet => ({pid: worklet.pid, type: worklet.type}));
    assert.deepEqual(actualPIDsAndTypes, expectedPIDsAndTypes);
  });
});
