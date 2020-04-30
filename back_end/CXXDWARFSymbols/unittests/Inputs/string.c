// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

void printfI(int);

const char *String;

const char *get() { return "abc"; }

int Main() {
  String = get();
  printfI(String[0]);
  return 0;
}
