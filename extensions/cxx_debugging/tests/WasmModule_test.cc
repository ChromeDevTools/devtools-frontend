// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "WasmModule.h"
#include "WasmVendorPlugins.h"

#include "Plugins/Language/CPlusPlus/CPlusPlusLanguage.h"
#include "Plugins/ObjectFile/wasm/ObjectFileWasm.h"
#include "Plugins/SymbolFile/DWARF/SymbolFileDWARF.h"
#include "Plugins/SymbolVendor/wasm/SymbolVendorWasm.h"
#include "gmock/gmock.h"
#include "gtest/gtest.h"
#include "lldb/Host/FileSystem.h"
#include "lldb/lldb-types.h"
#include "llvm/ADT/STLExtras.h"
#include "llvm/ADT/SmallSet.h"
#include "llvm/ADT/StringRef.h"
#include "llvm/ADT/iterator_range.h"
#include "llvm/BinaryFormat/Dwarf.h"

#include <algorithm>
#include <utility>
#include <vector>

namespace symbols_backend {
namespace {

using LocationRange = std::pair<lldb::addr_t, lldb::addr_t>;

symbols_backend::PluginRegistryContext<symbols_backend::WasmPlatform,
                                       lldb_private::FileSystem,
                                       lldb_private::CPlusPlusLanguage,
                                       lldb_private::TypeSystemClang,
                                       lldb_private::wasm::ObjectFileWasm,
                                       lldb_private::wasm::SymbolVendorWasm,
                                       symbols_backend::WasmProcess,
                                       symbols_backend::SymbolFileWasmDWARF>
    c;

template <typename ContainerT>
auto MakeRange(const ContainerT& c)
    -> llvm::iterator_range<decltype(c.begin())> {
  return c;
}

}  // namespace

TEST(WasmModuleTest, AddScript) {
  llvm::Expected<std::unique_ptr<WasmModule>> module =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/hello.wasm");
  ASSERT_TRUE(!!module);
  EXPECT_TRUE((*module)->Valid());
}

TEST(WasmModuleTest, SourceScripts) {
  auto module =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/hello.wasm");
  ASSERT_TRUE(!!module);
  EXPECT_EQ((*module)->GetSourceScripts().sources.size(), 2u);
}

TEST(WasmModuleTest, HelloAddScript) {
  auto module =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/hello.wasm");
  ASSERT_TRUE(!!module);
  EXPECT_TRUE((*module)->Valid());
  auto scripts = (*module)->GetSourceScripts();
  llvm::SmallVector<llvm::StringRef, 2> filenames;
  EXPECT_EQ(scripts.sources.size(), 2u);
  EXPECT_EQ(scripts.dwos.size(), 0u);
  for (auto& s : scripts.sources) {
    filenames.push_back(s);
  }
  EXPECT_THAT(filenames, testing::UnorderedElementsAre("hello.c", "printf.h"));
}

TEST(WasmModuleTest, HelloSourceToRawLocation) {
  auto module =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/hello.wasm");
  ASSERT_TRUE(!!module);
  SourceLocation source_location("hello.c", 8, 3);

  lldb::addr_t code_section_start = 0xf2;

  auto raw_locations = (*module)->GetOffsetFromSourceLocation(source_location);
  EXPECT_THAT(raw_locations, testing::ElementsAre(std::make_pair(
                                 lldb::addr_t(0x167 - code_section_start), 8)));
}

TEST(WasmModuleTest, HelloRawToSourceLocation) {
  auto module =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/hello.wasm");
  ASSERT_TRUE(!!module);
  lldb::addr_t code_section_start = 0xf2;
  auto loc =
      (*module)->GetSourceLocationFromOffset(0x167 - code_section_start, 0);
  EXPECT_EQ(loc.size(), 1u);
  if (loc.empty()) {
    return;
  }
  const SourceLocation& front_location = *loc.begin();
  EXPECT_EQ(front_location.file, "hello.c");
  EXPECT_EQ(front_location.column, 3u);
  EXPECT_EQ(front_location.line, 8u);
}

TEST(WasmModuleTest, InlineExactGetOffsetFromSourceLocation) {
  auto module =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/inline_emcc.wasm");
  ASSERT_TRUE(!!module);

  {
    // inline.c:18 -> 0x05
    SourceLocation source_location("inline.cc", 18, 0);
    auto raw_locations =
        (*module)->GetOffsetFromSourceLocation(source_location);
    EXPECT_THAT(raw_locations, testing::ElementsAre(std::make_pair(0x05, 4)));
  }

  {
    // inline.c:19 not present
    SourceLocation source_location("inline.cc", 19, 0);
    auto raw_locations =
        (*module)->GetOffsetFromSourceLocation(source_location);
    EXPECT_THAT(raw_locations, testing::ElementsAre());
  }

  {
    // inline.c:20 -> 0x09
    SourceLocation source_location("inline.cc", 20, 0);
    auto raw_locations =
        (*module)->GetOffsetFromSourceLocation(source_location);
    EXPECT_THAT(raw_locations, testing::ElementsAre(std::make_pair(0x09, 5)));
  }
}

TEST(WasmModuleTest, RegressCrbug1153147) {
  auto module = WasmModule::CreateFromFile(
      "cxx_debugging/tests/inputs/regress-crbug-1153147.wasm");
  ASSERT_TRUE(!!module);

  SourceLocation source_location("c:\\src\\temp.c", 5, 5);
  auto raw_locations = (*module)->GetOffsetFromSourceLocation(source_location);
  EXPECT_THAT(raw_locations, testing::ElementsAre(std::make_pair(0x6e, 4)));
}

TEST(WasmModuleTest, InlineSourceToRawLocation) {
  auto module =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/inline.wasm");
  ASSERT_TRUE(!!module);
  SourceLocation source_location("inline.cc", 8, 18);

  auto raw_locations = (*module)->GetOffsetFromSourceLocation(source_location);
  EXPECT_THAT(raw_locations,
              testing::ElementsAre(std::make_pair(lldb::addr_t(0x61), 14),
                                   std::make_pair(lldb::addr_t(0x99), 14)));
}

TEST(WasmModuleTest, InlineRawToSourceLocation) {
  auto m = WasmModule::CreateFromFile("cxx_debugging/tests/inputs/inline.wasm");
  ASSERT_TRUE(!!m);
  lldb::addr_t code_section_start = 0x102;
  {
    auto loc = (*m)->GetSourceLocationFromOffset(0x167 - code_section_start, 0);
    EXPECT_EQ(loc.size(), 1u);
    if (loc.empty()) {
      return;
    }
    const SourceLocation& front_location = *loc.begin();
    EXPECT_EQ(front_location.file, "inline.cc");
    EXPECT_EQ(front_location.column, 18u);
    EXPECT_EQ(front_location.line, 8u);
  }
  {
    auto loc = (*m)->GetSourceLocationFromOffset(0x19F - code_section_start, 0);
    EXPECT_EQ(loc.size(), 1u);
    if (loc.empty()) {
      return;
    }
    const SourceLocation& front_location = *loc.begin();
    EXPECT_EQ(front_location.file, "inline.cc");
    EXPECT_EQ(front_location.column, 18u);
    EXPECT_EQ(front_location.line, 8u);
  }
  {
    auto loc = (*m)->GetSourceLocationFromOffset(0x1BB - code_section_start, 0);
    EXPECT_EQ(loc.size(), 1u);
    if (loc.empty()) {
      return;
    }
    const SourceLocation& front_location = *loc.begin();
    EXPECT_EQ(front_location.file, "inline.cc");
    EXPECT_EQ(front_location.column, 7u);
    EXPECT_EQ(front_location.line, 14u);
  }
  {
    auto loc = (*m)->GetSourceLocationFromOffset(0x1DC - code_section_start, 0);
    EXPECT_EQ(loc.size(), 1u);
    if (loc.empty()) {
      return;
    }
    const SourceLocation& front_location = *loc.begin();
    EXPECT_EQ(front_location.file, "inline.cc");
    EXPECT_EQ(front_location.column, 3u);
    EXPECT_EQ(front_location.line, 20u);
  }
  {
    auto loc = (*m)->GetSourceLocationFromOffset(0x167 - code_section_start, 1);
    EXPECT_EQ(loc.size(), 1u);
    if (loc.empty()) {
      return;
    }
    const SourceLocation& front_location = *loc.begin();
    EXPECT_EQ(front_location.file, "inline.cc");
    EXPECT_EQ(front_location.column, 13u);
    EXPECT_EQ(front_location.line, 13u);
  }
  {
    auto loc = (*m)->GetSourceLocationFromOffset(0x19F - code_section_start, 1);
    EXPECT_EQ(loc.size(), 1u);
    if (loc.empty()) {
      return;
    }
    const SourceLocation& front_location = *loc.begin();
    EXPECT_EQ(front_location.file, "inline.cc");
    EXPECT_EQ(front_location.column, 10u);
    EXPECT_EQ(front_location.line, 14u);
  }
  {
    auto loc = (*m)->GetSourceLocationFromOffset(0x167 - code_section_start, 2);
    EXPECT_EQ(loc.size(), 1u);
    if (loc.empty()) {
      return;
    }
    const SourceLocation& front_location = *loc.begin();
    EXPECT_EQ(front_location.file, "inline.cc");
    EXPECT_EQ(front_location.column, 11u);
    EXPECT_EQ(front_location.line, 19u);
  }
  {
    auto loc = (*m)->GetSourceLocationFromOffset(0x19F - code_section_start, 2);
    EXPECT_EQ(loc.size(), 1u);
    if (loc.empty()) {
      return;
    }
    const SourceLocation& front_location = *loc.begin();
    EXPECT_EQ(front_location.file, "inline.cc");
    EXPECT_EQ(front_location.column, 11u);
    EXPECT_EQ(front_location.line, 19u);
  }
  {
    auto loc = (*m)->GetSourceLocationFromOffset(0x1BB - code_section_start, 1);
    EXPECT_EQ(loc.size(), 1u);
    if (loc.empty()) {
      return;
    }
    const SourceLocation& front_location = *loc.begin();
    EXPECT_EQ(front_location.file, "inline.cc");
    EXPECT_EQ(front_location.column, 11u);
    EXPECT_EQ(front_location.line, 19u);
  }
}

TEST(WasmModuleTest, InlineFunctionInfo) {
  auto m = WasmModule::CreateFromFile("cxx_debugging/tests/inputs/inline.wasm");
  ASSERT_TRUE(!!m);
  lldb::addr_t code_section_start = 0x102;
  {
    auto function_names =
        (*m)->GetFunctionInfo(0x167 - code_section_start).names;
    EXPECT_THAT(
        function_names,
        testing::ElementsAre("square(int)", "dsquare(int, int)", "main"));
  }
  {
    auto function_names =
        (*m)->GetFunctionInfo(0x19F - code_section_start).names;
    EXPECT_THAT(
        function_names,
        testing::ElementsAre("square(int)", "dsquare(int, int)", "main"));
  }
  {
    auto function_names =
        (*m)->GetFunctionInfo(0x1BB - code_section_start).names;
    EXPECT_THAT(function_names,
                testing::ElementsAre("dsquare(int, int)", "main"));
  }
  {
    auto function_names =
        (*m)->GetFunctionInfo(0x1DC - code_section_start).names;
    EXPECT_THAT(function_names, testing::ElementsAre("main"));
  }
}

TEST(WasmModuleTest, InlineFunctionRanges) {
  auto m = WasmModule::CreateFromFile("cxx_debugging/tests/inputs/inline.wasm");
  ASSERT_TRUE(!!m);
  lldb::addr_t code_section_start = 0x102;
  {
    llvm::SmallVector<LocationRange, 1> function_ranges(MakeRange(
        (*m)->GetInlineFunctionAddressRanges(0x167 - code_section_start)));
    EXPECT_THAT(function_ranges,
                testing::ElementsAre(std::make_pair(
                    lldb::addr_t(0x155 - code_section_start), 0x23)));
  }
  {
    llvm::SmallVector<LocationRange, 1> function_ranges(MakeRange(
        (*m)->GetInlineFunctionAddressRanges(0x19F - code_section_start)));
    EXPECT_THAT(function_ranges,
                testing::ElementsAre(std::make_pair(
                    lldb::addr_t(0x18D - code_section_start), 0x23)));
  }
  {
    llvm::SmallVector<LocationRange, 1> function_ranges(MakeRange(
        (*m)->GetInlineFunctionAddressRanges(0x1BB - code_section_start)));
    EXPECT_THAT(function_ranges,
                testing::ElementsAre(std::make_pair(
                    lldb::addr_t(0x147 - code_section_start), 0x85)));
  }
  {
    llvm::SmallVector<LocationRange, 1> function_ranges(MakeRange(
        (*m)->GetInlineFunctionAddressRanges(0x1DC - code_section_start)));
    EXPECT_EQ(function_ranges.size(), 0u);
  }
}

TEST(WasmModuleTest, ChildInlineFunctionRanges) {
  auto m = WasmModule::CreateFromFile("cxx_debugging/tests/inputs/inline.wasm");
  ASSERT_TRUE(!!m);
  lldb::addr_t code_section_start = 0x102;
  {
    llvm::SmallVector<LocationRange, 1> function_ranges(MakeRange(
        (*m)->GetChildInlineFunctionAddressRanges(0x167 - code_section_start)));
    EXPECT_EQ(function_ranges.size(), 0u);
  }
  {
    llvm::SmallVector<LocationRange, 1> function_ranges(MakeRange(
        (*m)->GetChildInlineFunctionAddressRanges(0x19F - code_section_start)));
    EXPECT_EQ(function_ranges.size(), 0u);
  }
  {
    llvm::SmallVector<LocationRange, 1> function_ranges(MakeRange(
        (*m)->GetChildInlineFunctionAddressRanges(0x1BB - code_section_start)));
    EXPECT_THAT(
        function_ranges,
        testing::ElementsAre(
            std::make_pair(lldb::addr_t(0x155 - code_section_start), 0x23),
            std::make_pair(lldb::addr_t(0x18D - code_section_start), 0x23)));
  }
  {
    llvm::SmallVector<LocationRange, 1> function_ranges(MakeRange(
        (*m)->GetChildInlineFunctionAddressRanges(0x1DC - code_section_start)));
    EXPECT_THAT(function_ranges,
                testing::ElementsAre(std::make_pair(
                    lldb::addr_t(0x147 - code_section_start), 0x85)));
  }
}

TEST(WasmModuleTest, AddScriptMissingScript) {
  auto m = WasmModule::CreateFromFile("@InvalidPath");
  EXPECT_FALSE(m);
  llvm::consumeError(m.takeError());
}

TEST(WasmModuleTest, GlobalVariable) {
  auto module =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/global.wasm");
  ASSERT_TRUE(!!module);
  auto variables = (*module)->GetVariablesInScope(0x2f, 0);
  std::vector<llvm::StringRef> names;
  names.reserve(variables.size());
  for (auto& v : variables) {
    names.push_back(v.name);
  }
  llvm::sort(names);
  EXPECT_THAT(names, testing::UnorderedElementsAreArray({
                         "i",
                         "S<int>::buffer",
                         "::i_ptr",
                         "::v_ptr",
                         "::var_bool",
                         "::var_char",
                         "::var_double",
                         "::var_float",
                         "::var_int",
                         "::var_int16_t",
                         "::var_int32_t",
                         "::var_int64_t",
                         "::var_int8_t",
                         "::var_long",
                         "::var_long_int",
                         "::var_long_long",
                         "::var_long_long_int",
                         "::var_short",
                         "::var_short_int",
                         "::var_signed",
                         "::var_signed_char",
                         "::var_signed_int",
                         "::var_signed_long",
                         "::var_signed_long_int",
                         "::var_signed_long_long",
                         "::var_signed_long_long_int",
                         "::var_signed_short",
                         "::var_signed_short_int",
                         "::var_uint16_t",
                         "::var_uint32_t",
                         "::var_uint64_t",
                         "::var_uint8_t",
                         "::var_unsigned",
                         "::var_unsigned_char",
                         "::var_unsigned_int",
                         "::var_unsigned_long",
                         "::var_unsigned_long_int",
                         "::var_unsigned_long_long",
                         "::var_unsigned_long_long_int",
                         "::var_unsigned_short",
                         "::var_unsigned_short_int",
                         "::var_int128",
                         "::var_uint128",
                     }));
}

TEST(WasmModuleTest, ClassStaticVariable) {
  auto module =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/classstatic.wasm");
  ASSERT_TRUE(!!module);
  auto variables = (*module)->GetVariablesInScope(0x4c, 0);
  llvm::SmallVector<llvm::StringRef, 1> names;
  for (auto& v : variables) {
    names.push_back(v.name);
  }
  EXPECT_THAT(names, testing::UnorderedElementsAre("MyClass::I"));
}

TEST(WasmModuleTest, NamespacedGlobalVariables) {
  auto m =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/namespaces.wasm");
  ASSERT_TRUE(!!m);
  lldb::addr_t code_section_start = 0x139;
  auto variables = (*m)->GetVariablesInScope(0x19c - code_section_start, 0);
  llvm::SmallVector<llvm::StringRef, 5> names;
  for (auto& v : variables) {
    names.push_back(v.name);
  }
  EXPECT_THAT(names, testing::UnorderedElementsAre("L", "n1::n2::I", "n1::I",
                                                   "n1::MyClass::I",
                                                   "(anonymous namespace)::K"));
}

TEST(WasmModuleTest, InlineLocalVariable) {
  auto m = WasmModule::CreateFromFile("cxx_debugging/tests/inputs/inline.wasm");
  ASSERT_TRUE(!!m);
  lldb::addr_t code_section_start = 0x102;
  {
    const int location = 0x167 - code_section_start;
    auto variables = (*m)->GetVariablesInScope(location, 0);
    llvm::SmallVector<llvm::StringRef, 2> names;
    for (auto& v : variables) {
      names.push_back(v.name);
    }
    EXPECT_THAT(names, testing::UnorderedElementsAre("x", "result"));
  }
  {
    const int location = 0x19F - code_section_start;
    auto variables = (*m)->GetVariablesInScope(location, 0);
    llvm::SmallVector<llvm::StringRef, 2> names;
    for (auto& v : variables) {
      names.push_back(v.name);
    }
    EXPECT_THAT(names, testing::UnorderedElementsAre("x", "result"));
  }
  {
    const int location = 0x1BB - code_section_start;
    auto variables = (*m)->GetVariablesInScope(location, 0);
    llvm::SmallVector<llvm::StringRef, 3> names;
    for (auto& v : variables) {
      names.push_back(v.name);
    }
    EXPECT_THAT(names, testing::UnorderedElementsAre("x", "y", "dsq"));
  }
  {
    const int location = 0x1DC - code_section_start;
    auto variables = (*m)->GetVariablesInScope(location, 0);
    llvm::SmallVector<llvm::StringRef, 1> names;
    for (auto& v : variables) {
      names.push_back(v.name);
    }
    EXPECT_THAT(names, testing::UnorderedElementsAre("I"));
  }
  {
    const int location = 0x167 - code_section_start;
    auto variables = (*m)->GetVariablesInScope(location, 1);
    llvm::SmallVector<llvm::StringRef, 3> names;
    for (auto& v : variables) {
      names.push_back(v.name);
    }
    EXPECT_THAT(names, testing::UnorderedElementsAre("x", "y", "dsq"));
  }
  {
    const int location = 0x167 - code_section_start;
    auto variables = (*m)->GetVariablesInScope(location, 2);
    llvm::SmallVector<llvm::StringRef, 1> names;
    for (auto& v : variables) {
      names.push_back(v.name);
    }
    EXPECT_THAT(names, testing::UnorderedElementsAre("I"));
  }
  {
    const int location = 0x1BB - code_section_start;
    auto variables = (*m)->GetVariablesInScope(location, 1);
    llvm::SmallVector<llvm::StringRef, 1> names;
    for (auto& v : variables) {
      names.push_back(v.name);
    }
    EXPECT_THAT(names, testing::UnorderedElementsAre("I"));
  }
}

TEST(WasmModuleTest, Strings) {
  auto module =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/string.wasm");
  ASSERT_TRUE(!!module);
  auto variables = (*module)->GetVariablesInScope(0x11, 0);
  llvm::SmallVector<llvm::StringRef, 1> names;
  for (auto& v : variables) {
    names.push_back(v.name);
  }
  EXPECT_THAT(names, testing::UnorderedElementsAre("String"));
}

TEST(WasmModuleTest, Arrays) {
  auto module =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/array.wasm");
  ASSERT_TRUE(!!module);
  lldb::addr_t code_section_start = 0x55;
  auto variables = (*module)->GetVariablesInScope(0xe7 - code_section_start, 0);
  llvm::SmallVector<std::pair<llvm::StringRef, llvm::StringRef>, 1> names;
  EXPECT_EQ(variables.size(), 1u);
  if (variables.size() > 0) {
    const Variable& front_variable = *variables.begin();
    EXPECT_EQ(front_variable.name, "A");
    EXPECT_EQ(front_variable.type, "int[4]");
  }
}

TEST(WasmModuleTest, GetMappedLinesMultipleIndices) {
  auto module = WasmModule::CreateFromFile(
      "cxx_debugging/tests/inputs/addresses_multiple_file_indices.wasm");
  ASSERT_TRUE(!!module);
  auto lines = (*module)->GetMappedLines("/tmp/tmp.2cFLVcXyW0/addresses.cc");
  ASSERT_GT(lines.size(), 0);

  EXPECT_THAT(lines, testing::UnorderedElementsAreArray(
                         {0, 5, 6, 7, 9, 11, 12, 16, 17, 20, 21, 22}));
}

TEST(WasmModuleTest, ShadowingVariables) {
  auto module =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/shadowing.wasm");
  ASSERT_TRUE(!!module);

  auto offsets = (*module)->GetOffsetFromSourceLocation({"shadowing.c", 9, 7});
  ASSERT_GT(offsets.size(), 0);

  auto variables = (*module)->GetVariablesInScope((*offsets.begin()).first, 0);
  ASSERT_EQ(variables.size(), 1);

  auto var = variables.begin();
  ASSERT_EQ(var->name, "a");
  ASSERT_EQ(var->scope, lldb::eValueTypeVariableLocal);

  offsets = (*module)->GetOffsetFromSourceLocation({"shadowing.c", 13, 3});
  ASSERT_GT(offsets.size(), 0);

  variables = (*module)->GetVariablesInScope((*offsets.begin()).first, 0);
  ASSERT_EQ(variables.size(), 1);

  var = variables.begin();
  ASSERT_EQ(var->name, "a");
  ASSERT_EQ(var->scope, lldb::eValueTypeVariableArgument);
}

}  // namespace symbols_backend
