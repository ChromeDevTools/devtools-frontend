#!/usr/bin/env python3
# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import argparse
import os
import subprocess
import sys

import pdl_to_api
import pdl_to_rpc


def script_main(args):
    parser = argparse.ArgumentParser()
    parser.add_argument('cwd', default=None, nargs='?')
    options = parser.parse_args(args)

    devtools_root = os.path.dirname(
        os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.realpath(__file__)))))
    to_json = os.path.join(devtools_root, 'third_party', 'inspector_protocol',
                           'concatenate_protocols.py')

    json = os.path.join(options.cwd or '.', 'api.json')
    pdl = os.path.join(devtools_root, 'back_end', 'CXXDWARFSymbols', 'tools',
                       'api.pdl')
    subprocess.check_call([to_json, pdl, json])

    api = os.path.join(devtools_root, 'back_end', 'CXXDWARFSymbols', 'lib',
                       'api.h')
    pdl_to_api.script_main([json, api])

    rpc = os.path.join(devtools_root, 'back_end', 'CXXDWARFSymbols', 'driver',
                       'lsp', 'JSON.cc')
    pdl_to_rpc.script_main([json, rpc])


if __name__ == '__main__':
    script_main(sys.argv[1:])
