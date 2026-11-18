// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import sinon from 'sinon';

import * as SDK from '../../../core/sdk/sdk.js';
import type * as Extensions from '../extensions/extensions.js';
import * as Models from '../models/models.js';

export class TestExtension implements Extensions.ExtensionManager.Extension {
  readonly #name: string;
  readonly #origin: string;
  readonly #mediaType?: string;
  readonly #sourceMapSuffix: string;

  constructor(
      name: string,
      origin = 'chrome-extension://ext-a',
      mediaType: string|undefined = 'text/javascript',
      sourceMapSuffix = '',
  ) {
    this.#name = name;
    this.#origin = origin;
    this.#mediaType = mediaType;
    this.#sourceMapSuffix = sourceMapSuffix;
  }

  getName(): string {
    return this.#name;
  }

  getOrigin(): string {
    return this.#origin;
  }

  getMediaType(): string|undefined {
    return this.#mediaType;
  }

  stringify(recording: Object): Promise<string> {
    return Promise.resolve(`${this.#name}:${JSON.stringify(recording)}${this.#sourceMapSuffix}`);
  }

  stringifyStep(step: Object): Promise<string> {
    return Promise.resolve(`${this.#name}:${JSON.stringify(step)}`);
  }

  getCapabilities(): Array<'replay'|'export'> {
    return ['export'];
  }

  replay(_recording: Object): void {
  }
}

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
        goto: sinon.stub().resolves(),
      }],
      mainFrame: () => mock.page.frames()[0],
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
