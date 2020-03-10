// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import {ContextFlavorListener} from './ContextFlavorListener.js';

/**
 * @unrestricted
 */
export class Context {
  constructor() {
    this._flavors = new Map();
    this._eventDispatchers = new Map();
  }

  /**
   * @param {function(new:T, ...)} flavorType
   * @param {?T} flavorValue
   * @template T
   */
  setFlavor(flavorType, flavorValue) {
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

  /**
   * @param {function(new:T, ...)} flavorType
   * @param {?T} flavorValue
   * @template T
   */
  _dispatchFlavorChange(flavorType, flavorValue) {
    for (const extension of self.runtime.extensions(ContextFlavorListener)) {
      if (extension.hasContextType(flavorType)) {
        extension.instance().then(
            instance => /** @type {!ContextFlavorListener} */ (instance).flavorChanged(flavorValue));
      }
    }
    const dispatcher = this._eventDispatchers.get(flavorType);
    if (!dispatcher) {
      return;
    }
    dispatcher.dispatchEventToListeners(Events.FlavorChanged, flavorValue);
  }

  /**
   * @param {function(new:Object, ...)} flavorType
   * @param {function(!Common.EventTarget.EventTargetEvent)} listener
   * @param {!Object=} thisObject
   */
  addFlavorChangeListener(flavorType, listener, thisObject) {
    let dispatcher = this._eventDispatchers.get(flavorType);
    if (!dispatcher) {
      dispatcher = new Common.ObjectWrapper.ObjectWrapper();
      this._eventDispatchers.set(flavorType, dispatcher);
    }
    dispatcher.addEventListener(Events.FlavorChanged, listener, thisObject);
  }

  /**
   * @param {function(new:Object, ...)} flavorType
   * @param {function(!Common.EventTarget.EventTargetEvent)} listener
   * @param {!Object=} thisObject
   */
  removeFlavorChangeListener(flavorType, listener, thisObject) {
    const dispatcher = this._eventDispatchers.get(flavorType);
    if (!dispatcher) {
      return;
    }
    dispatcher.removeEventListener(Events.FlavorChanged, listener, thisObject);
    if (!dispatcher.hasEventListeners(Events.FlavorChanged)) {
      this._eventDispatchers.delete(flavorType);
    }
  }

  /**
   * @param {function(new:T, ...)} flavorType
   * @return {?T}
   * @template T
   */
  flavor(flavorType) {
    return this._flavors.get(flavorType) || null;
  }

  /**
   * @return {!Set.<function(new:Object, ...)>}
   */
  flavors() {
    return new Set(this._flavors.keys());
  }

  /**
   * @param {!Array.<!Root.Runtime.Extension>} extensions
   * @return {!Set.<!Root.Runtime.Extension>}
   */
  applicableExtensions(extensions) {
    const targetExtensionSet = new Set();

    const availableFlavors = this.flavors();
    extensions.forEach(function(extension) {
      if (self.runtime.isExtensionApplicableToContextTypes(extension, availableFlavors)) {
        targetExtensionSet.add(extension);
      }
    });

    return targetExtensionSet;
  }
}

/** @enum {symbol} */
const Events = {
  FlavorChanged: Symbol('FlavorChanged')
};
