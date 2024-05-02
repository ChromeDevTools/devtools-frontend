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
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/hello.s.wasm");
  ASSERT_TRUE(!!module);
  EXPECT_TRUE((*module)->Valid());
}

TEST(WasmModuleTest, SourceScripts) {
  auto module =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/hello.s.wasm");
  ASSERT_TRUE(!!module);
  EXPECT_EQ((*module)->GetSourceScripts().sources.size(), 2u);
}

TEST(WasmModuleTest, HelloAddScript) {
  auto module =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/hello.s.wasm");
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
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/hello.s.wasm");
  ASSERT_TRUE(!!module);
  SourceLocation source_location("hello.c", 3, 0);

  auto raw_locations = (*module)->GetOffsetFromSourceLocation(source_location);
  EXPECT_THAT(raw_locations, testing::ElementsAre(std::make_pair(2, 3)));
}

TEST(WasmModuleTest, HelloRawToSourceLocation) {
  auto module =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/hello.s.wasm");
  ASSERT_TRUE(!!module);
  auto loc = (*module)->GetSourceLocationFromOffset(2, 0);
  EXPECT_EQ(loc.size(), 1u);
  if (loc.empty()) {
    return;
  }
  const SourceLocation& front_location = *loc.begin();
  EXPECT_EQ(front_location.file, "hello.c");
  EXPECT_EQ(front_location.column, 0u);
  EXPECT_EQ(front_location.line, 3u);
}

TEST(WasmModuleTest, RegressCrbug1153147) {
  auto module = WasmModule::CreateFromFile(
      "cxx_debugging/tests/inputs/windows_paths.s.wasm");
  ASSERT_TRUE(!!module);

  SourceLocation source_location("c:\\src\\temp.c", 5, 5);
  auto raw_locations = (*module)->GetOffsetFromSourceLocation(source_location);
  EXPECT_THAT(raw_locations, testing::ElementsAre(std::make_pair(2, 5)));
}

TEST(WasmModuleTest, InlineSourceToRawLocation) {
  auto module =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/inline.s.wasm");
  ASSERT_TRUE(!!module);
  SourceLocation source_location("inline.c", 10, 0);

  auto raw_locations = (*module)->GetOffsetFromSourceLocation(source_location);
  EXPECT_THAT(raw_locations,
              testing::ElementsAre(std::make_pair(lldb::addr_t(0x5), 1)));
}

TEST(WasmModuleTest, InlineRawToSourceLocation) {
  auto m =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/inline.s.wasm");
  ASSERT_TRUE(!!m);
  {
    auto loc = (*m)->GetSourceLocationFromOffset(0x2, 0);
    EXPECT_EQ(loc.size(), 1u);
    if (loc.empty()) {
      return;
    }
    const SourceLocation& front_location = *loc.begin();
    EXPECT_EQ(front_location.file, "inline.c");
    EXPECT_EQ(front_location.column, 0u);
    EXPECT_EQ(front_location.line, 1u);
  }
  {
    auto loc = (*m)->GetSourceLocationFromOffset(0x5, 0);
    EXPECT_EQ(loc.size(), 1u);
    if (loc.empty()) {
      return;
    }
    const SourceLocation& front_location = *loc.begin();
    EXPECT_EQ(front_location.file, "inline.c");
    EXPECT_EQ(front_location.column, 0u);
    EXPECT_EQ(front_location.line, 10u);
  }
  {
    auto loc = (*m)->GetSourceLocationFromOffset(0x6, 0);
    EXPECT_EQ(loc.size(), 1u);
    if (loc.empty()) {
      return;
    }
    const SourceLocation& front_location = *loc.begin();
    EXPECT_EQ(front_location.file, "inline.c");
    EXPECT_EQ(front_location.column, 0u);
    EXPECT_EQ(front_location.line, 2u);
  }
}

TEST(WasmModuleTest, InlineFunctionInfo) {
  auto m =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/inline.s.wasm");
  ASSERT_TRUE(!!m);
  {
    auto function_names = (*m)->GetFunctionInfo(0x2).names;
    EXPECT_THAT(function_names, testing::ElementsAre("caller"));
  }
  {
    auto function_names = (*m)->GetFunctionInfo(0x5).names;
    EXPECT_THAT(function_names, testing::ElementsAre("callee", "caller"));
  }
}

TEST(WasmModuleTest, InlineFunctionRanges) {
  auto m =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/inline.s.wasm");
  ASSERT_TRUE(!!m);
  {
    llvm::SmallVector<LocationRange, 1> function_ranges(
        MakeRange((*m)->GetInlineFunctionAddressRanges(0x5)));
    EXPECT_THAT(function_ranges.size(), 1u);
    EXPECT_THAT(function_ranges, testing::ElementsAre(std::make_pair(0x5, 1)));
  }
}

TEST(WasmModuleTest, ChildInlineFunctionRanges) {
  auto m =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/inline.s.wasm");
  ASSERT_TRUE(!!m);
  llvm::SmallVector<LocationRange, 1> function_ranges(
      MakeRange((*m)->GetChildInlineFunctionAddressRanges(0x2)));
  EXPECT_THAT(function_ranges.size(), 1u);
  EXPECT_THAT(function_ranges, testing::ElementsAre(std::make_pair(0x5, 1)));
}

TEST(WasmModuleTest, AddScriptMissingScript) {
  auto m = WasmModule::CreateFromFile("@InvalidPath");
  EXPECT_FALSE(m);
  llvm::consumeError(m.takeError());
}

TEST(WasmModuleTest, GlobalVariable) {
  auto module =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/globals.s.wasm");
  ASSERT_TRUE(!!module);
  auto variables = (*module)->GetVariablesInScope(0x3, 0);
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
  auto module = WasmModule::CreateFromFile(
      "cxx_debugging/tests/inputs/classstatic.s.wasm");
  ASSERT_TRUE(!!module);
  auto variables = (*module)->GetVariablesInScope(0x3, 0);
  llvm::SmallVector<llvm::StringRef, 1> names;
  for (auto& v : variables) {
    names.push_back(v.name);
  }
  EXPECT_THAT(names, testing::UnorderedElementsAre("MyClass::I"));
}

TEST(WasmModuleTest, NamespacedGlobalVariables) {
  auto m = WasmModule::CreateFromFile(
      "cxx_debugging/tests/inputs/namespaces.s.wasm");
  ASSERT_TRUE(!!m);
  auto variables = (*m)->GetVariablesInScope(0x03, 0);
  llvm::SmallVector<llvm::StringRef, 5> names;
  for (auto& v : variables) {
    names.push_back(v.name);
  }
  EXPECT_THAT(names, testing::UnorderedElementsAre("L", "n1::n2::I", "n1::I",
                                                   "n1::MyClass::I",
                                                   "(anonymous namespace)::K"));
}

TEST(WasmModuleTest, InlineLocalVariable) {
  auto m =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/inline.s.wasm");
  ASSERT_TRUE(!!m);
  {
    auto variables = (*m)->GetVariablesInScope(0x2, 0);
    llvm::SmallVector<llvm::StringRef, 2> names;
    for (auto& v : variables) {
      names.push_back(v.name);
    }
    EXPECT_THAT(names, testing::UnorderedElementsAre("outer_var"));
  }
  {
    auto variables = (*m)->GetVariablesInScope(0x5, 0);
    llvm::SmallVector<llvm::StringRef, 2> names;
    for (auto& v : variables) {
      names.push_back(v.name);
    }
    EXPECT_THAT(names,
                testing::UnorderedElementsAre("inner_var", "inner_param"));
  }
}

TEST(WasmModuleTest, ShadowingVariables) {
  auto module =
      WasmModule::CreateFromFile("cxx_debugging/tests/inputs/shadowing.s.wasm");
  ASSERT_TRUE(!!module);

  auto variables = (*module)->GetVariablesInScope(0x04, 0);
  ASSERT_EQ(variables.size(), 1);

  auto var = variables.begin();
  ASSERT_EQ(var->name, "a");
  ASSERT_EQ(var->scope, lldb::eValueTypeVariableLocal);

  variables = (*module)->GetVariablesInScope(0x02, 0);
  ASSERT_EQ(variables.size(), 1);

  var = variables.begin();
  ASSERT_EQ(var->name, "a");
  ASSERT_EQ(var->scope, lldb::eValueTypeVariableArgument);
}

}  // namespace symbols_backend
