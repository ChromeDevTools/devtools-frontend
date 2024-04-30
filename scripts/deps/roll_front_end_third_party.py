#!/usr/bin/env vpython3
#
# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import urllib.request
import tarfile
import os
import re
import subprocess
import json
import shutil
from pkg_resources import parse_version
import argparse

DEVTOOLS_PATH = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def get_start_and_end_endex_for_gn_var(content, variable):
    startIndex = None
    endIndex = None
    startPattern = re.compile(r'\s*' + variable + '\s*=\s*\[\s*')
    endPattern = re.compile(r'\s*\]\s*')
    for i, line in enumerate(content):
        if startPattern.match(line):
            startIndex = i + 1
            break

    if startIndex is None:
        raise BaseException(variable + ' not found')

    for i, line in enumerate(content[startIndex:], start=startIndex):
        if endPattern.match(line):
            endIndex = i
            break

    return startIndex, endIndex


def read_gn_var(filename, variable):
    with open(filename) as f:
        content = f.readlines()
        startIndex, endIndex = get_start_and_end_endex_for_gn_var(
            content, variable)
        return [x.strip(' \t",\'\n') for x in content[startIndex:endIndex]]


def update_gn_var(file, variable, files):
    content = None
    with open(file) as f:
        content = f.readlines()

    files.sort()
    startIndex, endIndex = get_start_and_end_endex_for_gn_var(
        content, variable)
    newContent = content[:startIndex] + [
        '    "' + x + '",\n' if not x.startswith('#') else '    ' + x + '\n'
        for x in files
    ] + content[endIndex:]

    with open(file, 'w') as f:
        f.write(''.join(newContent))


def update_tsconfig(file, files):
    files.sort()
    with open(file, 'w') as f:
        f.write("""{
  "compilerOptions": {
    "composite": true
  },
  "files": [\n""")
        last = files.pop()
        for file in files:
            f.write(f"    \"{file}\",\n")
        f.write(f"    \"{last}\"\n")
        f.write("""  ]
}
""")


def update_readme_version(file, ver):
    content = None
    with open(file) as f:
        content = f.readlines()

    # Find the `Version` line.
    for i, line in enumerate(content):
        if line.startswith("Version:"):
            lineIndex = i
            break
    if lineIndex is None:
        return

    with open(file, 'w') as f:
        f.write(''.join(content[:lineIndex] + [f"Version: {ver}\n"] +
                        content[lineIndex + 1:]))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('package_name')
    parser.add_argument('output_dir')
    parser.add_argument('library_dir')

    args = parser.parse_args()

    package_name = args.package_name
    output_dir = args.output_dir
    library_dir = args.library_dir

    path = DEVTOOLS_PATH + f'/front_end/third_party/{output_dir}'
    package_path = f'{path}/package'

    old_package_json = json.load(open(f'{package_path}/package.json'))
    package_json = json.load(
        urllib.request.urlopen(
            f'https://registry.npmjs.org/{package_name}/latest'))

    # Version check
    version = parse_version(package_json['version'])
    if parse_version(old_package_json['version']) >= version:
        return

    # Remove the old package
    shutil.rmtree(package_path)

    # Extract the tarball
    tarball_url = package_json['dist']['tarball']
    tar = tarfile.open(
        urllib.request.urlretrieve(tarball_url, filename=None)[0], 'r:gz')
    members = tar.getmembers()
    tar.extractall(path=path, members=members)

    # Get the names of all files
    members = [m.name for m in members]

    try:
        excluded_sources = set(
            read_gn_var(f'./front_end/third_party/{output_dir}/BUILD.gn',
                        'EXCLUDED_SOURCES'))
    except BaseException:
        excluded_sources = set()

    # Update {package-name}-tsconfig.json
    update_tsconfig(
        f'./front_end/third_party/{output_dir}/{output_dir}-tsconfig.json', [
            name
            for name in members if name.startswith(f'package/{library_dir}/')
            and name not in excluded_sources and name.endswith('.js')
        ])

    # Update BUILD.gn
    update_gn_var(
        f'./front_end/third_party/{output_dir}/BUILD.gn', 'SOURCES', [
            f'{output_dir}-tsconfig.json',
        ] + [
            name
            for name in members if name.startswith(f'package/{library_dir}/')
            and name not in excluded_sources and
            (name.endswith('.js') or name.endswith('.js.map')
             or name.endswith('.d.ts') or name.endswith('.d.ts.map'))
        ])

    # Update devtools_grd_files.gni
    update_gn_var(
        './config/gni/devtools_grd_files.gni', 'grd_files_debug_sources', [
            f'front_end/third_party/{output_dir}/' + name
            for name in members if name.startswith(f'package/{library_dir}/')
            and name not in excluded_sources and name.endswith('.js')
        ] + [
            name for name in read_gn_var('./config/gni/devtools_grd_files.gni',
                                         'grd_files_debug_sources')
            if not name.startswith(f'front_end/third_party/{output_dir}/')
        ])

    # Update README.chromium
    update_readme_version(
        f'./front_end/third_party/{output_dir}/README.chromium', version)

    tar.close()

    subprocess.check_call(['git', 'cl', 'format'], cwd=DEVTOOLS_PATH)


if __name__ == '__main__':
    main()
