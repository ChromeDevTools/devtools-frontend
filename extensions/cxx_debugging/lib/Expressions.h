// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef EXTENSIONS_CXX_DEBUGGING_EXPRESSIONS_H_
#define EXTENSIONS_CXX_DEBUGGING_EXPRESSIONS_H_

#include "lldb/Symbol/CompilerType.h"
#include "llvm/ADT/StringRef.h"
#include "llvm/Support/Error.h"
#include "llvm/Support/raw_ostream.h"

#include <variant>

namespace symbols_backend {
namespace api {
class DebuggerProxy;
}
class WasmModule;

struct ExpressionResult {
  lldb_private::CompilerType type;
  std::variant<std::monostate,
               bool,
               int8_t,
               uint8_t,
               int16_t,
               uint16_t,
               int32_t,
               uint32_t,
               int64_t,
               uint64_t,
               float,
               double,
               void*,
               std::nullptr_t>
      value;
  llvm::Optional<size_t> address;
};

llvm::Expected<ExpressionResult> InterpretExpression(
    const WasmModule& module,
    lldb_private::TypeSystem& type_system,
    lldb_private::SymbolContext& sc,
    size_t frame_offset,
    size_t inline_frame_index,
    lldb_private::Address addr,
    llvm::StringRef expression,
    const api::DebuggerProxy& proxy);

}  // namespace symbols_backend

#endif  // EXTENSIONS_CXX_DEBUGGING_EXPRESSIONS_H_
