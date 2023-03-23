// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

import {DebuggerModel, Events as DebuggerModelEvents} from './DebuggerModel.js';
import type {Target} from './Target.js';
import {Capability} from './Target.js';
import {SDKModel} from './SDKModel.js';
import {TargetManager} from './TargetManager.js';

interface IRawParams {
    [key: string]: any
}

export class CohtmlDebugModel extends SDKModel<void> implements ProtocolProxyApi.CohtmlDebugDispatcher, IRawParams {
  [k: string]: any;

  cohtmlDebugAgent: ProtocolProxyApi.CohtmlDebugApi;

  private registeredListeners: Common.EventTarget.EventDescriptor[];

  private continuousRepaintSetting: Common.Settings.Setting<any>;

  private drawMetaDataSetting: Common.Settings.Setting<any>;

  constructor(target: Target) {
    super(target);

    this.continuousRepaintSetting = Common.Settings.Settings.instance().moduleSetting('continuousRepaint');
    this.drawMetaDataSetting = Common.Settings.Settings.instance().moduleSetting('drawMetaData');

    this.registeredListeners = [];

    target.registerCohtmlDebugDispatcher(this);

    this.cohtmlDebugAgent = target.cohtmlDebugAgent();

    if (!target.suspended()) {
      this.cohtmlDebugAgent.invoke_enable();
      this.wireAgentToSettings();
    }
  }

  private wireAgentToSettings(): void {
    this.registeredListeners = [
      this.continuousRepaintSetting.addChangeListener(
        () => this.cohtmlDebugAgent.invoke_setContinuousRepaint({result: this.continuousRepaintSetting.get()})),

      this.drawMetaDataSetting.addChangeListener(
        () => this.cohtmlDebugAgent.invoke_setContinuousRepaint({result: this.drawMetaDataSetting.get()})),
    ];
  }

  async suspendModel(): Promise<void> {
    Common.EventTarget.removeEventListeners(this.registeredListeners);
    await this.cohtmlDebugAgent.invoke_disable();
  }

  async resumeModel(): Promise<void> {
    this.wireAgentToSettings()
    await this.cohtmlDebugAgent.invoke_enable();
  }

  dumpDOM(): void {
    this.cohtmlDebugAgent.invoke_dumpDOM();
  }

  dumpStackingContext(): void {
    this.cohtmlDebugAgent.invoke_dumpStackingContext();
  }

  dumpUsedImages(): void {
    this.cohtmlDebugAgent.invoke_dumpUsedImages();
  }

  captureBackend(): void {
    this.cohtmlDebugAgent.invoke_captureBackendBuffers();
  }

  captureRend(): void {
    this.cohtmlDebugAgent.invoke_captureRendFile();
  }

  capturePage(): void {
    this.cohtmlDebugAgent.invoke_captureFullPage();
  }

  clearCachedUnusedImages(): void {
    this.cohtmlDebugAgent.invoke_clearCachedUnusedImages();
  }

  async getSystemCacheStats(): Promise<Protocol.CohtmlDebug.GetSystemCacheStatsResponse|null> {
    const response = await this.cohtmlDebugAgent.invoke_getSystemCacheStats();
    if (response.getError()) {
      return null;
    }

    return response;
  }
}
// eslint-disable-next-line rulesdir/const_enum

SDKModel.register(CohtmlDebugModel, {capabilities: Capability.None, autostart: true});
