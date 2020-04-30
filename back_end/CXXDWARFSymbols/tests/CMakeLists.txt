# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

configure_lit_site_cfg(
  ${CMAKE_CURRENT_SOURCE_DIR}/Unittests/lit.site.cfg.py.in
  ${CMAKE_CURRENT_BINARY_DIR}/Unittests/lit.site.cfg.py)

configure_lit_site_cfg(
  ${CMAKE_CURRENT_SOURCE_DIR}/lit.site.cfg.py.in
  ${CMAKE_CURRENT_BINARY_DIR}/lit.site.cfg.py)

add_lit_testsuite(check-symbol-server "Running symbol server lit test suite"
  ${CMAKE_CURRENT_BINARY_DIR}/
  DEPENDS DWARFSymbolServer SymbolServerTests FileCheck count not
  )
