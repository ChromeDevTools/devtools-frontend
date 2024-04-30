// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "Variables.h"

#include "lldb/Utility/DataExtractor.h"
#include "llvm/ADT/Optional.h"
#include "llvm/BinaryFormat/Dwarf.h"
#include "llvm/Support/Error.h"
#include "llvm/Support/raw_ostream.h"

#include <algorithm>
#include <cassert>
#include <cstddef>
#include <cstdint>
#include <memory>
#include <utility>

namespace symbols_backend {
namespace {
template <typename T>
llvm::Expected<T> ChainErrors(llvm::Expected<T>&& value,
                              llvm::Optional<llvm::Error>&& error) {
  if (!error || value) {
    if (error) {
      llvm::consumeError(std::move(*error));
    }
    return std::move(value);
  }
  return joinErrors(value.takeError(), std::move(*error));
}
}  // namespace

static lldb_private::CompilerType BaseType(lldb_private::CompilerType t) {
  while (t.IsTypedefType()) {
    t = t.GetTypedefedType();
  }
  return t;
}

static void CreateMemberInfo(llvm::SmallVectorImpl<SubObjectInfo>& members,
                             lldb_private::CompilerType type) {
  type = BaseType(type);

  for (size_t base_class = 0, e = type.GetNumDirectBaseClasses();
       base_class < e; ++base_class) {
    CreateMemberInfo(members,
                     type.GetDirectBaseClassAtIndex(base_class, nullptr));
  }

  for (size_t base_class = 0, e = type.GetNumVirtualBaseClasses();
       base_class < e; ++base_class) {
    CreateMemberInfo(members,
                     type.GetVirtualBaseClassAtIndex(base_class, nullptr));
  }

  for (size_t child = 0, e = type.GetNumFields(); child < e; ++child) {
    std::string child_name;
    uint64_t bit_offset;
    auto child_type =
        type.GetFieldAtIndex(child, child_name, &bit_offset, nullptr, nullptr);
    assert(bit_offset % 8 == 0 && "Expecting fields to be byte-aligned");
    if (child_name.empty()) {
      // TODO(pfaffe) Are unions truly the only case here?
      child_name = "<union>";
    }
    members.emplace_back(child_name, bit_offset / 8, child_type);
  }
}

/*static */ llvm::SmallVector<SubObjectInfo, 1> SubObjectInfo::GetMembers(
    lldb_private::CompilerType type) {
  type = BaseType(type);

  lldb_private::CompilerType pointee_type;
  if (type.IsPointerType(&pointee_type)) {
    SubObjectInfo info("*", 0, pointee_type);
    return llvm::SmallVector<SubObjectInfo, 1>{{info}};
  }

  if (type.IsArrayType(&pointee_type, nullptr, nullptr) ||
      type.IsVectorType(&pointee_type, nullptr)) {
    SubObjectInfo info("0", 0, pointee_type);
    return llvm::SmallVector<SubObjectInfo, 1>{{info}};
  }

  if (type.IsReferenceType()) {
    SubObjectInfo info("*", 0, type.GetNonReferenceType());
    return llvm::SmallVector<SubObjectInfo, 1>{{info}};
  }

  if (type.IsAggregateType()) {
    llvm::SmallVector<SubObjectInfo, 1> members;
    CreateMemberInfo(members, type);
    return members;
  }
  return {};
}

}  // namespace symbols_backend
