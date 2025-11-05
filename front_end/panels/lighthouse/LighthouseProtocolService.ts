// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

import type * as ReportRenderer from './LighthouseReporterTypes.js';

/**
 * @file
 *                                                 ┌───────────────┐
 *                                                 │ CDPConnection │
 *                                                 └───────────────┘
 *                                                        │ ▲
 *                                                        │ │
 *                          ┌┐                            ▼ │                     ┌┐
 *                          ││   dispatchProtocolMessage     sendProtocolMessage  ││
 *                          ││                     │          ▲                   ││
 *          ProtocolService ││                     |          │                   ││
 *                          ││    sendWithResponse ▼          │                   ││
 *                          ││              │    send          onWorkerMessage    ││
 *                          └┘              │    │                 ▲              └┘
 *          worker boundary - - - - - - - - ┼ - -│- - - - - - - - -│- - - - - - - - - - - -
 *                          ┌┐              ▼    ▼                 │                    ┌┐
 *                          ││   onFrontendMessage      notifyFrontendViaWorkerMessage  ││
 *                          ││                   │       ▲                              ││
 *                          ││                   ▼       │                              ││
 *  LighthouseWorkerService ││               WorkerConnectionTransport                  ││
 *                          ││                           │ ▲                            ││
 *                          ││                           ▼ │                            ││
 *                          ││                     CDPConnection                        ││
 *                          ││                           │ ▲                            ││
 *                          ││     ┌─────────────────────┼─┼───────────────────────┐    ││
 *                          ││     │  Lighthouse    ┌────▼──────┐                  │    ││
 *                          ││     │                │connection │                  │    ││
 *                          ││     │                └───────────┘                  │    ││
 *                          └┘     └───────────────────────────────────────────────┘    └┘
 *
 * - All messages traversing the worker boundary are action-wrapped.
 * - All messages over the CDPConnection speak pure CDP.
 * - Within the worker we also use a 'CDPConnection' but with a custom
 *   transport called WorkerConnectionTransport.
 * - All messages within WorkerConnectionTransport/LegacyPort speak pure CDP.
 */

let lastId = 1;

export interface LighthouseRun {
  inspectedURL: Platform.DevToolsPath.UrlString;
  categoryIDs: string[];
  flags: {
    formFactor: (string|undefined),
    mode: string,
  };
}

/**
 * ProtocolService manages a connection between the frontend (Lighthouse panel) and the Lighthouse worker.
 */
export class ProtocolService implements ProtocolClient.CDPConnection.CDPConnectionObserver {
  private mainSessionId?: Protocol.Target.SessionID;
  private rootTargetId?: string;
  private rootTarget?: SDK.Target.Target;
  private lighthouseWorkerPromise?: Promise<Worker>;
  private lighthouseMessageUpdateCallback?: ((arg0: string) => void);
  private removeDialogHandler?: () => void;
  private configForTesting?: object;
  private connection?: ProtocolClient.CDPConnection.CDPConnection;

  async attach(): Promise<void> {
    await SDK.TargetManager.TargetManager.instance().suspendAllTargets();
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      throw new Error('Unable to find main target required for Lighthouse');
    }
    const rootTarget = SDK.TargetManager.TargetManager.instance().rootTarget();
    if (!rootTarget) {
      throw new Error('Could not find the root target');
    }
    const childTargetManager = mainTarget.model(SDK.ChildTargetManager.ChildTargetManager);
    if (!childTargetManager) {
      throw new Error('Unable to find child target manager required for Lighthouse');
    }
    const resourceTreeModel = mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      throw new Error('Unable to find resource tree model required for Lighthouse');
    }

    const rootChildTargetManager = rootTarget.model(SDK.ChildTargetManager.ChildTargetManager);
    if (!rootChildTargetManager) {
      throw new Error('Could not find the child target manager class for the root target');
    }

    const connection = rootTarget.router()?.connection;
    if (!connection) {
      throw new Error('Expected root target to have a session router');
    }

    const rootTargetId = await rootChildTargetManager.getParentTargetId();
    const {sessionId} = await rootTarget.targetAgent().invoke_attachToTarget({targetId: rootTargetId, flatten: true});
    this.connection = connection;
    this.connection.observe(this);

    // Lighthouse implements its own dialog handler like this, however its lifecycle ends when
    // the internal Lighthouse session is disposed.
    //
    // If the page is reloaded near the end of the run (e.g. bfcache testing), the Lighthouse
    // internal session can be disposed before a dialog message appears. This allows the dialog
    // to block important Lighthouse teardown operations in LighthouseProtocolService.
    //
    // To ensure the teardown operations can proceed, we need a dialog handler which lasts until
    // the LighthouseProtocolService detaches.
    const dialogHandler = (): void => {
      void mainTarget.pageAgent().invoke_handleJavaScriptDialog({accept: true});
    };

    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.JavaScriptDialogOpening, dialogHandler);
    this.removeDialogHandler = () =>
        resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.JavaScriptDialogOpening, dialogHandler);

    this.rootTargetId = rootTargetId;
    this.rootTarget = rootTarget;
    this.mainSessionId = sessionId;
  }

  getLocales(): readonly string[] {
    return [i18n.DevToolsLocale.DevToolsLocale.instance().locale];
  }

  async startTimespan(currentLighthouseRun: LighthouseRun): Promise<void> {
    const {inspectedURL, categoryIDs, flags} = currentLighthouseRun;

    if (!this.mainSessionId || !this.rootTargetId) {
      throw new Error('Unable to get target info required for Lighthouse');
    }

    await this.sendWithResponse('startTimespan', {
      url: inspectedURL,
      categoryIDs,
      flags,
      config: this.configForTesting,
      locales: this.getLocales(),
      mainSessionId: this.mainSessionId,
      rootTargetId: this.rootTargetId,
    });
  }

  async collectLighthouseResults(currentLighthouseRun: LighthouseRun): Promise<ReportRenderer.RunnerResult> {
    const {inspectedURL, categoryIDs, flags} = currentLighthouseRun;

    if (!this.mainSessionId || !this.rootTargetId) {
      throw new Error('Unable to get target info required for Lighthouse');
    }

    let mode = flags.mode as string;
    if (mode === 'timespan') {
      mode = 'endTimespan';
    }

    return await this.sendWithResponse(mode, {
      url: inspectedURL,
      categoryIDs,
      flags,
      config: this.configForTesting,
      locales: this.getLocales(),
      mainSessionId: this.mainSessionId,
      rootTargetId: this.rootTargetId,
    });
  }

  async detach(): Promise<void> {
    const oldLighthouseWorker = this.lighthouseWorkerPromise;
    const oldRootTarget = this.rootTarget;

    // When detaching, make sure that we remove the old promises, before we
    // perform any async cleanups. That way, if there is a message coming from
    // lighthouse while we are in the process of cleaning up, we shouldn't deliver
    // them to the backend.
    this.lighthouseWorkerPromise = undefined;
    this.rootTarget = undefined;
    this.connection?.unobserve(this);
    this.connection = undefined;

    if (oldLighthouseWorker) {
      (await oldLighthouseWorker).terminate();
    }
    if (oldRootTarget && this.mainSessionId) {
      await oldRootTarget.targetAgent().invoke_detachFromTarget({sessionId: this.mainSessionId});
    }
    await SDK.TargetManager.TargetManager.instance().resumeAllTargets();
    this.removeDialogHandler?.();
  }

  registerStatusCallback(callback: (arg0: string) => void): void {
    this.lighthouseMessageUpdateCallback = callback;
  }

  onEvent<T extends ProtocolClient.CDPConnection.Event>(event: ProtocolClient.CDPConnection.CDPEvent<T>): void {
    this.dispatchProtocolMessage(event);
  }

  private dispatchProtocolMessage(message: ProtocolClient.CDPConnection.CDPReceivableMessage): void {
    // A message without a sessionId is the main session of the main target (call it "Main session").
    // A parallel connection and session was made that connects to the same main target (call it "Lighthouse session").
    // Messages from the "Lighthouse session" have a sessionId.
    // Without some care, there is a risk of sending the same events for the same main frame to Lighthouse–the backend
    // will create events for the "Main session" and the "Lighthouse session".
    // The workaround–only send message to Lighthouse if:
    //   * the message has a sessionId (is not for the "Main session")
    //   * the message does not have a sessionId (is for the "Main session"), but only for the Target domain
    //     (to kickstart autoAttach in LH).
    if (message.sessionId || ('method' in message && message.method?.startsWith('Target'))) {
      void this.send('dispatchProtocolMessage', {message});
    }
  }

  onDisconnect(): void {
    // Do nothing.
  }

  private initWorker(): Promise<Worker> {
    this.lighthouseWorkerPromise = new Promise<Worker>(resolve => {
      const workerUrl = new URL('../../entrypoints/lighthouse_worker/lighthouse_worker.js', import.meta.url);
      const remoteBaseSearchParam = new URL(self.location.href).searchParams.get('remoteBase');
      if (remoteBaseSearchParam) {
        // Allows Lighthouse worker to fetch remote locale files.
        workerUrl.searchParams.set('remoteBase', remoteBaseSearchParam);
      }
      const worker = new Worker(workerUrl, {type: 'module'});

      worker.addEventListener('message', event => {
        if (event.data === 'workerReady') {
          resolve(worker);
          return;
        }

        this.onWorkerMessage(event);
      });
    });
    return this.lighthouseWorkerPromise;
  }

  private async ensureWorkerExists(): Promise<Worker> {
    let worker: Worker;
    if (!this.lighthouseWorkerPromise) {
      worker = await this.initWorker();
    } else {
      worker = await this.lighthouseWorkerPromise;
    }
    return worker;
  }

  private onWorkerMessage(event: MessageEvent): void {
    const lighthouseMessage = event.data;

    if (lighthouseMessage.action === 'statusUpdate') {
      if (this.lighthouseMessageUpdateCallback && lighthouseMessage.args && 'message' in lighthouseMessage.args) {
        this.lighthouseMessageUpdateCallback(lighthouseMessage.args.message as string);
      }
    } else if (lighthouseMessage.action === 'sendProtocolMessage') {
      if (lighthouseMessage.args && 'message' in lighthouseMessage.args) {
        this.sendProtocolMessage(lighthouseMessage.args.message as string);
      }
    }
  }

  private sendProtocolMessage(message: string): void {
    const {id, method, params, sessionId} = JSON.parse(message);
    // CDPConnection manages it's own message IDs and it's important, otherwise we'd clash
    // with the rest of the DevTools traffic.
    // Instead, we ignore the ID coming from the worker when sending the command, but
    // patch it back in when sending the response back to the worker.
    void this.connection?.send(method, params, sessionId).then(response => {
      this.dispatchProtocolMessage({
        id,
        sessionId,
        result: 'result' in response ? response.result : undefined,
        error: 'error' in response ? response.error : undefined,
      });
    });
  }

  private async send(action: string, args: Record<string, string|string[]|object> = {}): Promise<void> {
    const worker = await this.ensureWorkerExists();
    const messageId = lastId++;
    worker.postMessage({id: messageId, action, args: {...args, id: messageId}});
  }

  /** sendWithResponse currently only handles the original startLighthouse request and LHR-filled response. */
  private async sendWithResponse(action: string, args: Record<string, string|string[]|object|undefined> = {}):
      Promise<ReportRenderer.RunnerResult> {
    const worker = await this.ensureWorkerExists();
    const messageId = lastId++;
    const messageResult = new Promise<ReportRenderer.RunnerResult>(resolve => {
      const workerListener = (event: MessageEvent): void => {
        const lighthouseMessage = event.data;

        if (lighthouseMessage.id === messageId) {
          worker.removeEventListener('message', workerListener);
          resolve(lighthouseMessage.result);
        }
      };
      worker.addEventListener('message', workerListener);
    });
    worker.postMessage({id: messageId, action, args: {...args, id: messageId}});

    return await messageResult;
  }
}
