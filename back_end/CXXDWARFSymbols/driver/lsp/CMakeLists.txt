# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.


find_package(Protobuf REQUIRED)
set(PROTOC $<TARGET_FILE:protobuf::protoc>)
set(PROTO_SOURCES)

set(ADDITIONAL_LIBS)
if(CMAKE_SYSTEM_NAME MATCHES "Windows")
  list(APPEND ADDITIONAL_LIBS $ENV{VSINSTALLDIR}VC\\Tools\\MSVC\\$ENV{VCToolsVersion}\\lib\\onecore\\$ENV{VSCMD_ARG_TGT_ARCH}\\diaguids.lib)
endif()

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

add_proto(symbol_server)
add_lldb_tool(DWARFSymbolServer
  RPC.cc
  ${PROTO_SOURCES}
  Main.cc


  LINK_LIBS
  DWARFSymbols
  clangDaemon
  ${PROTOBUF_LIBRARIES}
  ${ADDITIONAL_LIBS}
  )

#FIXME Can we use the llvm facilities here?
set_target_properties(DWARFSymbolServer PROPERTIES
  BUILD_WITH_INSTALL_RPATH On
  INSTALL_RPATH
  "\$ORIGIN/../third_party/llvm/llvm/lib")
include_what_you_use(DWARFSymbolServer)

target_compile_options(DWARFSymbolServer PUBLIC
  -DGOOGLE_PROTOBUF_NO_RTTI
  )

get_target_property(CLANGD_INCLUDE_DIR clangDaemon SOURCE_DIR)
target_include_directories(DWARFSymbolServer PUBLIC
  ${CMAKE_CURRENT_BINARY_DIR}
  ${CLANGD_INCLUDE_DIR}
  )
