// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "Modules.h"

#include <memory>

#include "IndexedIterator.h"
#include "Util.h"
#include "Variables.h"
#include "lldb/Core/Module.h"
#include "lldb/Core/StreamFile.h"
#include "lldb/Core/Value.h"
#include "lldb/Core/dwarf.h"
#include "lldb/Symbol/Block.h"
#include "lldb/Symbol/CompileUnit.h"
#include "lldb/Symbol/LineTable.h"
#include "lldb/Symbol/SymbolFile.h"
#include "lldb/Symbol/Type.h"
#include "lldb/Symbol/TypeList.h"
#include "lldb/Symbol/VariableList.h"
#include "lldb/Utility/ArchSpec.h"
#include "lldb/Utility/FileSpec.h"
#include "lldb/Utility/RegularExpression.h"
#include "lldb/Utility/Stream.h"
#include "lldb/lldb-enumerations.h"
#include "lldb/lldb-forward.h"
#include "llvm/ADT/DenseSet.h"
#include "llvm/ADT/Optional.h"
#include "llvm/ADT/SmallSet.h"
#include "llvm/ADT/SmallVector.h"
#include "llvm/ADT/StringRef.h"
#include "llvm/Support/CommandLine.h"
#include "llvm/Support/Error.h"
#include "llvm/Support/ErrorHandling.h"
#include "llvm/Support/FileSystem.h"
#include "llvm/Support/MD5.h"
#include "llvm/Support/Path.h"
#include "llvm/Support/raw_ostream.h"

llvm::cl::list<std::string> search_directories("I");

llvm::cl::opt<bool> keep_temporaries("keep-temp-modules");

namespace std {
template <>
struct less<symbol_server::SourceLocation> {
  bool operator()(const symbol_server::SourceLocation& a,
                  const symbol_server::SourceLocation& b) const {
    return std::make_tuple(a.file, a.line, a.column) <
           std::make_tuple(b.file, b.line, b.column);
  }
};

template <>
struct less<symbol_server::Variable> {
  bool operator()(const symbol_server::Variable& a,
                  const symbol_server::Variable& b) const {
    return std::make_tuple(a.name, a.type, a.scope) <
           std::make_tuple(b.name, b.type, b.scope);
  }
};
}  // namespace std

namespace symbol_server {
bool operator==(const SourceLocation& a, const SourceLocation& b) {
  return std::make_tuple(a.file, a.line, a.column) ==
         std::make_tuple(b.file, b.line, b.column);
}

bool operator==(const symbol_server::Variable& a,
                const symbol_server::Variable& b) {
  return std::make_tuple(a.name, a.type, a.scope) ==
         std::make_tuple(b.name, b.type, b.scope);
}

std::shared_ptr<WasmModule> WasmModule::CreateFromFile(llvm::StringRef id,
                                                       llvm::StringRef path) {
  if (!llvm::sys::fs::exists(path)) {
    llvm::errs() << "Module file '" << path << "' not found\n.";
    return {};
  }
  LLVM_DEBUG(llvm::dbgs() << "Loading module from '" << path << "'\n");

  std::shared_ptr<WasmModule> new_module(new WasmModule(id));

  new_module->module_ = std::make_shared<lldb_private::Module>(
      lldb_private::FileSpec(path),
      lldb_private::ArchSpec("wasm32-unknown-unknown-wasm"));

  new_module->module_->PreloadSymbols();
  return new_module;
}

std::shared_ptr<WasmModule> WasmModule::CreateFromFile(
    llvm::StringRef id,
    llvm::sys::fs::TempFile path) {
  auto new_module = CreateFromFile(id, path.TmpName);
  if (!new_module) {
    return new_module;
  }
  new_module->temp_module_ = std::move(path);
  return new_module;
}

std::shared_ptr<WasmModule> WasmModule::CreateFromCode(
    llvm::StringRef id,
    llvm::StringRef byte_code) {
  llvm::SmallString<128> t_file;
  llvm::sys::path::system_temp_directory(true, t_file);
  llvm::sys::path::append(t_file, "%%%%%%.wasm");

  auto tf = llvm::sys::fs::TempFile::create(t_file);
  if (!tf) {
    llvm::errs() << "Failed to create temporary file for module\n";
    return {};
  }

  llvm::StringRef filename = tf->TmpName;
  LLVM_DEBUG(llvm::dbgs() << "Created temporary module " << filename << "\n");
  {
    llvm::raw_fd_ostream o(tf->FD, false);
    o << byte_code;
  }

  auto new_module = CreateFromFile(id, std::move(*tf));
  return new_module;
}

WasmModule::~WasmModule() {
  if (temp_module_) {
    if (!keep_temporaries) {
      consumeError(temp_module_->discard());
    } else {
      consumeError(temp_module_->keep());
    }
  }
}

bool WasmModule::Valid() const {
  return module_ && module_->GetNumCompileUnits() > 0;
}

llvm::SmallSet<std::string, 1> WasmModule::GetSourceScripts() const {
  llvm::SmallSet<std::string, 1> compile_units;
  llvm::SmallSet<std::pair<llvm::StringRef, llvm::StringRef>, 1> all_files;
  for (size_t idx = 0; idx < module_->GetNumCompileUnits(); idx++) {
    auto compile_unit = module_->GetCompileUnitAtIndex(idx);
    for (auto f : Indexed(compile_unit->GetSupportFiles())) {
      auto dir = f.GetDirectory().GetStringRef();
      auto filename = f.GetFilename().GetStringRef();
      if (filename.empty()) {
        continue;
      }
      if (!all_files.insert(std::make_pair(dir, filename)).second) {
        continue;
      }
      compile_units.insert(f.GetPath());
    }
  }
  return compile_units;
}

namespace {
void GetVariablesFromOffset(lldb_private::Module* module,
                            lldb::addr_t offset,
                            lldb_private::VariableList* var_list) {
  if (!module->GetObjectFile() || !module->GetObjectFile()->GetSectionList()) {
    return;
  }
  lldb_private::SymbolContext sc;
  lldb::SectionSP section =
      module->GetObjectFile()->GetSectionList()->FindSectionByType(
          lldb::eSectionTypeCode, false);
  lldb_private::Address addr(section, offset);
  auto resolved = module->ResolveSymbolContextForAddress(
      addr, lldb::eSymbolContextBlock, sc);
  if ((resolved & lldb::eSymbolContextBlock) == lldb::eSymbolContextBlock) {
    if (auto block_variables = sc.block->GetBlockVariableList(true)) {
      block_variables->AppendVariablesIfUnique(*var_list);
    }
  }
}

lldb::VariableSP FindVariableAtOffset(lldb_private::Module* module,
                                      lldb::addr_t offset,
                                      llvm::StringRef name) {
  lldb_private::VariableList var_list;
  GetVariablesFromOffset(module, offset, &var_list);
  for (auto var : Indexed(var_list)) {
    if (var->GetName().GetStringRef() == name) {
      return var;
    }
  }
  var_list.Clear();
  module->FindGlobalVariables(lldb_private::RegularExpression(".*"), -1,
                              var_list);
  for (auto var : Indexed(var_list)) {
    if (var->GetName().GetStringRef() == name) {
      return var;
    }
  }
  return {};
}
}  // namespace

llvm::SmallSet<SourceLocation, 1> WasmModule::GetSourceLocationFromOffset(
    lldb::addr_t offset) const {
  llvm::SmallSet<SourceLocation, 1> lines;

  for (lldb::CompUnitSP cu : Indexed(*module_)) {
    lldb_private::LineTable* lt = cu->GetLineTable();
    lldb_private::LineEntry le;
    lldb::SectionSP section =
        module_->GetObjectFile()->GetSectionList()->FindSectionByType(
            lldb::eSectionTypeCode, false);
    lldb_private::Address addr(section, offset);
    if (lt->FindLineEntryByAddress(addr, le)) {
      if (le.line > 0 && le.column > 0) {
        lines.insert({le.file.GetPath(), le.line, le.column});
      }
    }
  }
  return lines;
}

llvm::SmallSet<lldb::addr_t, 1> WasmModule::GetOffsetFromSourceLocation(
    const SourceLocation& source_loc) const {
  llvm::SmallSet<lldb::addr_t, 1> locations;
  std::vector<lldb_private::Address> output_local, output_extern;

  for (lldb::CompUnitSP cu : Indexed(*module_)) {
    lldb_private::SymbolContextList list;
    cu->ResolveSymbolContext(lldb_private::FileSpec(source_loc.file),
                             source_loc.line, true, true,
                             lldb::eSymbolContextLineEntry, list);
    for (uint32_t i = 0; i < list.GetSize(); i++) {
      lldb_private::SymbolContext sc;
      if (list.GetContextAtIndex(i, sc) && sc.line_entry.IsValid()) {
        LLVM_DEBUG(llvm::dbgs() << "Got location: " << sc.line_entry.line << ":"
                                << sc.line_entry.column << " ("
                                << sc.line_entry.is_terminal_entry << ")"
                                << "\n");
        if (sc.line_entry.line == source_loc.line) {
          locations.insert(sc.line_entry.range.GetBaseAddress().GetOffset());
        }
      }
    }
  }
  return locations;
}

llvm::Optional<std::string> ModuleCache::ResolveLocalModuleFile(
    llvm::StringRef url) const {
  if (!llvm::sys::path::is_absolute(url)) {
    for (auto& base_dir : module_search_paths_) {
      llvm::SmallString<32> relative_url(url);
      llvm::sys::fs::make_absolute(base_dir, relative_url);
      if (llvm::sys::fs::exists(relative_url)) {
        return {relative_url.c_str()};
      }
    }
  } else {
    if (auto local =
            ResolveLocalModuleFile(llvm::sys::path::relative_path(url))) {
      return local;
    }

    if (auto local = ResolveLocalModuleFile(llvm::sys::path::filename(url))) {
      return local;
    }
  }

  if (llvm::sys::fs::exists(url)) {
    return url.str();
  }

  return llvm::None;
}

void ModuleCache::AddModuleSearchPath(const llvm::Twine& search_path) {
  module_search_paths_.emplace_back(search_path.str());
}

const WasmModule* ModuleCache::FindModule(llvm::StringRef script_id) const {
  auto i = modules_.find(script_id);
  if (i != modules_.end()) {
    return i->second.get();
  }
  return nullptr;
}

bool ModuleCache::DeleteModule(llvm::StringRef script_id) {
  return modules_.erase(script_id) > 0;
}

static llvm::SmallString<32> ModuleHash(llvm::StringRef code) {
  llvm::MD5 hash;
  llvm::MD5::MD5Result hash_result;
  hash.update(code);
  hash.final(hash_result);
  return hash_result.digest();
}

ModuleCache::ModuleCache()
    : module_search_paths_(search_directories.begin(),
                           search_directories.end()) {}

const WasmModule* ModuleCache::GetModuleFromUrl(llvm::StringRef id,
                                                llvm::StringRef url) {
  if (auto m = FindModule(id)) {
    return m;
  }

  auto hash = ModuleHash(url);
  auto i = module_hashes_.find(hash);
  if (i != module_hashes_.end()) {
    LLVM_DEBUG(llvm::dbgs()
               << "Cache hit for module '" << id << "' at " << url << "\n");
    modules_[id] = i->second;
    return i->second.get();
  }

  auto source = ResolveLocalModuleFile(url);
  if (!source) {
    LLVM_DEBUG(llvm::dbgs()
               << "Module '" << id << "' at " << url << " not found\n");
    return nullptr;
  }

  std::shared_ptr<WasmModule> module =
      modules_.insert({id, WasmModule::CreateFromFile(id, *source)})
          .first->second;
  if (module) {
    LLVM_DEBUG(llvm::dbgs()
               << "Loaded module " << id << " with "
               << module->GetSourceScripts().size() << " source files\n");
    module_hashes_[hash] = module;
  }
  return module.get();
}

const WasmModule* ModuleCache::GetModuleFromCode(llvm::StringRef id,
                                                 llvm::StringRef byte_code) {
  if (auto m = FindModule(id)) {
    return m;
  }

  auto hash = ModuleHash(byte_code);
  auto i = module_hashes_.find(hash);
  if (i != module_hashes_.end()) {
    modules_[id] = i->second;
    return i->second.get();
  }

  auto module = modules_.insert({id, WasmModule::CreateFromCode(id, byte_code)})
                    .first->second;
  if (module) {
    LLVM_DEBUG(llvm::dbgs()
               << "Loaded module " << id << " with "
               << module->GetSourceScripts().size() << " source files\n");
    module_hashes_[hash] = module;
  }
  return module.get();
}

llvm::SmallVector<const WasmModule*, 1>
ModuleCache::FindModulesContainingSourceScript(llvm::StringRef file) const {
  lldb_private::FileSpec script_spec(file);
  llvm::SmallVector<const WasmModule*, 1> found_modules;
  for (auto& kv : modules_) {
    auto& m = kv.second;
    for (auto cu : Indexed(*m->module_)) {
      if (cu->GetSupportFiles().FindFileIndex(0, script_spec, true) !=
          UINT32_MAX) {
        LLVM_DEBUG(llvm::dbgs()
                   << "Found " << cu->GetPrimaryFile().GetPath() << "\n");
        found_modules.push_back(m.get());
        break;
      }
    }
  }
  return found_modules;
}

llvm::SmallSet<Variable, 1> WasmModule::GetVariablesInScope(
    lldb::addr_t offset) const {
  llvm::SmallSet<Variable, 1> variables;
  lldb_private::VariableList var_list;
  GetVariablesFromOffset(&*module_, offset, &var_list);
  LLVM_DEBUG(llvm::dbgs() << "Found " << var_list.GetSize()
                          << " variables in scope and ");
  module_->FindGlobalVariables(lldb_private::RegularExpression(".*"), -1,
                               var_list);
  LLVM_DEBUG(llvm::dbgs() << var_list.GetSize() << " globals\n.");
  for (auto var : Indexed(var_list)) {
    variables.insert({var->GetName().GetStringRef(), var->GetScope(),
                      var->GetType()->GetQualifiedName().GetStringRef()});
  }
  return variables;
}

llvm::Expected<Binary> WasmModule::GetVariableFormatScript(
    llvm::StringRef name,
    lldb::addr_t frame_offset,
    VariablePrinter* printer) const {
  lldb::VariableSP variable =
      FindVariableAtOffset(&*module_, frame_offset, name);
  if (!variable) {
    return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                   "Variable '%s' not found at offset %zu",
                                   name.str().c_str(), frame_offset);
  }

  auto code = printer->GenerateModule(name, variable);
  if (!code) {
    return code.takeError();
  }
  auto wasm_code = printer->GenerateCode(&**code);
  return wasm_code->getBuffer().str();
}
}  // namespace symbol_server
