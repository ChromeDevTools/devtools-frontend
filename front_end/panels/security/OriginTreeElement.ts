// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';

import {SecurityPanelSidebarTreeElement} from './SecurityPanelSidebarTreeElement.js';

export class ShowOriginEvent extends Event {
  static readonly eventName = 'showorigin';
  origin: Platform.DevToolsPath.UrlString|null;

  constructor(origin: Platform.DevToolsPath.UrlString|null) {
    super(ShowOriginEvent.eventName, {bubbles: true, composed: true});
    this.origin = origin;
  }
}

export class OriginTreeElement extends SecurityPanelSidebarTreeElement {
  #securityStateInternal: Protocol.Security.SecurityState|null;
  readonly #renderTreeElement: (element: SecurityPanelSidebarTreeElement) => void;
  readonly #originInternal: Platform.DevToolsPath.UrlString|null = null;

  constructor(
      className: string, renderTreeElement: (element: SecurityPanelSidebarTreeElement) => void,
      origin: Platform.DevToolsPath.UrlString|null = null) {
    super();

    this.#renderTreeElement = renderTreeElement;
    this.#originInternal = origin;

    this.listItemElement.classList.add(className);
    this.#securityStateInternal = null;
    this.setSecurityState(Protocol.Security.SecurityState.Unknown);
  }

  setSecurityState(newSecurityState: Protocol.Security.SecurityState): void {
    this.#securityStateInternal = newSecurityState;
    this.#renderTreeElement(this);
  }

  securityState(): Protocol.Security.SecurityState|null {
    return this.#securityStateInternal;
  }

  origin(): Platform.DevToolsPath.UrlString|null {
    return this.#originInternal;
  }

  override onselect(): boolean {
    this.listItemElement.dispatchEvent(new ShowOriginEvent(this.#originInternal));
    return true;
  }
}

declare global {
  interface HTMLElementEventMap {
    'showorigin': ShowOriginEvent;
  }
}
