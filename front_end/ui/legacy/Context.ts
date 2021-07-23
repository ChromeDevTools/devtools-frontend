// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';  // eslint-disable-line @typescript-eslint/no-unused-vars

import type {ContextFlavorListener} from './ContextFlavorListener.js';

let contextInstance: Context;

interface ConstructorFn<T> {
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new(...args: any[]): T;
}

export class Context {
  _flavors: Map<ConstructorFn<unknown>, Object>;
  _eventDispatchers: Map<ConstructorFn<unknown>, Common.ObjectWrapper.ObjectWrapper>;

  private constructor() {
    this._flavors = new Map();
    this._eventDispatchers = new Map();
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

  setFlavor<T>(flavorType: ConstructorFn<T>, flavorValue: T|null): void {
    const value = this._flavors.get(flavorType) || null;
    if (value === flavorValue) {
      return;
    }
    if (flavorValue) {
      this._flavors.set(flavorType, flavorValue);
    } else {
      this._flavors.delete(flavorType);
    }

    this._dispatchFlavorChange(flavorType, flavorValue);
  }

  _dispatchFlavorChange<T>(flavorType: ConstructorFn<T>, flavorValue: T|null): void {
    for (const extension of getRegisteredListeners()) {
      if (extension.contextTypes().includes(flavorType)) {
        extension.loadListener().then(instance => instance.flavorChanged(flavorValue));
      }
    }
    const dispatcher = this._eventDispatchers.get(flavorType);
    if (!dispatcher) {
      return;
    }
    dispatcher.dispatchEventToListeners(Events.FlavorChanged, flavorValue);
  }

  addFlavorChangeListener<T>(
      flavorType: ConstructorFn<T>, listener: (arg0: Common.EventTarget.EventTargetEvent) => void,
      thisObject?: Object): void {
    let dispatcher = this._eventDispatchers.get(flavorType);
    if (!dispatcher) {
      dispatcher = new Common.ObjectWrapper.ObjectWrapper();
      this._eventDispatchers.set(flavorType, dispatcher);
    }
    dispatcher.addEventListener(Events.FlavorChanged, listener, thisObject);
  }

  removeFlavorChangeListener<T>(
      flavorType: ConstructorFn<T>, listener: (arg0: Common.EventTarget.EventTargetEvent) => void,
      thisObject?: Object): void {
    const dispatcher = this._eventDispatchers.get(flavorType);
    if (!dispatcher) {
      return;
    }
    dispatcher.removeEventListener(Events.FlavorChanged, listener, thisObject);
    if (!dispatcher.hasEventListeners(Events.FlavorChanged)) {
      this._eventDispatchers.delete(flavorType);
    }
  }

  flavor<T>(flavorType: ConstructorFn<T>): T|null {
    return (this._flavors.get(flavorType) as T | null) || null;
  }

  flavors(): Set<ConstructorFn<unknown>> {
    return new Set(this._flavors.keys());
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
enum Events {
  FlavorChanged = 'FlavorChanged',
}

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
