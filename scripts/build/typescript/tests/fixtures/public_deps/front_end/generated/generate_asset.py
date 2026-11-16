#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Writes a JavaScript module and its TypeScript declaration file."""

import argparse


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-js', required=True)
    parser.add_argument('--output-dts', required=True)
    args = parser.parse_args()

    with open(args.output_js, 'w', encoding='utf-8', newline='\n') as f:
        f.write('export const ASSET_NAME = "fixture";\n')

    with open(args.output_dts, 'w', encoding='utf-8', newline='\n') as f:
        f.write('export declare const ASSET_NAME: string;\n')


if __name__ == '__main__':
    main()
