# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

add_lldb_tool(DWARFSymbolServer
  JSON.cc
  Main.cc


  LINK_LIBS
  DWARFSymbols
  clangDaemon
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
