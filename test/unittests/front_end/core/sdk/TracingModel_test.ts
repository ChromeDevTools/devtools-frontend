// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import {loadTraceEventsLegacyEventPayload} from '../../helpers/TraceHelpers.js';
import {FakeStorage, StubbedThread} from '../../helpers/TimelineHelpers.js';

describe('TracingModel', () => {
  it('is able to determine if a phase is a nestable async phase', () => {
    assert.isTrue(
        SDK.TracingModel.TracingModel.isNestableAsyncPhase('b'), '\'b\' should be considered a nestable async phase');
    assert.isTrue(
        SDK.TracingModel.TracingModel.isNestableAsyncPhase('e'), '\'e\' should be considered a nestable async phase');
    assert.isTrue(
        SDK.TracingModel.TracingModel.isNestableAsyncPhase('n'), '\'n\' should be considered a nestable async phase');
  });

  it('is able to determine if a phase is not a nestable async phase', () => {
    assert.isFalse(
        SDK.TracingModel.TracingModel.isNestableAsyncPhase('a'),
        '\'a\' should not be considered a nestable async phase');
    assert.isFalse(
        SDK.TracingModel.TracingModel.isNestableAsyncPhase('f'),
        '\'f\' should not be considered a nestable async phase');
    assert.isFalse(
        SDK.TracingModel.TracingModel.isNestableAsyncPhase('m'),
        '\'m\' should not be considered a nestable async phase');
  });

  it('can create events from an EventPayload[] and finds the correct number of processes', async () => {
    const events = await loadTraceEventsLegacyEventPayload('basic.json.gz');
    const model = new SDK.TracingModel.TracingModel(new FakeStorage());
    model.addEvents(events);
    assert.strictEqual(model.sortedProcesses().length, 4);
  });

  describe('fromPayload', () => {
    it('can create an event from a payload for an LCP candidate event', async () => {
      const rawEvents = await loadTraceEventsLegacyEventPayload('lcp-images.json.gz');
      // Find an event to test with; pick the first LCP event so it is an event
      // we understand and we get the same event each time.
      const firstLCPEventPayload = rawEvents.find(event => {
        return event.name === 'largestContentfulPaint::Candidate';
      });
      if (!firstLCPEventPayload) {
        throw new Error('Could not find LCP event');
      }
      const fakeThread = StubbedThread.make(firstLCPEventPayload.tid);
      const event = SDK.TracingModel.PayloadEvent.fromPayload(firstLCPEventPayload, fakeThread);
      assert.deepEqual(event.args, firstLCPEventPayload.args);
      assert.deepEqual(event.name, firstLCPEventPayload.name);
      assert.strictEqual(event.startTime, firstLCPEventPayload.ts / 1000);
    });

    it('sets the begin and end time correctly for an event with a duration', async () => {
      const rawEvents = await loadTraceEventsLegacyEventPayload('animation.json.gz');
      // Use a RunTask which will always have a ts (start) and dur.
      const firstRunTask = rawEvents.find(event => {
        return event.name === 'RunTask';
      });
      if (!firstRunTask) {
        throw new Error('Could not find run task');
      }
      const fakeThread = StubbedThread.make(firstRunTask.tid);
      const event = SDK.TracingModel.PayloadEvent.fromPayload(firstRunTask, fakeThread);
      assert.strictEqual(event.startTime, firstRunTask.ts / 1000);
      assert.strictEqual(event.endTime, (firstRunTask.ts + firstRunTask.dur) / 1000);
    });
  });

  describe('extractID', () => {
    it('can extract the ID from the id field if it exists', async () => {
      const fakePayload = {
        id: '123',
      } as unknown as SDK.TracingManager.EventPayload;
      assert.strictEqual(SDK.TracingModel.TracingModel.extractId(fakePayload), '123');
    });

    it('prepends the scope to the id if it is present', async () => {
      const fakePayload = {
        id: '123',
        scope: 'test-scope',
      } as unknown as SDK.TracingManager.EventPayload;
      assert.strictEqual(SDK.TracingModel.TracingModel.extractId(fakePayload), 'test-scope@123');
    });

    it('prioritises the id2 global field over id if they are both present', async () => {
      const fakePayload = {
        id: '123',
        id2: {
          global: 'global-id',
        },
        scope: 'test-scope',
      } as unknown as SDK.TracingManager.EventPayload;
      assert.strictEqual(SDK.TracingModel.TracingModel.extractId(fakePayload), ':test-scope:global-id');
    });

    it('prioritises the id2 local field over id if they are both present, and includes the PID of the event',
       async () => {
         const fakePayload = {
           id: '123',
           id2: {
             local: 'local-id',
           },
           pid: 'test-pid',
           scope: 'test-scope',
         } as unknown as SDK.TracingManager.EventPayload;
         assert.strictEqual(SDK.TracingModel.TracingModel.extractId(fakePayload), ':test-scope:test-pid:local-id');
       });

    it('logs an error and returns undefined if the id2 object has both global and local keys', async () => {
      const fakePayload = {
        id: '123',
        id2: {
          local: 'local-id',
          global: 'global-id',
        },
        pid: 'test-pid',
        scope: 'test-scope',
        ts: 1000,
      } as unknown as SDK.TracingManager.EventPayload;
      const consoleErrorStub = sinon.stub(console, 'error');
      assert.isUndefined(SDK.TracingModel.TracingModel.extractId(fakePayload));
      assert(consoleErrorStub.calledWithExactly(
          // The number 1 here is the timestamp divided by 1000.
          'Unexpected id2 field at 1, one and only one of \'local\' and \'global\' should be present.'));
    });
  });
});
