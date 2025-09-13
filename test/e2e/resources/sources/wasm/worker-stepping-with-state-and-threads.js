// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// clang-format off
self.onmessage = function(msg) {
  const module = msg.data;
  const instance = new WebAssembly.Instance(module);
  console.log(instance.exports.divSub(42, 6, 5));
};
