# Copyright 2023 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

set(CXX_DEBUGGING_BUILD_REVISION 0 CACHE STRING "Project build revision")
set(CXX_DEBUGGING_BUILD_PATCH 0 CACHE STRING "Project build patch")

cmake_minimum_required(VERSION 3.16)
cmake_policy(SET CMP0048 NEW)
project(DevToolsCXXDebuggingExtension VERSION 0.2.${CXX_DEBUGGING_BUILD_REVISION}.${CXX_DEBUGGING_BUILD_PATCH} LANGUAGES CXX)

set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_CXX_STANDARD 17)
set(REPO_SOURCE_DIR ${PROJECT_SOURCE_DIR}/../..)
set(THIRD_PARTY_DIR ${PROJECT_SOURCE_DIR}/third_party)
set(DEVTOOLS_SOURCE_DIR ${REPO_SOURCE_DIR})
set(CXX_DEBUGGING_GEN_DIR ${PROJECT_BINARY_DIR}/gen)
set(CXX_DEBUGGING_BINARY_DIR ${PROJECT_BINARY_DIR}/bin)
set(CXX_DEBUGGING_SOURCE_DIR ${PROJECT_SOURCE_DIR})

option(CXX_DEBUGGING_USE_SANITIZERS "Enable sanitizers" OFF)

# Compile typescript sources
find_program(TS_COMPILER tsc PATHS ${DEVTOOLS_SOURCE_DIR}/node_modules/.bin REQUIRED NO_DEFAULT_PATH)

set(TS_COMPILER_ARGS -p ${CMAKE_CURRENT_SOURCE_DIR} --outDir ${PROJECT_BINARY_DIR})
exec_program(${TS_COMPILER} ${CMAKE_CURRENT_SOURCE_DIR}
  ARGS ${TS_COMPILER_ARGS} --listFiles
  OUTPUT_VARIABLE TS_COMPILER_INPUTS
  RETURN_VALUE TS_COMPILER_RETVAL)

if (NOT ${TS_COMPILER_RETVAL} EQUAL 0)
  message(FATAL_ERROR "Running tsc failed:\n${TS_COMPILER_INPUTS}")
endif()

string(REPLACE "\n" ";" TS_COMPILER_INPUTS ${TS_COMPILER_INPUTS})

set(TS_COMPILER_OUTPUTS)
foreach(tsc_input IN LISTS TS_COMPILER_INPUTS)
  get_filename_component(ext ${tsc_input} EXT)
  if (NOT ext MATCHES ".d.ts$")
    file(RELATIVE_PATH rel_path ${CMAKE_CURRENT_SOURCE_DIR} ${tsc_input})
    get_filename_component(basename ${rel_path} NAME_WE)
    get_filename_component(dirname ${rel_path} DIRECTORY)
    list(APPEND TS_COMPILER_OUTPUTS ${CMAKE_CURRENT_BINARY_DIR}/${dirname}/${basename}.js)
  endif()
endforeach()

add_custom_command(OUTPUT ${TS_COMPILER_OUTPUTS}
  COMMAND ${DEVTOOLS_SOURCE_DIR}/third_party/node/node.py --output
  ${TS_COMPILER} ${TS_COMPILER_ARGS}
  COMMENT "Compiling Typescript"
  DEPENDS ${TS_COMPILER_INPUTS} tsconfig.json)

add_custom_target(TypescriptOutput DEPENDS ${TS_COMPILER_OUTPUTS})

option(CXX_DEBUGGING_ENABLE_DWARF5 "Enable -gdwarf-5 for emitting DWARF5" OFF)
if(CXX_DEBUGGING_ENABLE_DWARF5)
  add_compile_options(-gdwarf-5)
  add_link_options(-gdwarf-5)
endif()

option(CXX_DEBUGGING_ENABLE_PUBNAMES "Enable -gpubnames for emitting a DWARF index" OFF)
if(CXX_DEBUGGING_ENABLE_PUBNAMES)
  add_compile_options(-gpubnames)
  add_link_options(-gpubnames)
endif()

# Build LLVM dependencies.
set(LLVM_TARGETS_TO_BUILD "WebAssembly" CACHE STRING "")
set(LLVM_ENABLE_PROJECTS "clang;lldb" CACHE STRING "")
set(LLDB_INCLUDE_TESTS "OFF" CACHE STRING "")
set(CLANG_INCLUDE_TESTS "OFF" CACHE STRING "")

if (CMAKE_SYSTEM_NAME STREQUAL "Emscripten")
  set(CXX_DEBUGGING_BUILD_WASM TRUE)
else()
  set(CXX_DEBUGGING_BUILD_WASM FALSE)
endif()

if (CXX_DEBUGGING_BUILD_WASM)
  set(LLVM_ENABLE_RTTI "ON" CACHE STRING "")
  set(LLVM_ENABLE_THREADS "OFF" CACHE STRING "")
else()
  set(LLVM_ON_WIN32 0)
  set(LLVM_ON_UNIX 1)
endif()


if (CXX_DEBUGGING_BUILD_WASM)
  link_libraries(-sWASM_BIGINT)
  if (NOT CMAKE_BUILD_TYPE STREQUAL "Release")
    link_libraries(
      -sREVERSE_DEPS=all
      )
  endif()
endif()

if (CXX_DEBUGGING_USE_SANITIZERS)
  set(LLVM_USE_SANITIZER "Address;Undefined" CACHE STRING "")
else()
  set(LLVM_USE_SANITIZER "")
endif()

add_subdirectory(${THIRD_PARTY_DIR}/llvm/src/llvm ${CMAKE_CURRENT_BINARY_DIR}/third_party/llvm/src/llvm)
set_property(DIRECTORY ${THIRD_PARTY_DIR}/llvm/src/llvm PROPERTY EXCLUDE_FROM_ALL TRUE)


if (CXX_DEBUGGING_BUILD_WASM)
  if (CMAKE_BUILD_TYPE STREQUAL "Debug")
    target_compile_options(clangCodeGen PRIVATE -O2)
    target_compile_options(obj.clangCodeGen PRIVATE -O2)
  endif()
endif()

# Required to enable llvm option parsing
include(${THIRD_PARTY_DIR}/llvm/src/llvm/cmake/modules/DetermineGCCCompatible.cmake)

macro(copy_file INPUT OUTPUT)
  get_filename_component(ABS_INPUT ${INPUT} ABSOLUTE BASE_DIR ${CMAKE_CURRENT_SOURCE_DIR})
  get_filename_component(ABS_OUTPUT ${OUTPUT} ABSOLUTE BASE_DIR ${CMAKE_CURRENT_BINARY_DIR})
  add_custom_command(OUTPUT ${OUTPUT}
    DEPENDS ${INPUT}
    COMMAND ${CMAKE_COMMAND} -E copy ${ABS_INPUT} ${ABS_OUTPUT}
    )
endmacro()

function(fix_sysroot TARGET)
  if (CMAKE_SYSROOT)
    target_link_libraries(${TARGET} PRIVATE
      -Wl,-rpath,${CMAKE_SYSROOT}/usr/lib/x86_64-linux-gnu
      -Wl,-rpath,${CMAKE_SYSROOT}/lib/x86_64-linux-gnu
      -Wl,-dynamic-linker,${CMAKE_SYSROOT}/lib64/ld-linux-x86-64.so.2
      )
  endif()
endfunction()

set(LLVM_RUNTIME_OUTPUT_INTDIR ${LLVM_BINARY_DIR}/${CMAKE_CFG_INTDIR}/bin)
set(LLVM_LIBRARY_OUTPUT_INTDIR ${LLVM_BINARY_DIR}/${CMAKE_CFG_INTDIR}/lib${LLVM_LIBDIR_SUFFIX})
set(LLVM_TOOLS_BINARY_DIR ${LLVM_RUNTIME_OUTPUT_INTDIR})

set(CMAKE_BUILD_WITH_INSTALL_RPATH FALSE)
set(CMAKE_SKIP_BUILD_RPATH FALSE)

# Turn on -gsplit-dwarf if requested in debug builds.
option(CXX_DEBUGGING_USE_SPLIT_DWARF "Enable -gsplit-dwarf for the extension" OFF)
if(CXX_DEBUGGING_USE_SPLIT_DWARF)
  if(NOT LLVM_USE_SPLIT_DWARF)
    message(WARNING "CXX_DEBUGGING_USE_SPLIT_DWARF turned ON, but LLVM_USE_SPLIT_DWARF turned off, might not be what you want?")
  endif()
  string(TOUPPER "${CMAKE_BUILD_TYPE}" uppercase_CMAKE_BUILD_TYPE)
  if((uppercase_CMAKE_BUILD_TYPE STREQUAL "DEBUG") OR
     (uppercase_CMAKE_BUILD_TYPE STREQUAL "RELWITHDEBINFO"))
    add_compile_options(-gsplit-dwarf)
  endif()
endif()

fix_sysroot(lldb-tblgen)
fix_sysroot(clang-tblgen)
fix_sysroot(llvm-tblgen)
fix_sysroot(llvm-mc)
fix_sysroot(llvm-dwp)

if (CXX_DEBUGGING_BUILD_WASM)
  add_subdirectory(lib)
  add_subdirectory(src)
  add_subdirectory(tests)
endif()
