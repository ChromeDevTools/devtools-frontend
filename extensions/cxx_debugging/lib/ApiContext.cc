// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "ApiContext.h"
#include "Expressions.h"
#include "Variables.h"
#include "WasmModule.h"
#include "api.h"

#include "lldb/Symbol/CompilerType.h"
#include "lldb/Utility/ConstString.h"
#include "lldb/lldb-enumerations.h"
#include "lldb/lldb-types.h"
#include "llvm/ADT/APFloat.h"
#include "llvm/ADT/DenseSet.h"
#include "llvm/ADT/None.h"
#include "llvm/ADT/SmallSet.h"
#include "llvm/ADT/SmallVector.h"
#include "llvm/ADT/StringRef.h"
#include "llvm/ADT/Twine.h"
#include "llvm/BinaryFormat/Wasm.h"
#include "llvm/Support/Debug.h"
#include "llvm/Support/Error.h"
#include "llvm/Support/ErrorHandling.h"
#include "llvm/Support/FileSystem.h"
#include "llvm/Support/raw_ostream.h"

#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <deque>
#include <functional>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#define DEBUG_TYPE "symbols-backend"

namespace symbols_backend {
namespace api {

namespace {

Error MakeError(Error::Code ec, llvm::Twine message) {
  Error e;
  e.SetCode(ec);
  e.SetMessage(message.str());
  return e;
}

Error MakeError(Error::Code ec, llvm::Error error) {
  Error e;
  e.SetCode(ec);
  llvm::handleAllErrors(std::move(error),
                        [&e](const llvm::StringError& string_error) {
                          e.SetMessage(string_error.getMessage());
                        });
  return e;
}

Error MakeNotFoundError(llvm::StringRef raw_module_id) {
  return MakeError(Error::Code::kModuleNotFoundError,
                   "Module with id '" + raw_module_id + "' not found");
}

Error MakeEvalError(llvm::Error error) {
  Error e;
  e.SetCode(Error::Code::kEvalError);
  llvm::handleAllErrors(std::move(error),
                        [&e](const llvm::StringError& string_error) {
                          e.SetMessage(string_error.getMessage() +
                                       " (Not all C++ expressions supported)");
                        });
  return e;
}

Variable::Scope ToApiScope(lldb::ValueType scope) {
  switch (scope) {
    case lldb::eValueTypeVariableGlobal:
    case lldb::eValueTypeVariableStatic:
      return Variable::Scope::kGlobal;
    case lldb::eValueTypeVariableArgument:
      return Variable::Scope::kParameter;
    case lldb::eValueTypeVariableLocal:
      return Variable::Scope::kLocal;
    default:
      llvm::errs() << "Got variable scope " << scope << "\n";
      llvm_unreachable("Unhandled variable scope");
  }
}

llvm::SmallVector<RawLocationRange, 1> ToRawLocationRanges(
    llvm::SmallSet<std::pair<lldb::addr_t, lldb::addr_t>, 1>&& ranges,
    std::string raw_module_id) {
  llvm::SmallVector<RawLocationRange, 1> locations;
  for (auto offset_pair : ranges) {
    RawLocationRange& location = locations.emplace_back();
    location.SetRawModuleId(raw_module_id);
    location.SetStartOffset(offset_pair.first);
    location.SetEndOffset(offset_pair.first + offset_pair.second);
  }
  return locations;
}
}  // namespace

// Notify the plugin about a new script
AddRawModuleResponse ApiContext::AddRawModule(
    std::string raw_module_id,  // A raw module identifier
    std::string path            // The path to the file with the wasm bytes
) {
  AddRawModuleResponse response;
  if (FindModule(raw_module_id)) {
    response.SetError(
        MakeError(Error::Code::kInternalError,
                  "Duplicate module with id '" + raw_module_id + "'"));
  } else if (auto m = AddModule(raw_module_id, path)) {
    auto source_info = m->GetSourceScripts();
    response.SetSources(
        {source_info.sources.begin(), source_info.sources.end()});
    response.SetDwos({source_info.dwos.begin(), source_info.dwos.end()});
  } else {
    response.SetError(MakeError(Error::Code::kInternalError,
                                "Unable to load file '" + path + "'"));
  }
  return response;
};

void ApiContext::RemoveRawModule(
    std::string raw_module_id  // A raw module identifier
) {
  DeleteModule(raw_module_id);
}

// Find locations in raw modules from a location in a source file
SourceLocationToRawLocationResponse ApiContext::SourceLocationToRawLocation(
    std::string raw_module_id,
    std::string source_file,
    int32_t line_number,
    int32_t column_number) {
  SourceLocationToRawLocationResponse response;
  auto module = FindModule(raw_module_id);
  if (!module) {
    response.SetError(MakeNotFoundError(raw_module_id));
    return response;
  }

  llvm::SmallVector<RawLocationRange, 1> locations = ToRawLocationRanges(
      module->GetOffsetFromSourceLocation(
          {source_file, static_cast<uint32_t>(line_number + 1),
           static_cast<uint16_t>(column_number + 1)}),
      raw_module_id);
  response.SetRawLocationRanges({locations.begin(), locations.end()});
  return response;
};

// Find locations in source files from a location in a raw module
RawLocationToSourceLocationResponse ApiContext::RawLocationToSourceLocation(
    std::string raw_module_id,
    int32_t code_offset,
    int32_t inline_frame_index) {
  RawLocationToSourceLocationResponse response;
  auto module = FindModule(raw_module_id);
  if (!module) {
    response.SetError(MakeNotFoundError(raw_module_id));
    return response;
  }

  llvm::SmallVector<SourceLocation, 1> locations;
  for (auto& source_loc :
       module->GetSourceLocationFromOffset(code_offset, inline_frame_index)) {
    SourceLocation& location = locations.emplace_back();
    location.SetSourceFile(source_loc.file);
    location.SetRawModuleId(raw_module_id);
    location.SetLineNumber(source_loc.line - 1);
    location.SetColumnNumber(source_loc.column - 1);
  }
  response.SetSourceLocation({locations.begin(), locations.end()});
  return response;
}

// List all variables in lexical scope at a location in a raw module
ListVariablesInScopeResponse ApiContext::ListVariablesInScope(
    std::string raw_module_id,
    int32_t code_offset,
    int32_t inline_frame_index) {
  ListVariablesInScopeResponse response;
  auto module = FindModule(raw_module_id);
  if (!module) {
    response.SetError(MakeNotFoundError(raw_module_id));
    return response;
  }

  llvm::SmallVector<Variable, 1> variables;
  for (auto& var :
       module->GetVariablesInScope(code_offset, inline_frame_index)) {
    if (var.name.empty()) {
      // Skip anonymous objects, since we can't get their value through
      // `evaluate`.
      continue;
    }
    Variable& variable = variables.emplace_back();
    variable.SetScope(ToApiScope(var.scope));
    variable.SetName(var.name);
    variable.SetType(var.type);
  }
  response.SetVariable({variables.begin(), variables.end()});
  return response;
}

GetFunctionInfoResponse ApiContext::GetFunctionInfo(std::string raw_module_id,
                                                    int32_t code_offset) {
  GetFunctionInfoResponse response;
  auto module = FindModule(raw_module_id);
  if (!module) {
    response.SetError(MakeNotFoundError(raw_module_id));
    return response;
  }

  FunctionInfo fi = module->GetFunctionInfo(code_offset);
  response.SetFunctionNames({fi.names.begin(), fi.names.end()});
  response.SetMissingSymbolFiles(
      {fi.missing_symbols.begin(), fi.missing_symbols.end()});
  return response;
}

namespace {
std::vector<std::string> GetTypeNames(lldb_private::CompilerType type) {
  std::vector<std::string> names;

  lldb_private::CompilerType original_type = type;

  while (type.IsValid()) {
    if (const char* type_name = type.GetDisplayTypeName().GetCString()) {
      names.emplace_back(type_name);
    }
    if (const char* type_name = type.GetTypeName().GetCString()) {
      if (names.back() != type_name) {
        names.emplace_back(type_name);
      }
    }
    type = type.GetTypedefedType();
  }

  // If the original input type is a fixed-size integer or enum type, append a
  // matching c++ fixed-width integer type name to the list to simplify integer
  // handling.
  bool is_signed = false;
  if (original_type.IsIntegerOrEnumerationType(is_signed)) {
    if (original_type.IsEnumerationType(is_signed)) {
      original_type = original_type.GetEnumerationIntegerType();
    }
    if (auto byte_size = original_type.GetByteSize(nullptr)) {
      switch (*byte_size) {
        case 8:
          names.push_back(is_signed ? "int64_t" : "uint64_t");
          break;
        case 4:
          names.push_back(is_signed ? "int32_t" : "uint32_t");
          break;
        case 2:
          names.push_back(is_signed ? "int16_t" : "uint16_t");
          break;
        case 1:
          names.push_back(is_signed ? "int8_t" : "uint8_t");
          break;
      }
    }
  }
  return names;
}

}  // namespace

GetInlinedFunctionRangesResponse ApiContext::GetInlinedFunctionRanges(
    std::string raw_module_id,
    int32_t code_offset) {
  GetInlinedFunctionRangesResponse response;
  auto module = FindModule(raw_module_id);
  if (!module) {
    response.SetError(MakeNotFoundError(raw_module_id));
    return response;
  }

  llvm::SmallVector<RawLocationRange, 1> locations = ToRawLocationRanges(
      module->GetInlineFunctionAddressRanges(code_offset), raw_module_id);
  response.SetRawLocationRanges({locations.begin(), locations.end()});
  return response;
}

GetInlinedCalleesRangesResponse ApiContext::GetInlinedCalleesRanges(
    std::string raw_module_id,
    int32_t code_offset) {
  GetInlinedCalleesRangesResponse response;
  auto module = FindModule(raw_module_id);
  if (!module) {
    response.SetError(MakeNotFoundError(raw_module_id));
    return response;
  }

  llvm::SmallVector<RawLocationRange, 1> locations = ToRawLocationRanges(
      module->GetChildInlineFunctionAddressRanges(code_offset), raw_module_id);
  response.SetRawLocationRanges({locations.begin(), locations.end()});
  return response;
}

GetMappedLinesResponse ApiContext::GetMappedLines(std::string raw_module_id,
                                                  std::string source_file_url) {
  GetMappedLinesResponse response;
  auto module = FindModule(raw_module_id);
  if (!module) {
    response.SetError(MakeNotFoundError(raw_module_id));
    return response;
  }

  std::vector<int32_t> lines = module->GetMappedLines(source_file_url);
  for (int32_t& line : lines) {
    --line;
  }
  response.SetMappedLines(std::move(lines));
  return response;
}

std::shared_ptr<WasmModule> ApiContext::AddModule(llvm::StringRef id,
                                                  llvm::StringRef path) {
  if (!llvm::sys::fs::exists(path)) {
    LLVM_DEBUG(llvm::dbgs()
               << "Module '" << id << "' at " << path << " not found\n");
    return nullptr;
  }

  auto maybe_module = WasmModule::CreateFromFile(path);
  if (!maybe_module) {
    llvm::errs() << llvm::toString(maybe_module.takeError());
    return nullptr;
  }
  const auto& module =
      modules_.insert({id, std::move(*maybe_module)}).first->second;
  if (module) {
    LLVM_DEBUG(llvm::dbgs() << "Loaded module " << id << " with "
                            << module->GetSourceScripts().sources.size()
                            << " source files\n");
  }
  return module;
}

std::shared_ptr<WasmModule> ApiContext::FindModule(llvm::StringRef id) const {
  auto it = modules_.find(id);
  if (it == modules_.end()) {
    return nullptr;
  }
  return it->second;
}

void ApiContext::DeleteModule(llvm::StringRef id) {
  modules_.erase(id);
}

api::TypeInfo ApiContext::GetApiTypeInfo(
    lldb_private::CompilerType type,
    const llvm::SmallVectorImpl<SubObjectInfo>& member_info) {
  std::vector<api::Enumerator> enumerators;
  type.ForEachEnumerator([&](const lldb_private::CompilerType& type,
                             lldb_private::ConstString label,
                             const llvm::APSInt& value) {
    enumerators.push_back(api::Enumerator()
                              .SetName(label.AsCString(""))
                              .SetValue(value.getExtValue())
                              .SetTypeId(GetTypeId(type)));
    return true;
  });

  auto size = type.GetByteSize(nullptr);
  uint64_t array_size = 0;
  size_t alignment = type.GetTypeBitAlign(nullptr).value_or(0) / 8;
  bool has_elements = type.IsPointerOrReferenceType() ||
                      type.IsArrayType(nullptr, &array_size, nullptr) ||
                      type.IsVectorType(nullptr, &array_size);
  bool can_expand = type.IsAggregateType() || has_elements;
  bool is_signed = false;
  bool has_value =
      type.IsScalarType() || type.IsEnumerationType(is_signed) || has_elements;
  std::vector<api::FieldInfo> members;
  for (const auto& member : member_info) {
    members.push_back(FieldInfo()
                          .SetName(member.MemberName().str())
                          .SetOffset(member.OffsetInParent())
                          .SetTypeId(GetTypeId(member.Type())));
  }

  return api::TypeInfo()
      .SetCanExpand(can_expand)
      .SetArraySize(array_size)
      .SetHasValue(has_value)
      .SetTypeId(GetTypeId(type))
      .SetTypeNames(GetTypeNames(type))
      .SetSize(size ? *size : 0)
      .SetIsPointer(type.IsPointerOrReferenceType(nullptr))
      .SetAlignment(alignment)
      .SetMembers(std::move(members))
      .SetEnumerators(std::move(enumerators));
}

llvm::Expected<std::vector<api::TypeInfo>> ApiContext::GetApiTypeInfos(
    lldb_private::CompilerType type,
    int32_t required_type_depth) {
  std::deque<std::pair<lldb_private::CompilerType, int32_t>> queue{{type, 0}};
  std::vector<api::TypeInfo> type_infos;
  llvm::DenseSet<lldb::opaque_compiler_type_t> visited_types;

  while (!queue.empty()) {
    lldb_private::CompilerType type;
    int32_t depth;
    std::tie(type, depth) = queue.front();
    queue.pop_front();
    if (required_type_depth > 0 && depth > required_type_depth) {
      continue;
    }
    if (!visited_types.insert(type.GetOpaqueQualType()).second) {
      continue;
    }

    auto member_info = SubObjectInfo::GetMembers(type);
    for (const auto& member : member_info) {
      if (!visited_types.contains(member.Type().GetOpaqueQualType())) {
        queue.push_back({member.Type(), depth + 1});
      }
    }
    type_infos.push_back(GetApiTypeInfo(type, member_info));
  }
  return type_infos;
}

std::string ApiContext::GetTypeId(lldb_private::CompilerType type) {
  std::string key =
      std::to_string(reinterpret_cast<uintptr_t>(type.GetOpaqueQualType()));
  types_[key] = type;
  return key;
}

llvm::Optional<lldb_private::CompilerType> ApiContext::GetTypeFromId(
    llvm::StringRef type_id) {
  auto it = types_.find(type_id.str());
  if (it == types_.end()) {
    return llvm::None;
  }
  return it->getValue();
}

struct EvalVisitor {
  ApiContext& context;
  lldb_private::CompilerType type;
  llvm::Optional<size_t> address;

  EvalVisitor(ApiContext& context,
              lldb_private::CompilerType type,
              llvm::Optional<size_t> address)
      : context(context), type(type), address(address) {}

  api::EvaluateExpressionResponse MakeResponse() {
    auto member_type_infos = context.GetApiTypeInfos(type, 0);
    if (!member_type_infos) {
      return api::EvaluateExpressionResponse().SetError(
          MakeEvalError(member_type_infos.takeError()));
    }
    api::TypeInfo root_type = member_type_infos->front();
    return api::EvaluateExpressionResponse()
        .SetTypeInfos(std::move(*member_type_infos))
        .SetRoot(root_type)
        .SetMemoryAddress(address ? llvm::Optional<int32_t>(*address)
                                  : llvm::None);
  }

  // Most types are stringified in the JS wrapper, including most primitive
  // types as implemented below. There's two exceptions that we're handling
  // here because they're impossible/hard to do in JS, which is enum labels and
  // floating point values. Stringifying floats and doubles in JS is subtly
  // different than in C++ (or rather lldb), in particular for floats which
  // have different level of precision than JS's number.
  template <typename T>
  api::EvaluateExpressionResponse MakeResponse(T v) {
    auto begin = reinterpret_cast<unsigned char*>(&v);
    auto end = begin + sizeof(T);
    std::vector<int32_t> data = {begin, end};

    bool is_signed = false;
    llvm::Optional<std::string> enum_label;
    if (type.IsEnumerationType(is_signed)) {
      type.ForEachEnumerator([&enum_label, v](auto t, auto label, auto value) {
        if (value == v) {
          enum_label = std::string(label.GetStringRef());
          return false;
        }
        return true;
      });
    }

    return MakeResponse().SetData(data).SetDisplayValue(std::move(enum_label));
  }

  auto operator()(std::monostate v) { return MakeResponse(); }
  auto operator()(bool v) { return MakeResponse(v); }
  auto operator()(int8_t v) { return MakeResponse(v); }
  auto operator()(uint8_t v) { return MakeResponse(v); }
  auto operator()(int16_t v) { return MakeResponse(v); }
  auto operator()(uint16_t v) { return MakeResponse(v); }
  auto operator()(int32_t v) { return MakeResponse(v); }
  auto operator()(uint32_t v) { return MakeResponse(v); }
  auto operator()(int64_t v) { return MakeResponse(v); }
  auto operator()(uint64_t v) { return MakeResponse(v); }
  auto operator()(float v) {
    llvm::APFloat f(v);
    llvm::SmallVector<char, 256> str;
    f.toString(str, 0, 6);
    return MakeResponse(v).SetDisplayValue(std::string(str.data(), str.size()));
  }
  auto operator()(double v) {
    llvm::APFloat f(v);
    llvm::SmallVector<char, 256> str;
    f.toString(str, 0, 6);
    return MakeResponse(v).SetDisplayValue(std::string(str.data(), str.size()));
  }
  auto operator()(void* v) {
    return MakeResponse().SetLocation(reinterpret_cast<uint64_t>(v));
  }
  auto operator()(std::nullptr_t v) { return MakeResponse<intptr_t>(0); }
};

llvm::Expected<size_t> DebuggerProxy::ReadMemory(lldb::addr_t address,
                                                 void* buffer,
                                                 size_t size) const {
  return proxy_.call<size_t>("readMemory", static_cast<size_t>(address),
                             reinterpret_cast<size_t>(buffer), size);
}

static llvm::Expected<DebuggerProxy::WasmValue> readWasmValue(
    const emscripten::val& value) {
  std::string type = value["type"].as<std::string>();
  if (type == "i32") {
    return DebuggerProxy::WasmValue{llvm::wasm::ValType::I32,
                                    value["value"].as<int32_t>()};
  }
  if (type == "i64") {
    return DebuggerProxy::WasmValue{llvm::wasm::ValType::I64,
                                    value["value"].as<int64_t>()};
  }
  if (type == "f32") {
    return DebuggerProxy::WasmValue{llvm::wasm::ValType::F32,
                                    value["value"].as<float>()};
  }
  if (type == "f64") {
    return DebuggerProxy::WasmValue{llvm::wasm::ValType::F64,
                                    value["value"].as<double>()};
  }
  if (type == "reftype") {
    // Only a scalar value can cross the DWARF interpreter, so we
    // encode the value into a 64-bit integer.
    int64_t encodedValue = value["index"].as<uint32_t>();
    std::string valueClass = value["valueClass"].as<std::string>();
    if (valueClass == "local") {
      encodedValue |= (int64_t)1 << 32;
    } else if (valueClass == "operand") {
      encodedValue |= (int64_t)2 << 32;
    } else if (valueClass != "global") {
      llvm::errs() << "Got value class " << encodedValue << "\n";
      llvm_unreachable("Unhandled value class");
    }
    return DebuggerProxy::WasmValue{llvm::wasm::ValType::I64, encodedValue};
  }
  return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                 "Invalid value type %s", type.c_str());
}

llvm::Expected<DebuggerProxy::WasmValue> DebuggerProxy::GetGlobal(
    size_t index) const {
  return readWasmValue(proxy_.call<emscripten::val>("getGlobal", index));
}
llvm::Expected<DebuggerProxy::WasmValue> DebuggerProxy::GetLocal(
    size_t index) const {
  return readWasmValue(proxy_.call<emscripten::val>("getLocal", index));
}
llvm::Expected<DebuggerProxy::WasmValue> DebuggerProxy::GetOperand(
    size_t index) const {
  return readWasmValue(proxy_.call<emscripten::val>("getOperand", index));
}

api::EvaluateExpressionResponse ApiContext::EvaluateExpression(
    RawLocation location,
    std::string expression,
    emscripten::val debug_proxy) {
  std::string raw_module_id = location.GetRawModuleId();
  auto module = FindModule(raw_module_id);
  if (!module) {
    return api::EvaluateExpressionResponse().SetError(
        MakeNotFoundError(raw_module_id));
  }
  auto result = module->InterpretExpression(
      location.GetCodeOffset(), location.GetInlineFrameIndex(), expression,
      DebuggerProxy{debug_proxy});
  if (!result) {
    return api::EvaluateExpressionResponse().SetError(
        MakeError(Error::Code::kEvalError, result.takeError()));
  }

  return std::visit(EvalVisitor(*this, result->type, result->address),
                    result->value);
}

}  // namespace api
}  // namespace symbols_backend

#ifndef NDEBUG
namespace {
struct Logging {
  Logging() {
    lldb_private::Log::Initialize();
    lldb_private::Log::ListAllLogChannels(llvm::errs());
    auto stream = std::make_shared<llvm::raw_fd_ostream>(2, false, true);
    lldb_private::Log::EnableLogChannel(stream, 0, "lldb", {"default"},
                                        llvm::errs());
  }
};

static Logging l;
}  // namespace
#endif
