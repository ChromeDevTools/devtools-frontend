// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef SYMBOL_SERVER_INDEXEDITERATOR_H_
#define SYMBOL_SERVER_INDEXEDITERATOR_H_

#include <cstddef>

#include "lldb/Core/Module.h"
#include "lldb/Symbol/VariableList.h"
#include "lldb/Utility/FileSpec.h"
#include "llvm/ADT/iterator.h"

namespace lldb_private {
template <typename ContainerT>
struct index_traits {                                          // NOLINT
  static size_t size(ContainerT& C) { return C.size(); }       // NOLINT
  static auto at(ContainerT& C, size_t N) { return C.at(N); }  // NOLINT
};

template <typename ContainerT>
class indexed_iterator {                             // NOLINT
  using container_t = ContainerT;                    // NOLINT
  using iterator_t = indexed_iterator<container_t>;  // NOLINT

 public:
  indexed_iterator(size_t index, container_t* container)
      : index_(index), container_(container) {}
  auto operator*() {
    return index_traits<container_t>::at(*container_, index_);
  }
  auto operator->() {
    return &index_traits<container_t>::at(*container_, index_);
  }

  bool operator<(const iterator_t& o) { return index_ < o.index_; }
  bool operator>(const iterator_t& o) { return index_ > o.index_; }
  bool operator==(const iterator_t& o) { return index_ == o.index_; }
  bool operator!=(const iterator_t& o) { return index_ != o.index_; }

  iterator_t operator+=(size_t n) {
    size_t prev = index_;
    index_ += n;
    if (index_ < prev ||
        index_ > index_traits<container_t>::size(*container_)) {
      index_ = index_traits<container_t>::size(*container_);
    }
    return *this;
  }
  iterator_t operator-=(size_t n) {
    size_t prev = index_;
    index_ -= n;
    if (index_ > prev) {
      index_ = 0;
    }
    return *this;
  }
  iterator_t operator++() { return *this += 1; }
  iterator_t operator--() { return *this -= 1; }
  iterator_t operator++(int) {
    iterator_t r = *this;
    *this += 1;
    return r;
  }
  iterator_t operator--(int) {
    iterator_t r = *this;
    *this -= 1;
    return r;
  }
  friend iterator_t operator+(size_t n, iterator_t i) { return i += n; }
  friend iterator_t operator-(size_t n, iterator_t i) { return i -= n; }

 private:
  size_t index_;
  container_t* container_;
};

template <typename ContainerT>
auto Indexed(ContainerT& c) {
  return llvm::iterator_range<indexed_iterator<ContainerT>>{
      {0, &c}, {index_traits<ContainerT>::size(c), &c}};
}

#define INDEX_TRAITS(T)                                              \
  template <>                                                        \
  size_t index_traits<const T##List>::size(const T##List& C) {       \
    return C.GetSize();                                              \
  }                                                                  \
  template <>                                                        \
  auto index_traits<const T##List>::at(const T##List& C, size_t N) { \
    return C.Get##T##AtIndex(N);                                     \
  }                                                                  \
  template <>                                                        \
  size_t index_traits<T##List>::size(T##List& C) {                   \
    return C.GetSize();                                              \
  }                                                                  \
  template <>                                                        \
  auto index_traits<T##List>::at(T##List& C, size_t N) {             \
    return C.Get##T##AtIndex(N);                                     \
  }

template <>  // NOLINTNEXTLINE
size_t index_traits<lldb_private::Module>::size(lldb_private::Module& c) {
  return c.GetNumCompileUnits();
}
template <>  // NOLINTNEXTLINE
auto index_traits<lldb_private::Module>::at(lldb_private::Module& c, size_t n) {
  return c.GetCompileUnitAtIndex(n);
}

INDEX_TRAITS(FileSpec);
INDEX_TRAITS(Variable);
}  // namespace lldb_private

#endif  // SYMBOL_SERVER_INDEXEDITERATOR_H_
