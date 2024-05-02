# Copyright 2023 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.


add_custom_target(check-extension
  COMMAND
    ${DEVTOOLS_SOURCE_DIR}/third_party/node/node.py
    --output
    ${DEVTOOLS_SOURCE_DIR}/node_modules/karma/bin/karma start
    ${CMAKE_CURRENT_BINARY_DIR}/karma.conf.js
  WORKING_DIRECTORY ${PROJECT_SOURCE_DIR}
  DEPENDS SymbolsBackendTests SymbolsBackend LLDBEvalTests
    ${TS_COMPILER_OUTPUTS}
    ${EXTENSION_BUNDLED_SOURCES}
  )

include_directories(
  ${REPO_SOURCE_DIR}/third_party/llvm/src/llvm/utils/unittest/googlemock/include
  ${REPO_SOURCE_DIR}/third_party/llvm/src/llvm/utils/unittest/googletest/include)

set(LLVM_LINK_COMPONENTS Support)

add_llvm_unittest(SymbolsBackendTests WasmModule_test.cc)

add_custom_command(OUTPUT
  ${CMAKE_CURRENT_BINARY_DIR}/SymbolsBackendTests.wasm.debug.wasm.dwp
  COMMAND
    ${LLVM_DWP}
  ARGS
    -e ${CMAKE_CURRENT_BINARY_DIR}/SymbolsBackendTests.wasm.debug.wasm
    -o ${CMAKE_CURRENT_BINARY_DIR}/SymbolsBackendTests.wasm.debug.wasm.dwp
  WORKING_DIRECTORY
    ${PROJECT_BINARY_DIR}
  DEPENDS
    SymbolsBackendTests)

  if(CXX_DEBUGGING_USE_SPLIT_DWARF)
  add_custom_target(SymbolsBackendTestsDwp ALL DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/SymbolsBackendTests.wasm.debug.wasm.dwp)
endif()

set_target_properties(SymbolsBackendTests PROPERTIES EXCLUDE_FROM_ALL FALSE)
target_link_libraries(SymbolsBackendTests PRIVATE
  DWARFSymbols
  -sALLOW_MEMORY_GROWTH=1
  -sMODULARIZE=1
  -sENVIRONMENT=web
  -sEXPORT_NAME=createModule
  -sEXIT_RUNTIME=1
  -sEXPORT_ES6=1
  -s'EXTRA_EXPORTED_RUNTIME_METHODS=[\"FS\"]'
  -s'DEFAULT_LIBRARY_FUNCS_TO_INCLUDE=[\"$$Browser\"]'
  -sWASM_BIGINT
  -sERROR_ON_UNDEFINED_SYMBOLS=0
  -sASSERTIONS=1
  -sSEPARATE_DWARF_URL=SymbolsBackendTests.wasm.debug.wasm)

if (CXX_DEBUGGING_USE_SANITIZERS)
  target_link_libraries(SymbolsBackendTests PRIVATE
    -sINITIAL_MEMORY=134217728
    -fsanitize=address,undefined
  )
endif()

if (NOT CMAKE_BUILD_TYPE STREQUAL "Release")
  target_link_libraries(SymbolsBackendTests PRIVATE
    -sERROR_ON_WASM_CHANGES_AFTER_LINK
    -sREVERSE_DEPS=all
    )
endif()

get_target_property(incdirs LLVMSupport INCLUDE_DIRECTORIES)
set(incflags)
foreach(inc IN LISTS incdirs)
  list(APPEND incflags -I${inc})
endforeach()

add_executable(LLDBEvalTests
  ${THIRD_PARTY_DIR}/lldb-eval/src/lldb-eval/eval_test.cc
)
# Set link and compile options directly to avoid accidentally inheriting
# global flags.
set(compile_options
  -include ${CMAKE_CURRENT_SOURCE_DIR}/LLDBEvalExtensions.h
  ${incflags}
)
set(link_options
  -sASYNCIFY
  -sASYNCIFY_STACK_SIZE=49152
  -sWASM_BIGINT
  -std=c++17
  --bind
  -g0
  -sEXPORT_NAME=loadModule
  -sEXPORT_ES6=1
  -sASSERTIONS=1
)
if (CXX_DEBUGGING_USE_SANITIZERS)
  list(APPEND link_options
    -fsanitize=address,undefined
    -sINITIAL_MEMORY=134217728
  )
  list(APPEND compile_options
    -fsanitize=address,undefined
  )
endif()

set_target_properties(LLDBEvalTests PROPERTIES
  COMPILE_OPTIONS "${compile_options}"
  LINK_OPTIONS "${link_options}")
target_link_libraries(LLDBEvalTests PUBLIC llvm_gtest)
get_target_property(link_options LLDBEvalTests
  LINK_OPTIONS )
list(APPEND compiled_inputs ${CMAKE_CURRENT_BINARY_DIR}/LLDBEvalTests.js)
list(APPEND compiled_wasm_inputs ${CMAKE_CURRENT_BINARY_DIR}/LLDBEvalTests.wasm)

add_dependencies(SymbolsBackendTests SymbolsBackendTestInputs TypescriptOutput)

set(EXTENSION_TEST_BUILD_ARTIFACTS
  ${TS_COMPILER_OUTPUTS}
  ${EXTENSION_BUNDLED_SOURCES}
  $<TARGET_FILE:LLDBEvalTests>
  $<TARGET_FILE_DIR:LLDBEvalTests>/LLDBEvalTests.wasm
  $<TARGET_FILE:SymbolsBackendTests>
  $<TARGET_FILE_DIR:SymbolsBackendTests>/SymbolsBackendTests.wasm
  $<TARGET_FILE_DIR:SymbolsBackendTests>/SymbolsBackendTests.wasm.debug.wasm
  $<TARGET_FILE:SymbolsBackend>
  $<TARGET_FILE_DIR:SymbolsBackend>/SymbolsBackend.wasm
  $<TARGET_FILE_DIR:SymbolsBackend>/SymbolsBackend.wasm.debug.wasm
  )
  if(CXX_DEBUGGING_USE_SPLIT_DWARF AND NOT CXX_DEBUGGING_DWO_ONLY)
  list(APPEND EXTENSION_TEST_BUILD_ARTIFACTS
    $<TARGET_FILE_DIR:SymbolsBackendTests>/SymbolsBackendTests.wasm.debug.wasm.dwp
    $<TARGET_FILE_DIR:SymbolsBackend>/SymbolsBackend.wasm.debug.wasm.dwp
    )
endif()

add_subdirectory(inputs)

configure_file(build-artifacts.js.in build-artifacts.js.in @ONLY)
file(GENERATE OUTPUT build-artifacts.js
  INPUT ${CMAKE_CURRENT_BINARY_DIR}/build-artifacts.js.in)

configure_file(karma.conf.in.js karma.conf.in.js @ONLY)
file(GENERATE OUTPUT karma.conf.js
  INPUT ${CMAKE_CURRENT_BINARY_DIR}/karma.conf.in.js)
