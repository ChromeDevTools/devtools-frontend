// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// THIS IS GENERATED CODE, DO NOT MODIFY!
// clang-format off

#ifndef SYMBOL_SERVER_API_H_
#define SYMBOL_SERVER_API_H_

#include <string>
#include <vector>

#include "llvm/ADT/Optional.h"

namespace symbol_server {
namespace api {
// Error details
class Error {
 public:
  enum class Code {
    kInternalError,
    kNotFound
  };
 private:
  Code code_; // An error code
  std::string message_; // The error message

 public:
  Error() = default;
  Code GetCode() const { return code_; }
  void SetCode(Code value) { code_ = std::move(value); }
  std::string GetMessage() const { return message_; }
  void SetMessage(std::string value) { message_ = std::move(value); }
};

class RawModule {
  llvm::Optional<std::string> url_; // The origin url for the raw module, if it exists
  llvm::Optional<std::vector<uint8_t>> code_; // The source or bytecode defining the JS script or wasm module

 public:
  RawModule() = default;
  llvm::Optional<std::string> GetUrl() const { return url_; }
  void SetUrl(llvm::Optional<std::string> value) { url_ = std::move(value); }
  llvm::Optional<std::vector<uint8_t>> GetCode() const { return code_; }
  void SetCode(llvm::Optional<std::vector<uint8_t>> value) { code_ = std::move(value); }
};

// Offsets in raw modules
class RawLocation {
  std::string raw_module_id_; // Module identifier
  int32_t code_offset_; // Offset of the location in the raw module

 public:
  RawLocation() = default;
  std::string GetRawModuleId() const { return raw_module_id_; }
  void SetRawModuleId(std::string value) { raw_module_id_ = std::move(value); }
  int32_t GetCodeOffset() const { return code_offset_; }
  void SetCodeOffset(int32_t value) { code_offset_ = std::move(value); }
};

// Locations in source files
class SourceLocation {
  std::string raw_module_id_; // Module identifier
  std::string source_file_; // Url of the source file
  int32_t line_number_; // Line number of the location in the source file
  int32_t column_number_; // Column number of the location in the source file

 public:
  SourceLocation() = default;
  std::string GetRawModuleId() const { return raw_module_id_; }
  void SetRawModuleId(std::string value) { raw_module_id_ = std::move(value); }
  std::string GetSourceFile() const { return source_file_; }
  void SetSourceFile(std::string value) { source_file_ = std::move(value); }
  int32_t GetLineNumber() const { return line_number_; }
  void SetLineNumber(int32_t value) { line_number_ = std::move(value); }
  int32_t GetColumnNumber() const { return column_number_; }
  void SetColumnNumber(int32_t value) { column_number_ = std::move(value); }
};

// A source language variable
class Variable {
 public:
  enum class Scope {
    kLocal,
    kParameter,
    kGlobal
  };
 private:
  Scope scope_; // Scope of the variable
  std::string name_; // Name of the variable
  std::string type_; // Type of the variable

 public:
  Variable() = default;
  Scope GetScope() const { return scope_; }
  void SetScope(Scope value) { scope_ = std::move(value); }
  std::string GetName() const { return name_; }
  void SetName(std::string value) { name_ = std::move(value); }
  std::string GetType() const { return type_; }
  void SetType(std::string value) { type_ = std::move(value); }
};

// Return type of the AddRawModule command
class AddRawModuleResponse {
  std::vector<std::string> sources_; // The original source files the raw module was compiled from.
                                     // Filenames are in URL format
  llvm::Optional<Error> error_; // Error details if the raw module couldn't be handled

 public:
  AddRawModuleResponse() = default;
  std::vector<std::string> GetSources() const { return sources_; }
  void SetSources(std::vector<std::string> value) { sources_ = std::move(value); }
  llvm::Optional<Error> GetError() const { return error_; }
  void SetError(llvm::Optional<Error> value) { error_ = std::move(value); }
};

// Return type of the SourceLocationToRawLocation command
class SourceLocationToRawLocationResponse {
  std::vector<RawLocation> raw_location_; // The raw locations matching the source locations
  llvm::Optional<Error> error_; // Error details if the command failed

 public:
  SourceLocationToRawLocationResponse() = default;
  std::vector<RawLocation> GetRawLocation() const { return raw_location_; }
  void SetRawLocation(std::vector<RawLocation> value) { raw_location_ = std::move(value); }
  llvm::Optional<Error> GetError() const { return error_; }
  void SetError(llvm::Optional<Error> value) { error_ = std::move(value); }
};

// Return type of the RawLocationToSourceLocation command
class RawLocationToSourceLocationResponse {
  std::vector<SourceLocation> source_location_; // The source locations matching the raw locations
  llvm::Optional<Error> error_; // Error details if the command failed

 public:
  RawLocationToSourceLocationResponse() = default;
  std::vector<SourceLocation> GetSourceLocation() const { return source_location_; }
  void SetSourceLocation(std::vector<SourceLocation> value) { source_location_ = std::move(value); }
  llvm::Optional<Error> GetError() const { return error_; }
  void SetError(llvm::Optional<Error> value) { error_ = std::move(value); }
};

// Return type of the ListVariablesInScope command
class ListVariablesInScopeResponse {
  std::vector<Variable> variable_; // The variables present in the scope
  llvm::Optional<Error> error_; // Error details if the command failed

 public:
  ListVariablesInScopeResponse() = default;
  std::vector<Variable> GetVariable() const { return variable_; }
  void SetVariable(std::vector<Variable> value) { variable_ = std::move(value); }
  llvm::Optional<Error> GetError() const { return error_; }
  void SetError(llvm::Optional<Error> value) { error_ = std::move(value); }
};

// Return type of the EvaluateVariable command
class EvaluateVariableResponse {
  RawModule value_; // A raw module containing wasm bytecode that, when called, will
                    // render the variable as a json with keys `name`, `type`, `value`
  llvm::Optional<Error> error_; // error details if the command failed

 public:
  EvaluateVariableResponse() = default;
  RawModule GetValue() const { return value_; }
  void SetValue(RawModule value) { value_ = std::move(value); }
  llvm::Optional<Error> GetError() const { return error_; }
  void SetError(llvm::Optional<Error> value) { error_ = std::move(value); }
};

class DWARFSymbolsApi {
 public:  // Notify the plugin about a new script
  virtual AddRawModuleResponse AddRawModule(
    std::string raw_module_id, //A raw module identifier
    llvm::Optional<std::string> symbols, //A URL to file containing symbols in a plugin-specific format.
    RawModule raw_module //The new raw module
  ) = 0;

  // Find locations in raw modules from a location in a source file
  virtual SourceLocationToRawLocationResponse SourceLocationToRawLocation(
    std::string raw_module_id, //Module identifier
    std::string source_file, //Url of the source file
    int32_t line_number, //Line number of the location in the source file
    int32_t column_number //Column number of the location in the source file
  ) = 0;

  // Find locations in source files from a location in a raw module
  virtual RawLocationToSourceLocationResponse RawLocationToSourceLocation(
    std::string raw_module_id, //Module identifier
    int32_t code_offset //Offset of the location in the raw module
  ) = 0;

  // List all variables in lexical scope at a location in a raw module
  virtual ListVariablesInScopeResponse ListVariablesInScope(
    std::string raw_module_id, //Module identifier
    int32_t code_offset //Offset of the location in the raw module
  ) = 0;

  // Evaluate the content of a variable in a given lexical scope
  virtual EvaluateVariableResponse EvaluateVariable(
    std::string name, //Name of the variable to look up
    RawLocation location //The lexical scope to evaluate the variable
  ) = 0;

};
}  // namespace api
}  // namespace symbol_server


#endif // SYMBOL_SERVER_API_H_
