// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef EXTENSIONS_CXX_DEBUGGING_API_CONTEXT_H_
#define EXTENSIONS_CXX_DEBUGGING_API_CONTEXT_H_

#include "api.h"

#include "emscripten/val.h"
#include "lldb/lldb-types.h"
#include "llvm/ADT/Optional.h"
#include "llvm/ADT/StringMap.h"
#include "llvm/ADT/StringRef.h"
#include "llvm/BinaryFormat/Wasm.h"
#include "llvm/Support/Error.h"
#include "llvm/Support/JSON.h"

#include <cstdint>
#include <memory>
#include <string>
#include <variant>
#include <vector>

namespace lldb_private {
class CompilerType;
}

namespace symbols_backend {
class WasmModule;
class SubObjectInfo;
namespace api {

class DebuggerProxy {
  const emscripten::val& proxy_;

 public:
  struct WasmValue {
    llvm::wasm::ValType type;
    std::variant<int32_t, int64_t, float, double> value;
  };

  explicit DebuggerProxy(const emscripten::val& proxy) : proxy_(proxy) {}
  llvm::Expected<size_t> ReadMemory(lldb::addr_t address,
                                    void* buffer,
                                    size_t size) const;
  llvm::Expected<WasmValue> GetGlobal(size_t index) const;
  llvm::Expected<WasmValue> GetLocal(size_t index) const;
  llvm::Expected<WasmValue> GetOperand(size_t index) const;
};

class ApiContext : public DWARFSymbolsApi {
 public:
  AddRawModuleResponse AddRawModule(std::string raw_module_id,
                                    std::string path) final;

  void RemoveRawModule(std::string raw_module_id) final;

  SourceLocationToRawLocationResponse SourceLocationToRawLocation(
      std::string raw_module_id,
      std::string source_file,
      int32_t line_number,
      int32_t column_number) final;

  RawLocationToSourceLocationResponse RawLocationToSourceLocation(
      std::string raw_module_id,
      int32_t code_offset,
      int32_t inline_frame_index) final;

  ListVariablesInScopeResponse ListVariablesInScope(
      std::string raw_module_id,
      int32_t code_offset,
      int32_t inline_frame_index) final;

  GetFunctionInfoResponse GetFunctionInfo(std::string raw_module_id,
                                          int32_t code_offset) override;

  GetInlinedFunctionRangesResponse GetInlinedFunctionRanges(
      std::string raw_module_id,
      int32_t code_offset) override;

  GetInlinedCalleesRangesResponse GetInlinedCalleesRanges(
      std::string raw_module_id,
      int32_t code_offset) override;

  GetMappedLinesResponse GetMappedLines(std::string raw_module_id,
                                        std::string source_file_url) override;

  EvaluateExpressionResponse EvaluateExpression(
      RawLocation location,
      std::string expression,
      emscripten::val debug_proxy) final;

 private:
  llvm::StringMap<std::shared_ptr<WasmModule>> modules_;
  llvm::StringMap<lldb_private::CompilerType> types_;

  std::shared_ptr<WasmModule> AddModule(llvm::StringRef id,
                                        llvm::StringRef path);
  std::shared_ptr<WasmModule> FindModule(llvm::StringRef id) const;
  void DeleteModule(llvm::StringRef id);

  api::TypeInfo GetApiTypeInfo(
      lldb_private::CompilerType type,
      const llvm::SmallVectorImpl<SubObjectInfo>& member_info);
  llvm::Expected<std::vector<api::TypeInfo>> GetApiTypeInfos(
      lldb_private::CompilerType type,
      int32_t required_type_depth);
  std::string GetTypeId(lldb_private::CompilerType type);
  llvm::Optional<lldb_private::CompilerType> GetTypeFromId(
      llvm::StringRef type_id);

  friend struct EvalVisitor;
};

}  // namespace api
}  // namespace symbols_backend

#endif  // EXTENSIONS_CXX_DEBUGGING_API_CONTEXT_H_
