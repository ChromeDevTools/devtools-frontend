#!/usr/bin/env python3
# Copyright 2023 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import argparse
import json
import os
from pathlib import Path
import sys
import tempfile

from jinja2 import Template

import pdl_cxx

sys.path.append(
    str(
        Path(__file__).resolve().parent.parent.parent.parent / 'third_party' /
        'inspector_protocol'))
import concatenate_protocols

DEFAULT_APIS = [
    '../src/SymbolsBackend.cc.in', '../src/SymbolsBackend.d.ts.in',
    '../lib/api.h.in'
]


def pdlToJson():
    with tempfile.NamedTemporaryFile() as json_file:
        args = [str(Path(__file__).parent / 'api.pdl'), json_file.name]
        concatenate_protocols.main(args)
        json_file.seek(0)
        return json.load(json_file)


def getRelativeDefault(api_path):
    absolute = Path(__file__).parent.resolve() / api_path
    try:
        return absolute.relative_to(Path.cwd())
    except ValueError:
        return absolute


def script_main(args):
    defaults = [
        os.path.normpath(str(getRelativeDefault(api_path)))
        for api_path in DEFAULT_APIS
    ]

    parser = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument('api_input',
                        nargs='*',
                        help='Path to api templates',
                        default=defaults)
    options = parser.parse_args(args)

    specs = pdl_cxx.PDL.parse(pdlToJson())

    for api_input in options.api_input:
        output, ext = os.path.splitext(api_input)
        if ext != '.in':
            parser.error('"%s" does not end in .in' % api_input)
        with open(api_input) as input_file:
            with open(output, 'w') as output_file:
                output_file.write(
                    Template(input_file.read()).render(specs=specs,
                                                       enumerate=enumerate,
                                                       list=list))


if __name__ == '__main__':
    script_main(sys.argv[1:])
