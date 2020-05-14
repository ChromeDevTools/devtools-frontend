// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef SYMBOL_SERVER_UTIL_H_
#define SYMBOL_SERVER_UTIL_H_
#include "Plugins/TypeSystem/Clang/TypeSystemClang.h"

#ifndef DEBUG_TYPE
#define DEBUG_TYPE "symbol_server"
#endif

class ObjectFileELF;
class SymbolVendorWASM;
class SymbolFileDWARF;

namespace lldb_private {
class FileSystem;
class CPlusPlusLanguage;
class ClangASTContext;
namespace wasm {
class ObjectFileWasm;
class SymbolVendorWasm;
}  // namespace wasm
}  // namespace lldb_private

namespace symbol_server {

template <typename T>
static void initialize() {  // NOLINT
  T::Initialize();
}
template <typename T>
static void terminate() {  // NOLINT
  T::Terminate();
}
template <typename T, typename FirstT, typename... MoreT>
static void initialize() {  // NOLINT
  T::Initialize();
  initialize<FirstT, MoreT...>();
}
template <typename T, typename FirstT, typename... MoreT>
static void terminate() {  // NOLINT
  terminate<FirstT, MoreT...>();
  T::Terminate();
}

template <typename... SystemT>
struct PluginRegistryContext {
  PluginRegistryContext() { initialize<SystemT...>(); }
  ~PluginRegistryContext() { terminate<SystemT...>(); }
};

using DefaultPluginsContext =
    symbol_server::PluginRegistryContext<lldb_private::FileSystem,
                                         lldb_private::CPlusPlusLanguage,
                                         ::ObjectFileELF,
                                         lldb_private::TypeSystemClang,
                                         lldb_private::wasm::ObjectFileWasm,
                                         lldb_private::wasm::SymbolVendorWasm,
                                         ::SymbolFileDWARF>;

}  // namespace symbol_server

#endif  // SYMBOL_SERVER_UTIL_H_
