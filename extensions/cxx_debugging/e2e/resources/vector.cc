// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include <iostream>
#include <vector>
int main() {
  std::vector<std::string> v(10);
  v[4] = "foo";
  v.back() = "bar";

  std::cerr << &v << " (" << &v[4] << "): " << v[4] << '\n';
  std::cerr << "bye" << v.size() << "\n";
}
