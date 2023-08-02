# Copyright 2023 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

llvm_add_library(DWARFSymbols
  api.h
  ApiContext.cc
  ApiContext.h
  Expressions.cc
  Expressions.h
  Variables.cc
  Variables.h
  WasmModule.cc
  WasmModule.h
  WasmVendorPlugins.h
  WasmVendorPlugins.cc

  ${THIRD_PARTY_DIR}/lldb-eval/src/lldb-eval/ast.cc
  ${THIRD_PARTY_DIR}/lldb-eval/src/lldb-eval/ast.h
  ${THIRD_PARTY_DIR}/lldb-eval/src/lldb-eval/defines.h
  ${THIRD_PARTY_DIR}/lldb-eval/src/lldb-eval/parser.cc
  ${THIRD_PARTY_DIR}/lldb-eval/src/lldb-eval/parser.h
  ${THIRD_PARTY_DIR}/lldb-eval/src/lldb-eval/parser_context.cc
  ${THIRD_PARTY_DIR}/lldb-eval/src/lldb-eval/parser_context.h
  ${THIRD_PARTY_DIR}/lldb-eval/src/lldb-eval/type.cc
  ${THIRD_PARTY_DIR}/lldb-eval/src/lldb-eval/type.h
  ${THIRD_PARTY_DIR}/lldb-eval/src/lldb-eval/eval.cc
  ${THIRD_PARTY_DIR}/lldb-eval/src/lldb-eval/eval.h
  ${THIRD_PARTY_DIR}/lldb-eval/src/lldb-eval/value.cc
  ${THIRD_PARTY_DIR}/lldb-eval/src/lldb-eval/value.h
  ${THIRD_PARTY_DIR}/lldb-eval/src/lldb-eval/context.cc
  ${THIRD_PARTY_DIR}/lldb-eval/src/lldb-eval/context.h
  LINK_LIBS liblldb
            lldbHost
            lldbInitialization
            lldbPluginSymbolFileDWARF
            lldbPluginObjectFileWasm
            lldbPluginSymbolVendorWasm
            ${LLDB_SYSTEM_LIBS}
  LINK_COMPONENTS Support)

if (NOT LLVM_REQUIRES_EH AND NOT LLVM_ENABLE_RTTI)
  target_compile_options(DWARFSymbols PUBLIC -fno-rtti)
endif()

get_target_property(LLDB_INCLUDE_DIRS lldbHost INCLUDE_DIRECTORIES)
target_include_directories(DWARFSymbols PUBLIC
  ${PROJECT_SOURCE_DIR}/third_party/llvm/lldb/source
  ${PROJECT_SOURCE_DIR}/third_party/llvm/lldb/include
  ${LLDB_INCLUDE_DIRS}
  ${PROJECT_BINARY_DIR}/third_party/llvm/lldb/include
  ${THIRD_PARTY_DIR}/lldb-eval/src
  ${CMAKE_CURRENT_SOURCE_DIR})
