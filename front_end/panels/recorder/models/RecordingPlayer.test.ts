// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../../core/platform/platform.js';
import {
  createCustomStep,
  installMocksForRecordingPlayer,
  installMocksForTargetManager,
  type RecordingPlayerMocks,
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

  let mocks: RecordingPlayerMocks;

  beforeEach(() => {
    installMocksForTargetManager();
    mocks = installMocksForRecordingPlayer();
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
      sinon.stub(console, 'error');
      const url = urlString`chrome://settings`;
      const error = await waitForRecordingUrlError(url);
      assert.isNotNull(error);
      assert.strictEqual(error!.message, `Navigation to ${url} is not allowed, due to blocked schema`);
      sinon.assert.calledWith(console.error as sinon.SinonStub, 'Replay error', error!.message);
    });

    it('should reject navigation to javascript:// URLs', async () => {
      sinon.stub(console, 'error');
      const url = urlString`javascript:alert(1)`;
      const error = await waitForRecordingUrlError(url);
      assert.isNotNull(error);
      assert.strictEqual(error.message, `Navigation to ${url} is not allowed, due to blocked schema`);
      sinon.assert.calledWith(console.error as sinon.SinonStub, 'Replay error', error.message);
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
      sinon.stub(console, 'error');
      const url = urlString`about:srcdoc`;
      const error = await waitForRecordingUrlError(url);
      assert.isNotNull(error);
      assert.strictEqual(error.message, `Navigation to ${url} is not allowed, due to blocked schema`);
      sinon.assert.calledWith(console.error as sinon.SinonStub, 'Replay error', error.message);
    });
  });

  describe('Navigation guard', () => {
    const blockedUrl = 'https://other.test/landing';
    const blockedMessage =
        `Navigation to ${blockedUrl} is not allowed, because the recording does not contain its origin`;
    const fetchEnablePattern = {patterns: [{urlPattern: '*', resourceType: 'Document', requestStage: 'Response'}]};

    /**
     * Replays a recording that navigates to https://allowed.test and calls
     * `beforeSecondStep` before the second step.
     */
    async function replay(beforeSecondStep: () => void, extraSteps: Models.Schema.Step[] = []): Promise<{
      error: Error | null,
      steps: number,
    }> {
      recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
          {
            title: 'test',
            steps: [
              {type: Models.Schema.StepType.Navigate, url: 'https://allowed.test/'},
              createCustomStep(),
              createCustomStep(),
              ...extraSteps,
            ],
          },
          {speed: Models.RecordingPlayer.PlayRecordingSpeed.NORMAL},
      );
      let steps = 0;
      const result = new Promise<Error|null>(resolve => {
        recordingPlayer.addEventListener(Models.RecordingPlayer.Events.ERROR, ({data}) => resolve(data), {once: true});
        recordingPlayer.addEventListener(Models.RecordingPlayer.Events.DONE, () => resolve(null), {once: true});
      });
      recordingPlayer.addEventListener(Models.RecordingPlayer.Events.STEP, ({data: {resolve}}) => {
        steps++;
        if (steps === 2) {
          beforeSecondStep();
        }
        resolve();
      });
      await recordingPlayer.play();
      return {error: await result, steps};
    }

    it('pauses only document responses during the replay', async () => {
      const {error} = await replay(() => {});

      assert.isNull(error);
      const fetchCalls = mocks.send.args.filter(([method]) => method.startsWith('Fetch.'));
      assert.deepEqual(fetchCalls, [
        ['Fetch.enable', fetchEnablePattern],
        ['Fetch.disable'],
      ]);
    });

    it('continues navigations to an origin from the recording', async () => {
      const {error, steps} = await replay(() => {
        mocks.emitRequestPaused({
          requestId: '1',
          frameId: 'main-frame',
          request: {url: 'https://allowed.test/next'},
          responseStatusCode: 200,
        });
      });

      assert.isNull(error);
      assert.strictEqual(steps, 3);
      sinon.assert.calledWith(mocks.send, 'Fetch.continueRequest', {requestId: '1'});
      sinon.assert.neverCalledWith(mocks.send, 'Fetch.failRequest');
    });

    it('fails main frame navigations to an origin that is not in the recording', async () => {
      sinon.stub(console, 'error');
      const {error, steps} = await replay(() => {
        mocks.emitRequestPaused({
          requestId: '1',
          frameId: 'main-frame',
          request: {url: blockedUrl},
          responseStatusCode: 200,
        });
      });

      assert.strictEqual(error?.message, blockedMessage);
      assert.strictEqual(steps, 2);
      sinon.assert.calledWith(mocks.send, 'Fetch.failRequest', {requestId: '1', errorReason: 'BlockedByClient'});
      sinon.assert.neverCalledWith(mocks.send, 'Fetch.continueRequest');
    });

    it('continues subframe navigations', async () => {
      const {error, steps} = await replay(() => {
        mocks.emitRequestPaused({
          requestId: '1',
          frameId: 'subframe',
          request: {url: blockedUrl},
          responseStatusCode: 200,
        });
      });

      assert.isNull(error);
      assert.strictEqual(steps, 3);
      sinon.assert.calledWith(mocks.send, 'Fetch.continueRequest', {requestId: '1'});
    });

    it('skips runStep if a navigation was blocked during beforeEachStep', async () => {
      sinon.stub(console, 'error');
      recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
          {
            title: 'test',
            steps: [
              {type: Models.Schema.StepType.Navigate, url: 'https://allowed.test/first'},
              {type: Models.Schema.StepType.Navigate, url: 'https://allowed.test/second'},
            ],
          },
          {speed: Models.RecordingPlayer.PlayRecordingSpeed.NORMAL},
      );
      let steps = 0;
      const result = new Promise<Error|null>(resolve => {
        recordingPlayer.addEventListener(Models.RecordingPlayer.Events.ERROR, ({data}) => resolve(data), {once: true});
        recordingPlayer.addEventListener(Models.RecordingPlayer.Events.DONE, () => resolve(null), {once: true});
      });
      recordingPlayer.addEventListener(Models.RecordingPlayer.Events.STEP, ({data: {resolve}}) => {
        steps++;
        if (steps === 2) {
          mocks.emitRequestPaused({
            requestId: '1',
            frameId: 'main-frame',
            request: {url: blockedUrl},
            responseStatusCode: 200,
          });
        }
        resolve();
      });
      await recordingPlayer.play();

      assert.strictEqual((await result)?.message, blockedMessage);
      sinon.assert.calledOnceWithExactly(mocks.mainFrame.goto!, 'https://allowed.test/first');
    });

    it('does not run steps if the guard blocks a navigation before the runner starts', async () => {
      sinon.stub(console, 'error');
      mocks.send.withArgs('Fetch.enable').callsFake(async () => {
        mocks.emitRequestPaused({
          requestId: '1',
          frameId: 'main-frame',
          request: {url: blockedUrl},
          responseStatusCode: 200,
        });
      });
      const {error, steps} = await replay(() => {});

      assert.strictEqual(error?.message, blockedMessage);
      assert.strictEqual(steps, 0);
    });
  });
});
