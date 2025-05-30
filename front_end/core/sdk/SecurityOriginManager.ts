// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {SDKModel} from './SDKModel.js';
import {Capability} from './Target.js';

export class SecurityOriginManager extends SDKModel<EventTypes> {
  // if a URL is unreachable, the browser will jump to an error page at
  // 'chrome-error://chromewebdata/', and |this.#mainSecurityOriginInternal| stores
  // its origin. In this situation, the original unreachable URL's security
  // origin will be stored in |this.#unreachableMainSecurityOriginInternal|.
  #mainSecurityOriginInternal = '';
  #unreachableMainSecurityOriginInternal: string|null = '';
  #securityOriginsInternal = new Set<string>();

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

export enum Events {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  SecurityOriginAdded = 'SecurityOriginAdded',
  SecurityOriginRemoved = 'SecurityOriginRemoved',
  MainSecurityOriginChanged = 'MainSecurityOriginChanged',
  /* eslint-enable @typescript-eslint/naming-convention */
}

export interface MainSecurityOriginChangedEvent {
  mainSecurityOrigin: string;
  unreachableMainSecurityOrigin: string|null;
}

export interface EventTypes {
  [Events.SecurityOriginAdded]: string;
  [Events.SecurityOriginRemoved]: string;
  [Events.MainSecurityOriginChanged]: MainSecurityOriginChangedEvent;
}

// TODO(jarhar): this is the one of the two usages of Capability.None. Do something about it!
SDKModel.register(SecurityOriginManager, {capabilities: Capability.NONE, autostart: false});
