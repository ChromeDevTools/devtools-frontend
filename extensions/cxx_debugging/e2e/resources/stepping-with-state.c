// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include <stdio.h>

/* multiplies each element by a constant */
void multiplyByConstant(int *array, int length, int constant) {
  for (int i = 0; i < length; ++i) {
      array[i] *= constant;
  }
}

int main() {
  int n = 10;
  int x[n];

  /* initialize x */
  for (int i = 0; i < n; ++i) {
    x[i] = i;
  }

  /* multiply each element by 5 */
  multiplyByConstant(x, n, 5);

  /* output x */
  for (int i = 0; i < n; ++i) {
      printf("x[%d] = %d\n", i, x[i]);
  }
  return 0;
}
