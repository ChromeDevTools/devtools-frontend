// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';

import {NativeFunctions} from './NativeFunctions.js';

let javaScriptMetadataInstance: JavaScriptMetadataImpl;

export class JavaScriptMetadataImpl implements Common.JavaScriptMetaData.JavaScriptMetaData {
  private readonly uniqueFunctions: Map<string, string[][]>;
  private readonly instanceMethods: Map<string, Map<string, string[][]>>;
  private readonly staticMethods: Map<string, Map<string, string[][]>>;
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
    this.uniqueFunctions = new Map();
    this.instanceMethods = new Map();
    this.staticMethods = new Map();

    for (const nativeFunction of NativeFunctions) {
      if (!nativeFunction.receiver) {
        this.uniqueFunctions.set(nativeFunction.name, nativeFunction.signatures);
      } else if (nativeFunction.static) {
        let staticMethod = this.staticMethods.get(nativeFunction.receiver);
        if (!staticMethod) {
          staticMethod = new Map();
          this.staticMethods.set(nativeFunction.receiver, staticMethod);
        }
        staticMethod.set(nativeFunction.name, nativeFunction.signatures);
      } else {
        let instanceMethod = this.instanceMethods.get(nativeFunction.receiver);
        if (!instanceMethod) {
          instanceMethod = new Map();
          this.instanceMethods.set(nativeFunction.receiver, instanceMethod);
        }
        instanceMethod.set(nativeFunction.name, nativeFunction.signatures);
      }
    }
  }

  signaturesForNativeFunction(name: string): string[][]|null {
    return this.uniqueFunctions.get(name) || null;
  }

  signaturesForInstanceMethod(name: string, receiverClassName: string): string[][]|null {
    const instanceMethod = this.instanceMethods.get(receiverClassName);
    if (!instanceMethod) {
      return null;
    }
    return instanceMethod.get(name) || null;
  }

  signaturesForStaticMethod(name: string, receiverConstructorName: string): string[][]|null {
    const staticMethod = this.staticMethods.get(receiverConstructorName);
    if (!staticMethod) {
      return null;
    }
    return staticMethod.get(name) || null;
  }
}
