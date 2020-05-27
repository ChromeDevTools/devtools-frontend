// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "APIImpl.h"
#include "symbol-server-config.h"

#include <string>
#include <vector>
#include "Modules.h"

namespace symbol_server {
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
Error MakeNotFoundError(llvm::StringRef module_id) {
  return MakeError(Error::Code::kNotFound,
                   "Module with id '" + module_id + "' not found");
}

Variable::Scope ToApiScope(lldb::ValueType scope) {
  switch (scope) {
    case lldb::eValueTypeVariableGlobal:
      return Variable::Scope::kGlobal;
    case lldb::eValueTypeVariableArgument:
      return Variable::Scope::kParameter;
    case lldb::eValueTypeVariableLocal:
    case lldb::eValueTypeVariableStatic:
      return Variable::Scope::kLocal;
    default:
      llvm::errs() << "Got variable scope " << scope << "\n";
      llvm_unreachable("Unhandled variable scope");
  }
}
}  // namespace

// Notify the plugin about a new script
AddRawModuleResponse ApiContext::AddRawModule(
    std::string raw_module_id,            // A raw module identifier
    llvm::Optional<std::string> symbols,  // A URL to file containing symbols in
                                          // a plugin-specific format.
    RawModule raw_module                  // The new raw module
) {
  if (modules_.DeleteModule(raw_module_id)) {
    llvm::errs() << "Deleted duplicate module " << raw_module_id << "\n";
  }
  auto* m = [this, &raw_module, &raw_module_id]() -> const WasmModule* {
    if (auto code = raw_module.GetCode()) {
      if (!code->empty()) {
        return modules_.GetModuleFromCode(raw_module_id, *code);
      }
    }

    if (auto url = raw_module.GetUrl()) {
      if (!url->empty()) {
        return modules_.GetModuleFromUrl(raw_module_id, *url);
      }
    }
    return nullptr;
  }();

  AddRawModuleResponse response;
  if (!m) {
    response.SetError(MakeNotFoundError(raw_module_id));
    return response;
  }

  auto sources = m->GetSourceScripts();
  response.SetSources({sources.begin(), sources.end()});
  return response;
};

// Find locations in raw modules from a location in a source file
SourceLocationToRawLocationResponse ApiContext::SourceLocationToRawLocation(
    std::string raw_module_id,
    std::string source_file,
    int32_t line_number,
    int32_t column_number) {
  SourceLocationToRawLocationResponse response;
  auto* module = modules_.FindModule(raw_module_id);
  if (!module) {
    response.SetError(MakeNotFoundError(source_file));
    return response;
  }

  llvm::SmallVector<RawLocation, 1> locations;
  for (auto offset : module->GetOffsetFromSourceLocation(
           {source_file, static_cast<uint32_t>(line_number + 1),
            static_cast<uint16_t>(column_number + 1)})) {
    RawLocation& location = locations.emplace_back();
    location.SetRawModuleId(raw_module_id);
    location.SetCodeOffset(offset);
  }
  response.SetRawLocation({locations.begin(), locations.end()});
  return response;
};

// Find locations in source files from a location in a raw module
RawLocationToSourceLocationResponse ApiContext::RawLocationToSourceLocation(
    std::string raw_module_id,
    int32_t code_offset) {
  RawLocationToSourceLocationResponse response;
  auto* module = modules_.FindModule(raw_module_id);
  if (!module) {
    response.SetError(MakeNotFoundError(raw_module_id));
    return response;
  }

  llvm::SmallVector<SourceLocation, 1> locations;
  for (auto& source_loc : module->GetSourceLocationFromOffset(code_offset)) {
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
    int32_t code_offset) {
  ListVariablesInScopeResponse response;
  auto* module = modules_.FindModule(raw_module_id);
  if (!module) {
    response.SetError(MakeNotFoundError(raw_module_id));
    return response;
  }

  llvm::SmallVector<Variable, 1> variables;
  for (auto& var : module->GetVariablesInScope(code_offset)) {
    Variable& variable = variables.emplace_back();
    variable.SetScope(ToApiScope(var.scope));
    variable.SetName(var.name);
    variable.SetType(var.type);
  }
  response.SetVariable({variables.begin(), variables.end()});
  return response;
}

// Evaluate the content of a variable in a given lexical scope
EvaluateVariableResponse ApiContext::EvaluateVariable(
    std::string name,     // Name of the variable to look up
    RawLocation location  // The lexical scope to evaluate the variable
) {
  EvaluateVariableResponse response;
#ifdef SYMBOL_SERVER_BUILD_FORMATTERS
  std::string raw_module_id = location.GetRawModuleId();
  auto* module = modules_.FindModule(raw_module_id);
  if (!module) {
    response.SetError(MakeNotFoundError(raw_module_id));
    return response;
  }

  auto format_script = module->GetVariableFormatScript(
      name, location.GetCodeOffset(), modules_.Printer());
  if (!format_script) {
    response.SetError(
        MakeError(Error::Code::kInternalError, format_script.takeError()));
    return response;
  }

  RawModule raw_module;
  raw_module.SetCode(Binary{
      reinterpret_cast<const uint8_t*>(format_script->get()->getBufferStart()),
      reinterpret_cast<const uint8_t*>(format_script->get()->getBufferEnd())});
  response.SetValue(std::move(raw_module));
  return response;
#else
  response.SetError(MakeError(Error::Code::kInternalError,
                              "Formatter library not available"));
  return response;
#endif
}  // namespace api

}  // namespace api
}  // namespace symbol_server
