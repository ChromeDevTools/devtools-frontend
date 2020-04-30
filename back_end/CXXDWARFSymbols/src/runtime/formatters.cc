// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include <errno.h>
#include <stddef.h>
#include <stdint.h>
#include <cstdint>
#include <cstring>
#include <type_traits>
#include <utility>

// NOLINTNEXTLINE
extern "C" void __getMemory(uint32_t offset, uint32_t size, void* result);

namespace {
template <typename T>
class Slice {
 public:
  Slice() : array_(nullptr), length_(0) {}
  Slice(T* array, size_t length) : array_(array), length_(length) {}

  Slice& operator++() {
    if (Empty()) {
      return *this;
    }
    array_++;
    length_--;
    return *this;
  }

  Slice operator++(int) {
    if (Empty()) {
      return *this;
    }
    Slice temp = *this;
    array_++;
    length_--;
    return temp;
  }

  Slice operator-(uint32_t count) {
    if (count >= length_) {
      return {};
    }
    return {array_, length_ - count};
  }

  void Reverse() {
    T* first = array_;
    T* last = array_ + length_ - 1;
    while (first < last) {
      T c = *first;
      *first = *last;
      *last = c;
      ++first;
      --last;
    }
  }

  T& operator[](uint32_t idx) { return array_[idx]; }
  T& operator*() { return *array_; }
  T* begin() const { return array_; }          // NOLINT
  T* end() const { return array_ + length_; }  // NOLINT
  size_t Length() const { return length_; }
  bool Empty() const { return length_ == 0; }

 private:
  T* array_;
  size_t length_;
};

using StringSlice = Slice<char>;
using ConstStringSlice = Slice<const char>;

template <typename T>
ConstStringSlice GetTypename();
#define IMPLEMENT_TYPENAME(T)         \
  template <>                         \
  ConstStringSlice GetTypename<T>() { \
    return {#T, sizeof(#T) - 1};      \
  }

IMPLEMENT_TYPENAME(int64_t)
IMPLEMENT_TYPENAME(int32_t)
IMPLEMENT_TYPENAME(int8_t)
IMPLEMENT_TYPENAME(const char*)

template <typename T>
struct Value {
  explicit Value(T* value) : val(value) {}
  void EmitInto(StringSlice* output) const;

  T* val;
};

void EmitValueInto(Value<const char*> v, StringSlice* output) {
  StringSlice& output_slice = *output;
  // Copy the string in Input into Output, including the null-termintor.
  // Output points to the null-terminator when this function returns.
  for (const char* c = *v.val;; ++c) {
    if (output_slice.Empty()) {
      output_slice = {};
      return;  // ENOSPC;
    }
    __getMemory(static_cast<uint32_t>(reinterpret_cast<intptr_t>(c)), 1,
                output_slice.begin());
    if (*output_slice.begin() == 0) {
      break;
    }
    ++output_slice;
  }
}

// Print integer values to string.
template <typename T,
          typename = std::enable_if_t<!std::is_pointer<T>::value &&
                                      std::is_integral<T>::value>>
void EmitValueInto(Value<T> v, StringSlice* output) {
  StringSlice& output_slice = *output;
  if (output_slice.Empty()) {
    return;  // ENOSPC;
  }

  T d = *v.val;
  if (d == 0) {  // Input is 0
    output_slice[0] = '0';
    ++output_slice;
    return;
  }

  int neg = d < 0;
  const char* digits = "0123456789";
  StringSlice i = output_slice;
  // Iterate over the decimal digits in the number. Builds the string in reverse
  // and reverses it after the fact.
  while (d != 0 && !i.Empty()) {
    int x = d % 10;  // Get the last digit.
    // If d is negative, every mod result is.
    if (x < 0) {  // Avoid overflow: negate every digit individually.
      x *= -1;
    }
    *i.begin() = digits[x];
    ++i;
    d /= 10;
  }
  if (d != 0 || (neg && i.Empty())) {
    output_slice = {};
    return;  // ENOSPC
  }

  if (neg) {  // If negative, also push a negative sign.
    *i.begin() = '-';
    ++i;
  }
  (output_slice - i.Length()).Reverse();  // Finally reverse the string.
  output_slice = i;
}

template <typename T>
void Value<T>::EmitInto(StringSlice* output) const {
  EmitValueInto(*this, output);
}

class Printer {
 public:
  Printer(char* output, uint32_t size)
      : scratch_pad_(output, size), output_window_(output, size) {}

  uint32_t Length() const {
    return scratch_pad_.Length() - output_window_.Length();
  }
  bool Valid() const { return !output_window_.Empty(); }
  explicit operator bool() const { return Valid(); }

 private:
  StringSlice scratch_pad_;
  StringSlice output_window_;

  friend Printer& operator<<(Printer& p, std::nullptr_t) {
    if (p.Valid()) {
      *p.output_window_ = '\0';
    }
    return p;
  }

  friend Printer& operator<<(Printer& p, const char* msg) {
    for (const char* c = msg; *c != 0; ++c) {
      if (p.output_window_.Empty()) {
        break;
      }
      *p.output_window_.begin() = *c;
      ++p.output_window_;
    }
    return p;
  }

  friend Printer& operator<<(Printer& p, ConstStringSlice msg) {
    for (char c : msg) {
      if (p.output_window_.Empty()) {
        break;
      }
      *p.output_window_.begin() = c;
      ++p.output_window_;
    }
    return p;
  }

  template <typename T>
  friend Printer& operator<<(Printer& p, Value<T> msg) {
    msg.EmitInto(&p.output_window_);
    return p;
  }
};

std::nullptr_t fin = nullptr;

int ErrorOrLen(const Printer& p) {
  if (p.Valid()) {
    return p.Length();
  }
  return -ENOSPC;
}

template <typename T>
int FormatValue(T* value, const char* variable, char* result, uint32_t size) {
  if (size < 2) {
    return -ENOSPC;
  }

  Printer p(result, size);
  p << "{\"type\":\"" << GetTypename<T>() << "\",\"name\":\"" << variable
    << "\",\"value\":\"" << ::Value<T>(value) << "\"}" << fin;

  return ErrorOrLen(p);
}
}  // namespace

extern "C" {
// NOLINTNEXTLINE
uint32_t get_scratch_pad_size(char* scratch_pad_begin, char* scratch_pad_end) {
  if (scratch_pad_begin >= scratch_pad_end ||
      scratch_pad_end == reinterpret_cast<char*>(-1)) {
    return 0;
  }
  return scratch_pad_end - scratch_pad_begin;
}

// NOLINTNEXTLINE
int format_begin_array(const char* variable,
                       const char* type,
                       char* result,
                       uint32_t size) {
  Printer p(result, size);
  p << "{\"type\":\"" << type << "\",\"name\":\"" << variable
    << "\",\"value\":[" << fin;
  return ErrorOrLen(p);
}

// NOLINTNEXTLINE
int format_end_array(char* result, uint32_t size) {
  Printer p(result, size);
  p << "]}" << fin;
  return ErrorOrLen(p);
}

// NOLINTNEXTLINE
int format_sep(char* result, uint32_t size) {
  Printer p(result, size);
  p << "," << fin;
  return ErrorOrLen(p);
}

// NOLINTNEXTLINE
int format_int64_t(int64_t* value,
                   const char* variable,
                   char* result,
                   uint32_t size) {
  return FormatValue(value, variable, result, size);
}

// NOLINTNEXTLINE
int format_int32_t(int32_t* value,
                   const char* variable,
                   char* result,
                   uint32_t size) {
  return FormatValue(value, variable, result, size);
}

// NOLINTNEXTLINE
int format_int(int32_t* value,
               const char* variable,
               char* result,
               uint32_t size) {
  return FormatValue(value, variable, result, size);
}

// NOLINTNEXTLINE
int format_int8_t(int8_t* value,
                  const char* variable,
                  char* result,
                  uint32_t size) {
  return FormatValue(value, variable, result, size);
}

// NOLINTNEXTLINE
int format_string(const char** value,
                  const char* variable,
                  char* result,
                  uint32_t size) {
  return FormatValue(value, variable, result, size);
}
}
