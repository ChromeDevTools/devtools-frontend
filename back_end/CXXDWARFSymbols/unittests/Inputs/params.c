// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

void printfI(int);

float Global = 5;

int get(int a, int b, int c) {
  return Global + a + b + c;
}

int Main() {
  int I = get(1, 2, 3);
  printfI(I);
  return I;
}
