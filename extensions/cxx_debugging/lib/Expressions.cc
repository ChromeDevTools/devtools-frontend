// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "Expressions.h"
#include "ApiContext.h"
#include "WasmModule.h"
#include "WasmVendorPlugins.h"

#include "lldb-eval/ast.h"
#include "lldb-eval/context.h"
#include "lldb-eval/eval.h"
#include "lldb-eval/parser.h"
#include "lldb-eval/parser_context.h"
#include "lldb-eval/value.h"
#include "lldb/Core/Module.h"
#include "lldb/Core/Section.h"
#include "lldb/Symbol/CompilerType.h"
#include "lldb/Symbol/SymbolContext.h"
#include "lldb/Symbol/Type.h"
#include "lldb/Symbol/TypeSystem.h"
#include "lldb/Target/Process.h"
#include "lldb/Utility/ArchSpec.h"
#include "lldb/Utility/Listener.h"
#include "llvm/ADT/StringRef.h"

#include <cstddef>
#include <iterator>
#include <memory>
#include <string>
#include <type_traits>

namespace symbols_backend {
static lldb_private::CompilerType GetTopType(lldb_private::CompilerType t) {
  if (!t.IsValid() || !t.IsTypedefType()) {
    return t;
  }
  return GetTopType(t.GetTypedefedType());
}

struct WasmValueLoaderContext : SymbolFileWasmDWARF::WasmValueLoader {
  const api::DebuggerProxy& proxy;

  explicit WasmValueLoaderContext(const api::DebuggerProxy& proxy,
                                  SymbolFileWasmDWARF& symbol_file)
      : SymbolFileWasmDWARF::WasmValueLoader(symbol_file), proxy(proxy) {}

  llvm::Expected<api::DebuggerProxy::WasmValue> LoadWASMValue(
      uint8_t storage_type,
      const lldb_private::DataExtractor& data,
      lldb::offset_t& offset) final {
    uint64_t index = 0;
    switch (storage_type) {
      case 0x00:  // local
      case 0x01:  // global
      case 0x02:  // operand
        index = data.GetULEB128(&offset);
        break;
      case 0x03:  // global i32
        index = data.GetU32(&offset);
        break;
      default:
        return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                       "Invalid WASM value storage type");
    }

    switch (storage_type) {
      case 0x00:  // local
        return proxy.GetLocal(index);
      case 0x02:  // operand
        return proxy.GetOperand(index);
      case 0x01:  // global
      case 0x03:  // global i32
        return proxy.GetGlobal(index);
    }
    return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                   "Invalid WASM value storage type");
  }
};

lldb_private::CompilerType GetCompilerType(lldb::SBType t) {
  struct Derived : lldb::SBType {
    explicit Derived(const lldb::SBType& t) : SBType(t) {}
    auto Get() { return ref().GetCompilerType(false); }
  };
  return Derived{t}.Get();
}

llvm::Optional<llvm::Error> CheckError(lldb::SBValue value) {
  auto e = value.GetError();
  if (!e.IsValid() || e.Success()) {
    return {};
  }
  auto message = e.GetCString();
  return llvm::createStringError(llvm::inconvertibleErrorCode(), message);
}

llvm::Expected<ExpressionResult> InterpretExpression(
    const WasmModule& module,
    lldb_private::TypeSystem& type_system,
    lldb_private::SymbolContext& sc,
    size_t frame_offset,
    size_t inline_frame_index,
    lldb_private::Address addr,
    llvm::StringRef expression,
    const api::DebuggerProxy& proxy) {
  auto target = module.Target()->shared_from_this();
  lldb::ListenerSP listener = lldb_private::Listener::MakeListener("wasm32");

  lldb::ProcessSP process =
      target->CreateProcess(listener, "wasm32", nullptr, false);
  if (!process) {
    return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                   "Failed to create process");
  }
  lldb::SectionSP code_section =
      module.Module()->GetObjectFile()->GetSectionList()->FindSectionByType(
          lldb::eSectionTypeCode, false);
  target->SetSectionLoadAddress(code_section, 0);

  static_cast<WasmProcess*>(process.get())
      ->SetProxyAndFrameOffset(proxy, frame_offset);
  process->UpdateThreadListIfNeeded();
  process->GetThreadList().SetSelectedThreadByID(0);
  auto thread = std::static_pointer_cast<WasmThread>(
      process->GetThreadList().GetSelectedThread());

  WasmValueLoaderContext loader(proxy, *llvm::cast<SymbolFileWasmDWARF>(
                                           module.Module()->GetSymbolFile()));

  auto sm = lldb_eval::SourceManager::Create(expression.str());
  auto ctx = lldb_eval::Context::Create(sm, lldb::SBFrame{thread->GetFrame()});
  lldb_eval::Parser parser(ctx);
  lldb_eval::Error e;
  auto tree = parser.Run(e);
  if (e || !tree || tree->is_error()) {
    return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                   e.message().c_str());
  }
  lldb_eval::Interpreter interpreter(target, sm);
  auto result = interpreter.Eval(tree.get(), e);
  if (!result.IsValid() || e) {
    return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                   e.message().c_str());
  }

  if (auto e = CheckError(result.inner_value())) {
    return std::move(*e);
  }
  auto type = GetCompilerType(ToSBType(result.type()));
  auto top_type = GetTopType(type);
  auto val = result.inner_value();

  llvm::Optional<size_t> address;
  if (auto address_of = val.AddressOf()) {
    address = address_of.GetValueAsUnsigned();
  }
  switch (top_type.GetBasicTypeEnumeration()) {
    case lldb::BasicType::eBasicTypeChar:
    case lldb::BasicType::eBasicTypeSignedChar:
    case lldb::BasicType::eBasicTypeChar8:
    case lldb::BasicType::eBasicTypeChar16:
    case lldb::BasicType::eBasicTypeChar32:
    case lldb::BasicType::eBasicTypeShort:
    case lldb::BasicType::eBasicTypeInt:
    case lldb::BasicType::eBasicTypeLong:
    case lldb::BasicType::eBasicTypeWChar:
    case lldb::BasicType::eBasicTypeSignedWChar:
    case lldb::BasicType::eBasicTypeLongLong: {
      auto integer = result.GetValueAsSigned();
      if (auto integer_size = type.GetByteSize(nullptr)) {
        switch (*integer_size) {
          case 1:
            return ExpressionResult{type, static_cast<int8_t>(integer),
                                    address};
          case 2:
            return ExpressionResult{type, static_cast<int16_t>(integer),
                                    address};
          case 4:
            return ExpressionResult{type, static_cast<int32_t>(integer),
                                    address};
          case 8:
            return ExpressionResult{type, static_cast<int64_t>(integer),
                                    address};
        }
        break;
      }
    }
    case lldb::BasicType::eBasicTypeUnsignedChar:
    case lldb::BasicType::eBasicTypeUnsignedShort:
    case lldb::BasicType::eBasicTypeUnsignedWChar:
    case lldb::BasicType::eBasicTypeUnsignedInt:
    case lldb::BasicType::eBasicTypeUnsignedLong:
    case lldb::BasicType::eBasicTypeUnsignedLongLong: {
      auto integer = result.GetUInt64();
      if (auto integer_size = type.GetByteSize(nullptr)) {
        switch (*integer_size) {
          case 1:
            return ExpressionResult{type, static_cast<uint8_t>(integer),
                                    address};
          case 2:
            return ExpressionResult{type, static_cast<uint16_t>(integer),
                                    address};
          case 4:
            return ExpressionResult{type, static_cast<uint32_t>(integer),
                                    address};
          case 8:
            return ExpressionResult{type, static_cast<uint64_t>(integer),
                                    address};
        }
      }
      break;
    }
    case lldb::BasicType::eBasicTypeBool:
      return ExpressionResult{type, result.GetBool(), address};
    case lldb::BasicType::eBasicTypeFloat:
      return ExpressionResult{type, result.GetFloat().convertToFloat(),
                              address};
    case lldb::BasicType::eBasicTypeDouble:
      return ExpressionResult{type, result.GetFloat().convertToDouble(),
                              address};
    case lldb::BasicType::eBasicTypeVoid:
      return ExpressionResult{type, std::monostate{}, address};
    case lldb::BasicType::eBasicTypeNullPtr:
      return ExpressionResult{type, nullptr, address};
    case lldb::BasicType::eBasicTypeHalf:
    case lldb::BasicType::eBasicTypeLongDouble:
    case lldb::BasicType::eBasicTypeFloatComplex:
    case lldb::BasicType::eBasicTypeDoubleComplex:
    case lldb::BasicType::eBasicTypeLongDoubleComplex:
    case lldb::BasicType::eBasicTypeObjCID:
    case lldb::BasicType::eBasicTypeObjCClass:
    case lldb::BasicType::eBasicTypeObjCSel:
    case lldb::BasicType::eBasicTypeInt128:
    case lldb::BasicType::eBasicTypeUnsignedInt128:
    case lldb::BasicType::eBasicTypeOther:
      return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                     "Invalid basic type %s",
                                     result.type()->GetName().str().c_str());
    case lldb::BasicType::eBasicTypeInvalid:
      break;
  }

  bool is_signed = false;
  if (top_type.IsEnumerationType(is_signed)) {
    if (is_signed) {
      auto integer = result.GetValueAsSigned();
      if (auto integer_size = type.GetByteSize(nullptr)) {
        switch (*integer_size) {
          case 1:
            return ExpressionResult{type, static_cast<int8_t>(integer),
                                    address};
          case 2:
            return ExpressionResult{type, static_cast<int16_t>(integer),
                                    address};
          case 4:
            return ExpressionResult{type, static_cast<int32_t>(integer),
                                    address};
          case 8:
            return ExpressionResult{type, static_cast<int64_t>(integer),
                                    address};
        }
      }
    }
    auto integer = result.GetUInt64();
    if (auto integer_size = type.GetByteSize(nullptr)) {
      switch (*integer_size) {
        case 1:
          return ExpressionResult{type, static_cast<uint8_t>(integer), address};
        case 2:
          return ExpressionResult{type, static_cast<uint16_t>(integer),
                                  address};
        case 4:
          return ExpressionResult{type, static_cast<uint32_t>(integer),
                                  address};
        case 8:
          return ExpressionResult{type, static_cast<uint64_t>(integer),
                                  address};
      }
    }
  }

  if (result.IsPointer()) {
    if (module.Module()->GetArchitecture().GetAddressByteSize() == 4) {
      return ExpressionResult{type, static_cast<uint32_t>(result.GetUInt64()),
                              address};
    } else {
      return ExpressionResult{type, static_cast<uint64_t>(result.GetUInt64()),
                              address};
    }
  }

  auto ptr = result.AddressOf();
  if (ptr.IsValid()) {
    return ExpressionResult{type, reinterpret_cast<void*>(ptr.GetUInt64()),
                            address};
  }

  return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                 "Cannot evaluate in-memory value with type %s",
                                 result.type()->GetName().str().c_str());
}
}  // namespace symbols_backend
