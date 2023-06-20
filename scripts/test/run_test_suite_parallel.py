#!/usr/bin/env vpython3
#
# Copyright 2023 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
from e2e_divider import divide_run

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import devtools_paths


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
        default=4,
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
    parser.add_argument(
        '--no-failure-screenshots-file',
        dest='no_failure_screenshots_file',
        action='store_true',
        help='Does not save screenshots to failure_screenshots.html.')
    parser.add_argument('--no-color',
                        dest='no_color',
                        action='store_true',
                        help='Prints results without color.')
    parser.add_argument('--no-indent',
                        dest='no_indent',
                        action='store_true',
                        help='Prints results without indentation.')
    return parser.parse_args(cli_args)


class ColoredPrint:
    def __init__(self, no_color):
        self.color_codes = {
            'no_color': '0',
            'red': '0;31',
            'green': '0;32',
            'yellow': '1;33',
            'blue': '0;34',
            'purple': '0;35',
            'gray': '0;37',
            'white': '1;37',
        }
        self.no_color = no_color

        if os.popen('tput colors').read().strip() == '256':
            self.supports_color = True
        else:
            self.supports_color = False

    def cprint(self, text, color='no_color', end='\n'):
        if self.supports_color and not self.no_color:
            print(f'\033[{self.color_codes[color]}m {text} \033[0m', end=end)
        else:
            print(text, end=end)


def merge_files(file_path_list, new_file_path):
    combined_file = open(new_file_path, 'w')

    for file_path in file_path_list:
        file = open(file_path, 'r')
        file_content = file.read()
        combined_file.write(file_content)
        file.close()
        os.remove(file_path)

    combined_file.close()
    return combined_file


if __name__ == '__main__':
    args = parse_options(sys.argv[1:])
    commands = divide_run(chunks=int(args.jobs),
                          test_suite_source_dir=args.test_suite_source_dir,
                          pattern=args.test_file_pattern,
                          iterations=int(args.iterations))

    env = os.environ.copy()
    results_log_files = []
    processes = []
    for i in range(len(commands)):
        if not args.no_failure_screenshots_file:
            env["HTML_OUTPUT_FILE"] = f'{devtools_paths.devtools_root_path()}/out/failure_screenshots_{i}.html'
        for k, v in commands[i]['env'].items():
            env[k] = v
        temp = tempfile.NamedTemporaryFile(delete=False)
        open(temp.name, 'a')
        results_log_files.append(temp)
        processes.append(
            subprocess.Popen(commands[i]['command'] +
                             ['--mocha-reporter', 'json-stream'],
                             env=env,
                             stdout=subprocess.PIPE,
                             stderr=subprocess.STDOUT))

    cprint = ColoredPrint(args.no_color).cprint

    start_time = time.time()

    while None in [p.poll() for p in processes]:
        for i in range(len(processes)):
            line = processes[i].stdout.readline()
            if line:
                results_log_files[i].write(line)
                decoded_line = line.decode("utf-8")
                try:
                    json_line = json.loads(decoded_line)
                    formatted_line = json_line
                    if not args.no_indent:
                        formatted_line = json.dumps(json_line, indent=2)
                    if 'pass' in json_line:
                        cprint(formatted_line, color='green')
                    elif 'fail' in json_line:
                        cprint(formatted_line, color='red')
                    elif 'end' in json_line:
                        cprint(formatted_line, color='yellow')
                    else:
                        cprint(json_line)
                except ValueError as e:
                    cprint(decoded_line, end='')

    for f in results_log_files:
        f.close()

    failed_tests = []
    tests, passes, pending, failures = 0, 0, 0, 0
    for i in range(len(commands)):
        with open(results_log_files[i].name, "r") as f:
            for l in f.readlines():
                try:
                    json_line = json.loads(l)
                    if 'fail' in json_line:
                        failed_tests.append(json.loads(l)[1])
                    if 'end' in json_line:
                        result = json.loads(l)[1]
                        tests += result['tests']
                        passes += result['passes']
                        pending += result['pending']
                        failures += result['failures']
                except:
                    pass

    for tf in results_log_files:
        tf.close()

    print('\n\nFailed tests:')
    for f in failed_tests:
        print(json.dumps(f, indent=2))
        print()

    print()
    cprint(f'Total tests: {tests}', 'yellow')
    cprint(f'Passed: {passes}', 'green')
    cprint(f'Pending: {pending}', 'blue')
    cprint(f'Failures: {failures}', 'red')
    print()

    if not args.no_failure_screenshots_file and failed_tests:
        merge_files([
            f'{devtools_paths.devtools_root_path()}/out/failure_screenshots_{i}.html'
            for i in range(len(commands))
        ], f'{devtools_paths.devtools_root_path()}/out/failure_screenshots.html'
                    )
        cprint(
            f'Failure screenshots: {devtools_paths.devtools_root_path()}/out/failure_screenshots.html',
            'white')
        print()

    cprint(
        'Run Time: ' + str(round(
            (time.time() - start_time) / 60, 2)) + ' minutes', 'white')
