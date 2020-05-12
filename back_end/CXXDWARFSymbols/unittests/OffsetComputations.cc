// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "Modules.h"
#include "Util.h"
#include "symbol-server-test-config.h"

#include "Plugins/Language/CPlusPlus/CPlusPlusLanguage.h"  // IWYU pragma: keep
#include "Plugins/ObjectFile/ELF/ObjectFileELF.h"          // IWYU pragma: keep
#include "Plugins/ObjectFile/wasm/ObjectFileWasm.h"        // IWYU pragma: keep
#include "Plugins/SymbolFile/DWARF/SymbolFileDWARF.h"      // IWYU pragma: keep
#include "Plugins/SymbolVendor/wasm/SymbolVendorWasm.h"    // IWYU pragma: keep
#include "gmock/gmock.h"
#include "gtest/gtest.h"
#include "lldb/Host/FileSystem.h"  // IWYU pragma: keep
#include "lldb/lldb-types.h"
#include "llvm/ADT/SmallSet.h"
#include "llvm/ADT/SmallString.h"
#include "llvm/ADT/StringRef.h"
#include "llvm/Support/Error.h"
#include "llvm/Support/Path.h"
#include "llvm/Support/raw_ostream.h"

#include <string>
#include <utility>

static symbol_server::DefaultPluginsContext c;

static llvm::SmallString<32> MakeFile(llvm::StringRef file_name,
                                      bool make_absolute = false) {
  llvm::SmallString<32> file;
  if (make_absolute) {
    file = SYMBOL_SERVER_TEST_INPUTS_DIRECTORY;
  }
  llvm::sys::path::append(file, file_name);
  return file;
}

struct SymbolServerTest : public ::testing::Test {
  symbol_server::ModuleCache cache;

  const symbol_server::WasmModule* GetModule(llvm::StringRef module_name) {
    return cache.GetModuleFromUrl(module_name, MakeFile(module_name, true));
  }
};

TEST_F(SymbolServerTest, AddScript) {
  auto* module = GetModule("hello.wasm");
  ASSERT_TRUE(module);
  EXPECT_TRUE(module->Valid());
}

TEST_F(SymbolServerTest, SourceScripts) {
  auto* module = GetModule("hello.wasm");
  ASSERT_TRUE(module);
  EXPECT_EQ(module->GetSourceScripts().size(), 2u);
}

TEST_F(SymbolServerTest, HelloAddScript) {
  auto* module = GetModule("hello.wasm");
  ASSERT_TRUE(module);
  EXPECT_TRUE(module->Valid());
  auto scripts = module->GetSourceScripts();
  llvm::SmallVector<llvm::StringRef, 2> filenames;
  EXPECT_EQ(scripts.size(), 2u);
  for (auto& s : scripts) {
    filenames.push_back(s);
  }
  EXPECT_THAT(filenames, testing::UnorderedElementsAre("hello.c", "printf.h"));
}

TEST_F(SymbolServerTest, HelloSourceToRawLocation) {
  auto* module = GetModule("hello.wasm");
  ASSERT_TRUE(module);
  symbol_server::SourceLocation source_location(MakeFile("hello.c"), 8, 3);

  lldb::addr_t code_section_start = 0xf2;

  const llvm::SmallVector<const symbol_server::WasmModule*, 1>& modules =
      cache.FindModulesContainingSourceScript(source_location.file);
  EXPECT_EQ(modules.size(), 1u);
  if (modules.empty()) {
    return;
  }

  auto raw_locations =
      modules.front()->GetOffsetFromSourceLocation(source_location);
  EXPECT_EQ(raw_locations.size(), 1u);
  EXPECT_THAT(raw_locations,
              testing::ElementsAre(lldb::addr_t(0x167 - code_section_start)));
}

TEST_F(SymbolServerTest, HelloRawToSourceLocation) {
  auto* module = GetModule("hello.wasm");
  ASSERT_TRUE(module);
  lldb::addr_t code_section_start = 0xf2;
  auto loc = module->GetSourceLocationFromOffset(0x167 - code_section_start);
  EXPECT_EQ(loc.size(), 1u);
  if (loc.empty()) {
    return;
  }
  const symbol_server::SourceLocation& front_location = *loc.begin();
  EXPECT_EQ(front_location.file, "hello.c");
  EXPECT_EQ(front_location.column, 3u);
  EXPECT_EQ(front_location.line, 8u);
}

TEST_F(SymbolServerTest, InlineSourceToRawLocation) {
  auto* module = GetModule("inline.wasm");
  ASSERT_TRUE(module);
  symbol_server::SourceLocation source_location(MakeFile("inline.cc"), 8, 18);

  lldb::addr_t code_section_start = 0x102;

  const llvm::SmallVector<const symbol_server::WasmModule*, 1>& modules =
      cache.FindModulesContainingSourceScript(source_location.file);
  EXPECT_EQ(modules.size(), 1u);
  if (modules.empty()) {
    return;
  }

  auto raw_locations =
      modules.front()->GetOffsetFromSourceLocation(source_location);
  EXPECT_EQ(raw_locations.size(), 8u);
  EXPECT_THAT(raw_locations,
              testing::ElementsAre(lldb::addr_t(0x155 - code_section_start),
                                   lldb::addr_t(0x15C - code_section_start),
                                   lldb::addr_t(0x163 - code_section_start),
                                   lldb::addr_t(0x16A - code_section_start),
                                   lldb::addr_t(0x18D - code_section_start),
                                   lldb::addr_t(0x194 - code_section_start),
                                   lldb::addr_t(0x19B - code_section_start),
                                   lldb::addr_t(0x1A2 - code_section_start)));
}

TEST_F(SymbolServerTest, InlineRawToSourceLocation) {
  auto* m = GetModule("inline.wasm");
  ASSERT_TRUE(m);
  lldb::addr_t code_section_start = 0x102;
  {
    auto loc = m->GetSourceLocationFromOffset(0x167 - code_section_start);
    EXPECT_EQ(loc.size(), 1u);
    if (loc.empty()) {
      return;
    }
    const symbol_server::SourceLocation& front_location = *loc.begin();
    EXPECT_EQ(front_location.file, "inline.cc");
    EXPECT_EQ(front_location.column, 18u);
    EXPECT_EQ(front_location.line, 8u);
  }
  {
    auto loc = m->GetSourceLocationFromOffset(0x19F - code_section_start);
    EXPECT_EQ(loc.size(), 1u);
    if (loc.empty()) {
      return;
    }
    const symbol_server::SourceLocation& front_location = *loc.begin();
    EXPECT_EQ(front_location.file, "inline.cc");
    EXPECT_EQ(front_location.column, 18u);
    EXPECT_EQ(front_location.line, 8u);
  }
  {
    auto loc = m->GetSourceLocationFromOffset(0x1BB - code_section_start);
    EXPECT_EQ(loc.size(), 1u);
    if (loc.empty()) {
      return;
    }
    const symbol_server::SourceLocation& front_location = *loc.begin();
    EXPECT_EQ(front_location.file, "inline.cc");
    EXPECT_EQ(front_location.column, 7u);
    EXPECT_EQ(front_location.line, 14u);
  }
  {
    auto loc = m->GetSourceLocationFromOffset(0x1DC - code_section_start);
    EXPECT_EQ(loc.size(), 1u);
    if (loc.empty()) {
      return;
    }
    const symbol_server::SourceLocation& front_location = *loc.begin();
    EXPECT_EQ(front_location.file, "inline.cc");
    EXPECT_EQ(front_location.column, 3u);
    EXPECT_EQ(front_location.line, 20u);
  }
}

TEST_F(SymbolServerTest, AddScriptMissingScript) {
  const symbol_server::WasmModule* m = GetModule("@InvalidPath");
  EXPECT_FALSE(m);
}

TEST_F(SymbolServerTest, GlobalVariable) {
  auto* module = GetModule("global.wasm");
  ASSERT_TRUE(module);
  auto variables = module->GetVariablesInScope(0x10);
  llvm::SmallVector<llvm::StringRef, 1> names;
  for (auto& v : variables) {
    names.push_back(v.name);
  }
  EXPECT_THAT(names, testing::UnorderedElementsAre("I"));

#ifdef SYMBOL_SERVER_BUILD_FORMATTERS
  auto snippet = module->GetVariableFormatScript("I", 0x10, cache.Printer());
  EXPECT_TRUE(!!snippet);
  EXPECT_FALSE(snippet->empty());
#endif
}

TEST_F(SymbolServerTest, ClassStaticVariable) {
  auto* module = GetModule("classstatic.wasm");
  ASSERT_TRUE(module);
  auto variables = module->GetVariablesInScope(0x10);
  llvm::SmallVector<llvm::StringRef, 1> names;
  for (auto& v : variables) {
    names.push_back(v.name);
  }
  EXPECT_THAT(names, testing::UnorderedElementsAre("MyClass::I"));

#ifdef SYMBOL_SERVER_BUILD_FORMATTERS
  auto snippet = module->GetVariableFormatScript("I", 0x10, cache.Printer());
  EXPECT_TRUE(!!snippet);
  EXPECT_FALSE(snippet->empty());
#endif
}

TEST_F(SymbolServerTest, InlineLocalVariable) {
  auto* m = GetModule("inline.wasm");
  ASSERT_TRUE(m);
  lldb::addr_t code_section_start = 0x102;
  {
    const int location = 0x167 - code_section_start;
    auto variables = m->GetVariablesInScope(location);
    llvm::SmallVector<llvm::StringRef, 1> names;
    for (auto& v : variables) {
      names.push_back(v.name);
    }
    EXPECT_THAT(names, testing::UnorderedElementsAre("x", "result"));

#ifdef SYMBOL_SERVER_BUILD_FORMATTERS
    auto snippet =
        m->GetVariableFormatScript("result", location, cache.Printer());
    EXPECT_TRUE(!!snippet);
    EXPECT_FALSE(snippet->empty());
#endif
  }
  {
    const int location = 0x19F - code_section_start;
    auto variables = m->GetVariablesInScope(location);
    llvm::SmallVector<llvm::StringRef, 1> names;
    for (auto& v : variables) {
      names.push_back(v.name);
    }
    EXPECT_THAT(names, testing::UnorderedElementsAre("x", "result"));

#ifdef SYMBOL_SERVER_BUILD_FORMATTERS
    auto snippet =
        m->GetVariableFormatScript("result", location, cache.Printer());
    EXPECT_TRUE(!!snippet);
    EXPECT_FALSE(snippet->empty());
#endif
  }
  {
    const int location = 0x1BB - code_section_start;
    auto variables = m->GetVariablesInScope(location);
    llvm::SmallVector<llvm::StringRef, 1> names;
    for (auto& v : variables) {
      names.push_back(v.name);
    }
    EXPECT_THAT(names, testing::UnorderedElementsAre("x", "y", "dsq"));

#ifdef SYMBOL_SERVER_BUILD_FORMATTERS
    auto snippet = m->GetVariableFormatScript("dsq", location, cache.Printer());
    EXPECT_TRUE(!!snippet);
    EXPECT_FALSE(snippet->empty());
#endif
  }
  {
    const int location = 0x1DC - code_section_start;
    auto variables = m->GetVariablesInScope(location);
    llvm::SmallVector<llvm::StringRef, 1> names;
    for (auto& v : variables) {
      names.push_back(v.name);
    }
    EXPECT_THAT(names, testing::UnorderedElementsAre("I"));

#ifdef SYMBOL_SERVER_BUILD_FORMATTERS
    auto snippet = m->GetVariableFormatScript("I", location, cache.Printer());
    EXPECT_TRUE(!!snippet);
    EXPECT_FALSE(snippet->empty());
#endif
  }
}

TEST_F(SymbolServerTest, Strings) {
  auto* module = GetModule("string.wasm");
  ASSERT_TRUE(module);
  auto variables = module->GetVariablesInScope(0x11);
  llvm::SmallVector<llvm::StringRef, 1> names;
  for (auto& v : variables) {
    names.push_back(v.name);
  }
  EXPECT_THAT(names, testing::UnorderedElementsAre("String"));

#ifdef SYMBOL_SERVER_BUILD_FORMATTERS
  auto snippet =
      module->GetVariableFormatScript("String", 0x11, cache.Printer());
  EXPECT_TRUE(!!snippet);
  EXPECT_FALSE(snippet->empty());
#endif
}

TEST_F(SymbolServerTest, Arrays) {
  auto* module = GetModule("array.wasm");
  ASSERT_TRUE(module);
  lldb::addr_t code_section_start = 0x55;
  auto variables = module->GetVariablesInScope(0xe7 - code_section_start);
  llvm::SmallVector<std::pair<llvm::StringRef, llvm::StringRef>, 1> names;
  EXPECT_EQ(variables.size(), 1u);
  if (variables.size() > 0) {
    const symbol_server::Variable& front_variable = *variables.begin();
    EXPECT_EQ(front_variable.name, "A");
    EXPECT_EQ(front_variable.type, "int [4]");
  }

#ifdef SYMBOL_SERVER_BUILD_FORMATTERS
  auto snippet = module->GetVariableFormatScript("A", 0xe7 - code_section_start,
                                                 cache.Printer());
  EXPECT_TRUE(!!snippet) << snippet.takeError();
  EXPECT_FALSE(snippet->empty());
#endif
}
