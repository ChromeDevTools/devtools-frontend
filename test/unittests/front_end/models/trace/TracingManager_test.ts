// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../helpers/MockConnection.js';
import {makeFakeEventPayload} from '../../helpers/TraceHelpers.js';

class FakeClient implements TraceEngine.TracingManager.TracingManagerClient {
  traceEventsCollected(_events: TraceEngine.TracingManager.EventPayload[]): void {
  }
  tracingComplete(): void {
  }
  tracingBufferUsage(_usage: number): void {
  }
  eventsRetrievalProgress(_progress: number): void {
  }
}

const fakeEvents = [
  makeFakeEventPayload({
    name: 'test-event',
    categories: ['devtools.timeline'],
    ts: 1,
    ph: TraceEngine.Types.TraceEvents.Phase.INSTANT,
  }),
  makeFakeEventPayload({
    name: 'test-event',
    categories: ['devtools.timeline'],
    ts: 2,
    ph: TraceEngine.Types.TraceEvents.Phase.INSTANT,
  }),
];

describeWithMockConnection('TracingManager', () => {
  beforeEach(() => {
    setMockConnectionResponseHandler('Tracing.start', () => {
      return {};
    });
    setMockConnectionResponseHandler('Tracing.end', () => {
      return {};
    });
  });

  it('sends bufferUsage to the client', async () => {
    const target = createTarget();
    const manager = new TraceEngine.TracingManager.TracingManager(target);
    const client = new FakeClient();
    const bufferUsageSpy = sinon.spy(client, 'tracingBufferUsage');

    await manager.start(client, 'devtools-timeline', 'options');
    manager.bufferUsage(10);
    assert.isTrue(bufferUsageSpy.calledWith(10));
  });

  it('sends events to the client when they are collected and updates the client with progress', async () => {
    const target = createTarget();
    const manager = new TraceEngine.TracingManager.TracingManager(target);
    const client = new FakeClient();
    const eventsRetrievalProgressSpy = sinon.spy(client, 'eventsRetrievalProgress');
    const eventsCollectedSpy = sinon.spy(client, 'traceEventsCollected');

    await manager.start(client, 'devtools-timeline', 'options');
    // Set the event buffer size to 20
    manager.bufferUsage(0, 20);

    manager.eventsCollected(fakeEvents);
    assert.isTrue(eventsCollectedSpy.calledWith(fakeEvents));
    assert.isTrue(eventsRetrievalProgressSpy.calledWith(2 / 20 /* 2 events, and the buffer size is 20 */));
  });

  it('updates the buffer size if we saw more events than the last buffer size', async () => {
    const target = createTarget();
    const manager = new TraceEngine.TracingManager.TracingManager(target);
    const client = new FakeClient();
    const eventsRetrievalProgressSpy = sinon.spy(client, 'eventsRetrievalProgress');
    const eventsCollectedSpy = sinon.spy(client, 'traceEventsCollected');

    await manager.start(client, 'devtools-timeline', 'options');
    // Set the event buffer size to 1
    manager.bufferUsage(0, 1);

    manager.eventsCollected(fakeEvents);
    assert.isTrue(eventsCollectedSpy.calledWith(fakeEvents));
    assert.isTrue(eventsRetrievalProgressSpy.calledWith(2 / 2 /* 2 events, and the buffer size is now updated to 2 */));
  });

  it('notifies the client when tracing is complete', async () => {
    const target = createTarget();
    const manager = new TraceEngine.TracingManager.TracingManager(target);
    const client = new FakeClient();
    const tracingCompleteSpy = sinon.spy(client, 'tracingComplete');
    await manager.start(client, 'devtools-timeline', 'options');
    manager.bufferUsage(0, 10);
    manager.eventsCollected(fakeEvents);
    manager.tracingComplete();
    assert.isTrue(tracingCompleteSpy.calledOnce);
  });

  it('errors if tracing is started twice', async () => {
    const target = createTarget();
    const manager = new TraceEngine.TracingManager.TracingManager(target);
    const client = new FakeClient();
    await manager.start(client, 'devtools-timeline', 'options');
    // The assert.throws() helper does not work with async/await, hence the manual try catch
    let didThrow = false;
    try {
      await manager.start(client, 'devtools-timeline', 'options');
    } catch (error) {
      didThrow = true;
      assert.strictEqual(error.message, 'Tracing is already started');
    }
    assert.isTrue(didThrow, 'Test did not throw an error as expected.');
  });

  it('errors if you try to stop when tracing is not active', async () => {
    const target = createTarget();
    const manager = new TraceEngine.TracingManager.TracingManager(target);
    assert.throws(() => {
      manager.stop();
    }, /Tracing is not started/);
  });
});
