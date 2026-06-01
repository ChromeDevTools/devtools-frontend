// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Platform from '../../../core/platform/platform.js';
import {
  createCustomStep,
  installMocksForRecordingPlayer,
  installMocksForTargetManager,
} from '../testing/RecorderHelpers.js';

import * as Models from './models.js';

const {urlString} = Platform.DevToolsPath;

describe('RecordingPlayer', () => {
  let recordingPlayer: Models.RecordingPlayer.RecordingPlayer;
  /**
   * Create a promise that resolve once the Stop event is emitted
   * And return a new Promise that awaits the Stop event
   * Useful when dealing with breakpoints
   */
  function createStopEvent(
      recordingPlayer: Models.RecordingPlayer.RecordingPlayer,
      stopTimes = 1,
  ) {
    const stopEvent: {promise: Promise<void>} = {promise: Promise.resolve()};

    function createPromise() {
      return new Promise<void>(resolve => {
        recordingPlayer.addEventListener(
            Models.RecordingPlayer.Events.STOP,
            () => {
              // setTimeout is needed to insure that the checks are ran
              // on the next tick
              setTimeout(() => {
                resolve();
              }, 0);
            },
            {once: true},
        );
      });
    }

    stopEvent.promise = createPromise().then(() => {
      const time = stopTimes - 1;
      if (time > 0) {
        stopEvent.promise = createPromise();
      } else {
        stopEvent.promise = Promise.reject(new Error('Unexpected call to stopPromise'));
      }
    });
    return stopEvent;
  }

  beforeEach(() => {
    installMocksForTargetManager();
    installMocksForRecordingPlayer();
  });

  afterEach(() => {
    recordingPlayer.disposeForTesting();
  });

  it('should emit `Step` event before executing in every step', async () => {
    recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
        {
          title: 'test',
          steps: [
            createCustomStep(),
            createCustomStep(),
            createCustomStep(),
          ],
        },
        {
          speed: Models.RecordingPlayer.PlayRecordingSpeed.NORMAL,
          breakpointIndexes: new Set(),
        },
    );
    const stepEventHandlerStub = sinon.stub().callsFake(async ({data: {resolve}}) => {
      resolve();
    });
    recordingPlayer.addEventListener(
        Models.RecordingPlayer.Events.STEP,
        stepEventHandlerStub,
    );

    await recordingPlayer.play();

    assert.lengthOf(stepEventHandlerStub.getCalls(), 3);
  });

  describe('Step by step execution', () => {
    it('should stop execution before executing a step that has a breakpoint', async () => {
      recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
          {
            title: 'test',
            steps: [
              createCustomStep(),
              createCustomStep(),
              createCustomStep(),
            ],
          },
          {
            speed: Models.RecordingPlayer.PlayRecordingSpeed.NORMAL,
            breakpointIndexes: new Set([1]),
          },
      );
      const stepEventHandlerStub = sinon.stub().callsFake(async ({data: {resolve}}) => {
        resolve();
      });
      const stopEvent = createStopEvent(recordingPlayer);
      recordingPlayer.addEventListener(
          Models.RecordingPlayer.Events.STEP,
          stepEventHandlerStub,
      );

      void recordingPlayer.play();
      await stopEvent.promise;

      assert.lengthOf(stepEventHandlerStub.getCalls(), 2);
    });

    it('should `stepOver` execute only the next step after breakpoint and stop', async () => {
      recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
          {
            title: 'test',
            steps: [
              createCustomStep(),
              createCustomStep(),
              createCustomStep(),
              createCustomStep(),
            ],
          },
          {
            speed: Models.RecordingPlayer.PlayRecordingSpeed.NORMAL,
            breakpointIndexes: new Set([1]),
          },
      );
      const stepEventHandlerStub = sinon.stub().callsFake(async ({data: {resolve}}) => {
        resolve();
      });
      const stopEvent = createStopEvent(recordingPlayer, 2);
      recordingPlayer.addEventListener(
          Models.RecordingPlayer.Events.STEP,
          stepEventHandlerStub,
      );

      void recordingPlayer.play();
      await stopEvent.promise;
      assert.lengthOf(stepEventHandlerStub.getCalls(), 2);
      recordingPlayer.stepOver();

      await stopEvent.promise;

      assert.lengthOf(stepEventHandlerStub.getCalls(), 3);
    });

    it('should `continue` execute until the next breakpoint', async () => {
      recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
          {
            title: 'test',
            steps: [
              createCustomStep(),
              createCustomStep(),
              createCustomStep(),
              createCustomStep(),
              createCustomStep(),
            ],
          },
          {
            speed: Models.RecordingPlayer.PlayRecordingSpeed.NORMAL,
            breakpointIndexes: new Set([1, 3]),
          },
      );
      const stepEventHandlerStub = sinon.stub().callsFake(async ({data: {resolve}}) => {
        resolve();
      });
      const stopEvent = createStopEvent(recordingPlayer, 2);
      recordingPlayer.addEventListener(
          Models.RecordingPlayer.Events.STEP,
          stepEventHandlerStub,
      );

      void recordingPlayer.play();
      await stopEvent.promise;
      assert.lengthOf(stepEventHandlerStub.getCalls(), 2);
      recordingPlayer.continue();
      await stopEvent.promise;

      assert.lengthOf(stepEventHandlerStub.getCalls(), 4);
    });

    it('should `continue` execute until the end if there is no later breakpoints', async () => {
      recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
          {
            title: 'test',
            steps: [
              createCustomStep(),
              createCustomStep(),
              createCustomStep(),
              createCustomStep(),
              createCustomStep(),
            ],
          },
          {
            speed: Models.RecordingPlayer.PlayRecordingSpeed.NORMAL,
            breakpointIndexes: new Set([1]),
          },
      );
      const stepEventHandlerStub = sinon.stub().callsFake(async ({data: {resolve}}) => {
        resolve();
      });
      const stopEvent = createStopEvent(recordingPlayer);
      const doneEventPromise = new Promise<void>(resolve => {
        recordingPlayer.addEventListener(
            Models.RecordingPlayer.Events.DONE,
            () => {
              resolve();
            },
            {once: true},
        );
      });
      recordingPlayer.addEventListener(
          Models.RecordingPlayer.Events.STEP,
          stepEventHandlerStub,
      );

      void recordingPlayer.play();
      await stopEvent.promise;
      assert.lengthOf(stepEventHandlerStub.getCalls(), 2);
      recordingPlayer.continue();
      await doneEventPromise;

      assert.lengthOf(stepEventHandlerStub.getCalls(), 5);
    });
  });

  describe('Navigation URL schema restriction', () => {
    async function waitForRecordingUrlError(url: Platform.DevToolsPath.UrlString): Promise<Error|null> {
      recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
          {
            title: 'test',
            steps: [
              {
                type: Models.Schema.StepType.Navigate,
                url,
              },
            ],
          },
          {
            speed: Models.RecordingPlayer.PlayRecordingSpeed.NORMAL,
          },
      );
      return await new Promise<Error|null>(resolve => {
        recordingPlayer.addEventListener(
            Models.RecordingPlayer.Events.STEP,
            ({data: {resolve: resolveStep}}) => {
              resolveStep();
            },
        );
        recordingPlayer.addEventListener(
            Models.RecordingPlayer.Events.ERROR,
            ({data}) => {
              resolve(data);
            },
            {once: true},
        );
        recordingPlayer.addEventListener(
            Models.RecordingPlayer.Events.DONE,
            () => {
              resolve(null);
            },
            {once: true},
        );
        void recordingPlayer.play();
      });
    }

    it('should reject navigation to chrome:// URLs', async () => {
      const url = urlString`chrome://settings`;
      const error = await waitForRecordingUrlError(url);
      assert.isNotNull(error);
      assert.strictEqual(error!.message, `Navigation to ${url} is not allowed, due to blocked schema`);
    });

    it('should reject navigation to javascript:// URLs', async () => {
      const url = urlString`javascript:alert(1)`;
      const error = await waitForRecordingUrlError(url);
      assert.isNotNull(error);
      assert.strictEqual(error.message, `Navigation to ${url} is not allowed, due to blocked schema`);
    });

    it('should allow navigation to http:// URLs', async () => {
      const url = urlString`http://example.com`;
      const error = await waitForRecordingUrlError(url);
      assert.isNull(error);
    });

    it('should allow navigation to https:// URLs', async () => {
      const url = urlString`https://example.com`;
      const error = await waitForRecordingUrlError(url);
      assert.isNull(error);
    });

    it('should allow navigation to data: URLs', async () => {
      const url = urlString`data:text/plain,hello`;
      const error = await waitForRecordingUrlError(url);
      assert.isNull(error);
    });

    it('should allow navigation to about:blank', async () => {
      const url = urlString`about:blank`;
      const error = await waitForRecordingUrlError(url);
      assert.isNull(error);
    });

    it('should reject navigation to other about: URLs', async () => {
      const url = urlString`about:srcdoc`;
      const error = await waitForRecordingUrlError(url);
      assert.isNotNull(error);
      assert.strictEqual(error.message, `Navigation to ${url} is not allowed, due to blocked schema`);
    });
  });
});
