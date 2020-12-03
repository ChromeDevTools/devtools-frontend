#!/usr/bin/env vpython
#
# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import argparse
import os.path as path
import re
import subprocess
import sys

scripts_path = path.dirname(path.dirname(path.abspath(__file__)))
sys.path.append(scripts_path)
import devtools_paths

devtools_path = devtools_paths.devtools_root_path()


def parse_options(cli_args):
    parser = argparse.ArgumentParser(description='Process localization check arguments.')
    parser.add_argument('--all', '-a', action='store_true', dest='all_files', help='If present, check all devtools frontend .js files')
    parser.add_argument('--files', nargs='+', help='List of .js files with absolute paths separated by a space')
    parser.add_argument('--file-list', dest='file_list', help='Specifies a file with a list of files (one per line)')
    parser.add_argument(
        '--autofix', action='store_true', help='If present, errors in localizable resources will be fixed automatically')
    args = parser.parse_args(cli_args)

    if len(cli_args) == 0:
        print('No argument provided. Assuming --all to check all files.')
        args.all_files = True

    if args.all_files and args.files:
        parser.error(
            "Please provide only one option for scanning files: --all for all files or --files <FILE_LIST> for specific files.")
    return args


def popen(arguments, cwd=None):
    return subprocess.Popen(arguments, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)


def check_with_node_script(script_path, script_description, args):
    print(script_description + "...")
    script_proc_errors_found = False
    exec_command = [
        devtools_paths.node_path(),
        script_path,
    ] + args

    script_proc = popen(exec_command)
    (script_proc_out, _) = script_proc.communicate()
    if script_proc.returncode != 0:
        script_proc_errors_found = True

    print(script_proc_out)
    return script_proc_errors_found


def show_result(errors):
    if errors:
        print('Check failed (see above)')
        sys.exit(1)
    else:
        print('Check succeeded')


def check_devtools_localizable_resources(
        check_devtools_localizable_resources_args):
    script_path = devtools_paths.check_localizable_resources_path()
    script_description = 'Verifying all resources are localizable and checking the structure of grd files'
    return check_with_node_script(script_path, script_description, check_devtools_localizable_resources_args)


def main():
    check_devtools_localizable_resources_args = []

    parsed_args = parse_options(sys.argv[1:])

    if parsed_args.autofix:
        check_devtools_localizable_resources_args = ['--autofix']

    resources_errors_found_localizable = check_devtools_localizable_resources(
        check_devtools_localizable_resources_args)
    show_result(resources_errors_found_localizable)


if __name__ == '__main__':
    main()
