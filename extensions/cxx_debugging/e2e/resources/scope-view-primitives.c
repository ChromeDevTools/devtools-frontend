// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include <stdlib.h>
#include <stdio.h>

void check_primitives() {
  int i = 10;
  char c = 'a';
  float f = 1.1;
  double d = 1.2;
  printf("%d %c %f %f", i, c, f, d);
  return;
}

int main() {
  check_primitives();
}
