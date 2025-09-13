// Copyright 2024 The Chromium Authors
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
  #securityState: Protocol.Security.SecurityState|null;
  readonly #renderTreeElement: (element: SecurityPanelSidebarTreeElement) => void;
  readonly #origin: Platform.DevToolsPath.UrlString|null = null;

  constructor(
      className: string, renderTreeElement: (element: SecurityPanelSidebarTreeElement) => void,
      origin: Platform.DevToolsPath.UrlString|null = null) {
    super();

    this.#renderTreeElement = renderTreeElement;
    this.#origin = origin;

    this.listItemElement.classList.add(className);
    this.#securityState = null;
    this.setSecurityState(Protocol.Security.SecurityState.Unknown);
  }

  setSecurityState(newSecurityState: Protocol.Security.SecurityState): void {
    this.#securityState = newSecurityState;
    this.#renderTreeElement(this);
  }

  securityState(): Protocol.Security.SecurityState|null {
    return this.#securityState;
  }

  origin(): Platform.DevToolsPath.UrlString|null {
    return this.#origin;
  }

  override showElement(): void {
    this.listItemElement.dispatchEvent(new ShowOriginEvent(this.#origin));
  }
}

declare global {
  interface HTMLElementEventMap {
    showorigin: ShowOriginEvent;
  }
}
