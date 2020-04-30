# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

find_package(Protobuf REQUIRED)
set(PROTOC $<TARGET_FILE:protobuf::protoc>)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${SYMBOL_SERVER_BINARY_DIR})
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${SYMBOL_SERVER_LIBRARY_DIR})
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${SYMBOL_SERVER_LIBRARY_DIR})
set(PROTO_SOURCES)


function(add_proto name)
  set(PROTO_HDRS
    ${CMAKE_CURRENT_BINARY_DIR}/${name}.pb.h
    )
  set(PROTO_SRCS
    ${CMAKE_CURRENT_BINARY_DIR}/${name}.pb.cc
    )
  set(PROTO_SOURCES ${PROTO_SOURCES} ${PROTO_SRCS} PARENT_SCOPE)
  add_custom_command(
    OUTPUT ${PROTO_SRCS} ${PROTO_HDRS}
    COMMAND ${PROTOC}
    ARGS
    --cpp_out ${CMAKE_CURRENT_BINARY_DIR}
    -I ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/${name}.proto
    DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/${name}.proto
    )
endfunction()

set(SYMBOL_SERVER_TOOL_DIR ${CMAKE_CURRENT_BINARY_DIR})
configure_file(symbol-server-config.h.in
               ${CMAKE_CURRENT_BINARY_DIR}/symbol-server-config.h @ONLY)

add_proto(symbol_server)
add_library(DWARFSymbolServerObjects OBJECT
  Modules.cc
  RPC.cc
  Variables.cc
  DWARFLocationParser.cc
  ${PROTO_SOURCES}
  )
include_what_you_use(DWARFSymbolServerObjects)

get_target_property(SYMBOL_SERVER_SOURCES DWARFSymbolServerObjects SOURCES)
set(LLVM_OPTIONAL_SOURCES ${LLVM_OPTIONAL_SOURCES} ${SYMBOL_SERVER_SOURCES})

if (NOT LLVM_REQUIRES_EH AND NOT LLVM_REQUIRES_RTTI)
  target_compile_options(DWARFSymbolServerObjects PUBLIC -fno-rtti)
endif()

target_link_libraries(DWARFSymbolServerObjects PUBLIC
  ${PROTOBUF_LIBRARIES}
  lldWasm
  lldDriver
  clangDaemon
  )
get_target_property(LLD_INCLUDE_DIRS lldDriver INCLUDE_DIRECTORIES)
get_target_property(LLDB_INCLUDE_DIRS lldbBase INCLUDE_DIRECTORIES)
get_target_property(CLANG_INCLUDE_DIRS clang INCLUDE_DIRECTORIES)
get_target_property(CLANGD_INCLUDE_DIR clangDaemon SOURCE_DIR)
target_include_directories(DWARFSymbolServerObjects PUBLIC
  ${PROJECT_SOURCE_DIR}/third_party/llvm/lldb/source
  ${PROJECT_SOURCE_DIR}/third_party/llvm/lldb/include
  ${LLDB_INCLUDE_DIRS}
  ${CLANG_INCLUDE_DIRS}
  ${LLD_INCLUDE_DIRS}
  ${CLANGD_INCLUDE_DIR}
  ${PROTOBUF_INCLUDE_DIRS}
  ${CMAKE_CURRENT_BINARY_DIR}
  ${PROJECT_BINARY_DIR}/third_party/llvm/lldb/include
  ${PROJECT_SOURCE_DIR}/third_party/llvm/clang/include
  ${PROJECT_BINARY_DIR}/third_party/llvm/clang/include
  ${CMAKE_CURRENT_SOURCE_DIR}
  )

target_compile_options(DWARFSymbolServerObjects PUBLIC
  -DGOOGLE_PROTOBUF_NO_RTTI
  )


add_lldb_tool(DWARFSymbolServer
  Main.cc

  LINK_LIBS
  DWARFSymbolServerObjects
  lldbBase
  lldbHost
  lldbInitialization
  lldbPluginSymbolFileDWARF
  lldbPluginObjectFileWasm
  lldbPluginObjectFileELF
  lldbPluginSymbolVendorWasm
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

#FIXME Can we use the llvm facilities here?
set_target_properties(DWARFSymbolServer PROPERTIES
  BUILD_WITH_INSTALL_RPATH On
  INSTALL_RPATH
  "\$ORIGIN/../third_party/llvm/llvm/lib")
include_what_you_use(DWARFSymbolServer)

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
  add_dependencies(DWARFSymbolServerObjects SymbolServerRuntime)
endif()
