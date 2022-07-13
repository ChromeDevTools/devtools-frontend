// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Capability, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';

export class SecurityOriginManager extends SDKModel<EventTypes> {
  #mainSecurityOriginInternal: string;
  #unreachableMainSecurityOriginInternal: string|null;
  #securityOriginsInternal: Set<string>;
  constructor(target: Target) {
    super(target);

    // if a URL is unreachable, the browser will jump to an error page at
    // 'chrome-error://chromewebdata/', and |this.#mainSecurityOriginInternal| stores
    // its origin. In this situation, the original unreachable URL's security
    // origin will be stored in |this.#unreachableMainSecurityOriginInternal|.
    this.#mainSecurityOriginInternal = '';
    this.#unreachableMainSecurityOriginInternal = '';

    this.#securityOriginsInternal = new Set();
  }

  updateSecurityOrigins(securityOrigins: Set<string>): void {
    const oldOrigins = this.#securityOriginsInternal;
    this.#securityOriginsInternal = securityOrigins;

    for (const origin of oldOrigins) {
      if (!this.#securityOriginsInternal.has(origin)) {
        this.dispatchEventToListeners(Events.SecurityOriginRemoved, origin);
      }
    }

    for (const origin of this.#securityOriginsInternal) {
      if (!oldOrigins.has(origin)) {
        this.dispatchEventToListeners(Events.SecurityOriginAdded, origin);
      }
    }
  }

  securityOrigins(): string[] {
    return [...this.#securityOriginsInternal];
  }

  mainSecurityOrigin(): string {
    return this.#mainSecurityOriginInternal;
  }

  unreachableMainSecurityOrigin(): string|null {
    return this.#unreachableMainSecurityOriginInternal;
  }

  setMainSecurityOrigin(securityOrigin: string, unreachableSecurityOrigin: string): void {
    this.#mainSecurityOriginInternal = securityOrigin;
    this.#unreachableMainSecurityOriginInternal = unreachableSecurityOrigin || null;
    this.dispatchEventToListeners(Events.MainSecurityOriginChanged, {
      mainSecurityOrigin: this.#mainSecurityOriginInternal,
      unreachableMainSecurityOrigin: this.#unreachableMainSecurityOriginInternal,
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

export interface MainSecurityOriginChangedEvent {
  mainSecurityOrigin: string;
  unreachableMainSecurityOrigin: string|null;
}

export type EventTypes = {
  [Events.SecurityOriginAdded]: string,
  [Events.SecurityOriginRemoved]: string,
  [Events.MainSecurityOriginChanged]: MainSecurityOriginChangedEvent,
};

// TODO(jarhar): this is the one of the two usages of Capability.None. Do something about it!
SDKModel.register(SecurityOriginManager, {capabilities: Capability.None, autostart: false});
