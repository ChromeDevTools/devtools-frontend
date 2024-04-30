// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include <iostream>
#include <string>

struct MyStringView {
  explicit MyStringView(const std::string& s)
      : the_string_(s), begin_(0), end_(s.size()) {}
  MyStringView(const std::string& s, size_t begin, size_t length)
      : the_string_(s), begin_(begin), end_(begin + length) {}

  // NOLINTNEXTLINE
  auto begin() const { return the_string_.begin() + begin_; }
  // NOLINTNEXTLINE
  auto end() const { return the_string_.begin() + end_; }
  // NOLINTNEXTLINE
  auto str() const { return the_string_.substr(begin_, end_ - begin_); }
  // NOLINTNEXTLINE
  auto size() const { return end_ - begin_; }

 private:
  // const std::string& the_string_;
  const std::string& the_string_;
  const size_t begin_, end_;
};

std::ostream& operator<<(std::ostream& o, const MyStringView& v) {
  return o << v.str();
}

int main() {
  std::string my_string = "Hello World!";
  MyStringView full_view(my_string);
  std::cout << "Full string: " << full_view << " (size=" << full_view.size()
            << ")\n";
  MyStringView hello(my_string, 0, 6);
  std::cout << "Hello string: " << hello << " (size=" << hello.size() << ")\n";
}
