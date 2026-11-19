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

    const subframeStep: Models.Schema.Step = {
      type: Models.Schema.StepType.Click,
      selectors: [['a']],
      offsetX: 1,
      offsetY: 1,
      frame: [0],
    };

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

    it('continues HTTP redirect responses from unrecorded origins', async () => {
      const {error, steps} = await replay(() => {
        mocks.emitRequestPaused({
          requestId: '1',
          frameId: 'main-frame',
          request: {url: 'https://sso.test/bounce'},
          responseStatusCode: 302,
          responseHeaders: [{name: 'Location', value: 'https://allowed.test/done'}],
        });
      });

      assert.isNull(error);
      assert.strictEqual(steps, 3);
      sinon.assert.calledWith(mocks.send, 'Fetch.continueRequest', {requestId: '1'});
      sinon.assert.neverCalledWith(mocks.send, 'Fetch.failRequest');
    });

    it('fails 304 responses from unrecorded origins', async () => {
      sinon.stub(console, 'error');
      const {error} = await replay(() => {
        mocks.emitRequestPaused({
          requestId: '1',
          frameId: 'main-frame',
          request: {url: blockedUrl},
          responseStatusCode: 304,
        });
      });

      assert.strictEqual(error?.message, blockedMessage);
    });

    it('fails 302 responses without a Location header from unrecorded origins', async () => {
      sinon.stub(console, 'error');
      const {error} = await replay(() => {
        mocks.emitRequestPaused({
          requestId: '1',
          frameId: 'main-frame',
          request: {url: blockedUrl},
          responseStatusCode: 302,
          responseHeaders: [],
        });
      });

      assert.strictEqual(error?.message, blockedMessage);
    });

    it('fails 302 responses with an invalid Location header from unrecorded origins', async () => {
      sinon.stub(console, 'error');
      const {error} = await replay(() => {
        mocks.emitRequestPaused({
          requestId: '1',
          frameId: 'main-frame',
          request: {url: blockedUrl},
          responseStatusCode: 302,
          responseHeaders: [{name: 'Location', value: 'http://['}],
        });
      });

      assert.strictEqual(error?.message, blockedMessage);
    });

    it('continues Content-Disposition attachment downloads from unrecorded origins', async () => {
      const {error, steps} = await replay(() => {
        mocks.emitRequestPaused({
          requestId: '1',
          frameId: 'main-frame',
          request: {url: 'https://cdn.test/report.pdf'},
          responseStatusCode: 200,
          responseHeaders: [{name: 'Content-Disposition', value: 'attachment; filename="report.pdf"'}],
        });
      });

      assert.isNull(error);
      assert.strictEqual(steps, 3);
      sinon.assert.calledWith(mocks.send, 'Fetch.continueRequest', {requestId: '1'});
      sinon.assert.neverCalledWith(mocks.send, 'Fetch.failRequest');
    });

    it('fails responses with more than one Content-Disposition header from unrecorded origins', async () => {
      sinon.stub(console, 'error');
      const {error} = await replay(() => {
        mocks.emitRequestPaused({
          requestId: '1',
          frameId: 'main-frame',
          request: {url: blockedUrl},
          responseStatusCode: 200,
          responseHeaders: [
            {name: 'Content-Disposition', value: 'inline'},
            {name: 'Content-Disposition', value: 'attachment'},
          ],
        });
      });

      assert.strictEqual(error?.message, blockedMessage);
    });

    it('continues downloads with HTTP whitespace around the attachment type', async () => {
      const {error} = await replay(() => {
        mocks.emitRequestPaused({
          requestId: '1',
          frameId: 'main-frame',
          request: {url: 'https://cdn.test/report.pdf'},
          responseStatusCode: 200,
          responseHeaders: [{name: 'Content-Disposition', value: ' \tattachment \t; filename="report.pdf"'}],
        });
      });

      assert.isNull(error);
      sinon.assert.calledWith(mocks.send, 'Fetch.continueRequest', {requestId: '1'});
    });

    for (const [name, whitespace] of [['vertical tab', '\v'], ['form feed', '\f'], ['no-break space', '\u00a0']]) {
      it(`fails responses with a ${name} before the attachment type from unrecorded origins`, async () => {
        sinon.stub(console, 'error');
        const {error} = await replay(() => {
          mocks.emitRequestPaused({
            requestId: '1',
            frameId: 'main-frame',
            request: {url: blockedUrl},
            responseStatusCode: 200,
            responseHeaders: [{name: 'Content-Disposition', value: `${whitespace}attachment`}],
          });
        });

        assert.strictEqual(error?.message, blockedMessage);
      });
    }

    for (const status of [302, 404, 500]) {
      it(`fails ${status} responses with a Content-Disposition attachment header from unrecorded origins`, async () => {
        sinon.stub(console, 'error');
        const {error} = await replay(() => {
          mocks.emitRequestPaused({
            requestId: '1',
            frameId: 'main-frame',
            request: {url: blockedUrl},
            responseStatusCode: status,
            responseHeaders: [{name: 'Content-Disposition', value: 'attachment'}],
          });
        });

        assert.strictEqual(error?.message, blockedMessage);
      });
    }

    it('fails non-attachment Content-Disposition tokens from unrecorded origins', async () => {
      sinon.stub(console, 'error');
      for (const value of ['attachment-foo', 'attachment/foo']) {
        const {error} = await replay(() => {
          mocks.emitRequestPaused({
            requestId: '1',
            frameId: 'main-frame',
            request: {url: blockedUrl},
            responseStatusCode: 200,
            responseHeaders: [{name: 'Content-Disposition', value}],
          });
        });
        assert.strictEqual(error?.message, blockedMessage);
      }
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

    it('continues subframe navigations if the recording has no subframe steps', async () => {
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

    it('fails subframe navigations if the recording has subframe steps', async () => {
      sinon.stub(console, 'error');
      const {error, steps} = await replay(() => {
        mocks.emitRequestPaused({
          requestId: '1',
          frameId: 'subframe',
          request: {url: blockedUrl},
          responseStatusCode: 200,
        });
      }, [subframeStep]);

      assert.strictEqual(error?.message, blockedMessage);
      assert.strictEqual(steps, 2);
      sinon.assert.calledWith(mocks.send, 'Fetch.failRequest', {requestId: '1', errorReason: 'BlockedByClient'});
    });

    it('stops the replay if the main frame is at an origin that is not in the recording', async () => {
      sinon.stub(console, 'error');
      const {error, steps} = await replay(() => {
        mocks.emitFrameNavigated(Object.assign(mocks.mainFrame, {url: () => blockedUrl}));
      });

      assert.strictEqual(error?.message, blockedMessage);
      assert.strictEqual(steps, 2);
    });

    it('enables the interception in a new session before the target can run', async () => {
      const session = {send: sinon.stub().resolves(), on: sinon.stub(), off: sinon.stub(), detached: false};
      let callsInTheSameTask: unknown[][] = [];
      const {error} = await replay(() => {
        mocks.emitSessionAttached(session);
        callsInTheSameTask = [...session.send.args];
      });

      assert.isNull(error);
      assert.deepEqual(callsInTheSameTask, [['Fetch.enable', fetchEnablePattern]]);
      sinon.assert.calledWith(session.send, 'Fetch.disable');
    });

    it('fails closed if Fetch.enable rejects on a frame session when checking subframes', async () => {
      sinon.stub(console, 'error');
      const frameSession = {
        send: sinon.stub().rejects(new Error('protocol failure')),
        on: sinon.stub(),
        off: sinon.stub(),
        detached: false,
      };
      const {error} = await replay(() => {
        mocks.frames.push({_id: 'oopif-frame', client: frameSession, url: () => 'https://allowed.test/frame'});
        mocks.emitSessionAttached(frameSession);
      }, [subframeStep]);

      assert.include(error?.message, 'Could not enable the navigation guard: protocol failure');
    });

    it('fails closed if Fetch.enable rejects on framenavigated when checking subframes', async () => {
      sinon.stub(console, 'error');
      const frameSession = {
        send: sinon.stub().rejects(new Error('protocol failure')),
        on: sinon.stub(),
        off: sinon.stub(),
        detached: false,
      };
      const {error} = await replay(() => {
        mocks.emitFrameNavigated({_id: 'oopif-frame', client: frameSession, url: () => 'https://allowed.test/frame'});
      }, [subframeStep]);

      assert.include(error?.message, 'Could not enable the navigation guard: protocol failure');
    });

    it('disables the interception in a session if the replay ends while Fetch.enable is in progress', async () => {
      const enable = Promise.withResolvers<void>();
      const session = {
        send:
            sinon.stub().callsFake((method: string) => method === 'Fetch.enable' ? enable.promise : Promise.resolve()),
        on: sinon.stub(),
        off: sinon.stub(),
        detached: false,
      };

      // The player disposes the guard at the end of the replay.
      const {error} = await replay(() => {
        mocks.emitSessionAttached(session);
      });
      enable.resolve();

      assert.isNull(error);
      sinon.assert.calledWith(session.send, 'Fetch.disable');
      sinon.assert.calledWith(session.off, 'Fetch.requestPaused');
    });

    it('fails closed if Fetch.enable rejects on a frame session that the page does not know yet', async () => {
      sinon.stub(console, 'error');
      // Puppeteer can report the session before the frame of the session.
      const frameSession = {
        send: sinon.stub().rejects(new Error('protocol failure')),
        on: sinon.stub(),
        off: sinon.stub(),
        detached: false,
        target: () => ({_getTargetInfo: () => ({type: 'iframe'})}),
      };
      const {error} = await replay(() => {
        mocks.emitSessionAttached(frameSession);
      }, [subframeStep]);

      assert.include(error?.message, 'Could not enable the navigation guard: protocol failure');
    });

    it('fails closed if Fetch.enable rejects for the main frame on framenavigated', async () => {
      sinon.stub(console, 'error');
      const newSession = {
        send: sinon.stub().rejects(new Error('protocol failure')),
        on: sinon.stub(),
        off: sinon.stub(),
        detached: false,
      };
      // The recording has no subframe steps.
      const {error} = await replay(() => {
        mocks.emitFrameNavigated(Object.assign(mocks.mainFrame, {client: newSession}));
      });

      assert.include(error?.message, 'Could not enable the navigation guard: protocol failure');
    });

    describe('frames of the page at the start of the replay', () => {
      const frameCustomStep: Models.Schema.Step = {
        type: Models.Schema.StepType.CustomStep,
        name: 'dummy step',
        parameters: {},
        frame: [0],
      };

      /** Replays `steps` and returns the error and the number of steps that started. */
      async function replaySteps(steps: Models.Schema.Step[]): Promise<{error: Error | null, steps: number}> {
        Object.assign(mocks.mainFrame, {childFrames: () => [mocks.mainFrame]});
        recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
            {title: 'test', steps},
            {speed: Models.RecordingPlayer.PlayRecordingSpeed.NORMAL},
        );
        let started = 0;
        const result = new Promise<Error|null>(resolve => {
          recordingPlayer.addEventListener(Models.RecordingPlayer.Events.ERROR, ({data}) => resolve(data),
                                           {once: true});
          recordingPlayer.addEventListener(Models.RecordingPlayer.Events.DONE, () => resolve(null), {once: true});
        });
        recordingPlayer.addEventListener(Models.RecordingPlayer.Events.STEP, ({data: {resolve}}) => {
          started++;
          resolve();
        });
        await recordingPlayer.play();
        return {error: await result, steps: started};
      }

      function createFailingSession() {
        return {
          send: sinon.stub().rejects(new Error('protocol failure')),
          on: sinon.stub(),
          off: sinon.stub(),
          detached: false,
        };
      }

      it('stops the replay if a step can send input to a frame from an origin that is not in the recording',
         async () => {
           sinon.stub(console, 'error');
           mocks.frames.push({_id: 'subframe', client: mocks.mainFrame.client, url: () => blockedUrl});

           // The first step is interactive, and the recording has a subframe step.
           const {error, steps} = await replaySteps([frameCustomStep]);

           assert.strictEqual(error?.message, blockedMessage);
           assert.strictEqual(steps, 0);
         });

      it('does not check the frames if the replay navigates the page first', async () => {
        mocks.frames.push({_id: 'subframe', client: mocks.mainFrame.client, url: () => blockedUrl});

        const {error, steps} = await replaySteps([
          {type: Models.Schema.StepType.Navigate, url: 'https://allowed.test/'},
          frameCustomStep,
        ]);

        assert.isNull(error);
        assert.strictEqual(steps, 2);
      });

      it('does not check the subframes if the recording has no subframe steps', async () => {
        mocks.frames.push({_id: 'subframe', client: mocks.mainFrame.client, url: () => blockedUrl});

        const {error, steps} = await replaySteps([createCustomStep()]);

        assert.isNull(error);
        assert.strictEqual(steps, 1);
      });

      it('ignores a Fetch.enable failure on a subframe if the recording has no subframe steps', async () => {
        mocks.frames.push({_id: 'subframe', client: createFailingSession(), url: () => 'https://ads.test/'});

        const {error, steps} = await replaySteps([createCustomStep()]);

        assert.isNull(error);
        assert.strictEqual(steps, 1);
      });

      it('stops the replay after a Fetch.enable failure on a subframe if the recording has subframe steps',
         async () => {
           sinon.stub(console, 'error');
           mocks.frames.push({_id: 'subframe', client: createFailingSession(), url: () => 'https://allowed.test/'});

           const {error, steps} = await replaySteps([
             {type: Models.Schema.StepType.Navigate, url: 'https://allowed.test/'},
             frameCustomStep,
           ]);

           assert.strictEqual(error?.message, 'protocol failure');
           assert.strictEqual(steps, 0);
         });
    });

    it('ignores Fetch.enable rejection on a non-frame session or a closed session', async () => {
      const workerSession = {
        send: sinon.stub().rejects(new Error('Fetch.enable was not found')),
        on: sinon.stub(),
        off: sinon.stub(),
        detached: false,
        target: () => ({_getTargetInfo: () => ({type: 'worker'})}),
      };
      const closedFrameSession = {
        send: sinon.stub().rejects(new Error('Protocol error (Fetch.enable): Session closed.')),
        on: sinon.stub(),
        off: sinon.stub(),
        detached: true,
      };
      Object.assign(mocks.mainFrame, {childFrames: () => [mocks.mainFrame]});
      const subframeCustomStep: Models.Schema.Step = {
        type: Models.Schema.StepType.CustomStep,
        name: 'dummy step',
        parameters: {},
        frame: [0],
      };
      const {error} = await replay(() => {
        mocks.frames.push({_id: 'closed-frame', client: closedFrameSession, url: () => 'https://allowed.test/frame'});
        mocks.emitSessionAttached(workerSession);
        mocks.emitSessionAttached(closedFrameSession);
      }, [subframeCustomStep]);

      assert.isNull(error);
    });

    it('retries Fetch.enable on framenavigated when an earlier sessionattached attempt rejected', async () => {
      sinon.stub(console, 'error');
      const frameSession = {
        send: sinon.stub().rejects(new Error('protocol failure')),
        on: sinon.stub(),
        off: sinon.stub(),
        detached: false,
      };
      const {error} = await replay(() => {
        // Reject before the frame is registered in page.frames().
        mocks.emitSessionAttached(frameSession);
        // Once the rejection settles, emit framenavigated for the same session.
        queueMicrotask(() => {
          mocks.emitFrameNavigated({_id: 'oopif-frame', client: frameSession, url: () => 'https://allowed.test/frame'});
        });
      }, [subframeStep]);

      assert.include(error?.message, 'Could not enable the navigation guard: protocol failure');
      sinon.assert.calledTwice(frameSession.send);
      sinon.assert.calledTwice(frameSession.off.withArgs('Fetch.requestPaused'));
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
