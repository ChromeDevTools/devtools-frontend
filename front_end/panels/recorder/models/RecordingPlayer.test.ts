// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as PuppeteerService from '../../../services/puppeteer/puppeteer.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../../testing/MockCDPConnection.js';
import {getMainFrame} from '../../../testing/ResourceTreeHelpers.js';
import {setupRuntimeHooks} from '../../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
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

  describe('DevTools target', () => {
    const devToolsUrl = 'devtools://devtools/bundled/devtools_app.html';

    async function replayNavigateAndSetViewport(): Promise<Error|null> {
      recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
          {
            title: 'test',
            steps: [
              // The replay rejects this URL if it runs the navigate step.
              {type: Models.Schema.StepType.Navigate, url: 'chrome://settings'},
              {
                type: Models.Schema.StepType.SetViewport,
                width: 800,
                height: 600,
                deviceScaleFactor: 1,
                isMobile: false,
                hasTouch: false,
                isLandscape: false,
              },
            ],
          },
          {speed: Models.RecordingPlayer.PlayRecordingSpeed.NORMAL},
      );
      const result = new Promise<Error|null>(resolve => {
        recordingPlayer.addEventListener(Models.RecordingPlayer.Events.ERROR, ({data}) => resolve(data), {once: true});
        recordingPlayer.addEventListener(Models.RecordingPlayer.Events.DONE, () => resolve(null), {once: true});
      });
      recordingPlayer.addEventListener(Models.RecordingPlayer.Events.STEP, ({data: {resolve}}) => resolve());
      await recordingPlayer.play();
      return await result;
    }

    it('skips navigate and setViewport steps if the target info has a devtools: URL', async () => {
      mocks.setTargetUrl(devToolsUrl);

      const error = await replayNavigateAndSetViewport();

      assert.isNull(error);
    });

    it('does not skip navigate steps if only `page.url()` has a devtools: URL', async () => {
      sinon.stub(console, 'error');
      // A compromised renderer can forge the URL that Puppeteer reports.
      mocks.pages[0].url = () => devToolsUrl;
      mocks.mainFrame.url = () => devToolsUrl;

      const error = await replayNavigateAndSetViewport();

      assert.strictEqual(error?.message, 'Navigation to chrome://settings is not allowed, due to blocked schema');
    });
  });

  describe('Current URL', () => {
    /**
     * Replays a recording that uses the current page. The page gets a
     * response from `requestUrl` before the second step.
     */
    async function replayOnCurrentPage(requestUrl: string): Promise<Error|null> {
      recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
          {title: 'test', steps: [createCustomStep(), createCustomStep()]},
          {speed: Models.RecordingPlayer.PlayRecordingSpeed.NORMAL},
      );
      const result = new Promise<Error|null>(resolve => {
        recordingPlayer.addEventListener(Models.RecordingPlayer.Events.ERROR, ({data}) => resolve(data), {once: true});
        recordingPlayer.addEventListener(Models.RecordingPlayer.Events.DONE, () => resolve(null), {once: true});
      });
      let steps = 0;
      recordingPlayer.addEventListener(Models.RecordingPlayer.Events.STEP, ({data: {resolve}}) => {
        steps++;
        if (steps === 2) {
          mocks.emitRequestPaused({
            requestId: '1',
            frameId: 'main-frame',
            request: {url: requestUrl},
            responseStatusCode: 200,
          });
        }
        resolve();
      });
      await recordingPlayer.play();
      return await result;
    }

    it('allows navigations to the origin of the URL from the target info', async () => {
      mocks.setTargetUrl('https://current.test/page');

      const error = await replayOnCurrentPage('https://current.test/next');

      assert.isNull(error);
      sinon.assert.calledWith(mocks.send, 'Fetch.continueRequest', {requestId: '1'});
    });

    it('does not allow navigations to the origin of `page.url()`', async () => {
      sinon.stub(console, 'error');
      mocks.setTargetUrl('https://current.test/page');
      // A compromised renderer can forge the URL that Puppeteer reports.
      mocks.pages[0].url = () => 'https://forged.test/page';

      const error = await replayOnCurrentPage('https://forged.test/next');

      assert.strictEqual(
          error?.message,
          'Navigation to https://forged.test/next is not allowed, because the recording does not contain its origin');
      sinon.assert.calledWith(mocks.send, 'Fetch.failRequest', {requestId: '1', errorReason: 'BlockedByClient'});
    });
  });

  describe('Current document', () => {
    it('stops the replay if the replay uses the current page and the history has a current entry that is not in the recording',
       async () => {
         sinon.stub(console, 'error');
         mocks.setTargetUrl('https://current.test/page');
         // A compromised renderer can forge the URL that Puppeteer reports.
         mocks.pages[0].url = () => 'https://current.test/page';
         mocks.mainFrame.url = () => 'https://current.test/page';
         mocks.send.withArgs('Page.getNavigationHistory').resolves({
           currentIndex: 0,
           entries: [{url: 'https://other.test/landing'}],
         });
         recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
             {title: 'test', steps: [createCustomStep()]},
             {speed: Models.RecordingPlayer.PlayRecordingSpeed.NORMAL},
         );
         const result = new Promise<Error|null>(resolve => {
           recordingPlayer.addEventListener(Models.RecordingPlayer.Events.ERROR, ({data}) => resolve(data),
                                            {once: true});
           recordingPlayer.addEventListener(Models.RecordingPlayer.Events.DONE, () => resolve(null), {once: true});
         });
         const stepHandler = sinon.stub().callsFake(({data: {resolve}}) => resolve());
         recordingPlayer.addEventListener(Models.RecordingPlayer.Events.STEP, stepHandler);

         await recordingPlayer.play();

         assert.strictEqual(
             (await result)?.message,
             'Navigation to https://other.test/landing is not allowed, because the recording does not contain its origin');
         sinon.assert.notCalled(stepHandler);
         const goto = mocks.pages[0].goto;
         assert.isOk(goto);
         sinon.assert.notCalled(goto);
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

    function createPopupMock(
        url: string,
        extraFrames: Array<{url: string, client?: {send: sinon.SinonStub, on: sinon.SinonStub, off: sinon.SinonStub}}> =
            []) {
      const client = {
        send: sinon.stub().resolves(),
        on: sinon.stub(),
        off: sinon.stub(),
        detached: false,
        parentSession: () => undefined,
      };
      // The browser process reports the session history of the popup.
      client.send.withArgs('Page.getNavigationHistory').resolves({currentIndex: 0, entries: [{url}]});
      const mainFrame = {_id: `frame-${url}`, client, url: () => url, goto: sinon.stub().resolves()};
      const frames = [
        mainFrame,
        ...extraFrames.map(
            (f, index) => ({
              _id: `subframe-${index}`,
              client: f.client ?? {send: sinon.stub().resolves(), on: sinon.stub(), off: sinon.stub(), detached: false},
              url: () => f.url,
            })),
      ];
      const page = {
        _client: () => client,
        on: sinon.stub(),
        off: sinon.stub(),
        frames: () => frames,
        mainFrame: () => mainFrame,
        evaluate: () => '',
        url: () => url,
        bringToFront: () => Promise.resolve(),
        setDefaultTimeout: () => {},
        close: sinon.stub().resolves(),
        isClosed: () => false,
      };
      return {page, client, frames};
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

    it('blocks the page input of the Puppeteer connection when a navigation is blocked', async () => {
      sinon.stub(console, 'error');
      const blockedReplay = await replay(() => {
        mocks.emitRequestPaused({
          requestId: '1',
          frameId: 'main-frame',
          request: {url: blockedUrl},
          responseStatusCode: 200,
        });
      });
      sinon.assert.calledOnceWithExactly(mocks.blockPageInput, blockedReplay.error);
    });

    it('removes the session history of the page at the start of the replay', async () => {
      const {error} = await replay(() => {});

      assert.isNull(error);
      sinon.assert.notCalled(mocks.blockPageInput);
      sinon.assert.calledWith(mocks.send, 'Page.resetNavigationHistory');
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

      /**
       * Creates the root frame of an OOPIF. The frame reports an allowed
       * URL, and the target info from the browser process has `targetUrl`.
       */
      function createOopifFrame(targetUrl: string) {
        const client = {
          send: sinon.stub().resolves(),
          on: sinon.stub(),
          off: sinon.stub(),
          detached: false,
          target: () => ({_getTargetInfo: () => ({type: 'iframe', targetId: 'oopif', url: targetUrl})}),
        };
        return {_id: 'oopif', client, url: () => 'https://allowed.test/frame'};
      }

      it('stops the replay if the target info of an OOPIF has an origin that is not in the recording', async () => {
        sinon.stub(console, 'error');
        mocks.setTargetUrl('https://allowed.test/start');
        // A compromised renderer of the OOPIF can forge the URL that Puppeteer reports.
        mocks.frames.push(createOopifFrame(blockedUrl));

        const {error, steps} = await replaySteps([frameCustomStep]);

        assert.strictEqual(error?.message, blockedMessage);
        assert.strictEqual(steps, 0);
      });

      it('accepts an OOPIF if the target info has an origin from the recording', async () => {
        mocks.setTargetUrl('https://allowed.test/start');
        mocks.frames.push(createOopifFrame('https://allowed.test/frame'));

        const {error, steps} = await replaySteps([frameCustomStep]);

        assert.isNull(error);
        assert.strictEqual(steps, 1);
      });

      it('does not use the target info of an OOPIF for the in-process subframes of the OOPIF', async () => {
        mocks.setTargetUrl('https://allowed.test/start');
        const oopifFrame = createOopifFrame('https://allowed.test/frame');
        // The target info has the URL of the root frame only.
        oopifFrame.client.target = () =>
            ({_getTargetInfo: () => ({type: 'iframe', targetId: 'oopif', url: blockedUrl})});
        mocks.frames.push({_id: 'nested', client: oopifFrame.client, url: () => 'https://allowed.test/nested'});

        const {error, steps} = await replaySteps([frameCustomStep]);

        assert.isNull(error);
        assert.strictEqual(steps, 1);
      });

      it('stops the replay if an OOPIF navigates and its target info has an origin that is not in the recording',
         async () => {
           sinon.stub(console, 'error');
           recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
               {
                 title: 'test',
                 steps: [
                   {type: Models.Schema.StepType.Navigate, url: 'https://allowed.test/'},
                   frameCustomStep,
                   createCustomStep(),
                 ],
               },
               {speed: Models.RecordingPlayer.PlayRecordingSpeed.NORMAL},
           );
           const result = new Promise<Error|null>(resolve => {
             recordingPlayer.addEventListener(Models.RecordingPlayer.Events.ERROR, ({data}) => resolve(data),
                                              {once: true});
             recordingPlayer.addEventListener(Models.RecordingPlayer.Events.DONE, () => resolve(null), {once: true});
           });
           let started = 0;
           recordingPlayer.addEventListener(Models.RecordingPlayer.Events.STEP, ({data: {resolve}}) => {
             started++;
             if (started === 2) {
               mocks.emitFrameNavigated(createOopifFrame(blockedUrl));
             }
             resolve();
           });

           await recordingPlayer.play();

           assert.strictEqual((await result)?.message, blockedMessage);
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
        sinon.stub(console, 'error');
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

      it('stops the replay if a step targets an OOPIF on a page from an unrecorded origin before a navigate step',
         async () => {
           sinon.stub(console, 'error');
           const oopifUrl = 'https://oopif.test/frame.html';
           const oopifFrame = {_id: 'oopif', client: mocks.mainFrame.client, url: () => oopifUrl};
           mocks.mainFrame.url = () => blockedUrl;
           mocks.pages[0].url = () => blockedUrl;
           Object.assign(mocks.pages[0], {waitForFrame: async () => oopifFrame});
           mocks.frames.push(oopifFrame);
           mocks.targets.push({url: () => oopifUrl, page: async () => null});

           // The first step has a different target. It can send input to the
           // OOPIF, thus the guard checks the page at the start of the replay.
           const {error, steps} = await replaySteps([
             {type: Models.Schema.StepType.Close, target: oopifUrl},
             {type: Models.Schema.StepType.Navigate, url: 'https://allowed.test/'},
           ]);

           assert.strictEqual(error?.message, blockedMessage);
           assert.strictEqual(steps, 0);
           // The guard does not change the page of the user.
           sinon.assert.notCalled(mocks.pages[0].goto!);
           sinon.assert.neverCalledWith(mocks.send, 'Page.resetNavigationHistory');
         });

      // The guard does not know if a target is an OOPIF of the inspected page
      // or a popup, thus each of these steps causes the check of the page.
      const stepsBeforeNavigation: Array<{name: string, steps: Models.Schema.Step[]}> = [
        {
          name: 'a step targets a popup',
          steps: [{type: Models.Schema.StepType.Close, target: 'https://popup.test/index.html'}],
        },
        {
          name: 'a navigate step targets a popup',
          steps: [{
            type: Models.Schema.StepType.Navigate,
            url: 'https://allowed.test/popup',
            target: 'https://popup.test/index.html',
          }],
        },
        {
          name: 'a non-interactive step is before a step that targets an OOPIF',
          steps: [
            {
              type: Models.Schema.StepType.SetViewport,
              width: 800,
              height: 600,
              deviceScaleFactor: 1,
              isMobile: false,
              hasTouch: false,
              isLandscape: false,
            },
            {type: Models.Schema.StepType.Close, target: 'https://oopif.test/frame.html'},
          ],
        },
      ];
      for (const {name, steps: firstSteps} of stepsBeforeNavigation) {
        it(`stops the replay on a page from an unrecorded origin if ${name} before a main-page navigate step`,
            async () => {
              sinon.stub(console, 'error');
              mocks.mainFrame.url = () => blockedUrl;
              mocks.pages[0].url = () => blockedUrl;

              const {error, steps} = await replaySteps([
                ...firstSteps,
                {type: Models.Schema.StepType.Navigate, url: 'https://allowed.test/'},
              ]);

              assert.strictEqual(error?.message, blockedMessage);
              assert.strictEqual(steps, 0);
              sinon.assert.notCalled(mocks.pages[0].goto!);
              sinon.assert.neverCalledWith(mocks.send, 'Page.resetNavigationHistory');
            });
      }

      it('keeps the page if a step targets an OOPIF on a page from a recorded origin before a navigate step',
         async () => {
           const oopifUrl = 'https://oopif.test/frame.html';
           const oopifFrame = {_id: 'oopif', client: mocks.mainFrame.client, url: () => oopifUrl};
           mocks.mainFrame.url = () => 'https://allowed.test/start';
           mocks.pages[0].url = () => 'https://allowed.test/start';
           Object.assign(mocks.pages[0], {waitForFrame: async () => oopifFrame});
           mocks.frames.push(oopifFrame);
           mocks.targets.push({url: () => oopifUrl, page: async () => null});

           const {error, steps} = await replaySteps([
             {type: Models.Schema.StepType.Close, target: oopifUrl},
             {type: Models.Schema.StepType.Navigate, url: 'https://allowed.test/'},
           ]);

           assert.isNull(error);
           assert.strictEqual(steps, 2);
           sinon.assert.notCalled(mocks.pages[0].goto!);
           sinon.assert.calledWith(mocks.send, 'Page.resetNavigationHistory');
         });

      it('does not navigate the page to about:blank if a step targets an OOPIF before the first navigate step',
         async () => {
           const oopifUrl = 'https://oopif.test/frame.html';
           const oopifFrame = {_id: 'oopif', client: mocks.mainFrame.client, url: () => oopifUrl};
           mocks.send.withArgs('Page.getNavigationHistory').resolves({
             currentIndex: 0,
             entries: [{url: 'https://allowed.test/start'}],
           });
           mocks.mainFrame.url = () => 'https://allowed.test/start';
           Object.assign(mocks.pages[0], {waitForFrame: async () => oopifFrame});
           mocks.frames.push(oopifFrame);
           mocks.targets.push({url: () => oopifUrl, page: async () => null});

           // The first step sends input to a frame of the current page, thus the page must stay.
           const {error} = await replaySteps([
             {type: Models.Schema.StepType.Close, target: oopifUrl},
             {type: Models.Schema.StepType.Navigate, url: 'https://allowed.test/'},
           ]);

           assert.isNull(error);
           const goto = mocks.pages[0].goto;
           assert.isOk(goto);
           sinon.assert.notCalled(goto);
         });

      function createPrerenderSession() {
        return {send: sinon.stub().resolves(), on: sinon.stub(), off: sinon.stub(), detached: false};
      }

      it('stops the replay if a prerendered page has an origin that is not in the recording', async () => {
        sinon.stub(console, 'error');
        const session = createPrerenderSession();
        mocks.tabChildTargets.push({_subtype: () => 'prerender', _session: () => session, url: () => blockedUrl});

        // The first step is interactive. The page can activate the prerendered page before a step.
        const {error, steps} = await replaySteps([createCustomStep()]);

        assert.strictEqual(error?.message, blockedMessage);
        assert.strictEqual(steps, 0);
      });

      it('reads the URL of a prerendered page from its session', async () => {
        sinon.stub(console, 'error');
        const session = createPrerenderSession();
        session.send.withArgs('Page.getFrameTree').resolves({frameTree: {frame: {url: blockedUrl}}});
        // The URL of the target is empty until the prerendered page commits.
        mocks.tabChildTargets.push({_subtype: () => 'prerender', _session: () => session, url: () => ''});

        const {error, steps} = await replaySteps([createCustomStep()]);

        assert.strictEqual(error?.message, blockedMessage);
        assert.strictEqual(steps, 0);
      });

      it('stops the replay if a prerendered page commits a document from an origin that is not in the recording',
         async () => {
           sinon.stub(console, 'error');
           const session = createPrerenderSession();
           let onFrameNavigated = (_event: {frame: {url: string, parentId?: string}}): void => {};
           session.on.withArgs('Page.frameNavigated').callsFake((_name: string, listener: typeof onFrameNavigated) => {
             onFrameNavigated = listener;
           });
           // The response arrived before the interception was on. The document commits later.
           session.send.withArgs('Page.getFrameTree').callsFake(async () => {
             setTimeout(() => {
               onFrameNavigated({frame: {url: 'https://subframe.test/', parentId: 'parent'}});
               onFrameNavigated({frame: {url: blockedUrl}});
             }, 0);
             return {frameTree: {frame: {url: ''}}};
           });
           mocks.tabChildTargets.push({_subtype: () => 'prerender', _session: () => session, url: () => ''});

           const {error} = await replaySteps([createCustomStep(), createCustomStep()]);

           assert.strictEqual(error?.message, blockedMessage);
         });

      it('does not check a prerendered page if the replay navigates the page first', async () => {
        const session = createPrerenderSession();
        mocks.tabChildTargets.push({_subtype: () => 'prerender', _session: () => session, url: () => blockedUrl});

        // The navigation removes the prerendered pages of the current document.
        const {error, steps} = await replaySteps([
          {type: Models.Schema.StepType.Navigate, url: 'https://allowed.test/'},
          createCustomStep(),
        ]);

        assert.isNull(error);
        assert.strictEqual(steps, 2);
        sinon.assert.calledWith(session.send, 'Fetch.enable', fetchEnablePattern);
        sinon.assert.neverCalledWith(session.send, 'Page.getFrameTree');
      });

      it('checks a prerendered page if a step targets an OOPIF on the inspected page before a navigate step',
         async () => {
           sinon.stub(console, 'error');
           const oopifUrl = 'https://oopif.test/frame.html';
           const oopifFrame = {_id: 'oopif', client: mocks.mainFrame.client, url: () => oopifUrl};
           Object.assign(mocks.pages[0], {waitForFrame: async () => oopifFrame});
           mocks.frames.push(oopifFrame);
           mocks.targets.push({url: () => oopifUrl, page: async () => null});
           const session = createPrerenderSession();
           mocks.tabChildTargets.push({_subtype: () => 'prerender', _session: () => session, url: () => blockedUrl});

           // The page can activate the prerendered page after the input of the first step.
           const {error} = await replaySteps([
             {type: Models.Schema.StepType.Close, target: oopifUrl},
             {type: Models.Schema.StepType.Navigate, url: 'https://allowed.test/'},
           ]);

           assert.strictEqual(error?.message, blockedMessage);
           sinon.assert.notCalled(mocks.pages[0].goto!);
         });

      it('removes the session history if the recording has subframe steps, also if all entries are allowed',
         async () => {
           // The history does not report the frames of its entries.
           mocks.send.withArgs('Page.getNavigationHistory').resolves({
             currentIndex: 1,
             entries: [{url: 'https://allowed.test/first'}, {url: 'https://allowed.test/second'}],
           });

           const {error} = await replaySteps([
             {type: Models.Schema.StepType.Navigate, url: 'https://allowed.test/'},
             frameCustomStep,
           ]);

           assert.isNull(error);
           sinon.assert.calledWith(mocks.send, 'Page.resetNavigationHistory');
         });

      it('navigates the page to about:blank if the replay navigates first and has subframe steps, also if all frames report an allowed URL',
         async () => {
           // A compromised renderer can forge the URL of a frame, and the
           // history does not report the frames of its entries.
           mocks.send.withArgs('Page.getNavigationHistory').resolves({
             currentIndex: 0,
             entries: [{url: 'https://allowed.test/start'}],
           });
           mocks.frames.push(
               {_id: 'subframe', client: mocks.mainFrame.client, url: () => 'https://allowed.test/frame'});

           // The replay navigates the page first, thus the guard does not report the frame.
           const {error} = await replaySteps([
             {type: Models.Schema.StepType.Navigate, url: 'https://allowed.test/'},
             frameCustomStep,
           ]);

           assert.isNull(error);
           const goto = mocks.pages[0].goto;
           assert.isOk(goto);
           sinon.assert.calledOnceWithExactly(goto, 'about:blank');
         });

      it('does not navigate the page for a frame that is not allowed if the recording has no subframe steps',
         async () => {
           mocks.pages[0].url = () => 'https://allowed.test/start';
           mocks.frames.push({_id: 'subframe', client: mocks.mainFrame.client, url: () => blockedUrl});

           const {error} = await replaySteps([
             {type: Models.Schema.StepType.Navigate, url: 'https://allowed.test/'},
             createCustomStep(),
           ]);

           assert.isNull(error);
           const goto = mocks.pages[0].goto;
           assert.isOk(goto);
           sinon.assert.notCalled(goto);
         });
    });

    it('ignores Fetch.enable rejection on a non-frame session or a closed session', async () => {
      sinon.stub(console, 'error');
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

    it('guards the parent popup when a step targets an OOPIF inside that popup', async () => {
      sinon.stub(console, 'error');
      const oopifUrl = 'https://oopif.test/frame.html';
      const popup = createPopupMock(blockedUrl, [{url: oopifUrl}]);
      mocks.pages.push(popup.page);
      mocks.targets.push({url: () => oopifUrl, page: async () => null});

      const {error} = await replay(() => {}, [
        {type: Models.Schema.StepType.Close, target: oopifUrl},
      ]);

      assert.strictEqual(error?.message, blockedMessage);
      sinon.assert.calledWith(popup.client.send, 'Fetch.enable', fetchEnablePattern);
      sinon.assert.calledWith(popup.frames[1].client.send, 'Fetch.enable', fetchEnablePattern);
    });

    it('stops the replay if the history of a popup has a current entry that is not in the recording', async () => {
      sinon.stub(console, 'error');
      const popupUrl = 'https://popup.test/index.html';
      // A compromised renderer can forge the URL that Puppeteer reports for the popup.
      const popup = createPopupMock(popupUrl);
      popup.client.send.withArgs('Page.getNavigationHistory').resolves({currentIndex: 0, entries: [{url: blockedUrl}]});
      mocks.pages.push(popup.page);
      mocks.targets.push({url: () => popupUrl, page: async () => popup.page});

      const {error} = await replay(() => {}, [
        {type: Models.Schema.StepType.Close, target: popupUrl},
      ]);

      assert.strictEqual(error?.message, blockedMessage);
      sinon.assert.notCalled(popup.page.close);
      sinon.assert.neverCalledWith(popup.client.send, 'Page.resetNavigationHistory');
    });

    it('stops the replay if the history of a popup has no current entry', async () => {
      sinon.stub(console, 'error');
      const popupUrl = 'https://popup.test/index.html';
      const popup = createPopupMock(popupUrl);
      popup.client.send.withArgs('Page.getNavigationHistory').resolves({entries: []});
      mocks.pages.push(popup.page);
      mocks.targets.push({url: () => popupUrl, page: async () => popup.page});

      const {error} = await replay(() => {}, [
        {type: Models.Schema.StepType.Close, target: popupUrl},
      ]);

      assert.strictEqual(error?.message,
                         'Could not enable the navigation guard: The session history has no current entry');
      sinon.assert.notCalled(popup.page.close);
    });

    it('guards all pages that share a step target URL', async () => {
      const popupUrl = 'https://popup.test/index.html';
      const firstPopup = createPopupMock(popupUrl);
      const secondPopup = createPopupMock(popupUrl);
      mocks.pages.push(firstPopup.page, secondPopup.page);
      mocks.targets.push(
          {url: () => popupUrl, page: async () => firstPopup.page},
          {url: () => popupUrl, page: async () => secondPopup.page},
      );

      const {error} = await replay(() => {}, [
        {type: Models.Schema.StepType.Close, target: popupUrl},
      ]);

      assert.isNull(error);
      sinon.assert.calledWith(firstPopup.client.send, 'Fetch.enable', fetchEnablePattern);
      sinon.assert.calledWith(secondPopup.client.send, 'Fetch.enable', fetchEnablePattern);
    });

    describe('step targets that change during the replay', () => {
      /**
       * Replays a recording that navigates to https://allowed.test and then
       * runs `steps`. Calls `beforeStep` with the number of each step.
       */
      async function replayWithHook(steps: Models.Schema.Step[],
                                    beforeStep: (stepNumber: number) => void): Promise<Error|null> {
        recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
            {title: 'test', steps: [{type: Models.Schema.StepType.Navigate, url: 'https://allowed.test/'}, ...steps]},
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
          beforeStep(started);
          resolve();
        });
        await recordingPlayer.play();
        return await result;
      }

      it('guards a page that gets the URL of a step target after the guard looked for the target', async () => {
        const popupUrl = 'https://popup.test/index.html';
        const firstPopup = createPopupMock(popupUrl);
        const secondPopup = createPopupMock(popupUrl);
        mocks.pages.push(firstPopup.page);
        mocks.targets.push({url: () => popupUrl, page: async () => firstPopup.page});

        const error = await replayWithHook(
            [{type: Models.Schema.StepType.Close, target: popupUrl}, createCustomStep()], stepNumber => {
              if (stepNumber === 3) {
                // The step on the target is complete. A new page with the same URL opens.
                mocks.pages.push(secondPopup.page);
                mocks.emitTargetCreated({url: () => popupUrl, page: async () => secondPopup.page});
              }
            });

        assert.isNull(error);
        sinon.assert.calledWith(secondPopup.client.send, 'Fetch.enable', fetchEnablePattern);
      });

      it('does not guard a new page that does not have the URL of a step target', async () => {
        const popupUrl = 'https://popup.test/index.html';
        const firstPopup = createPopupMock(popupUrl);
        const otherPopup = createPopupMock('https://popup.test/other.html');
        mocks.pages.push(firstPopup.page);
        mocks.targets.push({url: () => popupUrl, page: async () => firstPopup.page});

        const error = await replayWithHook(
            [{type: Models.Schema.StepType.Close, target: popupUrl}, createCustomStep()], stepNumber => {
              if (stepNumber === 3) {
                mocks.pages.push(otherPopup.page);
                mocks.emitTargetCreated(
                    {url: () => 'https://popup.test/other.html', page: async () => otherPopup.page});
              }
            });

        assert.isNull(error);
        sinon.assert.neverCalledWith(otherPopup.client.send, 'Fetch.enable');
      });

      it('stops the wait for a step target when the guard blocks a navigation', async () => {
        sinon.stub(console, 'error');
        // No target has the URL of the step. The guard blocks a navigation
        // while the step waits for the target.
        mocks.waitForTarget.callsFake(async (_predicate: unknown, options?: {signal?: AbortSignal}) => {
          setTimeout(() => {
            mocks.emitRequestPaused({
              requestId: '1',
              frameId: 'main-frame',
              request: {url: blockedUrl},
              responseStatusCode: 200,
            });
          }, 0);
          return await new Promise((_resolve, reject) => {
            options?.signal?.addEventListener('abort', () => reject(new Error('The wait was aborted')));
          });
        });

        const error = await replayWithHook(
            [{type: Models.Schema.StepType.Close, target: 'https://popup.test/never.html'}], () => {});

        assert.strictEqual(error?.message, blockedMessage);
        sinon.assert.calledOnce(mocks.waitForTarget);
        assert.isTrue(mocks.waitForTarget.firstCall.args[1].signal.aborted);
      });

      it('ignores a step target page that closes while the guard starts on it', async () => {
        const popupUrl = 'https://popup.test/index.html';
        const popup = createPopupMock(popupUrl);
        popup.client.send.withArgs('Fetch.enable').rejects(new Error('Protocol error (Fetch.enable): Session closed.'));
        popup.page.isClosed = () => true;
        mocks.pages.push(popup.page);
        mocks.targets.push({url: () => popupUrl, page: async () => popup.page});

        const error = await replayWithHook([{type: Models.Schema.StepType.Close, target: popupUrl}], () => {});

        assert.isNull(error);
      });

      it('stops the replay if the guard cannot start on a step target page that is open', async () => {
        sinon.stub(console, 'error');
        const popupUrl = 'https://popup.test/index.html';
        const popup = createPopupMock(popupUrl);
        popup.client.send.withArgs('Fetch.enable').rejects(new Error('protocol failure'));
        mocks.pages.push(popup.page);
        mocks.targets.push({url: () => popupUrl, page: async () => popup.page});

        const error = await replayWithHook([{type: Models.Schema.StepType.Close, target: popupUrl}], () => {});

        assert.strictEqual(error?.message, 'protocol failure');
        sinon.assert.notCalled(popup.page.close);
      });
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

    it('does not start a step if a navigation is blocked while the page comes to the front', async () => {
      sinon.stub(console, 'error');
      let bringToFrontCalls = 0;
      mocks.pages[0].bringToFront = async () => {
        bringToFrontCalls++;
        if (bringToFrontCalls === 2) {
          // The second step called `bringToFront()`, and it has not started yet.
          mocks.emitRequestPaused({
            requestId: '1',
            frameId: 'main-frame',
            request: {url: blockedUrl},
            responseStatusCode: 200,
          });
        }
      };
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
      const result = new Promise<Error|null>(resolve => {
        recordingPlayer.addEventListener(Models.RecordingPlayer.Events.ERROR, ({data}) => resolve(data), {once: true});
        recordingPlayer.addEventListener(Models.RecordingPlayer.Events.DONE, () => resolve(null), {once: true});
      });
      recordingPlayer.addEventListener(Models.RecordingPlayer.Events.STEP, ({data: {resolve}}) => resolve());

      await recordingPlayer.play();

      assert.strictEqual((await result)?.message, blockedMessage);
      sinon.assert.calledOnceWithExactly(mocks.mainFrame.goto!, 'https://allowed.test/first');
    });

    it('checks all documents of a prerender session before the page uses the session', async () => {
      sinon.stub(console, 'error');
      const listeners: Array<(event: unknown) => void> = [];
      const prerenderSession = {
        send: sinon.stub().resolves(),
        on: sinon.stub().callsFake((event: string, listener: (event: unknown) => void) => {
          if (event === 'Fetch.requestPaused') {
            listeners.push(listener);
          }
        }),
        off: sinon.stub(),
        detached: false,
      };
      const {error} = await replay(() => {
        mocks.emitPrerenderSessionAttached(prerenderSession);
        // The recording has no subframe step, and the page does not know this frame.
        listeners[0]({
          requestId: '1',
          frameId: 'prerender-main-frame',
          request: {url: blockedUrl},
          responseStatusCode: 200,
        });
      });

      assert.strictEqual(error?.message, blockedMessage);
      sinon.assert.calledWith(prerenderSession.send.firstCall, 'Fetch.enable', fetchEnablePattern);
      sinon.assert.calledWith(prerenderSession.send, 'Fetch.failRequest',
                              {requestId: '1', errorReason: 'BlockedByClient'});
    });

    it('guards a prerendered page that the page started before the replay', async () => {
      const createSession = () =>
          ({send: sinon.stub().resolves(), on: sinon.stub(), off: sinon.stub(), detached: false});
      const prerenderSession = createSession();
      const otherSession = createSession();
      mocks.tabChildTargets.push(
          {
            _subtype: () => 'prerender',
            _session: () => prerenderSession,
            url: () => 'https://allowed.test/prerendered',
          },
          {_subtype: () => undefined, _session: () => otherSession, url: () => blockedUrl},
      );

      const {error} = await replay(() => {});

      assert.isNull(error);
      sinon.assert.calledWith(prerenderSession.send.firstCall, 'Fetch.enable', fetchEnablePattern);
      sinon.assert.notCalled(otherSession.send);
    });

    it('ignores a prerendered page from before the replay that is closed when the guard starts', async () => {
      const session = {
        send: sinon.stub().rejects(new Error('Protocol error (Fetch.enable): Session closed.')),
        on: sinon.stub(),
        off: sinon.stub(),
        detached: true,
      };
      // The guard does not check the URL of a page that is closed.
      mocks.tabChildTargets.push({_subtype: () => 'prerender', _session: () => session, url: () => blockedUrl});

      const {error, steps} = await replay(() => {});

      assert.isNull(error);
      assert.strictEqual(steps, 3);
    });

    it('fails closed if Fetch.enable rejects on a prerender session from before the replay', async () => {
      sinon.stub(console, 'error');
      const session = {
        send: sinon.stub().rejects(new Error('protocol failure')),
        on: sinon.stub(),
        off: sinon.stub(),
        detached: false,
      };
      mocks.tabChildTargets.push(
          {_subtype: () => 'prerender', _session: () => session, url: () => 'https://allowed.test/prerendered'});

      const {error, steps} = await replay(() => {});

      assert.strictEqual(error?.message, 'Could not enable the navigation guard: protocol failure');
      assert.strictEqual(steps, 0);
    });

    it('keeps the session history if all entries have an origin from the recording', async () => {
      mocks.send.withArgs('Page.getNavigationHistory').resolves({
        currentIndex: 1,
        entries: [{url: 'https://allowed.test/first'}, {url: 'https://allowed.test/second'}],
      });

      const {error} = await replay(() => {});

      assert.isNull(error);
      sinon.assert.neverCalledWith(mocks.send, 'Page.resetNavigationHistory');
    });

    it('removes the session history if an entry has an origin that is not in the recording', async () => {
      mocks.send.withArgs('Page.getNavigationHistory').resolves({
        currentIndex: 1,
        entries: [{url: blockedUrl}, {url: 'https://allowed.test/second'}],
      });

      const {error} = await replay(() => {});

      assert.isNull(error);
      sinon.assert.calledWith(mocks.send, 'Page.resetNavigationHistory');
    });

    it('navigates the page to about:blank before it removes the history, if the document is not allowed', async () => {
      // The replay navigates the page first, and the recording does not contain this origin.
      mocks.send.withArgs('Page.getNavigationHistory').resolves({
        currentIndex: 0,
        entries: [{url: 'https://unrecorded.test/page'}],
      });

      const {error} = await replay(() => {});

      assert.isNull(error);
      const goto = mocks.pages[0].goto;
      assert.isOk(goto);
      sinon.assert.calledOnceWithExactly(goto, 'about:blank');
      sinon.assert.calledWith(mocks.send, 'Page.resetNavigationHistory');
    });

    it('navigates the page to about:blank if only `page.url()` has an origin from the recording', async () => {
      // A compromised renderer can forge the URL that Puppeteer reports.
      mocks.pages[0].url = () => 'https://allowed.test/page';
      mocks.mainFrame.url = () => 'https://allowed.test/page';
      mocks.send.withArgs('Page.getNavigationHistory').resolves({
        currentIndex: 0,
        entries: [{url: 'https://unrecorded.test/page'}],
      });

      const {error} = await replay(() => {});

      assert.isNull(error);
      const goto = mocks.pages[0].goto;
      assert.isOk(goto);
      sinon.assert.calledOnceWithExactly(goto, 'about:blank');
      sinon.assert.calledWith(mocks.send, 'Page.resetNavigationHistory');
    });

    it('navigates the page to about:blank if the session history has no current entry', async () => {
      mocks.send.withArgs('Page.getNavigationHistory').resolves({entries: []});

      const {error} = await replay(() => {});

      assert.isNull(error);
      const goto = mocks.pages[0].goto;
      assert.isOk(goto);
      sinon.assert.calledOnceWithExactly(goto, 'about:blank');
    });

    it('does not change the page if the guard has an error before it removes the history', async () => {
      sinon.stub(console, 'error');
      mocks.send.withArgs('Page.getNavigationHistory').resolves({
        currentIndex: 0,
        entries: [{url: 'https://unrecorded.test/page'}],
      });
      mocks.send.withArgs('Fetch.enable').callsFake(async () => {
        mocks.emitRequestPaused({
          requestId: '1',
          frameId: 'main-frame',
          request: {url: blockedUrl},
          responseStatusCode: 200,
        });
      });

      const {error} = await replay(() => {});

      assert.strictEqual(error?.message, blockedMessage);
      const goto = mocks.pages[0].goto;
      assert.isOk(goto);
      sinon.assert.notCalled(goto);
      sinon.assert.neverCalledWith(mocks.send, 'Page.getNavigationHistory');
      sinon.assert.neverCalledWith(mocks.send, 'Page.resetNavigationHistory');
    });

    it('keeps the session history if the current entry of the history has a devtools: URL', async () => {
      mocks.send.withArgs('Page.getNavigationHistory').resolves({
        currentIndex: 0,
        entries: [{url: 'devtools://devtools/bundled/devtools_app.html'}],
      });

      const {error} = await replay(() => {});

      assert.isNull(error);
      const goto = mocks.pages[0].goto;
      assert.isOk(goto);
      sinon.assert.notCalled(goto);
      sinon.assert.neverCalledWith(mocks.send, 'Page.resetNavigationHistory');
    });

    it('removes the session history if only `page.url()` has a devtools: URL', async () => {
      // A compromised renderer can forge the URL that Puppeteer reports.
      mocks.pages[0].url = () => 'devtools://devtools/bundled/devtools_app.html';
      mocks.send.withArgs('Page.getNavigationHistory').resolves({
        currentIndex: 0,
        entries: [{url: 'https://unrecorded.test/page'}],
      });

      const {error} = await replay(() => {});

      assert.isNull(error);
      sinon.assert.calledWith(mocks.send, 'Page.resetNavigationHistory');
    });

    it('fails closed if Fetch.enable rejects on a prerender session', async () => {
      sinon.stub(console, 'error');
      const prerenderSession = {
        send: sinon.stub().rejects(new Error('protocol failure')),
        on: sinon.stub(),
        off: sinon.stub(),
        detached: false,
      };
      const {error} = await replay(() => {
        mocks.emitPrerenderSessionAttached(prerenderSession);
      });

      assert.include(error?.message, 'Could not enable the navigation guard: protocol failure');
    });

    it('does not wait for the step in progress after the guard blocks a navigation', async () => {
      sinon.stub(console, 'error');
      // The step does not complete before the end of the replay.
      const step = Promise.withResolvers<void>();
      mocks.mainFrame.goto!.callsFake(() => {
        setTimeout(() => {
          mocks.emitRequestPaused({
            requestId: '1',
            frameId: 'main-frame',
            request: {url: blockedUrl},
            responseStatusCode: 200,
          });
        }, 0);
        return step.promise;
      });
      recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
          {
            title: 'test',
            steps: [{type: Models.Schema.StepType.Navigate, url: 'https://allowed.test/'}, createCustomStep()],
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
        resolve();
      });

      await recordingPlayer.play();

      assert.strictEqual((await result)?.message, blockedMessage);
      assert.strictEqual(steps, 1);
      step.resolve();
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

describe('RecordingPlayer.connectPuppeteer', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  const pageUrl = 'https://current.test/page';
  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
    // `connectPuppeteer()` gets the targets from the global target manager.
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
  });

  afterEach(() => {
    universe.dispose();
  });

  /**
   * Creates a tab target and a page target on a mock CDP connection.
   * `hasPageTargetInfo` selects if Target.getTargetInfo succeeds for the page target.
   */
  function installTargets(hasPageTargetInfo: boolean) {
    SDK.ChildTargetManager.ChildTargetManager.install();
    const connection = new MockCDPConnection();
    const tabTarget = universe.createTarget({type: SDK.Target.Type.TAB, connection});
    const pageTarget = universe.createTarget({parentTarget: tabTarget, url: pageUrl});
    getMainFrame(pageTarget);
    const tabTargetInfo = tabTarget.targetInfo();
    const pageTargetInfo = pageTarget.targetInfo();
    assert.exists(tabTargetInfo);
    assert.exists(pageTargetInfo);
    // The page target has a session, and the tab target has no session.
    connection.setHandler('Target.getTargetInfo', (_params, sessionId) => {
      if (!sessionId) {
        return {result: {targetInfo: tabTargetInfo}};
      }
      return hasPageTargetInfo ? {result: {targetInfo: pageTargetInfo}} : {error: {code: -32000, message: 'failed'}};
    });
    const attachToTarget = sinon.stub().returns({sessionId: 'session'});
    connection.setSuccessHandler('Target.attachToTarget', attachToTarget);
    // The test does not use the Puppeteer objects, thus they have only the
    // members that `connectPuppeteer()` reads.
    const connectPuppeteerToConnection =
        sinon.stub(PuppeteerService.PuppeteerConnection.PuppeteerConnectionHelper, 'connectPuppeteerToConnectionViaTab')
            .resolves({page: {}, browser: {on: sinon.stub()}, puppeteerConnection: {}} as never);
    return {attachToTarget, connectPuppeteerToConnection};
  }

  it('returns the URL from the target info of the primary page target', async () => {
    const {attachToTarget} = installTargets(/* hasPageTargetInfo= */ true);

    const {targetUrl} = await Models.RecordingPlayer.RecordingPlayer.connectPuppeteer();

    assert.strictEqual(targetUrl, pageUrl);
    sinon.assert.calledOnce(attachToTarget);
  });

  it('throws before it attaches to the target if the target info is not available', async () => {
    const {attachToTarget, connectPuppeteerToConnection} = installTargets(/* hasPageTargetInfo= */ false);

    let error: Error|undefined;
    try {
      await Models.RecordingPlayer.RecordingPlayer.connectPuppeteer();
    } catch (err) {
      error = err;
    }

    assert.strictEqual(error?.message, 'Could not get the target info of the primary page target');
    sinon.assert.notCalled(attachToTarget);
    sinon.assert.notCalled(connectPuppeteerToConnection);
  });
});
