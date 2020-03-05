#!/usr/bin/env python
#
# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import os.path as path
import re
import os
from subprocess import Popen
import sys

ROOT_DIRECTORY = path.join(path.dirname(path.abspath(__file__)), '..', '..')

V8_DIRECTORY_PATH = path.join(ROOT_DIRECTORY, 'v8')
PROTOCOL_LOCATION = path.join(ROOT_DIRECTORY, 'third_party', 'blink', 'public', 'devtools_protocol')
SCRIPTS_BUILD_PATH = path.join(ROOT_DIRECTORY, 'scripts', 'build')

GENERATE_ARIA_SCRIPT = path.join(SCRIPTS_BUILD_PATH, 'generate_aria.py')
GENERATE_SUPPORTED_CSS_SCRIPT = path.join(SCRIPTS_BUILD_PATH, 'generate_supported_css.py')
GENERATE_PROTOCOL_DEFINITIONS_SCRIPT = path.join(SCRIPTS_BUILD_PATH, 'code_generator_frontend.py')
CONCATENATE_PROTOCOL_SCRIPT = path.join(ROOT_DIRECTORY, 'third_party', 'inspector_protocol', 'concatenate_protocols.py')


def popen(arguments, cwd=ROOT_DIRECTORY, env=os.environ.copy()):
    process = Popen([sys.executable] + arguments, cwd=cwd, env=env)

    process.communicate()

    if process.returncode != 0:
        sys.exit(process.returncode)


# Generate the required `front_end/generated` files that are based on files living in Blink
def main():
    popen([GENERATE_ARIA_SCRIPT])
    popen([GENERATE_SUPPORTED_CSS_SCRIPT])

    popen([CONCATENATE_PROTOCOL_SCRIPT] + [
        path.join(PROTOCOL_LOCATION, 'browser_protocol.pdl'),
        path.join(V8_DIRECTORY_PATH, 'include', 'js_protocol.pdl'),
        # output_file
        path.join(PROTOCOL_LOCATION, 'browser_protocol.json'),
    ])

    popen([GENERATE_PROTOCOL_DEFINITIONS_SCRIPT])


if __name__ == '__main__':
    main()
