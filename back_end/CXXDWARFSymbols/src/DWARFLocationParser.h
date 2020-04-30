// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef SYMBOL_SERVER_DWARFLOCATIONPARSER_H_
#define SYMBOL_SERVER_DWARFLOCATIONPARSER_H_
#include <map>

#include "lldb/Utility/DataExtractor.h"
#include "lldb/lldb-types.h"
#include "llvm/IR/DerivedTypes.h"
#include "llvm/IR/IRBuilder.h"
#include "llvm/Support/Error.h"

namespace llvm {
class Value;
class Type;
}  // namespace llvm

namespace lldb_private {
class Function;
class DWARFExpression;
}  // namespace lldb_private

namespace symbol_server {
struct DWARFLocationParser {
  enum class ConstSize { kUnknown, kI1, kI16, kI32, kI64 };

  DWARFLocationParser(llvm::IRBuilder<>* builder,
                      llvm::FunctionCallee get_memory_callback,
                      llvm::FunctionCallee get_local_callback,
                      lldb_private::Function* function_context)
      : builder_(builder),
        function_context_(function_context),
        offset_(0),
        get_memory_callback_(get_memory_callback),
        get_local_callback_(get_local_callback) {}

  static llvm::Expected<llvm::Value*> Parse(
      llvm::IRBuilder<>* builder,
      llvm::FunctionCallee get_memory_callback,
      llvm::FunctionCallee get_local_callback,
      lldb_private::Function* function_context,
      const lldb_private::DWARFExpression& expression);

 private:
  llvm::Error ParseAddr();
  llvm::Error ParseFbReg();
  llvm::Error ParseWasmLocation();
  llvm::Error ParseDeref();
  llvm::Error ParseConst(bool is_signed, ConstSize size = ConstSize::kUnknown);
  llvm::Error ParseDup();
  llvm::Error ParseDrop();
  llvm::Error ParseOver();
  llvm::Error ParsePick();
  llvm::Error ParseSwap();
  llvm::Error ParseRot();
  llvm::Error ParseAnd();
  llvm::Error ParseDiv();
  llvm::Error ParseMinus();
  llvm::Error ParseMod();
  llvm::Error ParseMul();
  llvm::Error ParseNeg();
  llvm::Error ParseNot();
  llvm::Error ParseOr();
  llvm::Error ParsePlus();
  llvm::Error ParsePlusUconst();
  llvm::Error ParseShl();
  llvm::Error ParseShr();
  llvm::Error ParseShra();
  llvm::Error ParseXor();
  llvm::Error ParseSkip();
  llvm::Error ParseLit(uint8_t lit);
  llvm::Error ParseReg(uint8_t reg);
  llvm::Error ParseRegx();
  llvm::Error ParseBreg(uint8_t reg);
  llvm::Error ParseBregx();
  llvm::Error ParseNop();
  llvm::Error ParsePiece();
  llvm::Error ParseBitPiece();
  llvm::Error ParseStackValue();

  llvm::Error ParseOpcode(uint8_t opcode);
  llvm::Expected<llvm::Value*> ConsumeOpcodes();

  llvm::Value* LoadFromLocal(llvm::Value* local, llvm::Type* result_type);
  llvm::Value* LoadFromMemory(llvm::Value* address, llvm::Type* result_type);
  llvm::Value* GetScratchpad(llvm::Type* element_type);

  std::map<llvm::Type*, llvm::Value*> scratchpads_;
  llvm::SmallVector<llvm::Value*, 1> operand_stack_;
  llvm::IRBuilder<>* builder_;
  lldb_private::Function* function_context_;
  lldb_private::DataExtractor opcodes_;
  lldb::offset_t offset_;

  llvm::FunctionCallee get_memory_callback_, get_local_callback_;
};

}  // namespace symbol_server

#endif  //  SYMBOL_SERVER_DWARFLOCATIONPARSER_H_
