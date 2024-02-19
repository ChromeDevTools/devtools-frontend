// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Models from '../../../../../../front_end/panels/recorder/models/models.js';

// eslint-disable-next-line rulesdir/es_modules_import
import * as RecorderHelpers from '../helpers/RecorderHelpers.js';

describe('RecordingPlayer', () => {
  let recordingPlayer: Models.RecordingPlayer.RecordingPlayer;

  beforeEach(() => {
    RecorderHelpers.installMocksForTargetManager();
    RecorderHelpers.installMocksForRecordingPlayer();
  });

  afterEach(() => {
    recordingPlayer.disposeForTesting();
  });

  it('should emit `Step` event before executing in every step', async () => {
    recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
        {
          title: 'test',
          steps: [
            RecorderHelpers.createCustomStep(),
            RecorderHelpers.createCustomStep(),
            RecorderHelpers.createCustomStep(),
          ],
        },
        {
          speed: Models.RecordingPlayer.PlayRecordingSpeed.Normal,
          breakpointIndexes: new Set(),
        },
    );
    const stepEventHandlerStub = sinon.stub().callsFake(async ({data: {resolve}}) => {
      resolve();
    });
    recordingPlayer.addEventListener(
        Models.RecordingPlayer.Events.Step,
        stepEventHandlerStub,
    );

    await recordingPlayer.play();

    assert.isTrue(stepEventHandlerStub.getCalls().length === 3);
  });

  describe('Step by step execution', () => {
    it('should stop execution before executing a step that has a breakpoint', async () => {
      recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
          {
            title: 'test',
            steps: [
              RecorderHelpers.createCustomStep(),
              RecorderHelpers.createCustomStep(),
              RecorderHelpers.createCustomStep(),
            ],
          },
          {
            speed: Models.RecordingPlayer.PlayRecordingSpeed.Normal,
            breakpointIndexes: new Set([1]),
          },
      );
      const stepEventHandlerStub = sinon.stub().callsFake(async ({data: {resolve}}) => {
        resolve();
      });
      const stopEventPromise = new Promise<void>(resolve => {
        recordingPlayer.addEventListener(
            Models.RecordingPlayer.Events.Stop,
            () => {
              resolve();
            },
        );
      });
      recordingPlayer.addEventListener(
          Models.RecordingPlayer.Events.Step,
          stepEventHandlerStub,
      );

      void recordingPlayer.play();
      await stopEventPromise;

      assert.strictEqual(stepEventHandlerStub.getCalls().length, 2);
    });

    it('should `stepOver` execute only the next step after breakpoint and stop', async () => {
      recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
          {
            title: 'test',
            steps: [
              RecorderHelpers.createCustomStep(),
              RecorderHelpers.createCustomStep(),
              RecorderHelpers.createCustomStep(),
              RecorderHelpers.createCustomStep(),
            ],
          },
          {
            speed: Models.RecordingPlayer.PlayRecordingSpeed.Normal,
            breakpointIndexes: new Set([1]),
          },
      );
      const stepEventHandlerStub = sinon.stub().callsFake(async ({data: {resolve}}) => {
        resolve();
      });
      let stopEventPromise = new Promise<void>(resolve => {
        recordingPlayer.addEventListener(
            Models.RecordingPlayer.Events.Stop,
            () => {
              resolve();
              stopEventPromise = new Promise<void>(nextResolve => {
                recordingPlayer.addEventListener(
                    Models.RecordingPlayer.Events.Stop,
                    () => {
                      nextResolve();
                    },
                    {once: true},
                );
              });
            },
            {once: true},
        );
      });
      recordingPlayer.addEventListener(
          Models.RecordingPlayer.Events.Step,
          stepEventHandlerStub,
      );

      void recordingPlayer.play();
      await stopEventPromise;
      assert.strictEqual(stepEventHandlerStub.getCalls().length, 2);
      recordingPlayer.stepOver();
      await stopEventPromise;

      assert.strictEqual(stepEventHandlerStub.getCalls().length, 3);
    });

    it('should `continue` execute until the next breakpoint', async () => {
      recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
          {
            title: 'test',
            steps: [
              RecorderHelpers.createCustomStep(),
              RecorderHelpers.createCustomStep(),
              RecorderHelpers.createCustomStep(),
              RecorderHelpers.createCustomStep(),
              RecorderHelpers.createCustomStep(),
            ],
          },
          {
            speed: Models.RecordingPlayer.PlayRecordingSpeed.Normal,
            breakpointIndexes: new Set([1, 3]),
          },
      );
      const stepEventHandlerStub = sinon.stub().callsFake(async ({data: {resolve}}) => {
        resolve();
      });
      let stopEventPromise = new Promise<void>(resolve => {
        recordingPlayer.addEventListener(
            Models.RecordingPlayer.Events.Stop,
            () => {
              resolve();
              stopEventPromise = new Promise<void>(nextResolve => {
                recordingPlayer.addEventListener(
                    Models.RecordingPlayer.Events.Stop,
                    () => {
                      nextResolve();
                    },
                    {once: true},
                );
              });
            },
            {once: true},
        );
      });
      recordingPlayer.addEventListener(
          Models.RecordingPlayer.Events.Step,
          stepEventHandlerStub,
      );

      void recordingPlayer.play();
      await stopEventPromise;
      assert.strictEqual(stepEventHandlerStub.getCalls().length, 2);
      recordingPlayer.continue();
      await stopEventPromise;

      assert.strictEqual(stepEventHandlerStub.getCalls().length, 4);
    });

    it('should `continue` execute until the end if there is no later breakpoints', async () => {
      recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
          {
            title: 'test',
            steps: [
              RecorderHelpers.createCustomStep(),
              RecorderHelpers.createCustomStep(),
              RecorderHelpers.createCustomStep(),
              RecorderHelpers.createCustomStep(),
              RecorderHelpers.createCustomStep(),
            ],
          },
          {
            speed: Models.RecordingPlayer.PlayRecordingSpeed.Normal,
            breakpointIndexes: new Set([1]),
          },
      );
      const stepEventHandlerStub = sinon.stub().callsFake(async ({data: {resolve}}) => {
        resolve();
      });
      let stopEventPromise = new Promise<void>(resolve => {
        recordingPlayer.addEventListener(
            Models.RecordingPlayer.Events.Stop,
            () => {
              resolve();
              stopEventPromise = new Promise<void>(nextResolve => {
                recordingPlayer.addEventListener(
                    Models.RecordingPlayer.Events.Stop,
                    () => {
                      nextResolve();
                    },
                    {once: true},
                );
              });
            },
            {once: true},
        );
      });
      const doneEventPromise = new Promise<void>(resolve => {
        recordingPlayer.addEventListener(
            Models.RecordingPlayer.Events.Done,
            () => {
              resolve();
            },
            {once: true},
        );
      });
      recordingPlayer.addEventListener(
          Models.RecordingPlayer.Events.Step,
          stepEventHandlerStub,
      );

      void recordingPlayer.play();
      await stopEventPromise;
      assert.strictEqual(stepEventHandlerStub.getCalls().length, 2);
      recordingPlayer.continue();
      await doneEventPromise;

      assert.strictEqual(stepEventHandlerStub.getCalls().length, 5);
    });
  });
});
