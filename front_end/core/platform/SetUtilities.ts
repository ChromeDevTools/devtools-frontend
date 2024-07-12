// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const addAll = function<T>(set: Set<T>, iterable: Iterable<T>): void {
  for (const item of iterable) {
    set.add(item);
  }
};
