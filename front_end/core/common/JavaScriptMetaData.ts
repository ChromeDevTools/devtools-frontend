// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export interface JavaScriptMetaData {
  signaturesForNativeFunction(name: string): string[][]|null;

  signaturesForInstanceMethod(name: string, receiverClassName: string): string[][]|null;

  signaturesForStaticMethod(name: string, receiverConstructorName: string): string[][]|null;
}
