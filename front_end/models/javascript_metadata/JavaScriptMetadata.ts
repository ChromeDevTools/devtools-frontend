// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';

import {NativeFunctions} from './NativeFunctions.js';
import * as DOMPinnedProperties from './DOMPinnedProperties.js';

let javaScriptMetadataInstance: JavaScriptMetadataImpl;

export class JavaScriptMetadataImpl implements Common.JavaScriptMetaData.JavaScriptMetaData {
  static readonly domPinnedProperties = DOMPinnedProperties;

  private readonly uniqueFunctions: Map<string, string[][]>;
  private readonly receiverMethods: Map<string, Map<string, string[][]>>;
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
    this.receiverMethods = new Map();

    for (const nativeFunction of NativeFunctions) {
      if (!nativeFunction.receivers) {
        this.uniqueFunctions.set(nativeFunction.name, nativeFunction.signatures);
        continue;
      }
      for (const receiver of nativeFunction.receivers) {
        let method = this.receiverMethods.get(receiver);
        if (!method) {
          method = new Map();
          this.receiverMethods.set(receiver, method);
        }
        method.set(nativeFunction.name, nativeFunction.signatures);
      }
    }
  }

  signaturesForNativeFunction(name: string): string[][]|null {
    return this.uniqueFunctions.get(name) || null;
  }

  signaturesForInstanceMethod(name: string, receiverClassName: string): string[][]|null {
    const instanceMethod = this.receiverMethods.get(receiverClassName);
    if (!instanceMethod) {
      return null;
    }
    return instanceMethod.get(name) || null;
  }

  signaturesForStaticMethod(name: string, receiverConstructorName: string): string[][]|null {
    const staticMethod = this.receiverMethods.get(receiverConstructorName + 'Constructor');
    if (!staticMethod) {
      return null;
    }
    return staticMethod.get(name) || null;
  }
}
