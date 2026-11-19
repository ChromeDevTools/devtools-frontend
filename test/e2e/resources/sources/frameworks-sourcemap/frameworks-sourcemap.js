// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function scheduleTestFunction() {
  setTimeout(testFunction, 0);
}

function testFunction() {
  debugger;
  return foo(callback);
}

function callback(i) {
  return i;
}
