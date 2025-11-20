// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const endTime = Date.now() + 100;
let s = 0;
while (Date.now() < endTime) {
  s += Math.cos(s) + Math.sin(s);
  s += Math.cos(s) + Math.sin(s);
  s += Math.cos(s) + Math.sin(s);
}
document.body.textContent = s;
