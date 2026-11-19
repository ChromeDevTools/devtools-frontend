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

export interface MockFrame {
  _id: string;
  client: {
    send: sinon.SinonStub,
    on: sinon.SinonStub,
    off: sinon.SinonStub,
    detached?: boolean,
  };
  url: () => string;
  goto?: sinon.SinonStub;
}

export interface MockPage {
  _client: () => MockFrame['client'];
  on: sinon.SinonStub;
  off: sinon.SinonStub;
  frames: () => MockFrame[];
  mainFrame: () => MockFrame;
  evaluate: () => string;
  url: () => string;
  bringToFront: () => Promise<void>;
}

export interface RecordingPlayerMocks {
  /** The `send` method of the CDP session of the mock page. */
  send: sinon.SinonStub;
  mainFrame: MockFrame;
  frames: MockFrame[];
  /** Sends a `Fetch.requestPaused` event to the listeners of the CDP session. */
  emitRequestPaused(event: {
    requestId: string,
    frameId: string,
    request: {url: string},
    responseStatusCode?: number,
    responseHeaders?: Array<{name: string, value: string}>,
  }): void;
  /** Sends a `framenavigated` event to the listeners of the mock page. */
  emitFrameNavigated(frame: unknown): void;
  /** Sends a `sessionattached` event to the listeners of the CDP session. */
  emitSessionAttached(session: unknown): void;
}

export const installMocksForRecordingPlayer = (): RecordingPlayerMocks => {
  const listeners = new Map<string, Set<(data: unknown) => void>>();
  const on = sinon.stub().callsFake((event: string, listener: (data: unknown) => void) => {
    listeners.set(event, (listeners.get(event) ?? new Set()).add(listener));
  });
  const off = sinon.stub().callsFake((event: string, listener: (data: unknown) => void) => {
    listeners.get(event)?.delete(listener);
  });
  const emit = (event: string, data: unknown): void => {
    for (const listener of [...(listeners.get(event) ?? [])]) {
      listener(data);
    }
  };
  const client = {send: sinon.stub().resolves(), on, off, detached: false};
  const mainFrame: MockFrame = {_id: 'main-frame', client, url: () => '', goto: sinon.stub().resolves()};
  const frames: MockFrame[] = [mainFrame];
  const page: MockPage = {
    _client: () => client,
    on,
    off,
    frames: () => frames,
    mainFrame: () => mainFrame,
    evaluate: () => '',
    url() {
      return '';
    },
    bringToFront() {
      return Promise.resolve();
    },
  };
  const mock = {
    page,
    browser: {
      pages: () => [page],
      disconnect: () => sinon.stub().resolves(),
    },
  };
  sinon.stub(Models.RecordingPlayer.RecordingPlayer, 'connectPuppeteer').resolves(mock as never);
  return {
    send: client.send,
    mainFrame,
    frames,
    emitRequestPaused: event => emit('Fetch.requestPaused', event),
    emitFrameNavigated: frame => emit('framenavigated', frame),
    emitSessionAttached: session => emit('sessionattached', session),
  };
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
