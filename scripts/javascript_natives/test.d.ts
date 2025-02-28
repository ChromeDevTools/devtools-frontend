// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

interface Array<T> {
  at(index: number): T|undefined;
  diffSig(oneSig: number): T|undefined;
}

interface ReadonlyArray<T> {
  at(index: number): T|undefined;
  diffSig(twoSig: number): T|undefined;
}
