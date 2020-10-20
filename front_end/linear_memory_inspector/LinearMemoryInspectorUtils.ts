// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export function toHexString(byte: number, pad: number) {
  const hex = byte.toString(16).padStart(pad, '0');
  return hex.toUpperCase();
}
