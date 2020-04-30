// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "DWARFLocationParser.h"

#include "lldb/Core/dwarf.h"
#include "lldb/Expression/DWARFExpression.h"
#include "lldb/Symbol/Function.h"
#include "llvm/IR/Constants.h"
#include "llvm/Support/Error.h"

#define DEBUG_TYPE "symbol_server"

#define CHECK_STACK(Opcode, Size)                                       \
  if (operand_stack_.size() != (Size))                                  \
    return llvm::createStringError(                                     \
        llvm::inconvertibleErrorCode(),                                 \
        "Expression stack needs at least %d items for DWARF opcode %s", \
        (Size), ToString(Opcode));

namespace {
const char* ToString(uint8_t opcode) {
  switch (opcode) {
#define HANDLE_DW_OP(Op, Name, N, Type) \
  case Op:                              \
    return #Name;
#include "llvm/BinaryFormat/Dwarf.def"
#undef HANDLE_DW_OP
  }
  return "UNKNOWN OPCODE";
}

llvm::Error NotImplemented() {
  return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                 "Opcode not Implemented");
}

llvm::Error NotWasmCompatible() {
  return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                 "Opcode is not supported for WebAssembly");
}
}  // namespace

llvm::Error symbol_server::DWARFLocationParser::ParseAddr() {
  uint64_t address = opcodes_.GetAddress(&offset_);
  operand_stack_.push_back(builder_->getInt32(address));
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseDeref() {
  CHECK_STACK(DW_OP_deref, 1);
  llvm::Value* address = operand_stack_.pop_back_val();
  operand_stack_.push_back(LoadFromMemory(address, builder_->getInt32Ty()));
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseConst(bool is_signed,
                                                           ConstSize size) {
  switch (size) {
    case ConstSize::kI1:
      operand_stack_.push_back(builder_->getInt8(opcodes_.GetU8(&offset_)));
      break;
    case ConstSize::kI16:
      operand_stack_.push_back(builder_->getInt16(opcodes_.GetU16(&offset_)));
      break;
    case ConstSize::kI32:
      operand_stack_.push_back(builder_->getInt32(opcodes_.GetU32(&offset_)));
      break;
    case ConstSize::kI64:
      operand_stack_.push_back(builder_->getInt64(opcodes_.GetU64(&offset_)));
      break;
    case ConstSize::kUnknown:
      if (is_signed) {
        operand_stack_.push_back(
            builder_->getInt64(opcodes_.GetULEB128(&offset_)));
      } else {
        operand_stack_.push_back(
            builder_->getInt64(opcodes_.GetSLEB128(&offset_)));
      }
      break;
  }
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseDup() {
  CHECK_STACK(DW_OP_dup, 1);
  operand_stack_.push_back(operand_stack_.back());
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseDrop() {
  CHECK_STACK(DW_OP_drop, 1);
  operand_stack_.pop_back();
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseOver() {
  CHECK_STACK(DW_OP_over, 2);
  operand_stack_.push_back(operand_stack_[operand_stack_.size() - 2]);
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParsePick() {
  uint8_t index = opcodes_.GetU8(&offset_);
  CHECK_STACK(DW_OP_pick, index);
  operand_stack_.push_back(operand_stack_[operand_stack_.size() - 1 - index]);
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseSwap() {
  CHECK_STACK(DW_OP_swap, 2);
  std::swap(operand_stack_.back(), operand_stack_[operand_stack_.size() - 2]);
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseRot() {
  CHECK_STACK(DW_OP_rot, 3);
  std::swap(operand_stack_.back(), operand_stack_[operand_stack_.size() - 3]);
  std::swap(operand_stack_.back(), operand_stack_[operand_stack_.size() - 2]);
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseAnd() {
  CHECK_STACK(DW_OP_and, 2);
  llvm::Value* a = operand_stack_.pop_back_val();
  llvm::Value* b = operand_stack_.pop_back_val();
  operand_stack_.push_back(builder_->CreateAnd(a, b));
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseDiv() {
  CHECK_STACK(DW_OP_div, 2);
  llvm::Value* top = operand_stack_.pop_back_val();
  llvm::Value* second = operand_stack_.pop_back_val();
  operand_stack_.push_back(builder_->CreateSDiv(second, top));
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseMinus() {
  CHECK_STACK(DW_OP_minus, 2);
  llvm::Value* top = operand_stack_.pop_back_val();
  llvm::Value* second = operand_stack_.pop_back_val();
  operand_stack_.push_back(builder_->CreateSub(second, top));
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseMod() {
  CHECK_STACK(DW_OP_mod, 2);
  llvm::Value* top = operand_stack_.pop_back_val();
  llvm::Value* second = operand_stack_.pop_back_val();
  operand_stack_.push_back(builder_->CreateSRem(second, top));
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseMul() {
  CHECK_STACK(DW_OP_mul, 2);
  llvm::Value* a = operand_stack_.pop_back_val();
  llvm::Value* b = operand_stack_.pop_back_val();
  operand_stack_.push_back(builder_->CreateMul(a, b));
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseNeg() {
  CHECK_STACK(DW_OP_neg, 1);
  llvm::Value* a = operand_stack_.pop_back_val();
  operand_stack_.push_back(builder_->CreateNeg(a));
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseNot() {
  CHECK_STACK(DW_OP_not, 1);
  llvm::Value* a = operand_stack_.pop_back_val();
  operand_stack_.push_back(builder_->CreateNeg(a));
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseOr() {
  CHECK_STACK(DW_OP_or, 2);
  llvm::Value* a = operand_stack_.pop_back_val();
  llvm::Value* b = operand_stack_.pop_back_val();
  operand_stack_.push_back(builder_->CreateOr(a, b));
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParsePlus() {
  CHECK_STACK(DW_OP_plus, 2);
  llvm::Value* a = operand_stack_.pop_back_val();
  llvm::Value* b = operand_stack_.pop_back_val();
  operand_stack_.push_back(builder_->CreateAdd(a, b));
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParsePlusUconst() {
  CHECK_STACK(DW_OP_plus_uconst, 1);
  llvm::Value* a = operand_stack_.pop_back_val();
  llvm::Value* b = builder_->getInt64(opcodes_.GetULEB128(&offset_));
  operand_stack_.push_back(
      builder_->CreateAdd(a, builder_->CreateIntCast(b, a->getType(), false)));
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseShl() {
  CHECK_STACK(DW_OP_shl, 2);
  llvm::Value* top = operand_stack_.pop_back_val();
  llvm::Value* second = operand_stack_.pop_back_val();
  operand_stack_.push_back(builder_->CreateShl(second, top));
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseShr() {
  CHECK_STACK(DW_OP_shr, 2);
  llvm::Value* top = operand_stack_.pop_back_val();
  llvm::Value* second = operand_stack_.pop_back_val();
  operand_stack_.push_back(builder_->CreateLShr(second, top));
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseShra() {
  CHECK_STACK(DW_OP_shra, 2);
  llvm::Value* top = operand_stack_.pop_back_val();
  llvm::Value* second = operand_stack_.pop_back_val();
  operand_stack_.push_back(builder_->CreateAShr(second, top));
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseXor() {
  CHECK_STACK(DW_OP_xor, 2);
  llvm::Value* top = operand_stack_.pop_back_val();
  llvm::Value* second = operand_stack_.pop_back_val();
  operand_stack_.push_back(builder_->CreateXor(second, top));
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseSkip() {
  int16_t skip_distance = opcodes_.GetU16(&offset_);
  offset_ += skip_distance;
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseLit(uint8_t lit) {
  operand_stack_.push_back(builder_->getInt32(lit));
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseReg(uint8_t reg) {
  return NotWasmCompatible();  // No registers in wasm
}

llvm::Error symbol_server::DWARFLocationParser::ParseRegx() {
  return NotWasmCompatible();  // No registers in wasm
}

llvm::Error symbol_server::DWARFLocationParser::ParseBreg(uint8_t reg) {
  return NotWasmCompatible();  // No registers in wasm
}

llvm::Error symbol_server::DWARFLocationParser::ParseBregx() {
  return NotWasmCompatible();  // No registers in wasm
}

llvm::Error symbol_server::DWARFLocationParser::ParseFbReg() {
  if (!function_context_) {
    return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                   "Empty frame base.");
  }

  auto frame_base =
      Parse(builder_, get_memory_callback_, get_local_callback_,
            function_context_, function_context_->GetFrameBaseExpression());
  if (!frame_base) {
    return frame_base.takeError();
  }
  auto* base_offset = builder_->getInt32(opcodes_.GetSLEB128(&offset_));

  operand_stack_.push_back(
      builder_->CreateAdd(*frame_base, base_offset, "DW_OP_fbreg"));

  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParseNop() {
  return llvm::Error::success();
}

llvm::Error symbol_server::DWARFLocationParser::ParsePiece() {
  return NotWasmCompatible();
}

llvm::Error symbol_server::DWARFLocationParser::ParseBitPiece() {
  return NotWasmCompatible();
}

llvm::Error symbol_server::DWARFLocationParser::ParseStackValue() {
  return ParseNop();
}

llvm::Error symbol_server::DWARFLocationParser::ParseWasmLocation() {
  uint64_t mem_type = opcodes_.GetULEB128(&offset_);
  uint64_t variable = opcodes_.GetULEB128(&offset_);
  enum WasmMemType { kLocal = 0, kGlobal = 1, kOperand = 2 };
  switch (mem_type) {
    case kLocal:
      operand_stack_.push_back(
          LoadFromLocal(builder_->getInt32(variable), builder_->getInt32Ty()));
      return llvm::Error::success();
    case kGlobal:
    case kOperand:
      return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                     "Unimplemented wasm location type %llu",
                                     mem_type);
    default:
      return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                     "Unknown wasm location type %llu",
                                     mem_type);
  }
}

llvm::Error symbol_server::DWARFLocationParser::ParseOpcode(uint8_t opcode) {
  llvm::Error inner_error = [=] {
    switch (opcode) {
      case DW_OP_addr:
        return ParseAddr();
      case DW_OP_deref:
        return ParseDeref();
      case DW_OP_const1u:
        return ParseConst(false, ConstSize::kI1);
      case DW_OP_const1s:
        return ParseConst(true, ConstSize::kI1);
      case DW_OP_const2u:
        return ParseConst(false, ConstSize::kI16);
      case DW_OP_const2s:
        return ParseConst(true, ConstSize::kI16);
      case DW_OP_const4u:
        return ParseConst(false, ConstSize::kI32);
      case DW_OP_const4s:
        return ParseConst(true, ConstSize::kI32);
      case DW_OP_const8u:
        return ParseConst(false, ConstSize::kI64);
      case DW_OP_const8s:
        return ParseConst(true, ConstSize::kI64);
      case DW_OP_constu:
        return ParseConst(false);
      case DW_OP_consts:
        return ParseConst(true);
      case DW_OP_dup:
        return ParseDup();
      case DW_OP_drop:
        return ParseDrop();
      case DW_OP_over:
        return ParseOver();
      case DW_OP_pick:
        return ParsePick();
      case DW_OP_swap:
        return ParseSwap();
      case DW_OP_rot:
        return ParseRot();
      case DW_OP_and:
        return ParseAnd();
      case DW_OP_div:
        return ParseDiv();
      case DW_OP_minus:
        return ParseMinus();
      case DW_OP_mod:
        return ParseMod();
      case DW_OP_mul:
        return ParseMul();
      case DW_OP_neg:
        return ParseNeg();
      case DW_OP_not:
        return ParseNot();
      case DW_OP_or:
        return ParseOr();
      case DW_OP_plus:
        return ParsePlus();
      case DW_OP_plus_uconst:
        return ParsePlusUconst();
      case DW_OP_shl:
        return ParseShl();
      case DW_OP_shr:
        return ParseShr();
      case DW_OP_shra:
        return ParseShra();
      case DW_OP_xor:
        return ParseXor();
      case DW_OP_skip:
        return ParseSkip();
      case DW_OP_lit0:
      case DW_OP_lit1:
      case DW_OP_lit2:
      case DW_OP_lit3:
      case DW_OP_lit4:
      case DW_OP_lit5:
      case DW_OP_lit6:
      case DW_OP_lit7:
      case DW_OP_lit8:
      case DW_OP_lit9:
      case DW_OP_lit10:
      case DW_OP_lit11:
      case DW_OP_lit12:
      case DW_OP_lit13:
      case DW_OP_lit14:
      case DW_OP_lit15:
      case DW_OP_lit16:
      case DW_OP_lit17:
      case DW_OP_lit18:
      case DW_OP_lit19:
      case DW_OP_lit20:
      case DW_OP_lit21:
      case DW_OP_lit22:
      case DW_OP_lit23:
      case DW_OP_lit24:
      case DW_OP_lit25:
      case DW_OP_lit26:
      case DW_OP_lit27:
      case DW_OP_lit28:
      case DW_OP_lit29:
      case DW_OP_lit30:
      case DW_OP_lit31:
        return ParseLit(opcode - DW_OP_lit0);
      case DW_OP_reg0:
      case DW_OP_reg4:
      case DW_OP_reg8:
      case DW_OP_reg12:
      case DW_OP_reg15:
      case DW_OP_reg16:
      case DW_OP_reg17:
      case DW_OP_reg18:
      case DW_OP_reg19:
      case DW_OP_reg20:
      case DW_OP_reg21:
      case DW_OP_reg22:
      case DW_OP_reg23:
      case DW_OP_reg24:
      case DW_OP_reg25:
      case DW_OP_reg26:
      case DW_OP_reg27:
      case DW_OP_reg28:
      case DW_OP_reg29:
      case DW_OP_reg30:
      case DW_OP_reg31:
        return ParseReg(opcode - DW_OP_reg0);
      case DW_OP_regx:
        return ParseRegx();
      case DW_OP_breg0:
      case DW_OP_breg1:
      case DW_OP_breg2:
      case DW_OP_breg3:
      case DW_OP_breg4:
      case DW_OP_breg5:
      case DW_OP_breg6:
      case DW_OP_breg7:
      case DW_OP_breg8:
      case DW_OP_breg9:
      case DW_OP_breg10:
      case DW_OP_breg11:
      case DW_OP_breg12:
      case DW_OP_breg13:
      case DW_OP_breg14:
      case DW_OP_breg15:
      case DW_OP_breg16:
      case DW_OP_breg17:
      case DW_OP_breg18:
      case DW_OP_breg19:
      case DW_OP_breg20:
      case DW_OP_breg21:
      case DW_OP_breg22:
      case DW_OP_breg23:
      case DW_OP_breg24:
      case DW_OP_breg25:
      case DW_OP_breg26:
      case DW_OP_breg27:
      case DW_OP_breg28:
      case DW_OP_breg29:
      case DW_OP_breg30:
      case DW_OP_breg31:
        return ParseBreg(opcode - DW_OP_breg0);
      case DW_OP_bregx:
        return ParseBregx();
      case DW_OP_fbreg:
        return ParseFbReg();
      case DW_OP_nop:
        return ParseNop();
      case DW_OP_piece:
        return ParsePiece();
      case DW_OP_bit_piece:
        return ParseBitPiece();
      case DW_OP_stack_value:
        return ParseStackValue();
      case DW_OP_WASM_location:
        return ParseWasmLocation();
      default:
        return NotImplemented();
    }
  }();

  if (!inner_error) {
    return llvm::Error::success();
  }
  return joinErrors(
      llvm::createStringError(llvm::inconvertibleErrorCode(),
                              "Failed to parse loction opcode '%s'",
                              ToString(opcode)),
      std::move(inner_error));
}

/* static */
llvm::Expected<llvm::Value*> symbol_server::DWARFLocationParser::Parse(
    llvm::IRBuilder<>* builder,
    llvm::FunctionCallee get_memory_callback,
    llvm::FunctionCallee get_local_callback,
    lldb_private::Function* function_context,
    const lldb_private::DWARFExpression& expression) {
  symbol_server::DWARFLocationParser p(builder, get_memory_callback,
                                       get_local_callback, function_context);
  expression.GetExpressionData(p.opcodes_);

  return p.ConsumeOpcodes();
}

llvm::Expected<llvm::Value*>
symbol_server::DWARFLocationParser::ConsumeOpcodes() {
  const lldb::offset_t end_offset = opcodes_.GetByteSize();

  while (opcodes_.ValidOffset(offset_) && offset_ < end_offset) {
    const uint8_t op = opcodes_.GetU8(&offset_);
    LLVM_DEBUG(llvm::dbgs() << "DW_OP: " << ToString(op) << ". Stack has "
                            << operand_stack_.size() << " entries\n");
    if (auto e = ParseOpcode(op)) {
      return std::move(e);
    }
  }
  return operand_stack_.pop_back_val();
}

llvm::Value* symbol_server::DWARFLocationParser::GetScratchpad(
    llvm::Type* element_type) {
  auto i = scratchpads_.find(element_type);
  if (i != scratchpads_.end()) {
    return i->second;
  }
  return scratchpads_[element_type] = builder_->CreateAlloca(element_type);
}

llvm::Value* symbol_server::DWARFLocationParser::LoadFromLocal(
    llvm::Value* local,
    llvm::Type* result_type) {
  llvm::Value* result = GetScratchpad(result_type);
  llvm::Value* arg_array[] = {
      local, builder_->CreatePointerCast(result, builder_->getInt8PtrTy())};
  builder_->CreateCall(get_local_callback_, arg_array);
  return builder_->CreateLoad(result);
}

llvm::Value* symbol_server::DWARFLocationParser::LoadFromMemory(
    llvm::Value* address,
    llvm::Type* result_type) {
  llvm::Value* result = GetScratchpad(result_type);
  llvm::Value* arg_array[] = {
      address, builder_->getInt32(result_type->getScalarSizeInBits() / 8),
      builder_->CreatePointerCast(result, builder_->getInt8PtrTy())};
  builder_->CreateCall(get_memory_callback_, arg_array);
  return builder_->CreateLoad(result);
}
