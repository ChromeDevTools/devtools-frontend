# Copyright 2018 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import datetime
import json
import os
import sys
from os import path

PYJSON5_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'third_party', 'pyjson5', 'src')
sys.path.append(PYJSON5_DIR)

import json5  # pylint: disable=import-error

ROOT_DIRECTORY = path.join(path.dirname(__file__), '..', '..')
GENERATED_LOCATION = path.join(ROOT_DIRECTORY, 'front_end', 'generated', 'ARIAProperties.js')
READ_LOCATION = path.join(ROOT_DIRECTORY, 'third_party', 'blink', 'renderer', 'core', 'html', 'aria_properties.json5')

def properties_from_file(file_name):
    with open(os.path.abspath(file_name)) as json5_file:
        properties = json5.loads(json5_file.read())
        return properties


ARIA_PROPERTIES = properties_from_file(READ_LOCATION)
now = datetime.datetime.now()
with open(GENERATED_LOCATION, "w+") as f:
    f.write('// Copyright %d The Chromium Authors. All rights reserved.\n' % now.year)
    f.write('// Use of this source code is governed by a BSD-style license that can be\n')
    f.write('// found in the LICENSE file.\n')
    f.write('\n')
    f.write("export const config = %s;\n" % json.dumps(ARIA_PROPERTIES))
