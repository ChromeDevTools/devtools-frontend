// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export interface DOMPinnedWebIDLProp {
  global?: boolean;
  specs?: number;
  rules?: DOMPinnedWebIDLRule[];
}

export interface DOMPinnedWebIDLType {
  inheritance?: string;
  includes?: string[];
  props?: {
    [PropName: string]: DOMPinnedWebIDLProp,
  };
  rules?: DOMPinnedWebIDLRule[];
}

export interface DOMPinnedWebIDLRule {
  when: string;
  is: string;
}

export interface JavaScriptMetaData {
  signaturesForNativeFunction(name: string): string[][]|null;

  signaturesForInstanceMethod(name: string, receiverClassName: string): string[][]|null;

  signaturesForStaticMethod(name: string, receiverConstructorName: string): string[][]|null;
}
