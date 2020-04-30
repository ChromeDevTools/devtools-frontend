# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import os
import lit

config.name = 'DWARF SymbolServer Unittests'
config.suffixes = []
config.test_exec_root = os.path.join(config.symbol_server_obj_root,
                                     'unittests')
config.test_source_root = config.test_exec_root

config.test_format = lit.formats.GoogleTest(config.llvm_build_mode,
                                            'SymbolServerTests')
