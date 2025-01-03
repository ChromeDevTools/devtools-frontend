// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

import type {RecorderExtensionEndpoint} from './RecorderExtensionEndpoint.js';

let instance: RecorderPluginManager|null = null;

export type ViewDescriptor = {
  id: string,
  title: string,
  pagePath: string,
  onShown: () => void,
  onHidden: () => void,
};

export class RecorderPluginManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  #plugins: Set<RecorderExtensionEndpoint> = new Set();
  #views: Map<string, ViewDescriptor> = new Map();

  static instance(): RecorderPluginManager {
    if (!instance) {
      instance = new RecorderPluginManager();
    }
    return instance;
  }

  addPlugin(plugin: RecorderExtensionEndpoint): void {
    this.#plugins.add(plugin);
    this.dispatchEventToListeners(Events.PLUGIN_ADDED, plugin);
  }

  removePlugin(plugin: RecorderExtensionEndpoint): void {
    this.#plugins.delete(plugin);
    this.dispatchEventToListeners(Events.PLUGIN_REMOVED, plugin);
  }

  plugins(): RecorderExtensionEndpoint[] {
    return Array.from(this.#plugins.values());
  }

  registerView(descriptor: ViewDescriptor): void {
    this.#views.set(descriptor.id, descriptor);
    this.dispatchEventToListeners(Events.VIEW_REGISTERED, descriptor);
  }

  views(): ViewDescriptor[] {
    return Array.from(this.#views.values());
  }

  getViewDescriptor(id: string): ViewDescriptor|undefined {
    return this.#views.get(id);
  }

  showView(id: string): void {
    const descriptor = this.#views.get(id);
    if (!descriptor) {
      throw new Error(`View with id ${id} is not found.`);
    }
    this.dispatchEventToListeners(Events.SHOW_VIEW_REQUESTED, descriptor);
  }
}

export const enum Events {
  PLUGIN_ADDED = 'pluginAdded',
  PLUGIN_REMOVED = 'pluginRemoved',
  VIEW_REGISTERED = 'viewRegistered',
  SHOW_VIEW_REQUESTED = 'showViewRequested',
}

export type EventTypes = {
  [Events.PLUGIN_ADDED]: RecorderExtensionEndpoint,
  [Events.PLUGIN_REMOVED]: RecorderExtensionEndpoint,
  [Events.VIEW_REGISTERED]: ViewDescriptor,
  [Events.SHOW_VIEW_REQUESTED]: ViewDescriptor,
};
