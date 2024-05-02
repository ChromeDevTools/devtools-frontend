// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// clang-format off
#include <string>
#include <vector>

#include <emscripten.h>
#include <emscripten/bind.h>
#include "ApiContext.h"
#include "WasmVendorPlugins.h"

#include "Plugins/Language/CPlusPlus/CPlusPlusLanguage.h"
#include "Plugins/ObjectFile/wasm/ObjectFileWasm.h"
#include "Plugins/ScriptInterpreter/None/ScriptInterpreterNone.h"
#include "Plugins/SymbolFile/DWARF/SymbolFileDWARF.h"
#include "Plugins/SymbolVendor/wasm/SymbolVendorWasm.h"
#include "lldb/Host/FileSystem.h"
#include "lldb/Host/linux/HostInfoLinux.h"
#include "llvm/ADT/StringRef.h"
#include "llvm/Support/Base64.h"
#include "llvm/Support/CommandLine.h"
#include "llvm/Support/raw_ostream.h"

namespace {

struct DefaultPluginsContext
    : symbols_backend::PluginRegistryContext<
                            lldb_private::HostInfoPosix,
                            symbols_backend::WasmPlatform,
                            lldb_private::ScriptInterpreterNone,
                            lldb_private::FileSystem,
                            lldb_private::CPlusPlusLanguage,
                            lldb_private::TypeSystemClang,
                            lldb_private::wasm::ObjectFileWasm,
                            lldb_private::wasm::SymbolVendorWasm,
                            symbols_backend::WasmProcess,
                            symbols_backend::SymbolFileWasmDWARF> {
  DefaultPluginsContext() : PluginRegistryContext() {
    lldb_private::Debugger::Initialize(nullptr);
  }
  ~DefaultPluginsContext() { lldb_private::Debugger::Terminate(); }
};

DefaultPluginsContext& GetGlobalContext() {
  static DefaultPluginsContext global_context;
  return global_context;
}

template <typename T, typename ClassT>
std::function<void(ClassT&, emscripten::val)> OptionalSetter(
    ClassT& (ClassT::*setter)(llvm::Optional<T>)) {
  return [setter](ClassT& cls, emscripten::val value) {
    if (value == emscripten::val::undefined() ||
        value == emscripten::val::null()) {
      (cls.*setter)(llvm::None);
    } else {
      (cls.*setter)(value.as<T>());
    }
  };
}

template <typename T, typename ClassT>
std::function<emscripten::val(const ClassT&)> OptionalGetter(
    llvm::Optional<T> (ClassT::*getter)() const) {
  return [getter](const ClassT& cls) {
    if (auto value = (cls.*getter)()) {
      return emscripten::val(std::move(*value));
    }
    return emscripten::val::undefined();
  };
}
}  // namespace

namespace symbols_backend {
class DWARFSymbolsPlugin : public api::ApiContext {
 public:
  DWARFSymbolsPlugin() : context_(GetGlobalContext()) {}

 private:
  DefaultPluginsContext& context_;
};
}  // namespace symbols_backend




EMSCRIPTEN_BINDINGS(DWARFSymbolsPlugin) {
  emscripten::enum_<symbols_backend::api::Error::Code>("ErrorCode")
    .value("INTERNAL_ERROR", symbols_backend::api::Error::Code::kInternalError)
    .value("PROTOCOL_ERROR", symbols_backend::api::Error::Code::kProtocolError)
    .value("MODULE_NOT_FOUND_ERROR", symbols_backend::api::Error::Code::kModuleNotFoundError)
    .value("EVAL_ERROR", symbols_backend::api::Error::Code::kEvalError)
    ;

  emscripten::class_<symbols_backend::api::Error>("Error")
      .constructor<>()
      .property("code", &symbols_backend::api::Error::GetCode, &symbols_backend::api::Error::SetCode)
      .property("message", &symbols_backend::api::Error::GetMessage, &symbols_backend::api::Error::SetMessage)
      ;

  emscripten::class_<symbols_backend::api::RawLocationRange>("RawLocationRange")
      .constructor<>()
      .property("rawModuleId", &symbols_backend::api::RawLocationRange::GetRawModuleId, &symbols_backend::api::RawLocationRange::SetRawModuleId)
      .property("startOffset", &symbols_backend::api::RawLocationRange::GetStartOffset, &symbols_backend::api::RawLocationRange::SetStartOffset)
      .property("endOffset", &symbols_backend::api::RawLocationRange::GetEndOffset, &symbols_backend::api::RawLocationRange::SetEndOffset)
      ;

  emscripten::class_<symbols_backend::api::RawLocation>("RawLocation")
      .constructor<>()
      .property("rawModuleId", &symbols_backend::api::RawLocation::GetRawModuleId, &symbols_backend::api::RawLocation::SetRawModuleId)
      .property("codeOffset", &symbols_backend::api::RawLocation::GetCodeOffset, &symbols_backend::api::RawLocation::SetCodeOffset)
      .property("inlineFrameIndex", &symbols_backend::api::RawLocation::GetInlineFrameIndex, &symbols_backend::api::RawLocation::SetInlineFrameIndex)
      ;

  emscripten::class_<symbols_backend::api::SourceLocation>("SourceLocation")
      .constructor<>()
      .property("rawModuleId", &symbols_backend::api::SourceLocation::GetRawModuleId, &symbols_backend::api::SourceLocation::SetRawModuleId)
      .property("sourceFile", &symbols_backend::api::SourceLocation::GetSourceFile, &symbols_backend::api::SourceLocation::SetSourceFile)
      .property("lineNumber", &symbols_backend::api::SourceLocation::GetLineNumber, &symbols_backend::api::SourceLocation::SetLineNumber)
      .property("columnNumber", &symbols_backend::api::SourceLocation::GetColumnNumber, &symbols_backend::api::SourceLocation::SetColumnNumber)
      ;
  emscripten::enum_<symbols_backend::api::Variable::Scope>("VariableScope")
    .value("LOCAL", symbols_backend::api::Variable::Scope::kLocal)
    .value("PARAMETER", symbols_backend::api::Variable::Scope::kParameter)
    .value("GLOBAL", symbols_backend::api::Variable::Scope::kGlobal)
    ;

  emscripten::class_<symbols_backend::api::Variable>("Variable")
      .constructor<>()
      .property("scope", &symbols_backend::api::Variable::GetScope, &symbols_backend::api::Variable::SetScope)
      .property("name", &symbols_backend::api::Variable::GetName, &symbols_backend::api::Variable::SetName)
      .property("type", &symbols_backend::api::Variable::GetType, &symbols_backend::api::Variable::SetType)
      .property("typedefs", &symbols_backend::api::Variable::GetTypedefs, &symbols_backend::api::Variable::SetTypedefs)
      ;

  emscripten::class_<symbols_backend::api::FieldInfo>("FieldInfo")
      .constructor<>()
      .property("name", OptionalGetter(&symbols_backend::api::FieldInfo::GetName), OptionalSetter(&symbols_backend::api::FieldInfo::SetName))
      .property("offset", &symbols_backend::api::FieldInfo::GetOffset, &symbols_backend::api::FieldInfo::SetOffset)
      .property("typeId", &symbols_backend::api::FieldInfo::GetTypeId, &symbols_backend::api::FieldInfo::SetTypeId)
      ;

  emscripten::class_<symbols_backend::api::Enumerator>("Enumerator")
      .constructor<>()
      .property("name", &symbols_backend::api::Enumerator::GetName, &symbols_backend::api::Enumerator::SetName)
      .property("value", &symbols_backend::api::Enumerator::GetValue, &symbols_backend::api::Enumerator::SetValue)
      .property("typeId", &symbols_backend::api::Enumerator::GetTypeId, &symbols_backend::api::Enumerator::SetTypeId)
      ;

  emscripten::class_<symbols_backend::api::TypeInfo>("TypeInfo")
      .constructor<>()
      .property("typeNames", &symbols_backend::api::TypeInfo::GetTypeNames, &symbols_backend::api::TypeInfo::SetTypeNames)
      .property("typeId", &symbols_backend::api::TypeInfo::GetTypeId, &symbols_backend::api::TypeInfo::SetTypeId)
      .property("alignment", &symbols_backend::api::TypeInfo::GetAlignment, &symbols_backend::api::TypeInfo::SetAlignment)
      .property("size", &symbols_backend::api::TypeInfo::GetSize, &symbols_backend::api::TypeInfo::SetSize)
      .property("canExpand", &symbols_backend::api::TypeInfo::GetCanExpand, &symbols_backend::api::TypeInfo::SetCanExpand)
      .property("hasValue", &symbols_backend::api::TypeInfo::GetHasValue, &symbols_backend::api::TypeInfo::SetHasValue)
      .property("arraySize", OptionalGetter(&symbols_backend::api::TypeInfo::GetArraySize), OptionalSetter(&symbols_backend::api::TypeInfo::SetArraySize))
      .property("isPointer", &symbols_backend::api::TypeInfo::GetIsPointer, &symbols_backend::api::TypeInfo::SetIsPointer)
      .property("members", &symbols_backend::api::TypeInfo::GetMembers, &symbols_backend::api::TypeInfo::SetMembers)
      .property("enumerators", &symbols_backend::api::TypeInfo::GetEnumerators, &symbols_backend::api::TypeInfo::SetEnumerators)
      ;

  emscripten::class_<symbols_backend::api::AddRawModuleResponse>("AddRawModuleResponse")
      .constructor<>()
      .property("sources", &symbols_backend::api::AddRawModuleResponse::GetSources, &symbols_backend::api::AddRawModuleResponse::SetSources)
      .property("dwos", &symbols_backend::api::AddRawModuleResponse::GetDwos, &symbols_backend::api::AddRawModuleResponse::SetDwos)
      .property("error", OptionalGetter(&symbols_backend::api::AddRawModuleResponse::GetError), OptionalSetter(&symbols_backend::api::AddRawModuleResponse::SetError))
      ;

  emscripten::class_<symbols_backend::api::SourceLocationToRawLocationResponse>("SourceLocationToRawLocationResponse")
      .constructor<>()
      .property("rawLocationRanges", &symbols_backend::api::SourceLocationToRawLocationResponse::GetRawLocationRanges, &symbols_backend::api::SourceLocationToRawLocationResponse::SetRawLocationRanges)
      .property("error", OptionalGetter(&symbols_backend::api::SourceLocationToRawLocationResponse::GetError), OptionalSetter(&symbols_backend::api::SourceLocationToRawLocationResponse::SetError))
      ;

  emscripten::class_<symbols_backend::api::RawLocationToSourceLocationResponse>("RawLocationToSourceLocationResponse")
      .constructor<>()
      .property("sourceLocation", &symbols_backend::api::RawLocationToSourceLocationResponse::GetSourceLocation, &symbols_backend::api::RawLocationToSourceLocationResponse::SetSourceLocation)
      .property("error", OptionalGetter(&symbols_backend::api::RawLocationToSourceLocationResponse::GetError), OptionalSetter(&symbols_backend::api::RawLocationToSourceLocationResponse::SetError))
      ;

  emscripten::class_<symbols_backend::api::ListVariablesInScopeResponse>("ListVariablesInScopeResponse")
      .constructor<>()
      .property("variable", &symbols_backend::api::ListVariablesInScopeResponse::GetVariable, &symbols_backend::api::ListVariablesInScopeResponse::SetVariable)
      .property("error", OptionalGetter(&symbols_backend::api::ListVariablesInScopeResponse::GetError), OptionalSetter(&symbols_backend::api::ListVariablesInScopeResponse::SetError))
      ;

  emscripten::class_<symbols_backend::api::GetFunctionInfoResponse>("GetFunctionInfoResponse")
      .constructor<>()
      .property("functionNames", &symbols_backend::api::GetFunctionInfoResponse::GetFunctionNames, &symbols_backend::api::GetFunctionInfoResponse::SetFunctionNames)
      .property("missingSymbolFiles", &symbols_backend::api::GetFunctionInfoResponse::GetMissingSymbolFiles, &symbols_backend::api::GetFunctionInfoResponse::SetMissingSymbolFiles)
      .property("error", OptionalGetter(&symbols_backend::api::GetFunctionInfoResponse::GetError), OptionalSetter(&symbols_backend::api::GetFunctionInfoResponse::SetError))
      ;

  emscripten::class_<symbols_backend::api::GetInlinedFunctionRangesResponse>("GetInlinedFunctionRangesResponse")
      .constructor<>()
      .property("rawLocationRanges", &symbols_backend::api::GetInlinedFunctionRangesResponse::GetRawLocationRanges, &symbols_backend::api::GetInlinedFunctionRangesResponse::SetRawLocationRanges)
      .property("error", OptionalGetter(&symbols_backend::api::GetInlinedFunctionRangesResponse::GetError), OptionalSetter(&symbols_backend::api::GetInlinedFunctionRangesResponse::SetError))
      ;

  emscripten::class_<symbols_backend::api::GetInlinedCalleesRangesResponse>("GetInlinedCalleesRangesResponse")
      .constructor<>()
      .property("rawLocationRanges", &symbols_backend::api::GetInlinedCalleesRangesResponse::GetRawLocationRanges, &symbols_backend::api::GetInlinedCalleesRangesResponse::SetRawLocationRanges)
      .property("error", OptionalGetter(&symbols_backend::api::GetInlinedCalleesRangesResponse::GetError), OptionalSetter(&symbols_backend::api::GetInlinedCalleesRangesResponse::SetError))
      ;

  emscripten::class_<symbols_backend::api::GetMappedLinesResponse>("GetMappedLinesResponse")
      .constructor<>()
      .property("MappedLines", &symbols_backend::api::GetMappedLinesResponse::GetMappedLines, &symbols_backend::api::GetMappedLinesResponse::SetMappedLines)
      .property("error", OptionalGetter(&symbols_backend::api::GetMappedLinesResponse::GetError), OptionalSetter(&symbols_backend::api::GetMappedLinesResponse::SetError))
      ;

  emscripten::class_<symbols_backend::api::EvaluateExpressionResponse>("EvaluateExpressionResponse")
      .constructor<>()
      .property("typeInfos", &symbols_backend::api::EvaluateExpressionResponse::GetTypeInfos, &symbols_backend::api::EvaluateExpressionResponse::SetTypeInfos)
      .property("root", &symbols_backend::api::EvaluateExpressionResponse::GetRoot, &symbols_backend::api::EvaluateExpressionResponse::SetRoot)
      .property("displayValue", OptionalGetter(&symbols_backend::api::EvaluateExpressionResponse::GetDisplayValue), OptionalSetter(&symbols_backend::api::EvaluateExpressionResponse::SetDisplayValue))
      .property("location", OptionalGetter(&symbols_backend::api::EvaluateExpressionResponse::GetLocation), OptionalSetter(&symbols_backend::api::EvaluateExpressionResponse::SetLocation))
      .property("memoryAddress", OptionalGetter(&symbols_backend::api::EvaluateExpressionResponse::GetMemoryAddress), OptionalSetter(&symbols_backend::api::EvaluateExpressionResponse::SetMemoryAddress))
      .property("data", OptionalGetter(&symbols_backend::api::EvaluateExpressionResponse::GetData), OptionalSetter(&symbols_backend::api::EvaluateExpressionResponse::SetData))
      .property("error", OptionalGetter(&symbols_backend::api::EvaluateExpressionResponse::GetError), OptionalSetter(&symbols_backend::api::EvaluateExpressionResponse::SetError))
      ;
  emscripten::register_vector<std::string>("StringArray");
  emscripten::register_vector<symbols_backend::api::RawLocationRange>("RawLocationRangeArray");
  emscripten::register_vector<symbols_backend::api::SourceLocation>("SourceLocationArray");
  emscripten::register_vector<symbols_backend::api::Variable>("VariableArray");
  emscripten::register_vector<int32_t>("Int32_TArray");
  emscripten::register_vector<symbols_backend::api::TypeInfo>("TypeInfoArray");
  emscripten::register_vector<symbols_backend::api::FieldInfo>("FieldInfoArray");
  emscripten::register_vector<symbols_backend::api::Enumerator>("EnumeratorArray");
  emscripten::register_vector<uint8_t>("ByteArray");

  emscripten::class_<symbols_backend::api::ApiContext>("DWARFSymbolsPluginBase")
      .constructor<>()
      .function("AddRawModule",
                &symbols_backend::DWARFSymbolsPlugin::AddRawModule)
      .function("RemoveRawModule",
                &symbols_backend::DWARFSymbolsPlugin::RemoveRawModule)
      .function("SourceLocationToRawLocation",
                &symbols_backend::DWARFSymbolsPlugin::SourceLocationToRawLocation)
      .function("RawLocationToSourceLocation",
                &symbols_backend::DWARFSymbolsPlugin::RawLocationToSourceLocation)
      .function("ListVariablesInScope",
                &symbols_backend::DWARFSymbolsPlugin::ListVariablesInScope)
      .function("GetFunctionInfo",
                &symbols_backend::DWARFSymbolsPlugin::GetFunctionInfo)
      .function("GetInlinedFunctionRanges",
                &symbols_backend::DWARFSymbolsPlugin::GetInlinedFunctionRanges)
      .function("GetInlinedCalleesRanges",
                &symbols_backend::DWARFSymbolsPlugin::GetInlinedCalleesRanges)
      .function("GetMappedLines",
                &symbols_backend::DWARFSymbolsPlugin::GetMappedLines)
      .function("EvaluateExpression",
                &symbols_backend::DWARFSymbolsPlugin::EvaluateExpression)
      ;
  emscripten::class_<symbols_backend::DWARFSymbolsPlugin, emscripten::base<symbols_backend::api::ApiContext>>("DWARFSymbolsPlugin")
      .constructor<>();

}
