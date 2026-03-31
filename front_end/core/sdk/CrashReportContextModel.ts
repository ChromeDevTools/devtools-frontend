// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';

export class CrashReportContextModel extends SDKModel<void> {
  readonly #agent: ProtocolProxyApi.CrashReportContextApi;

  constructor(target: Target) {
    super(target);
    this.#agent = target.crashReportContextAgent();
  }

  async getEntries(): Promise<Protocol.CrashReportContext.CrashReportContextEntry[]|null> {
    const response = await this.#agent.invoke_getEntries();
    if (response.getError()) {
      return null;
    }
    return response.entries;
  }
}

SDKModel.register(CrashReportContextModel, {capabilities: Capability.JS, autostart: false});
