// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import type {Target} from './Target.js';

export interface RegistrationInfo {
  capabilities: number;
  autostart: boolean;
  early?: boolean;
}

const registeredModels = new Map<new (arg1: Target) => SDKModel, RegistrationInfo>();

export class SDKModel extends Common.ObjectWrapper.ObjectWrapper {
  _target: Target;

  constructor(target: Target) {
    super();
    this._target = target;
  }

  target(): Target {
    return this._target;
  }

  /**
   * Override this method to perform tasks that are required to suspend the
   * model and that still need other models in an unsuspended state.
   */
  async preSuspendModel(_reason?: string): Promise<void> {
  }

  async suspendModel(_reason?: string): Promise<void> {
  }

  async resumeModel(): Promise<void> {
  }

  /**
   * Override this method to perform tasks that are required to after resuming
   * the model and that require all models already in an unsuspended state.
   */
  async postResumeModel(): Promise<void> {
  }

  dispose(): void {
  }

  static register(modelClass: new(arg1: Target) => SDKModel, registrationInfo: RegistrationInfo): void {
    if (registrationInfo.early && !registrationInfo.autostart) {
      throw new Error(`Error registering model ${modelClass.name}: early models must be autostarted.`);
    }
    registeredModels.set(modelClass, registrationInfo);
  }

  static get registeredModels(): typeof registeredModels {
    return registeredModels;
  }
}
