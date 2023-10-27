// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @typescript-eslint/naming-convention */

import * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import * as Models from '../../../../../../front_end/panels/recorder/models/models.js';

export interface ClientMock {
  send(): sinon.SinonStub;
}

export const createCustomStep = (): Models.Schema.Step => ({
  type: Models.Schema.StepType.CustomStep,
  name: 'dummy step',
  parameters: {},
});

export const installMocksForRecordingPlayer = (): void => {
  const mock = {
    page: {
      _client: () => ({
        send: sinon.stub().resolves(),
      }),
      frames: () => [{
        client: {send: sinon.stub().resolves()},
      }],
      evaluate: () => '',
      url() {
        return '';
      },
      bringToFront() {
        return Promise.resolve();
      },
    },
    browser: {
      pages: () => [mock.page],
      disconnect: () => sinon.stub().resolves(),
    },
  };
  sinon.stub(Models.RecordingPlayer.RecordingPlayer, 'connectPuppeteer').resolves(mock as never);
};

export const installMocksForTargetManager = (): void => {
  const stub = {
    suspendAllTargets: sinon.stub().resolves(),
    resumeAllTargets: sinon.stub().resolves(),
    primaryPageTarget: sinon.stub().returns({
      targetAgent: sinon.stub().returns({}),
    }),
  };
  sinon.stub(SDK.TargetManager.TargetManager, 'instance')
      .callsFake(() => stub as unknown as SDK.TargetManager.TargetManager);
};
