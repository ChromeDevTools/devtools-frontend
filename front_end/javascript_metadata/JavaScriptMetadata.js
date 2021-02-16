// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars

import {NativeFunctions} from './NativeFunctions.js';


/** @type {JavaScriptMetadataImpl} */
let javaScriptMetadataInstance;

/**
 * @implements {Common.JavaScriptMetaData.JavaScriptMetaData}
 */
export class JavaScriptMetadataImpl {
  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!javaScriptMetadataInstance || forceNew) {
      javaScriptMetadataInstance = new JavaScriptMetadataImpl();
    }

    return javaScriptMetadataInstance;
  }
  constructor() {
    /** @type {!Map<string, !Array<!Array<string>>>} */
    this._uniqueFunctions = new Map();
    /** @type {!Map<string, !Map<string, !Array<!Array<string>>>>} */
    this._instanceMethods = new Map();
    /** @type {!Map<string, !Map<string, !Array<!Array<string>>>>} */
    this._staticMethods = new Map();

    for (const nativeFunction of NativeFunctions) {
      if (!nativeFunction.receiver) {
        this._uniqueFunctions.set(nativeFunction.name, nativeFunction.signatures);
      } else if (nativeFunction.static) {
        let staticMethod = this._staticMethods.get(nativeFunction.receiver);
        if (!staticMethod) {
          staticMethod = new Map();
          this._staticMethods.set(nativeFunction.receiver, staticMethod);
        }
        staticMethod.set(nativeFunction.name, nativeFunction.signatures);
      } else {
        let instanceMethod = this._instanceMethods.get(nativeFunction.receiver);
        if (!instanceMethod) {
          instanceMethod = new Map();
          this._instanceMethods.set(nativeFunction.receiver, instanceMethod);
        }
        instanceMethod.set(nativeFunction.name, nativeFunction.signatures);
      }
    }
  }

  /**
   * @override
   * @param {string} name
   * @return {?Array<!Array<string>>}
   */
  signaturesForNativeFunction(name) {
    return this._uniqueFunctions.get(name) || null;
  }

  /**
   * @override
   * @param {string} name
   * @param {string} receiverClassName
   * @return {?Array<!Array<string>>}
   */
  signaturesForInstanceMethod(name, receiverClassName) {
    const instanceMethod = this._instanceMethods.get(receiverClassName);
    if (!instanceMethod) {
      return null;
    }
    return instanceMethod.get(name) || null;
  }

  /**
   * @override
   * @param {string} name
   * @param {string} receiverConstructorName
   * @return {?Array<!Array<string>>}
   */
  signaturesForStaticMethod(name, receiverConstructorName) {
    const staticMethod = this._staticMethods.get(receiverConstructorName);
    if (!staticMethod) {
      return null;
    }
    return staticMethod.get(name) || null;
  }
}
