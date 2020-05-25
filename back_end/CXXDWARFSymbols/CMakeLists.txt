# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

project(CXXDWARFSymbols CXX)
cmake_minimum_required(VERSION 3.13)

set(SYMBOL_SERVER_SOURCE_DIR ${PROJECT_SOURCE_DIR})
set(SYMBOL_SERVER_BINARY_DIR ${PROJECT_BINARY_DIR}/bin)
set(SYMBOL_SERVER_LIBRARY_DIR ${PROJECT_BINARY_DIR}/lib)

# Build dependencies.
set(LLVM_TARGETS_TO_BUILD "WebAssembly" CACHE STRING "")
set(LLVM_ENABLE_PROJECTS "clang;clang-tools-extra;lldb;lld" CACHE STRING "")
set(LLDB_INCLUDE_TESTS "OFF" CACHE STRING "")
add_subdirectory(third_party/llvm/llvm)
set_property(DIRECTORY third_party/llvm/llvm
  PROPERTY EXCLUDE_FROM_ALL TRUE)

# Required to enable llvm option parsing
include(third_party/llvm/llvm/cmake/modules/DetermineGCCCompatible.cmake)

option(SYMBOL_SERVER_BUILD_FORMATTERS
  "Build the formatters library for evaluator modules" OFF)
option(SYMBOL_SERVER_IWYU OFF)
option(SYMBOL_SERVER_CLANG_TIDY OFF)

find_program(IWYU NAMES include-what-you-use iwyu)
function(include_what_you_use TARGET)
  if(SYMBOL_SERVER_IWYU AND IWYU)
    set_target_properties(${TARGET} PROPERTIES
      CXX_INCLUDE_WHAT_YOU_USE ${IWYU}
      -Xiwyu --mapping_file=${SYMBOL_SERVER_SOURCE_DIR}/tools/iwyu.imp)
    target_compile_options(${TARGET} PRIVATE "-Werror")
  endif()
  if(SYMBOL_SERVER_CLANG_TIDY)
    set(clang_tidy
      clang-tidy
      -header-filter=${PROJECT_SOURCE_DIR}/src/.*
      -format-style=google
      -warnings-as-errors=*
      )
    set_target_properties(${TARGET} PROPERTIES
      CXX_CLANG_TIDY "${clang_tidy}")
  endif()
endfunction()

set(CMAKE_BUILD_WITH_INSTALL_RPATH FALSE)
set(CMAKE_SKIP_BUILD_RPATH FALSE)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${SYMBOL_SERVER_BINARY_DIR})
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${SYMBOL_SERVER_LIBRARY_DIR})

add_subdirectory(lib)
add_subdirectory(driver/lsp)
add_subdirectory(unittests)
add_subdirectory(tests)
