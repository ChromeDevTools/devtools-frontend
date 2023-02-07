#!/usr/bin/env vpython3
#
# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

# We are still generating PDL types as an out-of-process manual task, rather
# than in GN. There are some technical nuances here, but broadly speaking CDP
# is backwards compatible. That means that if you would update CDP, and
# DevTools was built with the expectation of an older version of CDP, that
# should compile and run. This is generally true, but sadly not always. As it
# turns out, the CDP owners regard some domains in CDP as "experimental",
# which is not covered by the backwards compatibility guarantee.

# The concrete result of that is that, sometimes, the CDP owners update the
# CDP definitions in such a way that it would break compilation of DevTools.
# That would happen if the types change, methods or events are removed and all
# of that integrates with our TypeScript build, which would start failing. As
# such, if the CDP definitions change and DevTools would break on it, we
# currently have to manually patch these on DevTools side. This currently
# happens when DevTools engineers roll our deps, regenerate the types, run the
# build and figure out if manually patching is required. Most of the time,
# there are no functional changes required, but there are rare cases where it
# is required. (Generally speaking, those that introduced the CDP breakage tend
# to be the ones resolving the breakage as well.)

# If we were to take the PDL definition from Chromium and compile DevTools with
# it, we effectively block any breaking change in CDP. The CDP owners indicated
# that they would like to maintain the freedom of making breaking changes in
# several domains, so that disallows us from integrating the PDL definition in
# the DevTools build. That's why we have to maintain a copy of CDP that we
# build DevTools with and ensure that we remain up-to-date on the Chromium side,
# resolving type breakages whenever they occur.

# There is another reason why we generate the types manually: so that VS Code
# picks them up and makes them available for usage in the editor. If we
# wouldn't generate them, then VS Code (or any other IDE with a TypeScript
# language server) would not see the types and start complaining,
# even though the local build would succeed.

import os.path as path
import os
import subprocess
import sys

_CURRENT_DIR = path.join(path.dirname(__file__))

try:
    old_sys_path = sys.path[:]
    sys.path.append(path.join(_CURRENT_DIR, '..', '..', 'scripts'))
    import devtools_paths
finally:
    sys.path = old_sys_path

ROOT_DIRECTORY = path.join(path.dirname(path.abspath(__file__)), '..', '..')

V8_DIRECTORY_PATH = path.join(ROOT_DIRECTORY, 'v8')
PROTOCOL_LOCATION = path.join(ROOT_DIRECTORY, 'third_party', 'blink', 'public', 'devtools_protocol')
SCRIPTS_BUILD_PATH = path.join(ROOT_DIRECTORY, 'scripts', 'build')

GENERATE_ARIA_SCRIPT = path.join(SCRIPTS_BUILD_PATH, 'generate_aria.py')
GENERATE_SUPPORTED_CSS_SCRIPT = path.join(SCRIPTS_BUILD_PATH, 'generate_supported_css.py')
GENERATE_PROTOCOL_DEFINITIONS_SCRIPT = path.join(SCRIPTS_BUILD_PATH, 'code_generator_frontend.py')
CONCATENATE_PROTOCOL_SCRIPT = path.join(ROOT_DIRECTORY, 'third_party', 'inspector_protocol', 'concatenate_protocols.py')
GENERATE_DEPRECATIONS_SCRIPT = path.join(SCRIPTS_BUILD_PATH,
                                         'generate_deprecations.py')

NODE_LOCATION = devtools_paths.node_path()
TSC_LOCATION = devtools_paths.typescript_compiler_path()


def popen(arguments, cwd=ROOT_DIRECTORY, env=os.environ.copy()):
    process = subprocess.Popen([sys.executable] + arguments, cwd=cwd, env=env)

    process.communicate()

    if process.returncode != 0:
        sys.exit(process.returncode)


def runTsc(file_to_compile):
    process = subprocess.Popen([NODE_LOCATION, TSC_LOCATION, file_to_compile], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    # TypeScript does not correctly write to stderr because of https://github.com/microsoft/TypeScript/issues/33849
    return process.returncode, stdout + stderr


def runNode(file_to_execute):
    process = subprocess.Popen([NODE_LOCATION, file_to_execute], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    return process.returncode, stdout + stderr


def generate_protocol_typescript_definitions():
    generator_script_to_compile = path.join(ROOT_DIRECTORY, 'scripts', 'protocol_typescript', 'protocol_dts_generator.ts')

    # first run TSC to convert the script from TS to JS
    typescript_found_errors, typescript_stderr = runTsc(generator_script_to_compile)

    if typescript_found_errors:
        print('')
        print('TypeScript compilation failed on %s' % generator_script_to_compile)
        print('')
        print(typescript_stderr)
        print('')
        return 1

    outputted_file_path = generator_script_to_compile.replace('.ts', '.js')

    node_found_errors, node_stderr = runNode(outputted_file_path)

    if node_found_errors:
        print('')
        print('Generating protocol typedefs failed')
        print('')
        print(node_stderr)
        print('')
        return 1


# Generate the required `front_end/generated` files that are based on files living in Blink
def main():
    popen([GENERATE_ARIA_SCRIPT])
    popen([GENERATE_SUPPORTED_CSS_SCRIPT])
    popen([GENERATE_DEPRECATIONS_SCRIPT])

    popen([CONCATENATE_PROTOCOL_SCRIPT] + [
        path.join(PROTOCOL_LOCATION, 'browser_protocol.pdl'),
        path.join(V8_DIRECTORY_PATH, 'include', 'js_protocol.pdl'),
        # output_file
        path.join(PROTOCOL_LOCATION, 'browser_protocol.json'),
    ])

    popen([GENERATE_PROTOCOL_DEFINITIONS_SCRIPT])

    generate_protocol_typescript_definitions()


if __name__ == '__main__':
    main()
