// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';

import * as Recorder from './models.js';

describeWithEnvironment('RecordingStorage', () => {
  beforeEach(() => {
    Recorder.RecordingStorage.RecordingStorage.instance().clearForTest();
  });

  after(() => {
    Recorder.RecordingStorage.RecordingStorage.instance().clearForTest();
  });

  class MockIdGenerator {
    #id = 1;
    next() {
      const result = `recording_${this.#id}`;
      this.#id++;
      return result;
    }
  }

  it('should create and retrieve recordings', async () => {
    const storage = Recorder.RecordingStorage.RecordingStorage.instance();
    storage.setIdGeneratorForTest(new MockIdGenerator());
    const flow1 = {title: 'Test1', steps: []};
    const flow2 = {title: 'Test2', steps: []};
    const flow3 = {title: 'Test3', steps: []};
    assert.deepEqual(await storage.saveRecording(flow1), {
      storageName: 'recording_1',
      flow: flow1,
    });
    assert.deepEqual(await storage.saveRecording(flow2), {
      storageName: 'recording_2',
      flow: flow2,
    });
    assert.deepEqual(await storage.getRecordings(), [
      {storageName: 'recording_1', flow: flow1},
      {storageName: 'recording_2', flow: flow2},
    ]);
    assert.deepEqual(await storage.getRecording('recording_2'), {
      storageName: 'recording_2',
      flow: flow2,
    });
    assert.deepEqual(await storage.getRecording('recording_3'), undefined);
    assert.deepEqual(await storage.updateRecording('recording_2', flow3), {
      storageName: 'recording_2',
      flow: flow3,
    });
    assert.deepEqual(await storage.getRecording('recording_2'), {
      storageName: 'recording_2',
      flow: flow3,
    });

    await storage.deleteRecording('recording_2');
    assert.deepEqual(await storage.getRecordings(), [
      {storageName: 'recording_1', flow: flow1},
    ]);
  });
});
