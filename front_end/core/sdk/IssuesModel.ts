// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import type {Target} from './SDKModel.js';
import {Capability, SDKModel} from './SDKModel.js';

/**
 * The `IssuesModel` is a thin dispatch that does not store issues, but only creates the representation
 * class (usually derived from `Issue`) and passes the instances on via a dispatched event.
 * We chose this approach here because the lifetime of the Model is tied to the target, but DevTools
 * wants to preserve issues for targets (e.g. iframes) that are already gone as well.
 */
export class IssuesModel extends SDKModel implements ProtocolProxyApi.AuditsDispatcher {
  private disposed: boolean;
  private enabled: boolean;
  private auditsAgent: ProtocolProxyApi.AuditsApi|null;

  constructor(target: Target) {
    super(target);
    this.enabled = false;
    this.auditsAgent = null;
    this.ensureEnabled();
    this.disposed = false;
  }

  private async ensureEnabled(): Promise<void> {
    if (this.enabled) {
      return;
    }

    this.enabled = true;
    this.target().registerAuditsDispatcher(this);
    this.auditsAgent = this.target().auditsAgent();
    await this.auditsAgent.invoke_enable();
  }

  issueAdded(issueAddedEvent: Protocol.Audits.IssueAddedEvent): void {
    this.dispatchEventToListeners(Events.IssueAdded, {issuesModel: this, inspectorIssue: issueAddedEvent.issue});
  }

  dispose(): void {
    super.dispose();
    this.disposed = true;
  }

  getTargetIfNotDisposed(): Target|null {
    if (!this.disposed) {
      return this.target();
    }
    return null;
  }
}


export const Events = {
  IssueAdded: Symbol('IssueAdded'),
};

SDKModel.register(IssuesModel, {capabilities: Capability.Audits, autostart: true});
