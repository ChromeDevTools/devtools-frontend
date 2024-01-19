// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Extensions from '../../../models/extensions/extensions.js';

let instance: ExtensionManager|null = null;

export interface Extension {
  getName(): string;
  getMediaType(): string|undefined;
  stringify(recording: Object): Promise<string>;
  stringifyStep(step: Object): Promise<string>;
  getCapabilities(): Array<'replay'|'export'>;
  replay(recording: Object): void;
}

export class ExtensionManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  static instance(): ExtensionManager {
    if (!instance) {
      instance = new ExtensionManager();
    }
    return instance;
  }

  #views = new Map<string, ExtensionIframe>();

  constructor() {
    super();
    this.attach();
  }

  attach(): void {
    const pluginManager = Extensions.RecorderPluginManager.RecorderPluginManager.instance();
    pluginManager.addEventListener(Extensions.RecorderPluginManager.Events.PluginAdded, this.#handlePlugin);
    pluginManager.addEventListener(Extensions.RecorderPluginManager.Events.PluginRemoved, this.#handlePlugin);
    pluginManager.addEventListener(Extensions.RecorderPluginManager.Events.ViewRegistered, this.#handleView);
    for (const descriptor of pluginManager.views()) {
      this.#handleView({data: descriptor});
    }
  }

  detach(): void {
    const pluginManager = Extensions.RecorderPluginManager.RecorderPluginManager.instance();
    pluginManager.removeEventListener(Extensions.RecorderPluginManager.Events.PluginAdded, this.#handlePlugin);
    pluginManager.removeEventListener(Extensions.RecorderPluginManager.Events.PluginRemoved, this.#handlePlugin);
    pluginManager.removeEventListener(Extensions.RecorderPluginManager.Events.ViewRegistered, this.#handleView);
    this.#views.clear();
  }

  extensions(): Extension[] {
    return Extensions.RecorderPluginManager.RecorderPluginManager.instance().plugins();
  }

  getView(descriptorId: string): ExtensionIframe {
    const view = this.#views.get(descriptorId);
    if (!view) {
      throw new Error('View not found');
    }
    return view;
  }

  #handlePlugin = (): void => {
    this.dispatchEventToListeners(Events.ExtensionsUpdated, this.extensions());
  };

  #handleView = (event: {data: Extensions.RecorderPluginManager.ViewDescriptor}): void => {
    const descriptor = event.data;
    if (!this.#views.has(descriptor.id)) {
      this.#views.set(descriptor.id, new ExtensionIframe(descriptor));
    }
  };
}

class ExtensionIframe {
  #descriptor: Extensions.RecorderPluginManager.ViewDescriptor;
  #iframe: HTMLIFrameElement;
  #isShowing = false;
  #isLoaded = false;

  constructor(descriptor: Extensions.RecorderPluginManager.ViewDescriptor) {
    this.#descriptor = descriptor;
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

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  ExtensionsUpdated = 'extensionsUpdated',
}

export type EventTypes = {
  [Events.ExtensionsUpdated]: Extension[],
};
