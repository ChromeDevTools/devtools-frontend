// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef EXTENSIONS_CXX_DEBUGGING_VARIABLES_H_
#define EXTENSIONS_CXX_DEBUGGING_VARIABLES_H_

#include "lldb/Symbol/CompilerType.h"
#include "llvm/ADT/SmallVector.h"
#include "llvm/ADT/StringRef.h"

#include <cstdint>
#include <string>

namespace lldb_private {
class Function;
}  // namespace lldb_private

namespace symbols_backend {

class ObjectInfoBase {
 public:
  bool IsSubObject() const { return is_subobject_; }

  bool IsArray() const { return type_.IsArrayType(nullptr, nullptr, nullptr); }

  bool IsPointer() const { return type_.IsPointerType(); }
  bool IsReference() const { return type_.IsReferenceType(); }

  bool HasInner() const {
    return IsArray() || IsPointer() || IsReference() || type_.IsAggregateType();
  }

  lldb_private::CompilerType Type() const { return type_; }

 protected:
  ObjectInfoBase(bool is_subobject, lldb_private::CompilerType type)
      : is_subobject_(is_subobject), type_(type) {}
  bool is_subobject_;
  lldb_private::CompilerType type_;
};

class SubObjectInfo : public ObjectInfoBase {
 public:
  static llvm::SmallVector<SubObjectInfo, 1> GetMembers(
      lldb_private::CompilerType type);

  SubObjectInfo(llvm::StringRef name,
                uint64_t offset_in_parent,
                lldb_private::CompilerType type)
      : ObjectInfoBase(true, type),
        identifier_(name),
        offset_(offset_in_parent) {}
  llvm::StringRef MemberName() const { return identifier_; }

  uint64_t OffsetInParent() const { return offset_; }

 protected:
  std::string identifier_;
  uint64_t offset_;
};

}  // namespace symbols_backend

#endif  // EXTENSIONS_CXX_DEBUGGING_VARIABLES_H_
