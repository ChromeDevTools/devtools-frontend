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

const UIStrings = {

};
const str_ = i18n.i18n.registerUIStrings('core/sdk/CohtmlDebugModel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CohtmlDebugModel extends SDKModel<EventTypes> implements ProtocolProxyApi.CohtmlDebugDispatcher {
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

  private async wireAgentToSettings(): Promise<void> {
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
    await Promise.all([this.cohtmlDebugAgent.invoke_enable(), this.wireAgentToSettings()]);
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
    this.cohtmlDebugAgent.invoke_captureBackend();
  }

  captureRend(): void {
    this.cohtmlDebugAgent.invoke_captureRend();
  }

  capturePage(): void {
    this.cohtmlDebugAgent.invoke_capturePage();
  }

  clearCachedUnusedImages(): void {
    this.cohtmlDebugAgent.invoke_clearCachedUnusedImages();
  }


}
// eslint-disable-next-line rulesdir/const_enum
export enum Events {

}

export type EventTypes = {
};

SDKModel.register(CohtmlDebugModel, {capabilities: Capability.None, autostart: true});
