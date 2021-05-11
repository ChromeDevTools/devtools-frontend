// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type {Target} from './SDKModel.js';
import {Capability, SDKModel} from './SDKModel.js';  // eslint-disable-line no-unused-vars

export class SecurityOriginManager extends SDKModel {
  _mainSecurityOrigin: string;
  _unreachableMainSecurityOrigin: string|null;
  _securityOrigins: Set<string>;
  constructor(target: Target) {
    super(target);

    // if a URL is unreachable, the browser will jump to an error page at
    // 'chrome-error://chromewebdata/', and |this._mainSecurityOrigin| stores
    // its origin. In this situation, the original unreachable URL's security
    // origin will be stored in |this._unreachableMainSecurityOrigin|.
    this._mainSecurityOrigin = '';
    this._unreachableMainSecurityOrigin = '';

    this._securityOrigins = new Set();
  }

  updateSecurityOrigins(securityOrigins: Set<string>): void {
    const oldOrigins = this._securityOrigins;
    this._securityOrigins = securityOrigins;

    for (const origin of oldOrigins) {
      if (!this._securityOrigins.has(origin)) {
        this.dispatchEventToListeners(Events.SecurityOriginRemoved, origin);
      }
    }

    for (const origin of this._securityOrigins) {
      if (!oldOrigins.has(origin)) {
        this.dispatchEventToListeners(Events.SecurityOriginAdded, origin);
      }
    }
  }

  securityOrigins(): string[] {
    return [...this._securityOrigins];
  }

  mainSecurityOrigin(): string {
    return this._mainSecurityOrigin;
  }

  unreachableMainSecurityOrigin(): string|null {
    return this._unreachableMainSecurityOrigin;
  }

  setMainSecurityOrigin(securityOrigin: string, unreachableSecurityOrigin: string): void {
    this._mainSecurityOrigin = securityOrigin;
    this._unreachableMainSecurityOrigin = unreachableSecurityOrigin || null;
    this.dispatchEventToListeners(Events.MainSecurityOriginChanged, {
      mainSecurityOrigin: this._mainSecurityOrigin,
      unreachableMainSecurityOrigin: this._unreachableMainSecurityOrigin,
    });
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  SecurityOriginAdded = 'SecurityOriginAdded',
  SecurityOriginRemoved = 'SecurityOriginRemoved',
  MainSecurityOriginChanged = 'MainSecurityOriginChanged',
}


// TODO(jarhar): this is the only usage of Capability.None. Do something about it!
SDKModel.register(SecurityOriginManager, {capabilities: Capability.None, autostart: false});
