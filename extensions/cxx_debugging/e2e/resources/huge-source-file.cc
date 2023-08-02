// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include <iostream>

// Build a large type to produce a non-trivial DWO file, so that we can hit the
// mmap path inside of llvm.
template <int n>
struct Recursive;

template <>
struct Recursive<0> {
  int value = 1 << 31;
};

template <int n = 1>
struct Recursive : Recursive<n - 1> {};

// Hide the local with the huge type to help the scope view a little bit.
int indirect() {
  Recursive<1 << 10> r;
  return r.value;
}

int main() {
  auto value = indirect();
  std::cout << value << '\n';
}
