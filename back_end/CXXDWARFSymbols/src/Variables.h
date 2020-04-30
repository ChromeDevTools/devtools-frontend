// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef SYMBOL_SERVER_VARIABLES_H_
#define SYMBOL_SERVER_VARIABLES_H_

#include <functional>
#include <memory>
#include "lldb/Symbol/Variable.h"
#include "llvm/ADT/StringRef.h"
#include "llvm/Analysis/CGSCCPassManager.h"
#include "llvm/IR/IRBuilder.h"
#include "llvm/IR/LLVMContext.h"
#include "llvm/IR/Module.h"
#include "llvm/IR/PassManager.h"
#include "llvm/IR/Value.h"
#include "llvm/Support/Error.h"
#include "llvm/Support/ErrorOr.h"
#include "llvm/Transforms/Scalar/LoopPassManager.h"

namespace llvm {
class TargetMachine;
}  // namespace llvm

namespace lldb_private {
class CompilerType;
}  // namespace lldb_private

namespace symbol_server {
enum class WasmAddressSpace { kMemory, kLocal, kGlobal };

struct MemoryLocation {
  std::string type;
  WasmAddressSpace address_space;
  llvm::Value* offset;
};

class VariablePrinter {
 public:
  using StringSlice = std::pair<llvm::Value*, llvm::Value*>;
  VariablePrinter();
  ~VariablePrinter();
  VariablePrinter(const VariablePrinter&) = delete;
  VariablePrinter(VariablePrinter&&) = delete;

  llvm::Expected<std::unique_ptr<llvm::Module>> GenerateModule(
      llvm::StringRef variable_name,
      lldb::VariableSP variable);
  std::unique_ptr<llvm::MemoryBuffer> GenerateCode(llvm::Module* m);

 private:
  std::unique_ptr<llvm::Module> LoadRuntimeModule();

  llvm::Expected<StringSlice> FormatVariable(
      llvm::IRBuilder<>* builder,
      llvm::Value* buffer,
      llvm::Value* size,
      llvm::StringRef name,
      const lldb_private::CompilerType& variable_type,
      const MemoryLocation& variable);
  llvm::Expected<StringSlice> FormatPrimitive(
      llvm::IRBuilder<>* builder,
      llvm::Value* buffer,
      llvm::Value* size,
      llvm::StringRef name,
      const lldb_private::CompilerType& variable_type,
      const MemoryLocation& variable);
  llvm::Expected<StringSlice> FormatAggregate(
      llvm::IRBuilder<>* builder,
      llvm::Value* buffer,
      llvm::Value* size,
      llvm::StringRef name,
      const lldb_private::CompilerType& variable_type,
      const MemoryLocation& variable);
  llvm::Expected<StringSlice> FormatArray(
      llvm::IRBuilder<>* builder,
      llvm::Value* buffer,
      llvm::Value* size,
      llvm::StringRef name,
      const lldb_private::CompilerType& element_type,
      const MemoryLocation& variable,
      uint64_t array_size,
      bool incomplete);

  llvm::LLVMContext main_context_;
  std::map<llvm::StringRef, std::function<llvm::FunctionCallee(llvm::Module*)>>
      primitive_formatters_;
  std::unique_ptr<llvm::TargetMachine> wasm_target_machine_;

  llvm::ModulePassManager optimizer_;
  llvm::LoopAnalysisManager loop_analyses_;
  llvm::FunctionAnalysisManager function_analyses_;
  llvm::CGSCCAnalysisManager cgscc_analyses_;
  llvm::ModuleAnalysisManager module_analyses_;
};
}  // namespace symbol_server

#endif  // SYMBOL_SERVER_VARIABLES_H_
