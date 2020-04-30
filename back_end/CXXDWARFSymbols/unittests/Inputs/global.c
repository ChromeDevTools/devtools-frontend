// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

void printfI(int);

int I = 0;

int get() { return 28; }
int Main() {
  I = get();
  printfI(I);
  return I;
}
