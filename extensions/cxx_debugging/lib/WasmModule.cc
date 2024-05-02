// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "WasmModule.h"
#include "Expressions.h"
#include "WasmVendorPlugins.h"

#include "Plugins/SymbolFile/DWARF/DWARFCompileUnit.h"
#include "Plugins/SymbolFile/DWARF/LogChannelDWARF.h"
#include "lldb/Core/Address.h"
#include "lldb/Core/AddressRange.h"
#include "lldb/Core/Debugger.h"
#include "lldb/Core/FileSpecList.h"
#include "lldb/Core/Module.h"
#include "lldb/Core/Section.h"
#include "lldb/Symbol/Block.h"
#include "lldb/Symbol/CompileUnit.h"
#include "lldb/Symbol/CompilerType.h"
#include "lldb/Symbol/Function.h"
#include "lldb/Symbol/LineEntry.h"
#include "lldb/Symbol/LineTable.h"
#include "lldb/Symbol/ObjectFile.h"
#include "lldb/Symbol/SymbolContext.h"
#include "lldb/Symbol/SymbolContextScope.h"
#include "lldb/Symbol/Type.h"
#include "lldb/Symbol/TypeList.h"
#include "lldb/Symbol/TypeSystem.h"
#include "lldb/Symbol/Variable.h"
#include "lldb/Symbol/VariableList.h"
#include "lldb/Utility/ArchSpec.h"
#include "lldb/Utility/ConstString.h"
#include "lldb/Utility/FileSpec.h"
#include "lldb/Utility/Log.h"
#include "lldb/lldb-enumerations.h"
#include "lldb/lldb-forward.h"
#include "llvm/ADT/Optional.h"
#include "llvm/ADT/StringRef.h"
#include "llvm/Support/Debug.h"
#include "llvm/Support/Error.h"
#include "llvm/Support/FileSystem.h"
#include "llvm/Support/Path.h"
#include "llvm/Support/raw_ostream.h"

#include <algorithm>
#include <cassert>
#include <cstddef>
#include <cstdint>
#include <functional>
#include <memory>
#include <tuple>

#define DEBUG_TYPE "symbols-backend"

namespace std {
template <>
struct less<symbols_backend::SourceLocation> {
  bool operator()(const symbols_backend::SourceLocation& a,
                  const symbols_backend::SourceLocation& b) const {
    return std::make_tuple(a.file, a.line, a.column) <
           std::make_tuple(b.file, b.line, b.column);
  }
};

template <>
struct less<symbols_backend::Variable> {
  bool operator()(const symbols_backend::Variable& a,
                  const symbols_backend::Variable& b) const {
    return a.name < b.name;
  }
};
}  // namespace std

namespace {
static llvm::StringRef GetDWOName(DWARFCompileUnit& dwarf_cu) {
  return dwarf_cu.GetUnitDIEOnly().GetDIE()->GetAttributeValueAsString(
      &dwarf_cu, lldb_private::dwarf::DW_AT_dwo_name, nullptr);
}
}  // namespace

namespace symbols_backend {
bool operator==(const SourceLocation& a, const SourceLocation& b) {
  return std::make_tuple(a.file, a.line, a.column) ==
         std::make_tuple(b.file, b.line, b.column);
}

bool operator==(const symbols_backend::Variable& a,
                const symbols_backend::Variable& b) {
  return std::make_tuple(a.name, a.type, a.scope) ==
         std::make_tuple(b.name, b.type, b.scope);
}

llvm::Expected<std::pair<lldb::DebuggerSP, lldb::TargetSP>> GetTarget() {
  static std::pair<lldb::DebuggerSP, lldb::TargetSP> instance = {};
  if (!instance.first) {
    lldb::DebuggerSP dbg = lldb_private::Debugger::CreateInstance();
    lldb_private::ArchSpec arch("wasm32-unknown-unknown");
    lldb::TargetSP target;
    lldb::PlatformSP platform = lldb_private::Platform::GetHostPlatform();
    dbg->GetPlatformList().SetSelectedPlatform(platform);
    auto stat = dbg->GetTargetList().CreateTarget(
        *dbg, {}, arch, lldb_private::eLoadDependentsNo, platform, target);
    if (stat.Fail()) {
      return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                     stat.AsCString());
    }
    target->SetPreloadSymbols(false);
    instance = {dbg, target};
  }
  return instance;
}

llvm::Expected<std::unique_ptr<WasmModule>> WasmModule::CreateFromFile(
    llvm::StringRef path) {
  if (!llvm::sys::fs::exists(path)) {
    return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                   "Module file '%s' not found\n.",
                                   path.str().c_str());
  }
  LLVM_DEBUG(llvm::dbgs() << "Loading module from '" << path << "'\n");

  auto instance = GetTarget();
  if (!instance) {
    return instance.takeError();
  }
  auto [debugger, target] = *instance;
  auto module = target->GetOrCreateModule(
      {lldb_private::FileSpec(path),
       lldb_private::ArchSpec("wasm32-unknown-unknown-wasm")},
      false);

  return std::unique_ptr<WasmModule>(new WasmModule(target, module));
}

bool WasmModule::Valid() const {
  return module_ && module_->GetNumCompileUnits() > 0;
}

SourceInfo WasmModule::GetSourceScripts() const {
  llvm::SmallSet<std::string, 1> compile_units;
  llvm::SmallSet<std::string, 1> dwos;
  llvm::SmallSet<std::pair<llvm::StringRef, llvm::StringRef>, 1> all_files;
  for (size_t idx = 0; idx < module_->GetNumCompileUnits(); idx++) {
    auto compile_unit = module_->GetCompileUnitAtIndex(idx);
    for (auto f : compile_unit->GetSupportFiles()) {
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

    // Cast user data to DwarfUnit
    DWARFCompileUnit* dwarf_cu =
        static_cast<DWARFCompileUnit*>(compile_unit->GetUserData());
    if (dwarf_cu && dwarf_cu->GetVersion() >= 5) {
      // Might need to lazy load this .dwo (only works for DWARF5)
      llvm::SmallVector<std::string, 2> missing_symbols;
      auto dwo_name = GetDWOName(*dwarf_cu);
      if (!dwo_name.empty()) {
        dwos.insert(dwo_name.str());
      }
    }
  }
  return {compile_units, dwos};
}

namespace {
uint32_t GetSymbolContextFromOffset(lldb_private::Module* module,
                                    lldb::addr_t offset,
                                    int inline_frame_index,
                                    lldb::SymbolContextItem resolve_scope,
                                    lldb_private::SymbolContext& out_sc,
                                    lldb_private::Address& out_addr) {
  if (!module->GetObjectFile() || !module->GetObjectFile()->GetSectionList()) {
    return 0;
  }
  lldb_private::SymbolContext sc;
  sc.module_sp = module->shared_from_this();
  lldb::SectionSP section =
      module->GetObjectFile()->GetSectionList()->FindSectionByType(
          lldb::eSectionTypeCode, false);
  lldb_private::Address addr(section, offset);

  auto resolved =
      module->ResolveSymbolContextForAddress(addr, resolve_scope, sc);
  if (inline_frame_index == 0 &&
      (resolved & lldb::eSymbolContextBlock) != lldb::eSymbolContextBlock) {
    out_sc = std::move(sc);
    out_addr = std::move(addr);
    return out_sc.GetResolvedMask();
  }

  for (int i = 0; i < inline_frame_index; i++) {
    lldb_private::SymbolContext next_sc;
    lldb_private::Address next_addr;
    if (!sc.GetParentOfInlinedScope(addr, next_sc, next_addr)) {
      return 0;
    }
    addr = std::move(next_addr);
    sc = std::move(next_sc);
    // Sometimes the inline block address range isn't properly clipped
    // to the parent range; fix this.
    if (addr.GetOffset() == 0 && sc.function) {
      addr = sc.function->GetAddressRange().GetBaseAddress();
    }
  }
  out_sc = std::move(sc);
  out_addr = std::move(addr);
  return out_sc.GetResolvedMask();
}

void GetVariablesFromOffset(lldb_private::Module* module,
                            lldb::addr_t offset,
                            int inline_frame_index,
                            lldb_private::VariableList* var_list) {
  lldb_private::SymbolContext sc;
  lldb_private::Address addr;
  auto resolved = GetSymbolContextFromOffset(
      module, offset, inline_frame_index, lldb::eSymbolContextBlock, sc, addr);
  if ((resolved & lldb::eSymbolContextBlock) == lldb::eSymbolContextBlock) {
    sc.block->AppendVariables(
        true, true, true,
        [var_list](lldb_private::Variable* var) {
          return (var_list->FindVariableIndex(lldb::VariableSP{
                      var, [](lldb_private::Variable*) {}}) == UINT32_MAX);
        },
        var_list);
  }
  resolved = GetSymbolContextFromOffset(module, offset, inline_frame_index,
                                        lldb::eSymbolContextCompUnit, sc, addr);
  if ((resolved & lldb::eSymbolContextCompUnit) ==
      lldb::eSymbolContextCompUnit) {
    sc.comp_unit->GetVariableList(true)->AppendVariablesIfUnique(*var_list);
  }
}
}  // namespace

lldb::VariableSP WasmModule::FindVariableAtOffset(lldb::addr_t offset,
                                                  int inline_frame_index,
                                                  llvm::StringRef name) const {
  lldb_private::VariableList var_list;
  GetVariablesFromOffset(&*module_, offset, inline_frame_index, &var_list);
  // GetVariablesFromOffset fills the list with variables sorted from innermost
  // scope to outermost scope, so the first hit in the list is the correct one.
  for (auto var : var_list) {
    // llvm::errs() << "var: " << var.get() << "\n";
    if (var->GetName().GetStringRef() == name) {
      return var;
    }
  }
  return {};
}

llvm::Optional<lldb_private::CompilerType> WasmModule::FindType(
    llvm::StringRef name) const {
  lldb_private::TypeList type_list;
  llvm::DenseSet<lldb_private::SymbolFile*> searched_symbol_files;
  module_->FindTypes(lldb_private::ConstString(name), true, 1,
                     searched_symbol_files, type_list);
  if (!type_list.Empty()) {
    return type_list.GetTypeAtIndex(0)->GetFullCompilerType();
  }
  return llvm::None;
}

llvm::SmallSet<SourceLocation, 1> WasmModule::GetSourceLocationFromOffset(
    lldb::addr_t offset,
    int inline_frame_index) const {
  llvm::SmallSet<SourceLocation, 1> lines;

  lldb_private::Address addr;
  lldb_private::SymbolContext sc;
  auto resolved = GetSymbolContextFromOffset(
      &*module_, offset, inline_frame_index,
      lldb::eSymbolContextBlock | lldb::eSymbolContextLineEntry, sc, addr);
  if ((resolved & lldb::eSymbolContextLineEntry) && sc.line_entry.IsValid() &&
      sc.line_entry.line > 0) {
    lines.insert({sc.line_entry.file.GetPath(), sc.line_entry.line,
                  sc.line_entry.column});
  }
  return lines;
}

std::vector<int32_t> WasmModule::GetMappedLines(
    llvm::StringRef file_path) const {
  lldb_private::FileSpec::Style file_path_style =
      lldb_private::FileSpec::GuessPathStyle(file_path).value_or(
          lldb_private::FileSpec::Style::native);
  lldb_private::FileSpec file_spec(file_path, file_path_style);
  lldb_private::SymbolContextList line_entry_scs;

  // Get the comp unit symbol contexts for the file.
  for (size_t idx = 0; idx < module_->GetNumCompileUnits(); idx++) {
    auto compile_unit = module_->GetCompileUnitAtIndex(idx);
    uint32_t file_idx =
        compile_unit->GetSupportFiles().FindFileIndex(0, file_spec, true);

    // Gather all line entries for the compile_unit
    lldb_private::LineTable* table = compile_unit->GetLineTable();
    while (file_idx != UINT32_MAX) {
      table->FineLineEntriesForFileIndex(file_idx, true, line_entry_scs);
      file_idx = compile_unit->GetSupportFiles().FindFileIndex(file_idx + 1,
                                                               file_spec, true);
    }
  }

  std::vector<int32_t> line_numbers;
  for (const lldb_private::SymbolContext& line_sc :
       line_entry_scs.SymbolContexts()) {
    assert(line_sc.line_entry.IsValid());
    line_numbers.push_back(line_sc.line_entry.line);
  }

  std::sort(line_numbers.begin(), line_numbers.end());
  auto end = std::unique(line_numbers.begin(), line_numbers.end());
  line_numbers.resize(end - line_numbers.begin());

  return line_numbers;
}

llvm::SmallSet<std::pair<lldb::addr_t, lldb::addr_t>, 1>
WasmModule::GetOffsetFromSourceLocation(
    const SourceLocation& source_loc) const {
  llvm::SmallSet<std::pair<lldb::addr_t, lldb::addr_t>, 1> locations;
  std::vector<lldb_private::Address> output_local, output_extern;

  llvm::StringRef file_path(source_loc.file);
  lldb_private::FileSpec::Style file_path_style =
      lldb_private::FileSpec::GuessPathStyle(file_path).value_or(
          lldb_private::FileSpec::Style::native);
  lldb_private::FileSpec file_spec(file_path, file_path_style);
  lldb_private::SymbolContextList list;
  module_->ResolveSymbolContextsForFileSpec(
      file_spec, source_loc.line, true,
      lldb::eSymbolContextLineEntry | lldb::eSymbolContextCompUnit, list);
  std::vector<lldb_private::AddressRange> ranges;
  for (lldb_private::SymbolContext sc : list.SymbolContexts()) {
    if (!sc.line_entry.IsValid()) {
      continue;
    }

    // Only return positions in the same line.
    if (sc.line_entry.line != source_loc.line) {
      continue;
    }

    // Take into account the column number here to make in-line breakpoints
    // work.
    if (source_loc.column && sc.line_entry.column != source_loc.column) {
      continue;
    }

    // Check if the line entry range is already covered.
    lldb_private::AddressRange range = sc.line_entry.range;
    if (std::find_if(ranges.begin(), ranges.end(),
                     [&](const lldb_private::AddressRange& r) {
                       auto address = range.GetBaseAddress();
                       return r.ContainsFileAddress(address);
                     }) != ranges.end()) {
      continue;
    }

    while (true) {
      lldb_private::SymbolContext next_sc;
      lldb_private::Address range_end(range.GetBaseAddress());
      range_end.Slide(range.GetByteSize());
      range_end.CalculateSymbolContext(&next_sc, lldb::eSymbolContextLineEntry);

      // Don't combine ranges across "start of statement" markers inserted
      // by the compiler.
      if (!next_sc.line_entry.IsValid() ||
          next_sc.line_entry.is_start_of_statement ||
          next_sc.line_entry.range.GetByteSize() == 0) {
        break;
      }

      // Include any line 0 entries, they indicate that this is compiler-
      // generated code that does not correspond to user source code.
      if (next_sc.line_entry.original_file != sc.line_entry.original_file ||
          (next_sc.line_entry.line != sc.line_entry.line &&
           next_sc.line_entry.line != 0)) {
        break;
      }

      // Try to extend our address range to cover this line entry.
      if (!range.Extend(next_sc.line_entry.range)) {
        break;
      }
    }

    ranges.push_back(range);
  }

  for (auto const& range : ranges) {
    locations.insert({range.GetBaseAddress().GetOffset(), range.GetByteSize()});
  }
  return locations;
}

std::set<Variable> WasmModule::GetVariablesInScope(
    lldb::addr_t offset,
    int inline_frame_index) const {
  std::set<Variable> variables;
  lldb_private::VariableList var_list;
  GetVariablesFromOffset(&*module_, offset, inline_frame_index, &var_list);
  LLVM_DEBUG(llvm::dbgs() << "Found " << var_list.GetSize() << " variables\n");
  for (auto var : var_list) {
    var->GetSymbolContextScope()->CalculateSymbolContextCompileUnit();
    // var_list contains variables sorted from innermost scope to outermost
    // scope. The set compares variables by name to preserve shadowing order.
    auto type = var->GetType();
    variables.insert(
        {var->GetName().GetStringRef(), var->GetScope(),
         type ? type->GetQualifiedName().GetStringRef() : llvm::StringRef()});
  }
  return variables;
}

FunctionInfo WasmModule::GetFunctionInfo(lldb::addr_t offset) const {
  llvm::SmallVector<std::string, 1> function_names;

  lldb_private::SymbolContext sc, old_sc;
  lldb_private::Address addr, old_addr;
  auto resolved = GetSymbolContextFromOffset(
      &*module_, offset, 0, lldb::eSymbolContextBlock, sc, addr);
  if ((resolved & lldb::eSymbolContextBlock) == lldb::eSymbolContextBlock) {
    do {
      auto name = sc.GetFunctionName();
      if (name.IsNull() || name.IsEmpty()) {
        function_names.push_back("");
      } else {
        function_names.push_back(name.GetCString());
      }
      old_sc = std::move(sc);
      old_addr = std::move(addr);
    } while (old_sc.GetParentOfInlinedScope(old_addr, sc, addr));
    return {function_names, {}};
  } else if ((resolved & lldb::eSymbolContextCompUnit) ==
             lldb::eSymbolContextCompUnit) {
    // Compile unit might be missing symbols?

    // Cast user data to DwarfUnit
    DWARFCompileUnit* dwarf_cu =
        static_cast<DWARFCompileUnit*>(sc.comp_unit->GetUserData());
    if (dwarf_cu && dwarf_cu == &dwarf_cu->GetNonSkeletonUnit()) {
      // The skeleton unit is the only unit, but is there supposed to be a .dwo?
      llvm::SmallVector<std::string, 2> missing_symbols;
      auto dwo_name = GetDWOName(*dwarf_cu);
      if (!dwo_name.empty()) {
        missing_symbols.push_back(dwo_name.str());
      }
      return {{}, missing_symbols};
    }
  }
  return {{}, {}};
}

llvm::SmallSet<std::pair<lldb::addr_t, lldb::addr_t>, 1>
WasmModule::GetInlineFunctionAddressRanges(lldb::addr_t offset) const {
  llvm::SmallSet<std::pair<lldb::addr_t, lldb::addr_t>, 1> ranges;
  lldb_private::SymbolContext sc;
  lldb_private::Address addr;
  auto resolved = GetSymbolContextFromOffset(
      &*module_, offset, 0, lldb::eSymbolContextBlock, sc, addr);
  if ((resolved & lldb::eSymbolContextBlock) == lldb::eSymbolContextBlock) {
    lldb_private::Block* inline_block = sc.block->GetContainingInlinedBlock();
    if (inline_block) {
      size_t count = inline_block->GetNumRanges();
      for (size_t i = 0; i < count; i++) {
        lldb_private::AddressRange range;
        if (inline_block->GetRangeAtIndex(i, range)) {
          ranges.insert(
              {range.GetBaseAddress().GetOffset(), range.GetByteSize()});
        }
      }
    }
  }
  return ranges;
}

llvm::SmallSet<std::pair<lldb::addr_t, lldb::addr_t>, 1>
WasmModule::GetChildInlineFunctionAddressRanges(lldb::addr_t offset) const {
  llvm::SmallSet<std::pair<lldb::addr_t, lldb::addr_t>, 1> ranges;
  lldb_private::SymbolContext sc;
  lldb_private::Address addr;
  auto resolved = GetSymbolContextFromOffset(
      &*module_, offset, 0, lldb::eSymbolContextBlock, sc, addr);
  if ((resolved & lldb::eSymbolContextBlock) == lldb::eSymbolContextBlock) {
    // Find root block for function to search from
    lldb_private::Block* root_block = sc.block;
    while (!root_block->GetInlinedFunctionInfo()) {
      lldb_private::Block* parent = root_block->GetParent();
      if (parent) {
        root_block = parent;
      } else {
        break;
      }
    }

    // Traverse tree to find child inline blocks
    lldb_private::Block* block = root_block->GetFirstChild();
    while (block) {
      lldb_private::Block* next_block = nullptr;
      if (block->GetInlinedFunctionInfo()) {
        size_t count = block->GetNumRanges();
        for (size_t i = 0; i < count; i++) {
          lldb_private::AddressRange range;
          if (block->GetRangeAtIndex(i, range)) {
            ranges.insert(
                {range.GetBaseAddress().GetOffset(), range.GetByteSize()});
          }
        }
      } else {
        // Only traverse children when not an inline block
        next_block = block->GetFirstChild();
      }
      // If we haven't found our next block, get a sibling
      // or a parent's sibling
      if (!next_block) {
        while (true) {
          next_block = block->GetSibling();
          if (next_block) {
            break;
          }
          block = block->GetParent();
          if (!block || block == root_block) {
            break;
          }
        }
      }
      block = next_block;
    }
  }
  return ranges;
}

llvm::Expected<ExpressionResult> WasmModule::InterpretExpression(
    lldb::addr_t frame_offset,
    uint32_t inline_frame_index,
    llvm::StringRef expression,
    const api::DebuggerProxy& proxy) const {
  lldb_private::SymbolContext sc;
  lldb_private::Address addr;
  auto resolved =
      GetSymbolContextFromOffset(&*module_, frame_offset, inline_frame_index,
                                 lldb::eSymbolContextEverything, sc, addr);

  if ((resolved &
       (lldb::eSymbolContextCompUnit | lldb::eSymbolContextFunction)) == 0) {
    resolved =
        GetSymbolContextFromOffset(&*module_, frame_offset, inline_frame_index,
                                   lldb::eSymbolContextCompUnit, sc, addr);
    if ((resolved & lldb::eSymbolContextCompUnit) == 0) {
      return llvm::createStringError(
          llvm::inconvertibleErrorCode(),
          "Not in a valid symbol context at offset %zu", frame_offset);
    }
  }
  auto type_system =
      module_->GetTypeSystemForLanguage(sc.comp_unit->GetLanguage());
  if (!type_system) {
    return type_system.takeError();
  }
  return ::symbols_backend::InterpretExpression(
      *this, **type_system, sc, frame_offset, inline_frame_index, addr,
      expression, proxy);
}
}  // namespace symbols_backend
