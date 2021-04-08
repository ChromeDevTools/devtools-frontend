// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';  // eslint-disable-line no-unused-vars

import {NativeFunctions} from './NativeFunctions.js';

let javaScriptMetadataInstance: JavaScriptMetadataImpl;

export class JavaScriptMetadataImpl implements Common.JavaScriptMetaData.JavaScriptMetaData {
  _uniqueFunctions: Map<string, string[][]>;
  _instanceMethods: Map<string, Map<string, string[][]>>;
  _staticMethods: Map<string, Map<string, string[][]>>;
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): JavaScriptMetadataImpl {
    const {forceNew} = opts;
    if (!javaScriptMetadataInstance || forceNew) {
      javaScriptMetadataInstance = new JavaScriptMetadataImpl();
    }

    return javaScriptMetadataInstance;
  }
  constructor() {
    this._uniqueFunctions = new Map();
    this._instanceMethods = new Map();
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

  signaturesForNativeFunction(name: string): string[][]|null {
    return this._uniqueFunctions.get(name) || null;
  }

  signaturesForInstanceMethod(name: string, receiverClassName: string): string[][]|null {
    const instanceMethod = this._instanceMethods.get(receiverClassName);
    if (!instanceMethod) {
      return null;
    }
    return instanceMethod.get(name) || null;
  }

  signaturesForStaticMethod(name: string, receiverConstructorName: string): string[][]|null {
    const staticMethod = this._staticMethods.get(receiverConstructorName);
    if (!staticMethod) {
      return null;
    }
    return staticMethod.get(name) || null;
  }
}
