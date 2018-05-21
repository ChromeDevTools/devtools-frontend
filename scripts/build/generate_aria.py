# Copyright 2018 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import json
import os
import os.path
import sys

PYJSON5_DIR = os.path.join(os.path.dirname(__file__),
                           '..', '..', '..', '..', '..', 'pyjson5', 'src')
sys.path.append(PYJSON5_DIR)

import json5  # pylint: disable=import-error


def properties_from_file(file_name):
    with open(os.path.abspath(file_name)) as json5_file:
        properties = json5.loads(json5_file.read())
        return properties


ARIA_PROPERTIES = properties_from_file(sys.argv[1])
with open(sys.argv[2], "w") as f:
    f.write("Accessibility.ARIAMetadata._config = %s;" % json.dumps(ARIA_PROPERTIES))
