// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include <stdlib.h>
#include <stdio.h>

void check_non_primitives() {
  int i = 10;
  int* p = &i;

  int a[5] = {1, 2, 3, 4, 5};

  struct Birthday {
    int day;
    int month;
    int year;
  };
  struct Birthday dob;
  dob.day = 23;
  dob.month = 6;
  dob.year = 1912;

  printf("%p %i %i", p, a[0], dob.year);
  return;
}

int main() {
  check_non_primitives();
}
