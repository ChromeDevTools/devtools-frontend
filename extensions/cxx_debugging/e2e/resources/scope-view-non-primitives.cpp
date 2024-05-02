// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include <cstdio>
#include <cstdlib>

class Rectangle {
 public:
  int height;
  int width;
};

enum UnscopedEnum { kUnscopedA = 19, kUnscopedB = 21 };

enum class ScopedEnum { kScopedA = 22, kScopedB = 23 };

struct Birthday {
  int day;
  int month;
  int year;
};

void check_non_primitives() {
  int a[5] = {1, 2, 3, 4, 5};

  int i = 10;
  int* p = &i;
  int& r = i;

  UnscopedEnum u = kUnscopedB;
  ScopedEnum s = ScopedEnum::kScopedB;

  Rectangle rec;
  rec.height = 6;
  rec.width = static_cast<int>(s) + u;

  struct Birthday dob;
  dob.day = 23;
  dob.month = 6;
  dob.year = 1912;

  printf("%d %p %d %d %d", a[0], p, r, rec.height, dob.year);
  return;
}

int main() {
  check_non_primitives();
}
