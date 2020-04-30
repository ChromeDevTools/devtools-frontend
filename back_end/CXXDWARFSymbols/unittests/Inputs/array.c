// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

int A[4];

void fill(int A[4]) {
  A[0] = 4;
  A[1] = 5;
  A[2] = 6;
  A[3] = 7;
}

void printfI(int);

int Main() {
  fill(A);
  printfI(A[0]);
  printfI(A[1]);
  printfI(A[2]);
  printfI(A[3]);
  return 0;
}
