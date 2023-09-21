// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from '../../../third_party/puppeteer/puppeteer.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Common from '../../../core/common/common.js';
import * as PuppeteerService from '../../../services/puppeteer/puppeteer.js';
import * as PuppeteerReplay from '../../../third_party/puppeteer-replay/puppeteer-replay.js';
// eslint-disable-next-line rulesdir/es_modules_import
import type * as Protocol from '../../../generated/protocol.js';

import {type Step, type UserFlow} from './Schema.js';

export const enum PlayRecordingSpeed {
  Normal = 'normal',
  Slow = 'slow',
  VerySlow = 'very_slow',
  ExtremelySlow = 'extremely_slow',
}

const speedDelayMap: Record<PlayRecordingSpeed, number> = {
  [PlayRecordingSpeed.Normal]: 0,
  [PlayRecordingSpeed.Slow]: 500,
  [PlayRecordingSpeed.VerySlow]: 1000,
  [PlayRecordingSpeed.ExtremelySlow]: 2000,
} as const;

export const enum ReplayResult {
  Failure = 'Failure',
  Success = 'Success',
}

export const defaultTimeout = 5000;  // ms

function isPageTarget(target: Protocol.Target.TargetInfo): boolean {
  // Treat DevTools targets as page targets too.
  return (
      target.url.startsWith('devtools://') || target.type === 'page' || target.type === 'background_page' ||
      target.type === 'webview');
}

export class RecordingPlayer extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  #stopPromise: Promise<void>;
  #resolveStopPromise?: Function;
  userFlow: UserFlow;
  speed: PlayRecordingSpeed;
  timeout: number;
  breakpointIndexes: Set<number>;
  steppingOver: boolean = false;
  aborted = false;
  abortPromise: Promise<void>;
  #abortResolveFn?: Function;
  #runner?: PuppeteerReplay.Runner;

  constructor(
      userFlow: UserFlow,
      {
        speed,
        breakpointIndexes = new Set(),
      }: {
        speed: PlayRecordingSpeed,
        breakpointIndexes?: Set<number>,
      },
  ) {
    super();
    this.userFlow = userFlow;
    this.speed = speed;
    this.timeout = userFlow.timeout || defaultTimeout;
    this.breakpointIndexes = breakpointIndexes;
    this.#stopPromise = new Promise(resolve => {
      this.#resolveStopPromise = resolve;
    });

    this.abortPromise = new Promise(resolve => {
      this.#abortResolveFn = resolve;
    });
  }

  #resolveAndRefreshStopPromise(): void {
    this.#resolveStopPromise?.();
    this.#stopPromise = new Promise(resolve => {
      this.#resolveStopPromise = resolve;
    });
  }

  static async connectPuppeteer(): Promise<{
    page: puppeteer.Page,
    browser: puppeteer.Browser,
  }> {
    const rootTarget = SDK.TargetManager.TargetManager.instance().rootTarget();
    if (!rootTarget) {
      throw new Error('Could not find the root target');
    }

    const primaryPageTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!primaryPageTarget) {
      throw new Error('Could not find the primary page target');
    }
    const childTargetManager = primaryPageTarget.model(
        SDK.ChildTargetManager.ChildTargetManager,
    );
    if (!childTargetManager) {
      throw new Error('Could not get childTargetManager');
    }
    const resourceTreeModel = primaryPageTarget.model(
        SDK.ResourceTreeModel.ResourceTreeModel,
    );
    if (!resourceTreeModel) {
      throw new Error('Could not get resource tree model');
    }
    const mainFrame = resourceTreeModel.mainFrame;
    if (!mainFrame) {
      throw new Error('Could not find main frame');
    }

    const rootChildTargetManager = rootTarget.model(SDK.ChildTargetManager.ChildTargetManager);

    if (!rootChildTargetManager) {
      throw new Error('Could not find the child target manager class for the root target');
    }

    // Pass an empty message handler because it will be overwritten by puppeteer anyways.
    const result = await rootChildTargetManager.createParallelConnection(() => {});
    const connection = result.connection as SDK.Connections.ParallelConnectionInterface;

    const mainTargetId = await childTargetManager.getParentTargetId();
    const rootTargetId = await rootChildTargetManager.getParentTargetId();

    const {page, browser, puppeteerConnection} =
        await PuppeteerService.PuppeteerConnection.PuppeteerConnectionHelper.connectPuppeteerToConnectionViaTab(
            {
              connection,
              rootTargetId: rootTargetId as string,
              isPageTargetCallback: isPageTarget,
            },
        );

    if (!page) {
      throw new Error('could not find main page!');
    }

    browser.on('targetdiscovered', (targetInfo: Protocol.Target.TargetInfo) => {
      // Pop-ups opened by the main target won't be auto-attached. Therefore,
      // we need to create a session for them explicitly. We user openedId
      // and type to classify a target as requiring a session.
      if (targetInfo.type !== 'page') {
        return;
      }
      if (targetInfo.targetId === mainTargetId) {
        return;
      }
      if (targetInfo.openerId !== mainTargetId) {
        return;
      }
      void puppeteerConnection._createSession(
          targetInfo,
          /* emulateAutoAttach= */ true,
      );
    });

    return {page, browser};
  }

  static async disconnectPuppeteer(browser: puppeteer.Browser): Promise<void> {
    try {
      const pages = await browser.pages();
      for (const page of pages) {
        const client = (page as puppeteer.Page)._client();
        await client.send('Network.disable');
        await client.send('Page.disable');
        await client.send('Log.disable');
        await client.send('Performance.disable');
        await client.send('Runtime.disable');
        await client.send('Emulation.clearDeviceMetricsOverride');
        await client.send('Emulation.setAutomationOverride', {enabled: false});
        for (const frame of page.frames()) {
          const client = frame.client;
          await client.send('Network.disable');
          await client.send('Page.disable');
          await client.send('Log.disable');
          await client.send('Performance.disable');
          await client.send('Runtime.disable');
          await client.send('Emulation.setAutomationOverride', {enabled: false});
        }
      }
      browser.disconnect();
    } catch (err) {
      console.error('Error disconnecting Puppeteer', err.message);
    }
  }

  async stop(): Promise<void> {
    await Promise.race([this.#stopPromise, this.abortPromise]);
  }

  abort(): void {
    this.aborted = true;
    this.#abortResolveFn?.();
    this.#runner?.abort();
  }

  disposeForTesting(): void {
    this.#resolveStopPromise?.();
    this.#abortResolveFn?.();
  }

  continue(): void {
    this.steppingOver = false;
    this.#resolveAndRefreshStopPromise();
  }

  stepOver(): void {
    this.steppingOver = true;
    this.#resolveAndRefreshStopPromise();
  }

  updateBreakpointIndexes(breakpointIndexes: Set<number>): void {
    this.breakpointIndexes = breakpointIndexes;
  }

  async play(): Promise<void> {
    const {page, browser} = await RecordingPlayer.connectPuppeteer();
    this.aborted = false;

    const player = this;
    class ExtensionWithBreak extends PuppeteerReplay.PuppeteerRunnerExtension {
      readonly #speed: PlayRecordingSpeed;

      constructor(
          browser: puppeteer.Browser,
          page: puppeteer.Page,
          {
            timeout,
            speed,
          }: {
            timeout: number,
            speed: PlayRecordingSpeed,
          },
      ) {
        super(browser, page, {timeout});
        this.#speed = speed;
      }

      override async beforeEachStep?(step: Step, flow: UserFlow): Promise<void> {
        let resolver: () => void = () => {};
        const promise = new Promise<void>(r => {
          resolver = r;
        });
        player.dispatchEventToListeners(Events.Step, {
          step,
          resolve: resolver,
        });
        await promise;
        const currentStepIndex = flow.steps.indexOf(step);
        const shouldStopAtCurrentStep = player.steppingOver || player.breakpointIndexes.has(currentStepIndex);
        const shouldWaitForSpeed = step.type !== 'setViewport' && step.type !== 'navigate' && !player.aborted;
        if (shouldStopAtCurrentStep) {
          player.dispatchEventToListeners(Events.Stop);
          await player.stop();
          player.dispatchEventToListeners(Events.Continue);
        } else if (shouldWaitForSpeed) {
          await Promise.race([
            new Promise(
                resolve => setTimeout(resolve, speedDelayMap[this.#speed]),
                ),
            player.abortPromise,
          ]);
        }
      }

      override async runStep(
          step: PuppeteerReplay.Schema.Step,
          flow: PuppeteerReplay.Schema.UserFlow,
          ): Promise<void> {
        // When replaying on a DevTools target we skip setViewport and navigate steps
        // because navigation and viewport changes are not supported there.
        if (page?.url().startsWith('devtools://') && (step.type === 'setViewport' || step.type === 'navigate')) {
          return;
        }
        // Focus the target in case it's not focused.
        await this.page.bringToFront();
        await super.runStep(step, flow);
      }
    }

    const extension = new ExtensionWithBreak(browser, page, {
      timeout: this.timeout,
      speed: this.speed,
    });

    this.#runner = await PuppeteerReplay.createRunner(this.userFlow, extension);
    let error: Error|undefined;

    try {
      await this.#runner.run();
    } catch (err) {
      error = err;
      console.error('Replay error', err.message);
    } finally {
      await RecordingPlayer.disconnectPuppeteer(browser);
    }
    if (this.aborted) {
      this.dispatchEventToListeners(Events.Abort);
    } else if (error) {
      this.dispatchEventToListeners(Events.Error, error);
    } else {
      this.dispatchEventToListeners(Events.Done);
    }
  }
}

export const enum Events {
  Abort = 'Abort',
  Done = 'Done',
  Step = 'Step',
  Stop = 'Stop',
  Error = 'Error',
  Continue = 'Continue',
}

type EventTypes = {
  [Events.Abort]: void,
  [Events.Done]: void,
  [Events.Step]: {step: Step, resolve: () => void},
  [Events.Stop]: void,
  [Events.Continue]: void,
  [Events.Error]: Error,
};
