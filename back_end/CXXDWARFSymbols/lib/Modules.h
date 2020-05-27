// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef SYMBOL_SERVER_MODULES_H_
#define SYMBOL_SERVER_MODULES_H_

#include "Variables.h"
#include "lldb/lldb-enumerations.h"
#include "lldb/lldb-forward.h"
#include "lldb/lldb-types.h"
#include "llvm/ADT/Optional.h"
#include "llvm/ADT/SmallSet.h"
#include "llvm/ADT/SmallString.h"
#include "llvm/ADT/SmallVector.h"
#include "llvm/ADT/StringMap.h"
#include "llvm/ADT/StringRef.h"
#include "llvm/Support/FileSystem.h"
#include "llvm/Support/MemoryBuffer.h"

namespace symbol_server {
using Binary = std::vector<uint8_t>;

struct SourceLocation {
  SourceLocation(llvm::StringRef file, uint32_t line, uint16_t column)
      : file(file), line(line), column(column) {}

  std::string file;
  uint32_t line;
  uint16_t column;

  friend bool operator==(const SourceLocation&, const SourceLocation&);
};

struct Variable {
  Variable(llvm::StringRef name, lldb::ValueType scope, llvm::StringRef type)
      : name(name), scope(scope), type(type) {}

  std::string name;
  lldb::ValueType scope;
  std::string type;

  friend bool operator==(const Variable&, const Variable&);
};

struct ModuleSource {
  enum class SourceType { kLocalFile, kWebUrl };

  ModuleSource(SourceType type, llvm::StringRef path)
      : path(path), type(type) {}

  std::string path;
  SourceType type;
};

class WasmModule {
  friend class ModuleCache;
  lldb::ModuleSP module_;
  std::string id_;
  llvm::Optional<llvm::sys::fs::TempFile> temp_module_;
  explicit WasmModule(llvm::StringRef id) : id_(id) {}

 public:
  ~WasmModule();
  WasmModule(const WasmModule&) = delete;
  WasmModule& operator=(const WasmModule&) = delete;
  WasmModule(WasmModule&&) = default;
  WasmModule& operator=(WasmModule&&) = default;

  static std::shared_ptr<WasmModule> CreateFromFile(
      llvm::StringRef id,
      llvm::sys::fs::TempFile path);

  static std::shared_ptr<WasmModule> CreateFromFile(llvm::StringRef id,
                                                    llvm::StringRef path);

  static std::shared_ptr<WasmModule> CreateFromCode(
      llvm::StringRef id,
      const std::vector<uint8_t>& byte_code);

  bool Valid() const;
  llvm::StringRef Id() const { return id_; }

  llvm::SmallSet<std::string, 1> GetSourceScripts() const;
  llvm::SmallSet<SourceLocation, 1> GetSourceLocationFromOffset(
      lldb::addr_t offset) const;
  llvm::SmallSet<lldb::addr_t, 1> GetOffsetFromSourceLocation(
      const SourceLocation& source_loc) const;
  llvm::SmallSet<MemoryLocation, 1> GetVariablesInScope(
      const SourceLocation& source_loc) const;
  llvm::SmallSet<Variable, 1> GetVariablesInScope(lldb::addr_t offset) const;
  llvm::Expected<std::unique_ptr<llvm::MemoryBuffer>> GetVariableFormatScript(
      llvm::StringRef name,
      lldb::addr_t frame_offset,
      VariablePrinter* printer) const;
};

class ModuleCache {
  llvm::SmallVector<std::string, 1> module_search_paths_;
  llvm::StringMap<std::shared_ptr<WasmModule>> modules_;
  std::map<llvm::SmallString<32>, std::shared_ptr<WasmModule>> module_hashes_;
  VariablePrinter printer_;

  llvm::Optional<std::string> ResolveLocalModuleFile(llvm::StringRef url) const;
  std::shared_ptr<WasmModule> LoadModule(llvm::StringRef id,
                                         const ModuleSource& source);

 public:
  ModuleCache();

  const WasmModule* GetModuleFromUrl(llvm::StringRef id, llvm::StringRef url);
  const WasmModule* GetModuleFromCode(llvm::StringRef id,
                                      const std::vector<uint8_t>& byte_code);

  void AddModuleSearchPath(const llvm::Twine&);

  const WasmModule* FindModule(llvm::StringRef id) const;
  bool DeleteModule(llvm::StringRef id);
  llvm::SmallVector<const WasmModule*, 1> FindModulesContainingSourceScript(
      llvm::StringRef file) const;

  VariablePrinter* Printer() { return &printer_; }
};
}  // namespace symbol_server
#endif  // SYMBOL_SERVER_MODULES_H_
