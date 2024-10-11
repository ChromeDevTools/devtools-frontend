// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';  // eslint-disable-line @typescript-eslint/no-unused-vars

import type {ContextFlavorListener} from './ContextFlavorListener.js';

let contextInstance: Context|undefined;

interface ConstructorFn<T> {
  new(...args: any[]): T;
}

export class Context {
  private readonly flavorsInternal: Map<ConstructorFn<unknown>, Object>;
  private readonly eventDispatchers: Map<ConstructorFn<unknown>, Common.ObjectWrapper.ObjectWrapper<EventTypes>>;

  private constructor() {
    this.flavorsInternal = new Map();
    this.eventDispatchers = new Map();
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): Context {
    const {forceNew} = opts;
    if (!contextInstance || forceNew) {
      contextInstance = new Context();
    }

    return contextInstance;
  }

  static removeInstance(): void {
    contextInstance = undefined;
  }

  setFlavor<T extends Object>(flavorType: ConstructorFn<T>, flavorValue: T|null): void {
    const value = this.flavorsInternal.get(flavorType) || null;
    if (value === flavorValue) {
      return;
    }
    if (flavorValue) {
      this.flavorsInternal.set(flavorType, flavorValue);
    } else {
      this.flavorsInternal.delete(flavorType);
    }

    this.dispatchFlavorChange(flavorType, flavorValue);
  }

  private dispatchFlavorChange<T extends Object>(flavorType: ConstructorFn<T>, flavorValue: T|null): void {
    for (const extension of getRegisteredListeners()) {
      if (extension.contextTypes().includes(flavorType)) {
        void extension.loadListener().then(instance => instance.flavorChanged(flavorValue));
      }
    }
    const dispatcher = this.eventDispatchers.get(flavorType);
    if (!dispatcher) {
      return;
    }
    dispatcher.dispatchEventToListeners(Events.FLAVOR_CHANGED, flavorValue);
  }

  addFlavorChangeListener<T>(
      flavorType: ConstructorFn<T>, listener: (arg0: Common.EventTarget.EventTargetEvent<T>) => void,
      thisObject?: Object): void {
    let dispatcher = this.eventDispatchers.get(flavorType);
    if (!dispatcher) {
      dispatcher = new Common.ObjectWrapper.ObjectWrapper<EventTypes>();
      this.eventDispatchers.set(flavorType, dispatcher);
    }
    dispatcher.addEventListener(Events.FLAVOR_CHANGED, listener, thisObject);
  }

  removeFlavorChangeListener<T>(
      flavorType: ConstructorFn<T>, listener: (arg0: Common.EventTarget.EventTargetEvent<T>) => void,
      thisObject?: Object): void {
    const dispatcher = this.eventDispatchers.get(flavorType);
    if (!dispatcher) {
      return;
    }
    dispatcher.removeEventListener(Events.FLAVOR_CHANGED, listener, thisObject);
    if (!dispatcher.hasEventListeners(Events.FLAVOR_CHANGED)) {
      this.eventDispatchers.delete(flavorType);
    }
  }

  flavor<T>(flavorType: ConstructorFn<T>): T|null {
    return (this.flavorsInternal.get(flavorType) as T | null) || null;
  }

  flavors(): Set<ConstructorFn<unknown>> {
    return new Set(this.flavorsInternal.keys());
  }
}

const enum Events {
  FLAVOR_CHANGED = 'FlavorChanged',
}

export type EventTypes = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [Events.FLAVOR_CHANGED]: any,
};

const registeredListeners: ContextFlavorListenerRegistration[] = [];

export function registerListener(registration: ContextFlavorListenerRegistration): void {
  registeredListeners.push(registration);
}

function getRegisteredListeners(): ContextFlavorListenerRegistration[] {
  return registeredListeners;
}
export interface ContextFlavorListenerRegistration {
  contextTypes: () => Array<Function>;
  loadListener: () => Promise<ContextFlavorListener>;
}
