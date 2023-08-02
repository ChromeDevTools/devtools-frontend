// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// THIS IS GENERATED CODE, DO NOT MODIFY!
// clang-format off

#ifndef EXTENSIONS_CXX_DEBUGGING_API_H_
#define EXTENSIONS_CXX_DEBUGGING_API_H_

#include <string>
#include <vector>
#include <emscripten/val.h>

#include "llvm/ADT/Optional.h"

namespace symbols_backend {
namespace api {
// Error details
class Error {
 public:
  enum class Code {
    kInternalError,
    kProtocolError,
    kModuleNotFoundError,
    kEvalError
  };
 private:
  Code code_ = {}; // An error code
  std::string message_ = {}; // The error message

 public:
  Error() = default;
  virtual ~Error() = default;
  Code GetCode() const { return code_; }
  Error &SetCode(Code value) {
    code_ = std::move(value);
    return *this;
  }
  std::string GetMessage() const { return message_; }
  Error &SetMessage(std::string value) {
    message_ = std::move(value);
    return *this;
  }
};

// Offsets in raw modules
class RawLocationRange {
 private:
  std::string raw_module_id_ = {}; // Module identifier
  int32_t start_offset_ = {}; // Start offset of the code range in the raw module
  int32_t end_offset_ = {}; // Exclusive end offset of the code range in the raw module

 public:
  RawLocationRange() = default;
  virtual ~RawLocationRange() = default;
  std::string GetRawModuleId() const { return raw_module_id_; }
  RawLocationRange &SetRawModuleId(std::string value) {
    raw_module_id_ = std::move(value);
    return *this;
  }
  int32_t GetStartOffset() const { return start_offset_; }
  RawLocationRange &SetStartOffset(int32_t value) {
    start_offset_ = std::move(value);
    return *this;
  }
  int32_t GetEndOffset() const { return end_offset_; }
  RawLocationRange &SetEndOffset(int32_t value) {
    end_offset_ = std::move(value);
    return *this;
  }
};

// Offsets in raw modules
class RawLocation {
 private:
  std::string raw_module_id_ = {}; // Module identifier
  int32_t code_offset_ = {}; // Offset of the location in the raw module
  int32_t inline_frame_index_ = {}; // Index of inline call frame, 0 is top.

 public:
  RawLocation() = default;
  virtual ~RawLocation() = default;
  std::string GetRawModuleId() const { return raw_module_id_; }
  RawLocation &SetRawModuleId(std::string value) {
    raw_module_id_ = std::move(value);
    return *this;
  }
  int32_t GetCodeOffset() const { return code_offset_; }
  RawLocation &SetCodeOffset(int32_t value) {
    code_offset_ = std::move(value);
    return *this;
  }
  int32_t GetInlineFrameIndex() const { return inline_frame_index_; }
  RawLocation &SetInlineFrameIndex(int32_t value) {
    inline_frame_index_ = std::move(value);
    return *this;
  }
};

// Locations in source files
class SourceLocation {
 private:
  std::string raw_module_id_ = {}; // Module identifier
  std::string source_file_ = {}; // Url of the source file
  int32_t line_number_ = {}; // Line number of the location in the source file
  int32_t column_number_ = {}; // Column number of the location in the source file

 public:
  SourceLocation() = default;
  virtual ~SourceLocation() = default;
  std::string GetRawModuleId() const { return raw_module_id_; }
  SourceLocation &SetRawModuleId(std::string value) {
    raw_module_id_ = std::move(value);
    return *this;
  }
  std::string GetSourceFile() const { return source_file_; }
  SourceLocation &SetSourceFile(std::string value) {
    source_file_ = std::move(value);
    return *this;
  }
  int32_t GetLineNumber() const { return line_number_; }
  SourceLocation &SetLineNumber(int32_t value) {
    line_number_ = std::move(value);
    return *this;
  }
  int32_t GetColumnNumber() const { return column_number_; }
  SourceLocation &SetColumnNumber(int32_t value) {
    column_number_ = std::move(value);
    return *this;
  }
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
  Scope scope_ = {}; // Scope of the variable
  std::string name_ = {}; // Name of the variable
  std::string type_ = {}; // Type of the variable
  std::vector<std::string> typedefs_ = {};

 public:
  Variable() = default;
  virtual ~Variable() = default;
  Scope GetScope() const { return scope_; }
  Variable &SetScope(Scope value) {
    scope_ = std::move(value);
    return *this;
  }
  std::string GetName() const { return name_; }
  Variable &SetName(std::string value) {
    name_ = std::move(value);
    return *this;
  }
  std::string GetType() const { return type_; }
  Variable &SetType(std::string value) {
    type_ = std::move(value);
    return *this;
  }
  std::vector<std::string> GetTypedefs() const { return typedefs_; }
  Variable &SetTypedefs(std::vector<std::string> value) {
    typedefs_ = std::move(value);
    return *this;
  }
};

class FieldInfo {
 private:
  llvm::Optional<std::string> name_ = {};
  int32_t offset_ = {};
  std::string type_id_ = {};

 public:
  FieldInfo() = default;
  virtual ~FieldInfo() = default;
  llvm::Optional<std::string> GetName() const { return name_; }
  FieldInfo &SetName(llvm::Optional<std::string> value) {
    name_ = std::move(value);
    return *this;
  }
  int32_t GetOffset() const { return offset_; }
  FieldInfo &SetOffset(int32_t value) {
    offset_ = std::move(value);
    return *this;
  }
  std::string GetTypeId() const { return type_id_; }
  FieldInfo &SetTypeId(std::string value) {
    type_id_ = std::move(value);
    return *this;
  }
};

class Enumerator {
 private:
  std::string name_ = {};
  int64_t value_ = {};
  std::string type_id_ = {};

 public:
  Enumerator() = default;
  virtual ~Enumerator() = default;
  std::string GetName() const { return name_; }
  Enumerator &SetName(std::string value) {
    name_ = std::move(value);
    return *this;
  }
  int64_t GetValue() const { return value_; }
  Enumerator &SetValue(int64_t value) {
    value_ = std::move(value);
    return *this;
  }
  std::string GetTypeId() const { return type_id_; }
  Enumerator &SetTypeId(std::string value) {
    type_id_ = std::move(value);
    return *this;
  }
};

class TypeInfo {
 private:
  std::vector<std::string> type_names_ = {};
  std::string type_id_ = {};
  int32_t alignment_ = {};
  int32_t size_ = {};
  bool can_expand_ = {};
  bool has_value_ = {};
  llvm::Optional<int32_t> array_size_ = {};
  bool is_pointer_ = {};
  std::vector<FieldInfo> members_ = {};
  std::vector<Enumerator> enumerators_ = {};

 public:
  TypeInfo() = default;
  virtual ~TypeInfo() = default;
  std::vector<std::string> GetTypeNames() const { return type_names_; }
  TypeInfo &SetTypeNames(std::vector<std::string> value) {
    type_names_ = std::move(value);
    return *this;
  }
  std::string GetTypeId() const { return type_id_; }
  TypeInfo &SetTypeId(std::string value) {
    type_id_ = std::move(value);
    return *this;
  }
  int32_t GetAlignment() const { return alignment_; }
  TypeInfo &SetAlignment(int32_t value) {
    alignment_ = std::move(value);
    return *this;
  }
  int32_t GetSize() const { return size_; }
  TypeInfo &SetSize(int32_t value) {
    size_ = std::move(value);
    return *this;
  }
  bool GetCanExpand() const { return can_expand_; }
  TypeInfo &SetCanExpand(bool value) {
    can_expand_ = std::move(value);
    return *this;
  }
  bool GetHasValue() const { return has_value_; }
  TypeInfo &SetHasValue(bool value) {
    has_value_ = std::move(value);
    return *this;
  }
  llvm::Optional<int32_t> GetArraySize() const { return array_size_; }
  TypeInfo &SetArraySize(llvm::Optional<int32_t> value) {
    array_size_ = std::move(value);
    return *this;
  }
  bool GetIsPointer() const { return is_pointer_; }
  TypeInfo &SetIsPointer(bool value) {
    is_pointer_ = std::move(value);
    return *this;
  }
  std::vector<FieldInfo> GetMembers() const { return members_; }
  TypeInfo &SetMembers(std::vector<FieldInfo> value) {
    members_ = std::move(value);
    return *this;
  }
  std::vector<Enumerator> GetEnumerators() const { return enumerators_; }
  TypeInfo &SetEnumerators(std::vector<Enumerator> value) {
    enumerators_ = std::move(value);
    return *this;
  }
};

// Return type of the AddRawModule command
class AddRawModuleResponse {
 private:
  std::vector<std::string> sources_ = {}; // The original source files the raw module was compiled from. Filenames are in URL format
  std::vector<std::string> dwos_ = {}; // DWO filenames that might be lazily loaded. Used internally by the extension to set up emscripten filesystem.
  llvm::Optional<Error> error_ = {}; // Error details if the raw module couldn't be handled

 public:
  AddRawModuleResponse() = default;
  virtual ~AddRawModuleResponse() = default;
  std::vector<std::string> GetSources() const { return sources_; }
  AddRawModuleResponse &SetSources(std::vector<std::string> value) {
    sources_ = std::move(value);
    return *this;
  }
  std::vector<std::string> GetDwos() const { return dwos_; }
  AddRawModuleResponse &SetDwos(std::vector<std::string> value) {
    dwos_ = std::move(value);
    return *this;
  }
  llvm::Optional<Error> GetError() const { return error_; }
  AddRawModuleResponse &SetError(llvm::Optional<Error> value) {
    error_ = std::move(value);
    return *this;
  }
};

// Return type of the SourceLocationToRawLocation command
class SourceLocationToRawLocationResponse {
 private:
  std::vector<RawLocationRange> raw_location_ranges_ = {}; // The raw locations matching the source locations
  llvm::Optional<Error> error_ = {}; // Error details if the command failed

 public:
  SourceLocationToRawLocationResponse() = default;
  virtual ~SourceLocationToRawLocationResponse() = default;
  std::vector<RawLocationRange> GetRawLocationRanges() const { return raw_location_ranges_; }
  SourceLocationToRawLocationResponse &SetRawLocationRanges(std::vector<RawLocationRange> value) {
    raw_location_ranges_ = std::move(value);
    return *this;
  }
  llvm::Optional<Error> GetError() const { return error_; }
  SourceLocationToRawLocationResponse &SetError(llvm::Optional<Error> value) {
    error_ = std::move(value);
    return *this;
  }
};

// Return type of the RawLocationToSourceLocation command
class RawLocationToSourceLocationResponse {
 private:
  std::vector<SourceLocation> source_location_ = {}; // The source locations matching the raw locations
  llvm::Optional<Error> error_ = {}; // Error details if the command failed

 public:
  RawLocationToSourceLocationResponse() = default;
  virtual ~RawLocationToSourceLocationResponse() = default;
  std::vector<SourceLocation> GetSourceLocation() const { return source_location_; }
  RawLocationToSourceLocationResponse &SetSourceLocation(std::vector<SourceLocation> value) {
    source_location_ = std::move(value);
    return *this;
  }
  llvm::Optional<Error> GetError() const { return error_; }
  RawLocationToSourceLocationResponse &SetError(llvm::Optional<Error> value) {
    error_ = std::move(value);
    return *this;
  }
};

// Return type of the ListVariablesInScope command
class ListVariablesInScopeResponse {
 private:
  std::vector<Variable> variable_ = {}; // The variables present in the scope
  llvm::Optional<Error> error_ = {}; // Error details if the command failed

 public:
  ListVariablesInScopeResponse() = default;
  virtual ~ListVariablesInScopeResponse() = default;
  std::vector<Variable> GetVariable() const { return variable_; }
  ListVariablesInScopeResponse &SetVariable(std::vector<Variable> value) {
    variable_ = std::move(value);
    return *this;
  }
  llvm::Optional<Error> GetError() const { return error_; }
  ListVariablesInScopeResponse &SetError(llvm::Optional<Error> value) {
    error_ = std::move(value);
    return *this;
  }
};

// Return type of the GetFunctionInfo command
class GetFunctionInfoResponse {
 private:
  std::vector<std::string> function_names_ = {}; // A list of functions (multiple if inlined) starting with innermost.
  std::vector<std::string> missing_symbol_files_ = {}; // A string representing a missing .dwo file.
  llvm::Optional<Error> error_ = {}; // error details if the command failed

 public:
  GetFunctionInfoResponse() = default;
  virtual ~GetFunctionInfoResponse() = default;
  std::vector<std::string> GetFunctionNames() const { return function_names_; }
  GetFunctionInfoResponse &SetFunctionNames(std::vector<std::string> value) {
    function_names_ = std::move(value);
    return *this;
  }
  std::vector<std::string> GetMissingSymbolFiles() const { return missing_symbol_files_; }
  GetFunctionInfoResponse &SetMissingSymbolFiles(std::vector<std::string> value) {
    missing_symbol_files_ = std::move(value);
    return *this;
  }
  llvm::Optional<Error> GetError() const { return error_; }
  GetFunctionInfoResponse &SetError(llvm::Optional<Error> value) {
    error_ = std::move(value);
    return *this;
  }
};

// Return type of the GetInlinedFunctionRanges command
class GetInlinedFunctionRangesResponse {
 private:
  std::vector<RawLocationRange> raw_location_ranges_ = {}; // The raw locations of the inlined function or empty
  llvm::Optional<Error> error_ = {}; // Error details if the command failed

 public:
  GetInlinedFunctionRangesResponse() = default;
  virtual ~GetInlinedFunctionRangesResponse() = default;
  std::vector<RawLocationRange> GetRawLocationRanges() const { return raw_location_ranges_; }
  GetInlinedFunctionRangesResponse &SetRawLocationRanges(std::vector<RawLocationRange> value) {
    raw_location_ranges_ = std::move(value);
    return *this;
  }
  llvm::Optional<Error> GetError() const { return error_; }
  GetInlinedFunctionRangesResponse &SetError(llvm::Optional<Error> value) {
    error_ = std::move(value);
    return *this;
  }
};

// Return type of the GetInlinedCalleesRanges command
class GetInlinedCalleesRangesResponse {
 private:
  std::vector<RawLocationRange> raw_location_ranges_ = {}; // The raw locations of any child inlined functions
  llvm::Optional<Error> error_ = {}; // Error details if the command failed

 public:
  GetInlinedCalleesRangesResponse() = default;
  virtual ~GetInlinedCalleesRangesResponse() = default;
  std::vector<RawLocationRange> GetRawLocationRanges() const { return raw_location_ranges_; }
  GetInlinedCalleesRangesResponse &SetRawLocationRanges(std::vector<RawLocationRange> value) {
    raw_location_ranges_ = std::move(value);
    return *this;
  }
  llvm::Optional<Error> GetError() const { return error_; }
  GetInlinedCalleesRangesResponse &SetError(llvm::Optional<Error> value) {
    error_ = std::move(value);
    return *this;
  }
};

// Return type of the GetMappedLines command
class GetMappedLinesResponse {
 private:
  std::vector<int32_t> _mapped_lines_ = {}; // Mapped lines
  llvm::Optional<Error> error_ = {}; // Error details if the command failed

 public:
  GetMappedLinesResponse() = default;
  virtual ~GetMappedLinesResponse() = default;
  std::vector<int32_t> GetMappedLines() const { return _mapped_lines_; }
  GetMappedLinesResponse &SetMappedLines(std::vector<int32_t> value) {
    _mapped_lines_ = std::move(value);
    return *this;
  }
  llvm::Optional<Error> GetError() const { return error_; }
  GetMappedLinesResponse &SetError(llvm::Optional<Error> value) {
    error_ = std::move(value);
    return *this;
  }
};

// Return type of the EvaluateExpression command
class EvaluateExpressionResponse {
 private:
  std::vector<TypeInfo> type_infos_ = {};
  TypeInfo root_ = {};
  llvm::Optional<std::string> display_value_ = {};
  llvm::Optional<int32_t> location_ = {};
  llvm::Optional<int32_t> memory_address_ = {};
  llvm::Optional<std::vector<int32_t>> data_ = {};
  llvm::Optional<Error> error_ = {};

 public:
  EvaluateExpressionResponse() = default;
  virtual ~EvaluateExpressionResponse() = default;
  std::vector<TypeInfo> GetTypeInfos() const { return type_infos_; }
  EvaluateExpressionResponse &SetTypeInfos(std::vector<TypeInfo> value) {
    type_infos_ = std::move(value);
    return *this;
  }
  TypeInfo GetRoot() const { return root_; }
  EvaluateExpressionResponse &SetRoot(TypeInfo value) {
    root_ = std::move(value);
    return *this;
  }
  llvm::Optional<std::string> GetDisplayValue() const { return display_value_; }
  EvaluateExpressionResponse &SetDisplayValue(llvm::Optional<std::string> value) {
    display_value_ = std::move(value);
    return *this;
  }
  llvm::Optional<int32_t> GetLocation() const { return location_; }
  EvaluateExpressionResponse &SetLocation(llvm::Optional<int32_t> value) {
    location_ = std::move(value);
    return *this;
  }
  llvm::Optional<int32_t> GetMemoryAddress() const { return memory_address_; }
  EvaluateExpressionResponse &SetMemoryAddress(llvm::Optional<int32_t> value) {
    memory_address_ = std::move(value);
    return *this;
  }
  llvm::Optional<std::vector<int32_t>> GetData() const { return data_; }
  EvaluateExpressionResponse &SetData(llvm::Optional<std::vector<int32_t>> value) {
    data_ = std::move(value);
    return *this;
  }
  llvm::Optional<Error> GetError() const { return error_; }
  EvaluateExpressionResponse &SetError(llvm::Optional<Error> value) {
    error_ = std::move(value);
    return *this;
  }
};


class DWARFSymbolsApi {
 public:

  // Notify the plugin about a new script
  virtual AddRawModuleResponse AddRawModule(
    std::string raw_module_id, //A raw module identifier
    std::string path //The path to the file with the wasm bytes
  ) = 0;

  // Notify the plugin about a new script
  virtual void RemoveRawModule(
    std::string raw_module_id //The raw module identifier
  ) = 0;

  // Find locations in raw modules from a location in a source file
  virtual SourceLocationToRawLocationResponse SourceLocationToRawLocation(
    std::string raw_module_id, //Module identifier
    std::string source_file_url, //URL of the source file
    int32_t line_number, //Line number of the location in the source file
    int32_t column_number //Column number of the location in the source file
  ) = 0;

  // Find locations in source files from a location in a raw module
  virtual RawLocationToSourceLocationResponse RawLocationToSourceLocation(
    std::string raw_module_id, //Module identifier
    int32_t code_offset, //Offset of the location in the raw module
    int32_t inline_frame_index //Index of inline frame
  ) = 0;

  // List all variables in lexical scope at a location in a raw module
  virtual ListVariablesInScopeResponse ListVariablesInScope(
    std::string raw_module_id, //Module identifier
    int32_t code_offset, //Offset of the location in the raw module
    int32_t inline_frame_index //Index of inline frame
  ) = 0;

  // Get function at location including inline frames.
  virtual GetFunctionInfoResponse GetFunctionInfo(
    std::string raw_module_id, //Module identifier
    int32_t code_offset //Offset of the location in the raw module
  ) = 0;

  // Get ranges for inlined function containing codeOffset.
  virtual GetInlinedFunctionRangesResponse GetInlinedFunctionRanges(
    std::string raw_module_id, //Module identifier
    int32_t code_offset //Offset of the location in the raw module
  ) = 0;

  // Get ranges for inlined functions called by function containing codeOffset.
  virtual GetInlinedCalleesRangesResponse GetInlinedCalleesRanges(
    std::string raw_module_id, //Module identifier
    int32_t code_offset //Offset of the location in the raw module
  ) = 0;

  virtual GetMappedLinesResponse GetMappedLines(
    std::string raw_module_id, //Module identifier
    std::string source_file_url //Source file URL
  ) = 0;

  virtual EvaluateExpressionResponse EvaluateExpression(
    RawLocation location,
    std::string expression,
    emscripten::val debug_proxy
  ) = 0;
};
}  // namespace api
}  // namespace symbols_backend

#endif // EXTENSIONS_CXX_DEBUGGING_API_H_
