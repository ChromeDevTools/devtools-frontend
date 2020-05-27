// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// THIS IS GENERATED CODE, DO NOT MODIFY!
// clang-format off

#include "api.h"

#include "llvm/ADT/StringRef.h"
#include "llvm/Support/ErrorHandling.h"
#include "llvm/Support/Base64.h"
#include "llvm/Support/JSON.h"

namespace symbol_server {
namespace api {

template <typename T>
llvm::json::Value toJSON(const llvm::Optional<T>& Opt) { // NOLINT
  return llvm::json::toJSON(Opt);
}

llvm::json::Value ToBase64(const llvm::Optional<std::vector<uint8_t>> &out) {
  if (!out) return "";
  if (out->size() == 0) return "";
  return llvm::encodeBase64(*out);
}

bool FromBase64(const llvm::json::Value& value, std::vector<uint8_t> *out) {
  llvm_unreachable("Not implemented");
}

template <typename T>
llvm::Optional<T> GetValue(const llvm::json::Object* object, llvm::StringRef key) {
  if (!object) {
    return llvm::None;
  }
  if (const llvm::json::Value* value = object->get(key)) {
    T result;
    if (fromJSON(*value, result)) {
      return result;
    }
  }
  return llvm::None;
}

template <>
llvm::Optional<std::vector<uint8_t>> GetValue(const llvm::json::Object* object, llvm::StringRef key) {
  if (!object) {
    return llvm::None;
  }
  if (const llvm::json::Value* value = object->get(key)) {
    std::vector<uint8_t> result;
    if (FromBase64(*value, &result)) {
      return result;
    }
  }
  return llvm::None;
}

// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::Error& out);
// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::Error& out);
// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::RawModule& out);
// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::RawModule& out);
// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::RawLocation& out);
// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::RawLocation& out);
// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::SourceLocation& out);
// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::SourceLocation& out);
// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::Variable& out);
// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::Variable& out);
// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::AddRawModuleResponse& out);
// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::AddRawModuleResponse& out);
// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::SourceLocationToRawLocationResponse& out);
// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::SourceLocationToRawLocationResponse& out);
// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::RawLocationToSourceLocationResponse& out);
// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::RawLocationToSourceLocationResponse& out);
// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::ListVariablesInScopeResponse& out);
// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::ListVariablesInScopeResponse& out);
// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::EvaluateVariableResponse& out);
// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::EvaluateVariableResponse& out);
// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::Error::Code& out);
// NOLINTNEXTLINE
llvm::json::Value toJSON(symbol_server::api::Error::Code out);
// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::Variable::Scope& out);
// NOLINTNEXTLINE
llvm::json::Value toJSON(symbol_server::api::Variable::Scope out);
// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::Error& out) {
  if (auto* obj = e.getAsObject()) {
    if (auto value = GetValue<symbol_server::api::Error::Code>(obj, "code")) {
      out.SetCode(*value);
    }
    if (auto value = GetValue<std::string>(obj, "message")) {
      out.SetMessage(*value);
    }
    return true;
  }
  return false;
}

// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::Error& out) {
    return llvm::json::Object({      {"code", toJSON(out.GetCode())},
      {"message", out.GetMessage()},
});
}

// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::RawModule& out) {
  if (auto* obj = e.getAsObject()) {
    if (auto value = GetValue<std::string>(obj, "url")) {
      out.SetUrl(*value);
    }
    if (auto value = GetValue<std::vector<uint8_t>>(obj, "code")) {
      out.SetCode(*value);
    }
    return true;
  }
  return false;
}

// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::RawModule& out) {
    return llvm::json::Object({      {"url", out.GetUrl()},
      {"code", ToBase64(out.GetCode())},
});
}

// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::RawLocation& out) {
  if (auto* obj = e.getAsObject()) {
    if (auto value = GetValue<std::string>(obj, "rawModuleId")) {
      out.SetRawModuleId(*value);
    }
    if (auto value = GetValue<int32_t>(obj, "codeOffset")) {
      out.SetCodeOffset(*value);
    }
    return true;
  }
  return false;
}

// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::RawLocation& out) {
    return llvm::json::Object({      {"rawModuleId", out.GetRawModuleId()},
      {"codeOffset", out.GetCodeOffset()},
});
}

// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::SourceLocation& out) {
  if (auto* obj = e.getAsObject()) {
    if (auto value = GetValue<std::string>(obj, "rawModuleId")) {
      out.SetRawModuleId(*value);
    }
    if (auto value = GetValue<std::string>(obj, "sourceFile")) {
      out.SetSourceFile(*value);
    }
    if (auto value = GetValue<int32_t>(obj, "lineNumber")) {
      out.SetLineNumber(*value);
    }
    if (auto value = GetValue<int32_t>(obj, "columnNumber")) {
      out.SetColumnNumber(*value);
    }
    return true;
  }
  return false;
}

// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::SourceLocation& out) {
    return llvm::json::Object({      {"rawModuleId", out.GetRawModuleId()},
      {"sourceFile", out.GetSourceFile()},
      {"lineNumber", out.GetLineNumber()},
      {"columnNumber", out.GetColumnNumber()},
});
}

// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::Variable& out) {
  if (auto* obj = e.getAsObject()) {
    if (auto value = GetValue<symbol_server::api::Variable::Scope>(obj, "scope")) {
      out.SetScope(*value);
    }
    if (auto value = GetValue<std::string>(obj, "name")) {
      out.SetName(*value);
    }
    if (auto value = GetValue<std::string>(obj, "type")) {
      out.SetType(*value);
    }
    return true;
  }
  return false;
}

// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::Variable& out) {
    return llvm::json::Object({      {"scope", toJSON(out.GetScope())},
      {"name", out.GetName()},
      {"type", out.GetType()},
});
}

// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::AddRawModuleResponse& out) {
  if (auto* obj = e.getAsObject()) {
    if (auto value = GetValue<std::vector<std::string>>(obj, "sources")) {
      out.SetSources(*value);
    }
    if (auto value = GetValue<symbol_server::api::Error>(obj, "error")) {
      out.SetError(*value);
    }
    return true;
  }
  return false;
}

// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::AddRawModuleResponse& out) {
    return llvm::json::Object({      {"sources", out.GetSources()},
      {"error", toJSON(out.GetError())},
});
}

// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::SourceLocationToRawLocationResponse& out) {
  if (auto* obj = e.getAsObject()) {
    if (auto value = GetValue<std::vector<symbol_server::api::RawLocation>>(obj, "rawLocation")) {
      out.SetRawLocation(*value);
    }
    if (auto value = GetValue<symbol_server::api::Error>(obj, "error")) {
      out.SetError(*value);
    }
    return true;
  }
  return false;
}

// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::SourceLocationToRawLocationResponse& out) {
    return llvm::json::Object({      {"rawLocation", out.GetRawLocation()},
      {"error", toJSON(out.GetError())},
});
}

// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::RawLocationToSourceLocationResponse& out) {
  if (auto* obj = e.getAsObject()) {
    if (auto value = GetValue<std::vector<symbol_server::api::SourceLocation>>(obj, "sourceLocation")) {
      out.SetSourceLocation(*value);
    }
    if (auto value = GetValue<symbol_server::api::Error>(obj, "error")) {
      out.SetError(*value);
    }
    return true;
  }
  return false;
}

// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::RawLocationToSourceLocationResponse& out) {
    return llvm::json::Object({      {"sourceLocation", out.GetSourceLocation()},
      {"error", toJSON(out.GetError())},
});
}

// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::ListVariablesInScopeResponse& out) {
  if (auto* obj = e.getAsObject()) {
    if (auto value = GetValue<std::vector<symbol_server::api::Variable>>(obj, "variable")) {
      out.SetVariable(*value);
    }
    if (auto value = GetValue<symbol_server::api::Error>(obj, "error")) {
      out.SetError(*value);
    }
    return true;
  }
  return false;
}

// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::ListVariablesInScopeResponse& out) {
    return llvm::json::Object({      {"variable", out.GetVariable()},
      {"error", toJSON(out.GetError())},
});
}

// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::EvaluateVariableResponse& out) {
  if (auto* obj = e.getAsObject()) {
    if (auto value = GetValue<symbol_server::api::RawModule>(obj, "value")) {
      out.SetValue(*value);
    }
    if (auto value = GetValue<symbol_server::api::Error>(obj, "error")) {
      out.SetError(*value);
    }
    return true;
  }
  return false;
}

// NOLINTNEXTLINE
llvm::json::Value toJSON(const symbol_server::api::EvaluateVariableResponse& out) {
    return llvm::json::Object({      {"value", toJSON(out.GetValue())},
      {"error", toJSON(out.GetError())},
});
}

// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::Error::Code& out) {
  if (auto obj = e.getAsString()) {
    if (*obj == "INTERNAL_ERROR") {
      out = symbol_server::api::Error::Code::kInternalError;
      return true;
    }
    if (*obj == "NOT_FOUND") {
      out = symbol_server::api::Error::Code::kNotFound;
      return true;
    }
    }
  return false;
}

// NOLINTNEXTLINE
llvm::json::Value toJSON(symbol_server::api::Error::Code out) {
    switch(out) {
    case symbol_server::api::Error::Code::kInternalError: return "INTERNAL_ERROR";
    case symbol_server::api::Error::Code::kNotFound: return "NOT_FOUND";
    }
  return {};
}

// NOLINTNEXTLINE
bool fromJSON(const llvm::json::Value& e, symbol_server::api::Variable::Scope& out) {
  if (auto obj = e.getAsString()) {
    if (*obj == "LOCAL") {
      out = symbol_server::api::Variable::Scope::kLocal;
      return true;
    }
    if (*obj == "PARAMETER") {
      out = symbol_server::api::Variable::Scope::kParameter;
      return true;
    }
    if (*obj == "GLOBAL") {
      out = symbol_server::api::Variable::Scope::kGlobal;
      return true;
    }
    }
  return false;
}

// NOLINTNEXTLINE
llvm::json::Value toJSON(symbol_server::api::Variable::Scope out) {
    switch(out) {
    case symbol_server::api::Variable::Scope::kLocal: return "LOCAL";
    case symbol_server::api::Variable::Scope::kParameter: return "PARAMETER";
    case symbol_server::api::Variable::Scope::kGlobal: return "GLOBAL";
    }
  return {};
}


llvm::json::Value InvalidMethodError(llvm::StringRef method) {
  Error e;
  e.SetCode(Error::Code::kInternalError);
  e.SetMessage(("Invalid method '" + method + "'").str());
  return toJSON(e);
}

llvm::json::Value MissingArgumentError(llvm::StringRef argument) {
  Error e;
  e.SetCode(Error::Code::kInternalError);
  e.SetMessage(("JSON Error: missing non-optional argument '" + argument +
                "'").str());
  return toJSON(e);
}

llvm::Expected<llvm::json::Value> CallApiMethod(api::DWARFSymbolsApi *api,
                                               llvm::StringRef method,
                                               llvm::json::Value params) {
  llvm::json::Object *obj = params.getAsObject();
    if (method == "addRawModule") {
      auto param_0 = api::GetValue<std::string>(obj, "rawModuleId");
      if (!param_0) { return MissingArgumentError("rawModuleId"); }
      auto param_1 = api::GetValue<std::string>(obj, "symbols");
      auto param_2 = api::GetValue<symbol_server::api::RawModule>(obj, "rawModule");
      if (!param_2) { return MissingArgumentError("rawModule"); }
      return toJSON(api->AddRawModule(*param_0, param_1, *param_2));
    }
    if (method == "sourceLocationToRawLocation") {
      auto param_0 = api::GetValue<std::string>(obj, "rawModuleId");
      if (!param_0) { return MissingArgumentError("rawModuleId"); }
      auto param_1 = api::GetValue<std::string>(obj, "sourceFile");
      if (!param_1) { return MissingArgumentError("sourceFile"); }
      auto param_2 = api::GetValue<int32_t>(obj, "lineNumber");
      if (!param_2) { return MissingArgumentError("lineNumber"); }
      auto param_3 = api::GetValue<int32_t>(obj, "columnNumber");
      if (!param_3) { return MissingArgumentError("columnNumber"); }
      return toJSON(api->SourceLocationToRawLocation(*param_0, *param_1, *param_2, *param_3));
    }
    if (method == "rawLocationToSourceLocation") {
      auto param_0 = api::GetValue<std::string>(obj, "rawModuleId");
      if (!param_0) { return MissingArgumentError("rawModuleId"); }
      auto param_1 = api::GetValue<int32_t>(obj, "codeOffset");
      if (!param_1) { return MissingArgumentError("codeOffset"); }
      return toJSON(api->RawLocationToSourceLocation(*param_0, *param_1));
    }
    if (method == "listVariablesInScope") {
      auto param_0 = api::GetValue<std::string>(obj, "rawModuleId");
      if (!param_0) { return MissingArgumentError("rawModuleId"); }
      auto param_1 = api::GetValue<int32_t>(obj, "codeOffset");
      if (!param_1) { return MissingArgumentError("codeOffset"); }
      return toJSON(api->ListVariablesInScope(*param_0, *param_1));
    }
    if (method == "evaluateVariable") {
      auto param_0 = api::GetValue<std::string>(obj, "name");
      if (!param_0) { return MissingArgumentError("name"); }
      auto param_1 = api::GetValue<symbol_server::api::RawLocation>(obj, "location");
      if (!param_1) { return MissingArgumentError("location"); }
      return toJSON(api->EvaluateVariable(*param_0, *param_1));
    }
  return InvalidMethodError(method);

}
}  // namespace api
}  // namespace symbol_server
