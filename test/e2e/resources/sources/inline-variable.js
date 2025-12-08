// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function testFunction() {
  debugger;
  var a = { k: 1 };
  var b = [1, 2, 3, 4, 5];
  var c = new Array(100); c[10] = 1;
  a.k = 2;
  a.l = window;
  b[1]++;
  b[2] = document.body;
}
