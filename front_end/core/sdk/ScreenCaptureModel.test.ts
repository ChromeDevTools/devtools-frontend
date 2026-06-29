// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Protocol from '../../generated/protocol.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as SDK from './sdk.js';

const noop = () => {};

const QUALITY = 80;
const MAX_WIDTH = 10;
const MAX_HEIGHT = 20;
const EVERY_NTH_FRAME = 2;

async function expectStartScreencastCalled<T>(connection: MockCDPConnection, action: () => Promise<T>| T): Promise<{
  cdpRequest: Protocol.Page.StartScreencastRequest,
  actionResult: T,
}> {
  connection.setHandler('Page.startScreencast', null);

  const startScreencastCalledPromise = Promise.withResolvers<Protocol.Page.StartScreencastRequest>();
  connection.setSuccessHandler('Page.startScreencast', (request?: Protocol.Page.StartScreencastRequest) => {
    startScreencastCalledPromise.resolve(request as Protocol.Page.StartScreencastRequest);
    return {};
  });

  const response = await action();

  return {
    cdpRequest: await startScreencastCalledPromise.promise,
    actionResult: response,
  };
}

async function expectStopScreencastCaled<T>(connection: MockCDPConnection, action: () => Promise<T>| T): Promise<{
  actionResult: T,
}> {
  connection.setHandler('Page.stopScreencast', null);

  const stopScreencastCalledPromise = Promise.withResolvers<void>();
  connection.setSuccessHandler('Page.stopScreencast', () => {
    stopScreencastCalledPromise.resolve();
    return {};
  });

  const response = await action();

  return {actionResult: response};
}

async function startMockScreencast(connection: MockCDPConnection,
                                   screenCaptureModel: SDK.ScreenCaptureModel.ScreenCaptureModel, {
                                     format = Protocol.Page.StartScreencastRequestFormat.Jpeg,
                                     quality = QUALITY,
                                     maxWidth = MAX_WIDTH,
                                     maxHeight = MAX_HEIGHT,
                                     everyNthFrame = EVERY_NTH_FRAME,
                                     onFrame = noop,
                                     onVisibilityChanged = noop,
                                   }: {
                                     format?: Protocol.Page.StartScreencastRequestFormat,
                                     quality?: number,
                                     maxWidth?: number,
                                     maxHeight?: number,
                                     everyNthFrame?: number,
                                     onFrame?: () => void,
                                     onVisibilityChanged?: () => void,
                                   } = {}) {
  const {
    cdpRequest,
    actionResult: id,
  } = await expectStartScreencastCalled(connection, () => {
    return screenCaptureModel.startScreencast(
        format, quality, maxWidth, maxHeight, everyNthFrame, onFrame, onVisibilityChanged);
  });

  return {
    id,
    cdpRequest,
  };
}

async function stopMockScreencast(connection: MockCDPConnection,
                                  screenCaptureModel: SDK.ScreenCaptureModel.ScreenCaptureModel, {id}: {
                                    id: number,
                                  }) {
  await expectStopScreencastCaled(connection, () => {
    screenCaptureModel.stopScreencast(id);
  });
}

describeWithEnvironment('ScreenCaptureModel', () => {
  let target: SDK.Target.Target;
  let screenCaptureModel: SDK.ScreenCaptureModel.ScreenCaptureModel;
  let universe: TestUniverse;
  let connection: MockCDPConnection;
  beforeEach(() => {
    universe = new TestUniverse();
    connection = new MockCDPConnection();
    target = universe.createTarget({connection});
    const model = target.model(SDK.ScreenCaptureModel.ScreenCaptureModel);
    assert.exists(model);
    screenCaptureModel = model;
  });

  describe('Screencasting', () => {
    describe('only one screencast operation', () => {
      it('startScreencast should start screen casting', async () => {
        const {cdpRequest} = await startMockScreencast(connection, screenCaptureModel, {
          format: Protocol.Page.StartScreencastRequestFormat.Jpeg,
          quality: 1,
          maxWidth: 2,
          maxHeight: 3,
          everyNthFrame: 4,
        });

        assert.deepEqual(cdpRequest, {
          format: Protocol.Page.StartScreencastRequestFormat.Jpeg,
          quality: 1,
          maxWidth: 2,
          maxHeight: 3,
          everyNthFrame: 4
        });
      });

      it('stopScreencast should stop screen casting', async () => {
        const {id} = await startMockScreencast(connection, screenCaptureModel);

        await stopMockScreencast(connection, screenCaptureModel, {id});
      });

      it('stopScreencast throws an error for trying to stop screencast when there are no screencast operations in progress',
         async () => {
           try {
             await stopMockScreencast(connection, screenCaptureModel, {id: 42});
             assert.fail('Expected `stopScreencast` to throw');
           } catch (err) {
             assert.strictEqual(err.message, 'There is no screencast operation to stop.');
           }
         });

      it('stopScreencast throws an error for trying to stop a different screencast than what is being in progress right now',
         async () => {
           await startMockScreencast(connection, screenCaptureModel);
           try {
             await stopMockScreencast(connection, screenCaptureModel, {id: 42});
             assert.fail('Expected `stopScreencast` to throw');
           } catch (err) {
             assert.strictEqual(
                 err.message, 'Trying to stop a screencast operation that is not being served right now.');
           }
         });
    });

    describe('multiple screencast operations', () => {
      beforeEach(() => {
        connection.setSuccessHandler('Page.stopScreencast', () => ({}));
      });

      it('second call to startScreencast stops the ongoing screencasting', async () => {
        await startMockScreencast(connection, screenCaptureModel);

        // Stop screencast is called for the initial call before starting a new screencast.
        await expectStopScreencastCaled(connection, async () => {
          await startMockScreencast(connection, screenCaptureModel);
        });
      });

      it('only the last operation receives the callbacks', async () => {
        const initialFrameCallback = sinon.stub();
        const initialVisibilityChangeCallback = sinon.stub();
        const lastFrameCallback = sinon.stub();
        const lastVisibilityChangeCallback = sinon.stub();

        await startMockScreencast(
            connection, screenCaptureModel,
            {onFrame: initialFrameCallback, onVisibilityChanged: initialVisibilityChangeCallback});
        await startMockScreencast(connection, screenCaptureModel,
                                  {onFrame: lastFrameCallback, onVisibilityChanged: lastVisibilityChangeCallback});
        connection.dispatchEvent('Page.screencastFrame', {} as Protocol.Page.ScreencastFrameEvent, undefined);
        connection.dispatchEvent('Page.screencastVisibilityChanged',
                                 {} as Protocol.Page.ScreencastVisibilityChangedEvent, undefined);

        sinon.assert.notCalled(initialFrameCallback);
        sinon.assert.notCalled(initialVisibilityChangeCallback);
        sinon.assert.calledOnce(lastFrameCallback);
        sinon.assert.calledOnce(lastVisibilityChangeCallback);
      });

      it('after the last operation is stopped, the previous one continues to receive callbacks', async () => {
        const initialFrameCallback = sinon.stub();
        const initialVisibilityChangeCallback = sinon.stub();
        const lastFrameCallback = sinon.stub();
        const lastVisibilityChangeCallback = sinon.stub();

        await startMockScreencast(
            connection, screenCaptureModel,
            {onFrame: initialFrameCallback, onVisibilityChanged: initialVisibilityChangeCallback});
        const {id} =
            await startMockScreencast(connection, screenCaptureModel,
                                      {onFrame: lastFrameCallback, onVisibilityChanged: lastVisibilityChangeCallback});
        await stopMockScreencast(connection, screenCaptureModel, {id});
        connection.dispatchEvent('Page.screencastFrame', {} as Protocol.Page.ScreencastFrameEvent, undefined);
        connection.dispatchEvent('Page.screencastVisibilityChanged',
                                 {} as Protocol.Page.ScreencastVisibilityChangedEvent, undefined);

        sinon.assert.calledOnce(initialFrameCallback);
        sinon.assert.calledOnce(initialVisibilityChangeCallback);
        sinon.assert.notCalled(lastFrameCallback);
        sinon.assert.notCalled(lastVisibilityChangeCallback);
      });
    });
  });
});
