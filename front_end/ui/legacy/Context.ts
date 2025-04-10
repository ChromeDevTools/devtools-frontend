// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';

import type {ContextFlavorListener} from './ContextFlavorListener.js';

let contextInstance: Context|undefined;

export class Context {
  readonly #flavors = new Map<Platform.Constructor.Constructor<unknown>, object|null>();
  readonly #eventDispatchers =
      new Map<Platform.Constructor.Constructor<unknown>, Common.ObjectWrapper.ObjectWrapper<EventTypes>>();

  private constructor() {
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

  setFlavor<T extends Object>(flavorType: Platform.Constructor.Constructor<T>, flavorValue: T|null): void {
    const value = this.#flavors.get(flavorType) || null;
    if (value === flavorValue) {
      return;
    }
    if (flavorValue) {
      this.#flavors.set(flavorType, flavorValue);
    } else {
      this.#flavors.delete(flavorType);
    }

    this.#dispatchFlavorChange(flavorType, flavorValue);
  }

  #dispatchFlavorChange<T extends Object>(flavorType: Platform.Constructor.Constructor<T>, flavorValue: T|null): void {
    for (const extension of getRegisteredListeners()) {
      if (extension.contextTypes().includes(flavorType)) {
        void extension.loadListener().then(instance => instance.flavorChanged(flavorValue));
      }
    }
    const dispatcher = this.#eventDispatchers.get(flavorType);
    if (!dispatcher) {
      return;
    }
    dispatcher.dispatchEventToListeners(Events.FLAVOR_CHANGED, flavorValue);
  }

  addFlavorChangeListener<T>(
      flavorType: Platform.Constructor.Constructor<T>, listener: (arg0: Common.EventTarget.EventTargetEvent<T>) => void,
      thisObject?: Object): void {
    let dispatcher = this.#eventDispatchers.get(flavorType);
    if (!dispatcher) {
      dispatcher = new Common.ObjectWrapper.ObjectWrapper<EventTypes>();
      this.#eventDispatchers.set(flavorType, dispatcher);
    }
    dispatcher.addEventListener(
        Events.FLAVOR_CHANGED,
        listener as Common.EventTarget.EventListener<EventTypes, Events.FLAVOR_CHANGED>,
        thisObject,
    );
  }

  removeFlavorChangeListener<T>(
      flavorType: Platform.Constructor.Constructor<T>,
      listener: (arg0: Common.EventTarget.EventTargetEvent<T>) => void,
      thisObject?: Object,
      ): void {
    const dispatcher = this.#eventDispatchers.get(flavorType);
    if (!dispatcher) {
      return;
    }
    dispatcher.removeEventListener(
        Events.FLAVOR_CHANGED,
        listener as Common.EventTarget.EventListener<EventTypes, Events.FLAVOR_CHANGED>,
        thisObject,
    );
    if (!dispatcher.hasEventListeners(Events.FLAVOR_CHANGED)) {
      this.#eventDispatchers.delete(flavorType);
    }
  }

  flavor<T>(flavorType: Platform.Constructor.Constructor<T>): T|null {
    return (this.#flavors.get(flavorType) as T | null) || null;
  }

  flavors(): Set<Platform.Constructor.Constructor<unknown>> {
    return new Set(this.#flavors.keys());
  }
}

const enum Events {
  FLAVOR_CHANGED = 'FlavorChanged',
}

export type EventListenerDirect = Common.EventTarget.EventListener<EventTypes, Events.FLAVOR_CHANGED>;
export interface EventTypes {
  [Events.FLAVOR_CHANGED]: InstanceType<Platform.Constructor.Constructor<unknown>>;
}

const registeredListeners: ContextFlavorListenerRegistration[] = [];

export function registerListener(registration: ContextFlavorListenerRegistration): void {
  registeredListeners.push(registration);
}

function getRegisteredListeners(): ContextFlavorListenerRegistration[] {
  return registeredListeners;
}
export interface ContextFlavorListenerRegistration {
  contextTypes: () => Array<Platform.Constructor.Constructor<unknown>>;
  loadListener: () => Promise<ContextFlavorListener>;
}
