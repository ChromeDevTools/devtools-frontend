// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// TODO(crbug.com/442509324): remove UI dependency
// eslint-disable-next-line rulesdir/no-imports-in-directory
import * as UI from '../../ui/legacy/legacy.js';
// TODO(crbug.com/442509324): remove UI dependency
// eslint-disable-next-line rulesdir/no-imports-in-directory
import * as Lit from '../../ui/lit/lit.js';

import type {ExtensionServer} from './ExtensionServer.js';

const {render, html, Directives: {ref}} = Lit;

interface ViewInput {
  src: string;
  className: string;
  onLoad: () => void;
}

interface ViewOutput {
  iframe?: HTMLIFrameElement;
}

const DEFAULT_VIEW = (input: ViewInput, output: ViewOutput, target: HTMLElement): void => {
  // clang-format off
  render(html`<iframe
    ${ref(element => {output.iframe = element as HTMLIFrameElement; })}
    src=${input.src}
    class=${input.className}
    @load=${input.onLoad}></iframe>`, target);
  // clang-format on
};

export class ExtensionView extends UI.Widget.Widget {
  #server: ExtensionServer;
  #id: string;
  #src: string;
  #className: string;

  #iframe?: HTMLIFrameElement;
  #frameIndex?: number;

  #view: typeof DEFAULT_VIEW;
  constructor(server: ExtensionServer, id: string, src: string, className: string, view = DEFAULT_VIEW) {
    super();
    this.#view = view;
    this.#server = server;
    this.#src = src;
    this.#className = className;
    this.#id = id;
    this.setHideOnDetach();  // Override
    void this.performUpdate();
  }

  override performUpdate(): Promise<void>|void {
    const output: ViewOutput = {};
    this.#view(
        {
          src: this.#src,
          className: this.#className,
          onLoad: this.onLoad.bind(this),
        },
        output, this.element);
    if (output.iframe) {
      this.#iframe = output.iframe;
    }
  }

  override wasShown(): void {
    super.wasShown();
    if (typeof this.#frameIndex === 'number') {
      this.#server.notifyViewShown(this.#id, this.#frameIndex);
    }
  }

  override willHide(): void {
    if (typeof this.#frameIndex === 'number') {
      this.#server.notifyViewHidden(this.#id);
    }
  }

  private onLoad(): void {
    if (!this.#iframe) {
      return;
    }
    const frames = window.frames;
    this.#frameIndex = Array.prototype.indexOf.call(frames, this.#iframe.contentWindow);
    if (this.isShowing()) {
      this.#server.notifyViewShown(this.#id, this.#frameIndex);
    }
  }
}

export class ExtensionNotifierView extends UI.Widget.VBox {
  private readonly server: ExtensionServer;
  private readonly id: string;
  constructor(server: ExtensionServer, id: string) {
    super();

    this.server = server;
    this.id = id;
  }

  override wasShown(): void {
    this.server.notifyViewShown(this.id);
  }

  override willHide(): void {
    this.server.notifyViewHidden(this.id);
  }
}
