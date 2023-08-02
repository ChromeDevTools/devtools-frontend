# Copyright 2023 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

get_filename_component(llvm_bin ${LLVM_TABLEGEN} DIRECTORY)
set(LLVM_MC ${llvm_bin}/llvm-mc)

set(compiled_inputs)
macro(add_test_inputs)
  cmake_parse_arguments(option "DWO" "" "" ${ARGN})
  foreach(input IN ITEMS ${option_UNPARSED_ARGUMENTS})
    set(mc_args ${CMAKE_CURRENT_SOURCE_DIR}/${input} -triple wasm32-unknown-unknown -filetype=obj -o ${input}.wasm)
    if (option_DWO)
      add_custom_command(OUTPUT ${input}.wasm ${input}.dwo
        DEPENDS ${input}
        COMMAND ${LLVM_MC} ${mc_args} -split-dwarf-file=${input}.dwo
        )
      list(APPEND compiled_inputs ${CMAKE_CURRENT_BINARY_DIR}/${input}.wasm ${CMAKE_CURRENT_BINARY_DIR}/${input}.dwo)
    else()
      add_custom_command(OUTPUT ${input}.wasm
        DEPENDS ${input}
        COMMAND ${LLVM_MC} ${mc_args}
        )
      list(APPEND compiled_inputs ${CMAKE_CURRENT_BINARY_DIR}/${input}.wasm)
    endif()
  endforeach()
endmacro()

set(compiled_wasm_inputs)
macro(add_test_program program)
  add_executable(${program} ${ARGN})
  set(compile_options -g -gdwarf-5 -O0)
  set(link_options -g -gdwarf-5 -gseparate-dwarf
    -O0
    -sERROR_ON_WASM_CHANGES_AFTER_LINK=1
    -sMODULARIZE=1
    -sWASM_BIGINT
    -sEXPORT_NAME=loadModule
    -sEXPORT_ES6=1
    -sEXPORT_ALL=1
    -std=c++17
    -Wl,--export-all
    -Wl,--no-gc-sections
  )
  # Set link and compile options directly to avoid accidentally inheriting
  # global flags.
  set_target_properties(${program} PROPERTIES
    COMPILE_OPTIONS "${compile_options}"
    LINK_OPTIONS "${link_options}")
  list(APPEND compiled_inputs
    ${CMAKE_CURRENT_BINARY_DIR}/${program}.js
    )
  list(APPEND compiled_wasm_inputs
    ${CMAKE_CURRENT_BINARY_DIR}/${program}.wasm
    ${CMAKE_CURRENT_BINARY_DIR}/${program}.wasm.debug.wasm
    )
endmacro()

add_test_inputs(DWO split-dwarf.s)
add_test_inputs(embedded.s addr_index.s enums.s)

add_test_program(addresses_main addresses.cc)
add_test_program(lldb_eval_inputs
  ${THIRD_PARTY_DIR}/lldb-eval/src/testdata/test_binary.cc
  ${THIRD_PARTY_DIR}/lldb-eval/src/testdata/test_library.cc)


set(TEST_BINARY_INPUTS
 page.html
 page.js
 )

set(binary_inputs)
foreach(input IN LISTS TEST_BINARY_INPUTS)
  list(APPEND binary_inputs ${CMAKE_CURRENT_BINARY_DIR}/${input})
  add_custom_command(OUTPUT ${input} DEPENDS ${input}
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_SOURCE_DIR}/${input} ${CMAKE_CURRENT_BINARY_DIR}/)
endforeach()
add_custom_target(SymbolsBackendTestInputs DEPENDS ${compiled_inputs} ${TEST_BINARY_INPUTS})

list(APPEND EXTENSION_TEST_BUILD_ARTIFACTS ${compiled_inputs} ${binary_inputs} ${compiled_wasm_inputs})
set(EXTENSION_TEST_BUILD_ARTIFACTS ${EXTENSION_TEST_BUILD_ARTIFACTS} PARENT_SCOPE)
