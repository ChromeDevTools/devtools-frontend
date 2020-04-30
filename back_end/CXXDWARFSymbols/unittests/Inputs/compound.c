// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

struct Pair {
  int X, Y;
};

struct Pair get() {
  struct Pair P = {4, 5};
  return P;
}

void printfI(int);
struct Pair P;
int Main() {
  P = get();
  printfI(P.X);
  printfI(P.Y);
  return 0;
}
