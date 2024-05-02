// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef EXTENSIONS_CXX_DEBUGGING_WASM_MODULE_H_
#define EXTENSIONS_CXX_DEBUGGING_WASM_MODULE_H_
#include "lldb/lldb-enumerations.h"
#include "lldb/lldb-forward.h"
#include "lldb/lldb-types.h"
#include "llvm/ADT/SmallSet.h"
#include "llvm/ADT/SmallVector.h"
#include "llvm/ADT/StringRef.h"
#include "llvm/Support/Error.h"

#include <cstdint>
#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace symbols_backend {
namespace api {
class DebuggerProxy;
}
class ObjectInfo;

struct SourceLocation {
  SourceLocation(llvm::StringRef file, uint32_t line, uint16_t column)
      : file(file), line(line), column(column) {}

  std::string file;
  uint32_t line;
  uint16_t column;

  friend bool operator==(const SourceLocation&, const SourceLocation&);
};

struct Variable {
  Variable(llvm::StringRef name, lldb::ValueType scope, llvm::StringRef type)
      : name(name), scope(scope), type(type) {}

  std::string name;
  lldb::ValueType scope;
  std::string type;

  friend bool operator==(const Variable&, const Variable&);
};

struct FunctionInfo {
  FunctionInfo(llvm::SmallVector<std::string, 1> names,
               llvm::SmallVector<std::string, 2> missing_symbols)
      : names(names), missing_symbols(missing_symbols) {}

  llvm::SmallVector<std::string, 1> names;
  llvm::SmallVector<std::string, 2> missing_symbols;
};

struct SourceInfo {
  SourceInfo(llvm::SmallSet<std::string, 1> sources,
             llvm::SmallSet<std::string, 1> dwos)
      : sources(sources), dwos(dwos) {}

  llvm::SmallSet<std::string, 1> sources;
  llvm::SmallSet<std::string, 1> dwos;
};

struct ExpressionResult;
class WasmModule {
  lldb::ModuleSP module_;
  lldb::TargetSP target_;
  explicit WasmModule(lldb::TargetSP target, lldb::ModuleSP module)
      : module_(module), target_(target) {}

 public:
  ~WasmModule(){};
  WasmModule(const WasmModule&) = delete;
  WasmModule& operator=(const WasmModule&) = delete;
  WasmModule(WasmModule&&) = default;
  WasmModule& operator=(WasmModule&&) = default;

  static llvm::Expected<std::unique_ptr<WasmModule>> CreateFromFile(
      llvm::StringRef path);

  bool Valid() const;

  lldb_private::Module* Module() const { return module_.get(); }
  lldb_private::Target* Target() const { return target_.get(); }

  SourceInfo GetSourceScripts() const;
  llvm::SmallSet<SourceLocation, 1> GetSourceLocationFromOffset(
      lldb::addr_t offset,
      int inline_frame_index) const;
  llvm::SmallSet<std::pair<lldb::addr_t, lldb::addr_t>, 1>
  GetOffsetFromSourceLocation(const SourceLocation& source_loc) const;
  std::set<Variable> GetVariablesInScope(lldb::addr_t offset,
                                         int inline_frame_index) const;
  FunctionInfo GetFunctionInfo(lldb::addr_t offset) const;
  // Returns inline function address ranges for the inline function containing
  // offset, or an empty set if offset is not in an inline function. Used for
  // stepping out of inline functions.
  llvm::SmallSet<std::pair<lldb::addr_t, lldb::addr_t>, 1>
  GetInlineFunctionAddressRanges(lldb::addr_t offset) const;
  // Returns address ranges for any inline function calls made by the function
  // or inline function containing offset. Used for stepping over inline
  // functions.
  llvm::SmallSet<std::pair<lldb::addr_t, lldb::addr_t>, 1>
  GetChildInlineFunctionAddressRanges(lldb::addr_t offset) const;

  std::vector<int32_t> GetMappedLines(llvm::StringRef file) const;

  lldb::VariableSP FindVariableAtOffset(lldb::addr_t offset,
                                        int inline_frame_index,
                                        llvm::StringRef name) const;
  llvm::Optional<lldb_private::CompilerType> FindType(
      llvm::StringRef name) const;

  llvm::Expected<ExpressionResult> InterpretExpression(
      lldb::addr_t frame_offset,
      uint32_t inline_frame_index,
      llvm::StringRef expression,
      const api::DebuggerProxy& proxy) const;
};

}  // namespace symbols_backend

#endif  // EXTENSIONS_CXX_DEBUGGING_WASM_MODULE_H_
