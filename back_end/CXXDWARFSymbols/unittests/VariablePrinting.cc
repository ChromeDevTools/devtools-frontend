// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "gtest/gtest.h"

#include <cstdint>
#include <cstring>
#include <limits>
#include <string>

#include "runtime/formatters.cc"

thread_local static intptr_t offset_base = 0;

extern "C" {
void __getMemory(uint32_t offset, uint32_t size, void* result) {  // NOLINT
  auto address = reinterpret_cast<char*>(offset_base + offset);
  memcpy(result, address, size);
}
void __debug(uint32_t, uint32_t) {  // NOLINT
}
}

namespace {
template <typename T>
T* FixPointerValues(T* value) {
  offset_base = 0xFFFFFFFF00000000 & reinterpret_cast<intptr_t>(value);
  return reinterpret_cast<T*>(0xFFFFFFFF & reinterpret_cast<intptr_t>(value));
}

template <typename T>
T FixPointerValues(T value) {
  return value;
}

template <size_t size, typename T>
static std::string Emit(T value) {
  char result[size];

  value = FixPointerValues(value);

  Printer p(result, size);
  p << ::Value<T>(&value);

  if (!p.Valid() || p.Length() == size) {
    return "";
  }
  return {result, result + p.Length()};
}

template <uint32_t size, typename T, typename CallableT>
std::string Format(T value, const char* variable, CallableT&& c) {
  char result[size];
  char* cur = result;
  value = FixPointerValues(value);
  auto r = c(&value, variable, cur, size);
  if (r <= 0) {
    return "";
  }
  return std::string(result, r);
}
}  // namespace

template <typename T>
class SymbolServerRuntimeIntegers : public ::testing::Test {};
using SymbolServerIntegerTypes = ::testing::Types<int64_t, int32_t, int8_t>;
TYPED_TEST_CASE(SymbolServerRuntimeIntegers, SymbolServerIntegerTypes);

TYPED_TEST(SymbolServerRuntimeIntegers, EmitInteger) {
  TypeParam value = 7;
  ASSERT_EQ((Emit<8, TypeParam>(value)), "7");

  value = 10;
  ASSERT_EQ((Emit<8, TypeParam>(value)), "10");

  value = -10;
  ASSERT_EQ((Emit<8, TypeParam>(value)), "-10");

  value = 100;
  ASSERT_EQ((Emit<2, TypeParam>(value)), "");

  value = 0;
  ASSERT_EQ((Emit<8, TypeParam>(value)), "0");

  value = std::numeric_limits<TypeParam>::max();
  ASSERT_EQ((Emit<64, TypeParam>(value)),
            std::to_string(std::numeric_limits<TypeParam>::max()));

  value = std::numeric_limits<TypeParam>::min();
  ASSERT_EQ((Emit<64, TypeParam>(value)),
            std::to_string(std::numeric_limits<TypeParam>::min()));
}

TEST(SymbolServerRuntime, TypeName) {
  ConstStringSlice t = GetTypename<int>();
  std::string tn = {t.begin(), t.end()};
  ASSERT_EQ(tn, "int32_t");
}

TEST(SymbolServerRuntime, FormattingNullTerminated) {
  char result[64];
  char* cur = result;
  int value = 7;
  auto r = format_int(&value, "Value", cur, 64);
  ASSERT_GT(r, 0);
  ASSERT_LT(r, 64);
  ASSERT_EQ(result[r], '\0');
}

TEST(SymbolServerRuntime, FormatInt64) {
  int64_t value = 7;
  ASSERT_EQ(Format<64>(value, "Value", format_int64_t),
            "{\"type\":\"int64_t\",\"name\":\"Value\",\"value\":\"7\"}");
}

TEST(SymbolServerRuntime, FormatInt32) {
  int32_t value = 7;
  ASSERT_EQ(Format<64>(value, "Value", format_int32_t),
            "{\"type\":\"int32_t\",\"name\":\"Value\",\"value\":\"7\"}");
}

TEST(SymbolServerRuntime, FormatInt8) {
  int8_t value = 7;
  ASSERT_EQ(Format<64>(value, "Value", format_int8_t),
            "{\"type\":\"int8_t\",\"name\":\"Value\",\"value\":\"7\"}");
}

TEST(SymbolServerRuntime, EmitString) {
  const char* value = "abc";
  ASSERT_EQ(Emit<4>(value), "abc");
  value = "";
  ASSERT_EQ(Emit<4>(value), "");
  value = "abcdefg";
  ASSERT_EQ(Emit<4>(value), "");
  std::string heap_value =
      "abc";  // hackishly attempt to get a value with a high address
  ASSERT_EQ(Emit<4>(heap_value.c_str()), "abc");
}

TEST(SymbolServerRuntime, FormatString) {
  const char* value = "abc";
  ASSERT_EQ(Format<64>(value, "Value", format_string),
            "{\"type\":\"const char*\",\"name\":\"Value\",\"value\":\"abc\"}");
}

TEST(SymbolServerRuntime, FormatArray) {
  char result[512];
  char* cur = result;
  int size = sizeof(result);
  int n = format_begin_array("A", "int32_t [4]", cur, size);
  ASSERT_GT(n, 0);
  ASSERT_LT(n, size);
  size -= n;
  cur += n;
  for (int element = 0; element < 4; ++element) {
    if (element > 0) {
      n = format_sep(cur, size);
      ASSERT_GT(n, 0);
      ASSERT_LT(n, size);
      size -= n;
      cur += n;
    }
    std::string name = "[" + std::to_string(element) + "]";
    n = format_int(&element, name.c_str(), cur, size);
    ASSERT_GT(n, 0);
    ASSERT_LT(n, size);
    size -= n;
    cur += n;
  }
  n = format_end_array(cur, size);
  ASSERT_GT(n, 0);
  ASSERT_LT(n, size);
  std::string expect =
      "{\"type\":\"int32_t "
      "[4]\",\"name\":\"A\",\"value\":[{\"type\":\"int32_t\",\"name\":\"[0]\","
      "\"value\":\"0\"},{\"type\":\"int32_t\",\"name\":\"[1]\",\"value\":\"1\"}"
      ",{"
      "\"type\":\"int32_t\",\"name\":\"[2]\",\"value\":\"2\"},{\"type\":"
      "\"int32_t\","
      "\"name\":\"[3]\",\"value\":\"3\"}]}";
  ASSERT_EQ(std::string(result), expect);
}
