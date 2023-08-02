// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include <iostream>

struct B;
struct A {
  int value;
  B* b;
};

struct B {
  int value;
  A* a;
};

int main() {
  A a1 = {1};
  A a2 = {2};
  A a3 = {3};
  B b1 = {4};
  B b2 = {5};
  B b3 = {6};
  a1.b = &b1;
  a2.b = &b2;
  a3.b = &b3;
  b1.a = &a2;
  b2.a = &a3;
  b3.a = nullptr;

  std::cout << a1.b->a->b->a->b->a << ": " << a1.b->a->b->a->b->value << "\n";

  A cycle_a = {'a'};
  B cycle_b = {'b'};
  cycle_a.b = &cycle_b;
  cycle_b.a = &cycle_a;
  std::cout << cycle_a.b->a->b->a->b << ": " << cycle_a.b->a->b->a->b->value
            << "\n";
}
