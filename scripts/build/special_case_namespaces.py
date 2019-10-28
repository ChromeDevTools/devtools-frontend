# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import json
from os import path

special_case_namespaces_path = path.join(path.dirname(path.abspath(__file__)), 'special_case_namespaces.json')
with open(special_case_namespaces_path) as json_file:
    special_case_namespaces = json.load(json_file)
