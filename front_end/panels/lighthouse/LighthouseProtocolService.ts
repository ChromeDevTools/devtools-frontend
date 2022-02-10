// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import * as SDK from '../../core/sdk/sdk.js';

import type * as ReportRenderer from './LighthouseReporterTypes.js';

let lastId = 1;

export class ProtocolService {
  private targetInfo?: {
    mainSessionId: string,
    mainTargetId: string,
    mainFrameId: string,
  };
  private rawConnection?: ProtocolClient.InspectorBackend.Connection;
  private lighthouseWorkerPromise?: Promise<Worker>;
  private lighthouseMessageUpdateCallback?: ((arg0: string) => void);

  async attach(): Promise<void> {
    await SDK.TargetManager.TargetManager.instance().suspendAllTargets();
    const mainTarget = SDK.TargetManager.TargetManager.instance().mainTarget();
    if (!mainTarget) {
      throw new Error('Unable to find main target required for Lighthouse');
    }
    const childTargetManager = mainTarget.model(SDK.ChildTargetManager.ChildTargetManager);
    if (!childTargetManager) {
      throw new Error('Unable to find child target manager required for Lighthouse');
    }
    const resourceTreeModel = mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      throw new Error('Unable to find resource tree model required for Lighthouse');
    }
    const mainFrame = resourceTreeModel.mainFrame;
    if (!mainFrame) {
      throw new Error('Unable to find main frame required for Lighthouse');
    }

    const {connection, sessionId} = await childTargetManager.createParallelConnection(message => {
      if (typeof message === 'string') {
        message = JSON.parse(message);
      }
      this.dispatchProtocolMessage(message);
    });

    this.rawConnection = connection;
    this.targetInfo = {
      mainTargetId: await childTargetManager.getParentTargetId(),
      mainFrameId: mainFrame.id,
      mainSessionId: sessionId,
    };
  }

  getLocales(): readonly string[] {
    return [i18n.DevToolsLocale.DevToolsLocale.instance().locale];
  }

  async startLighthouse(auditURL: string, categoryIDs: string[], flags: Record<string, Object|undefined>):
      Promise<ReportRenderer.RunnerResult> {
    if (!this.targetInfo) {
      throw new Error('Unable to get target info required for Lighthouse');
    }
    const mode = flags.legacyNavigation ? 'start' : 'navigate';
    return this.sendWithResponse(mode, {
      url: auditURL,
      categoryIDs,
      flags,
      locales: this.getLocales(),
      target: this.targetInfo,
    });
  }

  async detach(): Promise<void> {
    const oldLighthouseWorker = this.lighthouseWorkerPromise;
    const oldRawConnection = this.rawConnection;

    // When detaching, make sure that we remove the old promises, before we
    // perform any async cleanups. That way, if there is a message coming from
    // lighthouse while we are in the process of cleaning up, we shouldn't deliver
    // them to the backend.
    this.lighthouseWorkerPromise = undefined;
    this.rawConnection = undefined;

    if (oldLighthouseWorker) {
      (await oldLighthouseWorker).terminate();
    }
    if (oldRawConnection) {
      await oldRawConnection.disconnect();
    }
    await SDK.TargetManager.TargetManager.instance().resumeAllTargets();
  }

  registerStatusCallback(callback: (arg0: string) => void): void {
    this.lighthouseMessageUpdateCallback = callback;
  }

  private dispatchProtocolMessage(message: Object): void {
    // A message without a sessionId is the main session of the main target (call it "Main session").
    // A parallel connection and session was made that connects to the same main target (call it "Lighthouse session").
    // Messages from the "Lighthouse session" have a sessionId.
    // Without some care, there is a risk of sending the same events for the same main frame to Lighthouse–the backend
    // will create events for the "Main session" and the "Lighthouse session".
    // The workaround–only send message to Lighthouse if:
    //   * the message has a sessionId (is not for the "Main session")
    //   * the message does not have a sessionId (is for the "Main session"), but only for the Target domain
    //     (to kickstart autoAttach in LH).
    const protocolMessage = message as {
      sessionId?: string,
      method?: string,
    };
    if (protocolMessage.sessionId || (protocolMessage.method && protocolMessage.method.startsWith('Target'))) {
      void this.sendWithoutResponse('dispatchProtocolMessage', {message: JSON.stringify(message)});
    }
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

        const lighthouseMessage = JSON.parse(event.data);

        if (lighthouseMessage.method === 'statusUpdate') {
          if (this.lighthouseMessageUpdateCallback && lighthouseMessage.params &&
              'message' in lighthouseMessage.params) {
            this.lighthouseMessageUpdateCallback(lighthouseMessage.params.message as string);
          }
        } else if (lighthouseMessage.method === 'sendProtocolMessage') {
          if (lighthouseMessage.params && 'message' in lighthouseMessage.params) {
            this.sendProtocolMessage(lighthouseMessage.params.message as string);
          }
        }
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

  private sendProtocolMessage(message: string): void {
    if (this.rawConnection) {
      this.rawConnection.sendRawMessage(message);
    }
  }

  private async sendWithoutResponse(method: string, params: {[x: string]: string|string[]|Object} = {}): Promise<void> {
    const worker = await this.ensureWorkerExists();
    const messageId = lastId++;
    worker.postMessage(JSON.stringify({id: messageId, method, params: {...params, id: messageId}}));
  }

  private async sendWithResponse(method: string, params: {[x: string]: string|string[]|Object} = {}):
      Promise<ReportRenderer.RunnerResult> {
    const worker = await this.ensureWorkerExists();
    const messageId = lastId++;
    const messageResult = new Promise<ReportRenderer.RunnerResult>(resolve => {
      const workerListener = (event: MessageEvent): void => {
        const lighthouseMessage = JSON.parse(event.data);

        if (lighthouseMessage.id === messageId) {
          worker.removeEventListener('message', workerListener);
          resolve(lighthouseMessage.result);
        }
      };
      worker.addEventListener('message', workerListener);
    });
    worker.postMessage(JSON.stringify({id: messageId, method, params: {...params, id: messageId}}));

    return messageResult;
  }
}
