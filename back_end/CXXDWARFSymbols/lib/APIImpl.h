// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef SYMBOL_SERVER_API_IMPL_H_
#define SYMBOL_SERVER_API_IMPL_H_

#include "Modules.h"
#include "api.h"

namespace symbol_server {
namespace api {
class ApiContext : public DWARFSymbolsApi {
 public:
  AddRawModuleResponse AddRawModule(std::string raw_module_id,
                                    llvm::Optional<std::string> symbols,
                                    RawModule raw_module) override;

  SourceLocationToRawLocationResponse SourceLocationToRawLocation(
      std::string raw_module_id,
      std::string source_file,
      int32_t line_number,
      int32_t column_number) override;

  RawLocationToSourceLocationResponse RawLocationToSourceLocation(
      std::string raw_module_id,
      int32_t code_offset) override;

  ListVariablesInScopeResponse ListVariablesInScope(
      std::string raw_module_id,
      int32_t code_offset) override;

  EvaluateVariableResponse EvaluateVariable(std::string name,
                                            RawLocation location) override;

 private:
  ModuleCache modules_;
};
}  // namespace api
}  // namespace symbol_server

#endif
