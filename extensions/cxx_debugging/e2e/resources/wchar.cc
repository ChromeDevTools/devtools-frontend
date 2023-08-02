// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include <iostream>
#include <string>

int main() {
  const wchar_t* c_str = L"abcde";
  std::wstring cxx_str = c_str;
  std::wstring short_cxx_str = L"a";

  const char16_t* u16_c_str = u"abcde";
  std::u16string u16_cxx_str = u"abcde";
  std::u16string u16_short_cxx_str = u"a";

  const char32_t* u32_c_str = U"abcde";
  std::u32string u32_cxx_str = U"abcde";
  std::u32string u32_short_cxx_str = U"a";

  std::wcout << c_str << '\n' << cxx_str << '\n' << short_cxx_str << '\n';
}
