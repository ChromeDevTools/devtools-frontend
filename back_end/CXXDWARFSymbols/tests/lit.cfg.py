# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import os
import lit

config.name = 'DWARF SymbolServer'
config.test_format = lit.formats.ShTest(
    os.environ.get('LIT_USE_INTERNAL_SHELL') == '0')
config.suffixes = ['.js', '.test']
config.test_source_root = os.path.dirname(__file__)
config.test_exec_root = os.path.join(config.symbol_server_obj_root, 'tests')
