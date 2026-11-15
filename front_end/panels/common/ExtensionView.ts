// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Extensions from '../../models/extensions/extensions.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../ui/lit/lit.js';

import type {ExtensionServer} from './ExtensionServer.js';

const {ref} = Directives;

export interface ViewInput {
  src: string;
  className: string;
  onLoad: () => void;
}

export interface ViewOutput {
  getContentWindow?: () => Window | null;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export interface ExtensionViewData {
  server?: ExtensionServer;
  id: string;
  src: string;
  className: string;
}

export interface ExtensionNotifierViewData {
  server?: ExtensionServer;
  id: string;
}

export const DEFAULT_VIEW: View = (input: ViewInput, output: ViewOutput, target: HTMLElement): void => {
  // clang-format off
  render(html`<iframe
    ${ref(element => {
      output.getContentWindow = element instanceof HTMLIFrameElement ? () => element.contentWindow : undefined;
    })}
    src=${input.src}
    allow="language-model; summarizer; translator; language-detector; writer; rewriter; proofreader; clipboard-write; autoplay"
    class=${input.className}
    @load=${input.onLoad}></iframe>`, target);
  // clang-format on
};

export class ExtensionView extends UI.Widget.Widget {
  #server?: ExtensionServer;
  #id = '';
  #src = '';
  #className = '';

  #getContentWindow?: () => Window | null;
  #hasRendered = false;
  #frameIndex?: number;
  #isNotifiedShown = false;

  #view: View;
  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
    this.setHideOnDetach();  // Override
  }

  set data({server, id, src, className}: ExtensionViewData) {
    const targetChanged = server !== this.#server || id !== this.#id;
    const srcChanged = src !== this.#src;
    const classNameChanged = className !== this.#className;
    if (!targetChanged && !srcChanged && !classNameChanged) {
      return;
    }
    if ((targetChanged || srcChanged) && this.#isNotifiedShown && this.#server && this.#id) {
      this.#isNotifiedShown = false;
      this.#server.notifyViewHidden(this.#id);
    }
    this.#server = server;
    this.#id = id;
    this.#className = className;
    if (srcChanged) {
      this.#src = src;
      this.#frameIndex = undefined;
    }
    if (srcChanged || classNameChanged) {
      this.requestUpdate();
    }
    if (this.isShowing() && typeof this.#frameIndex === 'number' && !this.#isNotifiedShown && this.#server &&
        this.#id) {
      this.#isNotifiedShown = true;
      this.#server.notifyViewShown(this.#id, this.#frameIndex);
    }
  }

  override performUpdate(): Promise<void>|void {
    this.#hasRendered = true;
    const output: ViewOutput = {};
    this.#view(
        {
          src: this.#src,
          className: this.#className,
          onLoad: this.onLoad.bind(this),
        },
        output, this.element);
    this.#getContentWindow = output.getContentWindow;
  }

  override wasShown(): void {
    if (!this.#hasRendered) {
      this.requestUpdate();
    }
    super.wasShown();
    if (typeof this.#frameIndex === 'number' && !this.#isNotifiedShown && this.#server && this.#id) {
      this.#isNotifiedShown = true;
      this.#server.notifyViewShown(this.#id, this.#frameIndex);
    }
  }

  override willHide(): void {
    super.willHide();
    if (typeof this.#frameIndex === 'number' && this.#isNotifiedShown && this.#server && this.#id) {
      this.#isNotifiedShown = false;
      this.#server.notifyViewHidden(this.#id);
    }
  }

  private onLoad(): void {
    const contentWindow = this.#getContentWindow?.();
    if (!contentWindow) {
      return;
    }
    const frames = window.frames;
    this.#frameIndex = Array.prototype.indexOf.call(frames, contentWindow);
    if (this.isShowing() && !this.#isNotifiedShown && this.#server && this.#id) {
      this.#isNotifiedShown = true;
      this.#server.notifyViewShown(this.#id, this.#frameIndex);
    }
  }
}

export class ExtensionNotifierView extends UI.Widget.VBox {
  #server?: ExtensionServer;
  #id = '';
  #isNotifiedShown = false;

  set data({server, id}: ExtensionNotifierViewData) {
    if (server === this.#server && id === this.#id) {
      return;
    }
    if (this.#isNotifiedShown && this.#server && this.#id) {
      this.#isNotifiedShown = false;
      this.#server.notifyViewHidden(this.#id);
    }
    this.#server = server;
    this.#id = id;
    if (this.isShowing() && !this.#isNotifiedShown && this.#server && this.#id) {
      this.#isNotifiedShown = true;
      this.#server.notifyViewShown(this.#id);
    }
  }

  override wasShown(): void {
    super.wasShown();
    if (!this.#isNotifiedShown && this.#server && this.#id) {
      this.#isNotifiedShown = true;
      this.#server.notifyViewShown(this.#id);
    }
  }

  override willHide(): void {
    super.willHide();
    if (this.#isNotifiedShown && this.#server && this.#id) {
      this.#isNotifiedShown = false;
      this.#server.notifyViewHidden(this.#id);
    }
  }
}

export class ExtensionIframe {
  #descriptor: Extensions.RecorderPluginManager.ViewDescriptor;
  #iframe: HTMLIFrameElement;
  #isShowing = false;
  #isLoaded = false;

  constructor(descriptor: Extensions.RecorderPluginManager.ViewDescriptor) {
    this.#descriptor = descriptor;
    // We are creating a single iframe here.
    /* eslint-disable-next-line @devtools/no-imperative-dom-api */
    this.#iframe = document.createElement('iframe');
    this.#iframe.src = descriptor.pagePath;
    this.#iframe.onload = this.#onIframeLoad;
  }

  #onIframeLoad = (): void => {
    this.#isLoaded = true;
    if (this.#isShowing) {
      this.#descriptor.onShown();
    }
  };

  show(): void {
    if (this.#isShowing) {
      return;
    }
    this.#isShowing = true;
    if (this.#isLoaded) {
      this.#descriptor.onShown();
    }
  }

  hide(): void {
    if (!this.#isShowing) {
      return;
    }
    this.#isShowing = false;
    this.#isLoaded = false;
    this.#descriptor.onHidden();
  }

  frame(): HTMLIFrameElement {
    return this.#iframe;
  }
}
