# Copyright 2022 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import argparse
import json
from os import path
import platform
import re
import subprocess
import sys

REPO_DIR = path.join(path.dirname(__file__), '..', '..')


def llvm_readobj():
    binary_name = {
        'Darwin': 'llvm-readobj',
        'Linux': 'llvm-readobj',
        'Windows': 'llvm-readobj.exe',
    }[platform.system()]
    return path.realpath(
        path.join(REPO_DIR, 'third_party', 'emscripten-releases', 'install',
                  'bin', binary_name))


def wasm_as():
    binary_name = {
        'Darwin': 'wasm-as',
        'Linux': 'wasm-as',
        'Windows': 'wasm-as.exe',
    }[platform.system()]
    return path.realpath(
        path.join(REPO_DIR, 'third_party', 'emscripten-releases', 'install',
                  'bin', binary_name))


def script_main(args):
    parser = argparse.ArgumentParser()
    parser.add_argument('input')
    parser.add_argument('output')
    # The build passes `//third_party/node`: the DEPS checkout in a standalone
    # build and Chromium's own copy in a Chromium build. This way we don't have
    # to know where DevTools is located inside of the Chromium checkout.
    parser.add_argument('--node-dir',
                        default=path.join(REPO_DIR, 'third_party', 'node'),
                        help='Directory that contains node.py.')
    options = parser.parse_args(args)

    sourcemap = f'{options.output}.map'
    subprocess.check_call([
        wasm_as(), options.input, '-g', '-sm', sourcemap, '-o', options.output
    ])

    wasm_obj_headers = subprocess.check_output(
        [llvm_readobj(), '-e', options.output])
    (size, offset) = re.search(
        rb'Section {[^}]*Type: CODE[^}]*Size: (\d*)[^}]*Offset: (\d*)[^}]*}',
        wasm_obj_headers).groups()

    # readobj reports as offset the location of the first byte of the header.
    # Our offsets are relative to the first byte of the section though, so
    # calculate the offset manually. The header is composed of one byte for the
    # section id, and an leb128 value for the length.
    size = int(size)
    leb_len = 0
    while size > 0:
        size >>= 7
        leb_len += 1
    offset = int(offset) + 1 + leb_len

    # Chromium's node.py doesn't print the output of the script when it is run
    # from the command line, so import it and use the output RunNode() returns.
    sys.path.append(path.abspath(options.node_dir))
    import node  # pylint: disable=import-outside-toplevel,import-error

    sourcemap2json = path.realpath(
        path.join(REPO_DIR, 'scripts', 'build', 'wasm_sourcemap.mjs'))
    sourcemap_contents = node.RunNode(
        [sourcemap2json, '--input', sourcemap, '--offset',
         '%s' % (offset)])

    json_file = f'{options.output}.map.json'
    with open(json_file, 'w', encoding='utf-8', newline='') as output:
        output.write(sourcemap_contents)

    return 0


if __name__ == '__main__':
    sys.exit(script_main(sys.argv[1:]))
