// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include <wasm_simd128.h>

int main() {
  v128_t a = wasm_i32x4_splat(1);
  v128_t b = wasm_i32x4_splat(2);
  v128_t c = wasm_i32x4_add(a, b);
  int32_t r = wasm_i32x4_extract_lane(c, 0);
  return r - 3;
}
