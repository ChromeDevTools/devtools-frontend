# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

include_directories(
  ${CMAKE_CURRENT_BINARY_DIR}
  ${PROJECT_SOURCE_DIR}/third_party/llvm/llvm/utils/unittest/googlemock/include
  ${PROJECT_SOURCE_DIR}/third_party/llvm/llvm/utils/unittest/googletest/include
  ${LLD_INCLUDE_DIRS}
  )

set(SYMBOL_SERVER_TEST_INPUTS_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/Inputs)
configure_file(symbol-server-test-config.h.in
               ${CMAKE_CURRENT_BINARY_DIR}/symbol-server-test-config.h @ONLY)

add_definitions(-DGOOGLE_PROTOBUF_NO_RTTI)

set(sources OffsetComputations.cc)
if (SYMBOL_SERVER_BUILD_FORMATTERS)
  list(APPEND sources VariablePrinting.cc)
else()
  set(LLVM_OPTIONAL_SOURCES VariablePrinting.cc)
endif()

set(LLVM_LINK_COMPONENTS
  Support
  Core
  Linker
  Analysis
  IRReader
  Target
  WebAssembly
  TransformUtils
  Passes
  )

add_llvm_unittest(SymbolServerTests
  ${sources}
  )

target_link_libraries(SymbolServerTests
  PRIVATE
  DWARFSymbolServerObjects
  lldbBase
  lldbHost
  lldbInitialization
  lldbPluginSymbolFileDWARF
  lldbPluginObjectFileWasm
  lldbPluginObjectFileELF
  lldbPluginSymbolVendorWasm
  lldbPluginInstructionARM
  lldbPluginInstructionMIPS
  lldbPluginInstructionMIPS64
  ${LLDB_SYSTEM_LIBS}
  lldDriver
  lldWasm
  )

include_what_you_use(SymbolServerTests)
