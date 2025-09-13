// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../models/trace/trace.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../testing/MockConnection.js';
import {makeInstantEvent} from '../../testing/TraceHelpers.js';

import * as Tracing from './tracing.js';

class FakeClient implements Tracing.TracingManager.TracingManagerClient {
  traceEventsCollected(_events: Trace.Types.Events.Event[]): void {
  }
  tracingComplete(): void {
  }
  tracingBufferUsage(_usage: number): void {
  }
  eventsRetrievalProgress(_progress: number): void {
  }
}

const fakeEvents = [
  makeInstantEvent('test-event-1', 1),
  makeInstantEvent('test-event-2', 2),
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
    const manager = new Tracing.TracingManager.TracingManager(target);
    const client = new FakeClient();
    const bufferUsageSpy = sinon.spy(client, 'tracingBufferUsage');

    await manager.start(client, 'devtools-timeline');
    manager.bufferUsage(10);
    sinon.assert.calledWith(bufferUsageSpy, 10);
  });

  it('sends events to the client when they are collected and updates the client with progress', async () => {
    const target = createTarget();
    const manager = new Tracing.TracingManager.TracingManager(target);
    const client = new FakeClient();
    const eventsRetrievalProgressSpy = sinon.spy(client, 'eventsRetrievalProgress');
    const eventsCollectedSpy = sinon.spy(client, 'traceEventsCollected');

    await manager.start(client, 'devtools-timeline');
    manager.bufferUsage(0);

    manager.eventsCollected(fakeEvents);
    sinon.assert.calledWith(eventsCollectedSpy, fakeEvents);
    assert.approximately(0.15, eventsRetrievalProgressSpy.args[0][0], 0.01);
  });

  it('notifies the client when tracing is complete', async () => {
    const target = createTarget();
    const manager = new Tracing.TracingManager.TracingManager(target);
    const client = new FakeClient();
    const tracingCompleteSpy = sinon.spy(client, 'tracingComplete');
    await manager.start(client, 'devtools-timeline');
    manager.bufferUsage(0);
    manager.eventsCollected(fakeEvents);
    manager.tracingComplete();
    sinon.assert.calledOnce(tracingCompleteSpy);
  });

  it('errors if tracing is started twice', async () => {
    const target = createTarget();
    const manager = new Tracing.TracingManager.TracingManager(target);
    const client = new FakeClient();
    await manager.start(client, 'devtools-timeline');
    // The assert.throws() helper does not work with async/await, hence the manual try catch
    let didThrow = false;
    try {
      await manager.start(client, 'devtools-timeline');
    } catch (error) {
      didThrow = true;
      assert.strictEqual(error.message, 'Tracing is already started');
    }
    assert.isTrue(didThrow, 'Test did not throw an error as expected.');
  });

  it('errors if you try to stop when tracing is not active', async () => {
    const target = createTarget();
    const manager = new Tracing.TracingManager.TracingManager(target);
    assert.throws(() => {
      manager.stop();
    }, /Tracing is not started/);
  });
});
