#!/usr/bin/env vpython3
#
# Copyright 2023 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import argparse
from glob import glob
import math
import os
import random
import sys
from pathlib import Path

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from devtools_paths import node_path, devtools_root_path


def parse_options(cli_args):
    parser = argparse.ArgumentParser(description='Run tests')
    parser.add_argument(
        '--test-suite-source-dir',
        dest='test_suite_source_dir',
        default='test/e2e',
        help=
        'Path to the source folder containing the tests, relative to the current working directory.'
    )
    parser.add_argument(
        '--jobs',
        dest='jobs',
        default=1,
        help='Number of parallel runners to use (if supported). Defaults to 1.'
    )
    parser.add_argument(
        '--test-file-pattern',
        dest='test_file_pattern',
        default=None,
        help=
        'A comma separated glob (or just a file path) to select specific test files to execute.'
    )
    parser.add_argument('--iterations',
                        dest='iterations',
                        default=1,
                        help='Number of test iterations.')
    parser.add_argument('--shuffle',
                        dest='shuffle',
                        action='store_true',
                        help='Shuffles the order of the test files.')
    return parser.parse_args(cli_args)


def divide_run(chunks,
               test_suite_source_dir,
               pattern=None,
               iterations=1,
               shuffle=False):
    commands = []
    test_files = []

    if pattern:
        test_files = pattern.split(',')
    else:
        test_suite_path = Path(
            f'{devtools_root_path()}/{test_suite_source_dir}')
        test_files = [
            os.path.relpath(p, start=test_suite_path)
            for p in glob(f'{test_suite_path}/**/*_test.ts', recursive=True)
        ]

    if shuffle:
        random.shuffle(test_files)

    if iterations > 1:
        for i in range(chunks):
            commands.append({
                'env': {
                    'ITERATIONS': str(math.ceil(iterations / chunks))
                },
                'command': [
                    node_path(),
                    str(
                        Path(
                            f'{devtools_root_path()}/scripts/test/run_test_suite.js'
                        )),
                    f'--config={Path(f"{test_suite_source_dir}/test-runner-config.json")}',
                    '--test-file-pattern=' + ','.join(test_files)
                ]
            })

        return commands

    chunk_size = math.ceil(len(test_files) / chunks)

    for l in [
            test_files[i:i + chunk_size]
            for i in range(0, len(test_files), chunk_size)
            if test_files[i:i + chunk_size]
    ]:
        commands.append({
            'env': {},
            'command': [
                node_path(),
                str(
                    Path(
                        f'{devtools_root_path()}/scripts/test/run_test_suite.js'
                    )),
                f'--config={Path(f"{test_suite_source_dir}/test-runner-config.json")}',
                '--test-file-pattern=' + ','.join(l)
            ]
        })

    return commands


if __name__ == '__main__':
    args = parse_options(sys.argv[1:])
    commands = divide_run(chunks=int(args.jobs),
                          test_suite_source_dir=args.test_suite_source_dir,
                          pattern=args.test_file_pattern,
                          iterations=int(args.iterations),
                          shuffle=args.shuffle)
    for command in commands:
        command_text = ' '.join(
            [f'{k}={v}'
             for k, v in command['env'].items()] + command['command'])
        assert len(command_text) < 8191,\
          'Command is too long for Windows, consider increasing the number of shards'
        print(command_text)
