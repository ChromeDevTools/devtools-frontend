// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import {Capability, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';

/**
 * The `IssuesModel` is a thin dispatch that does not store issues, but only creates the representation
 * class (usually derived from `Issue`) and passes the instances on via a dispatched event.
 * We chose this approach here because the lifetime of the Model is tied to the target, but DevTools
 * wants to preserve issues for targets (e.g. iframes) that are already gone as well.
 */
export class IssuesModel extends SDKModel<EventTypes> implements ProtocolProxyApi.AuditsDispatcher {
  #disposed = false;
  #enabled = false;

  constructor(target: Target) {
    super(target);
    void this.ensureEnabled();
  }

  private async ensureEnabled(): Promise<void> {
    if (this.#enabled) {
      return;
    }

    this.#enabled = true;
    this.target().registerAuditsDispatcher(this);
    const auditsAgent = this.target().auditsAgent();
    await auditsAgent.invoke_enable();
  }

  issueAdded(issueAddedEvent: Protocol.Audits.IssueAddedEvent): void {
    this.dispatchEventToListeners(Events.IssueAdded, {issuesModel: this, inspectorIssue: issueAddedEvent.issue});
  }

  override dispose(): void {
    super.dispose();
    this.#disposed = true;
  }

  getTargetIfNotDisposed(): Target|null {
    if (!this.#disposed) {
      return this.target();
    }
    return null;
  }
}

export const enum Events {
  IssueAdded = 'IssueAdded',
}

export interface IssueAddedEvent {
  issuesModel: IssuesModel;
  inspectorIssue: Protocol.Audits.InspectorIssue;
}

export type EventTypes = {
  [Events.IssueAdded]: IssueAddedEvent,
};

SDKModel.register(IssuesModel, {capabilities: Capability.Audits, autostart: true});
