# Copyright 2022 The Chromium Authors. All rights reserved.
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
    options = parser.parse_args(args)

    sourcemap = f'{options.output}.map'
    subprocess.check_call([
        wasm_as(), options.input, '-g', '-sm', sourcemap, '-o', options.output
    ])

    wasm_obj_headers = subprocess.check_output([
        llvm_readobj(),
        '-e',
        # TODO(crbug.com/1328729): use JSON output as soon as that's supported for wasm
        # '--elf-output-style=JSON',
        options.output
    ])
    (size, offset) = re.search(
        b'Section {[^}]*Type: CODE[^}]*Size: (\d*)[^}]*Offset: (\d*)[^}]*}',
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

    node = path.realpath(path.join(REPO_DIR, 'third_party', 'node', 'node.py'))
    sourcemap2json = path.realpath(
        path.join(REPO_DIR, 'scripts', 'build', 'wasm_sourcemap.mjs'))
    sourcemap_contents = subprocess.check_output([
        sys.executable, node, '--output', sourcemap2json, sourcemap,
        '%s' % (offset)
    ])

    json_file = f'{options.output}.map.json'
    with open(json_file, 'wb') as output:
        output.write(sourcemap_contents)

    return 0


if __name__ == '__main__':
    sys.exit(script_main(sys.argv[1:]))
