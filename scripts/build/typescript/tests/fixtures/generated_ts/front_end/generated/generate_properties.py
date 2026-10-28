#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Writes a TypeScript module and a declaration file from properties.json.

A stand-in for the generators in front_end/generated. Like them, it always
writes its outputs: preserving the mtime of outputs that did not change is the
job of scripts/build/run_with_restat.py, which generated_ts() runs it under.
"""

import argparse
import json

HEADER = """// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file is auto-generated, do not edit manually.

"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--output-dts', required=True)
    args = parser.parse_args()

    with open(args.input, encoding='utf-8') as f:
        properties = json.load(f)['properties']

    with open(args.output, 'w', encoding='utf-8', newline='\n') as f:
        f.write(HEADER)
        f.write('export const PROPERTIES: readonly string[] = %s;\n' %
                json.dumps(properties))

    with open(args.output_dts, 'w', encoding='utf-8', newline='\n') as f:
        f.write(HEADER)
        f.write('export interface PropertyMapping {\n')
        for name in properties:
            f.write('  %s: string;\n' % name)
        f.write('}\n')


if __name__ == '__main__':
    main()
