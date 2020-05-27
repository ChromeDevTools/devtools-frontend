# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${SYMBOL_SERVER_BINARY_DIR})
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${SYMBOL_SERVER_LIBRARY_DIR})
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${SYMBOL_SERVER_LIBRARY_DIR})

set(SYMBOL_SERVER_TOOL_DIR ${CMAKE_CURRENT_BINARY_DIR})
configure_file(symbol-server-config.h.in
               ${CMAKE_CURRENT_BINARY_DIR}/symbol-server-config.h @ONLY)

llvm_add_library(DWARFSymbols
  APIImpl.cc
  Modules.cc
  Variables.cc
  DWARFLocationParser.cc

  LINK_LIBS
  lldbBase
  lldbHost
  lldbInitialization
  lldbPluginSymbolFileDWARF
  lldbPluginObjectFileWasm
  lldbPluginObjectFileELF
  lldbPluginSymbolVendorWasm
  lldWasm
  lldDriver
  ${LLDB_SYSTEM_LIBS}

  LINK_COMPONENTS
  Support
  Core
  Analysis
  Linker
  IRReader
  Target
  WebAssembly
  TransformUtils
  MC
  Passes
  )
include_what_you_use(DWARFSymbols)

get_target_property(SYMBOL_SERVER_SOURCES DWARFSymbols SOURCES)
set(LLVM_OPTIONAL_SOURCES ${LLVM_OPTIONAL_SOURCES} ${SYMBOL_SERVER_SOURCES})

get_target_property(LLD_INCLUDE_DIRS lldDriver INCLUDE_DIRECTORIES)
get_target_property(LLDB_INCLUDE_DIRS lldbBase INCLUDE_DIRECTORIES)
get_target_property(CLANG_INCLUDE_DIRS clang INCLUDE_DIRECTORIES)
target_include_directories(DWARFSymbols PUBLIC
  ${PROJECT_SOURCE_DIR}/third_party/llvm/lldb/source
  ${PROJECT_SOURCE_DIR}/third_party/llvm/lldb/include
  ${LLDB_INCLUDE_DIRS}
  ${CLANG_INCLUDE_DIRS}
  ${LLD_INCLUDE_DIRS}
  ${PROTOBUF_INCLUDE_DIRS}
  ${CMAKE_CURRENT_BINARY_DIR}
  ${PROJECT_BINARY_DIR}/third_party/llvm/lldb/include
  ${PROJECT_SOURCE_DIR}/third_party/llvm/clang/include
  ${PROJECT_BINARY_DIR}/third_party/llvm/clang/include
  ${CMAKE_CURRENT_SOURCE_DIR}
  )

if (SYMBOL_SERVER_BUILD_FORMATTERS)
  if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    set(optargs -O1)
  else()
    set(optargs -O3 -DNDEBUG)
  endif()
  set(_formatter_includes
    -I/usr/include/x86_64-linux-gnu
    -I/usr/include
    -I/usr/include/c++/8
    -I/usr/include/x86_64-linux-gnu/c++/8
    )

  add_custom_target(SymbolServerRuntime
    COMMAND $<TARGET_FILE:clang>
    ${CMAKE_CURRENT_SOURCE_DIR}/runtime/formatters.cc
    -std=c++14 -emit-llvm -c
    --target=wasm32-unknown-unknown-wasm
    ${_optargs}
    ${_formatter_includes}
    DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/runtime/formatters.cc clang
    BYPRODUCTS formatters.bc
    )
  add_dependencies(DWARFSymbols SymbolServerRuntime)
endif()
