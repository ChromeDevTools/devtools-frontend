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

THIRD_PARTY_NPM_PACKAGE_NAMES = [{
    "package_name": "puppeteer-core",
    "folder_name": "puppeteer",
    "package_root": "lib/esm",
}, {
    "package_name": "@puppeteer/replay",
    "folder_name": "puppeteer-replay",
    "package_root": "lib",
}]

parser = argparse.ArgumentParser()
parser.add_argument("-cb",
                    "--create-branch",
                    dest="create_branch",
                    help="Creates a new branch for each dependency",
                    action='store_true')
parser.add_argument("-u",
                    "--upload-cl",
                    dest="upload_cl",
                    help="Uploads a CL for each dependency",
                    action='store_true')

args = parser.parse_args()


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


for package_info in THIRD_PARTY_NPM_PACKAGE_NAMES:
    package_name = package_info["package_name"]
    folder_name = package_info["folder_name"]
    package_root = package_info["package_root"]

    path = DEVTOOLS_PATH + f'/front_end/third_party/{folder_name}'
    package_path = f'{path}/package'

    old_package_json = json.load(open(f'{package_path}/package.json'))
    package_json = json.load(
        urllib.request.urlopen(
            f'https://registry.npmjs.org/{package_name}/latest'))

    # Version check
    version = parse_version(package_json['version'])
    if parse_version(old_package_json['version']) >= version:
        continue

    if args.create_branch:
        subprocess.check_call(['git', 'checkout', 'main'], cwd=DEVTOOLS_PATH)
        subprocess.check_call(
            ['git', 'checkout', '-b', f'update-{folder_name}-{version}'],
            cwd=DEVTOOLS_PATH)

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
            read_gn_var(f'./front_end/third_party/{folder_name}/BUILD.gn',
                        'EXCLUDED_SOURCES'))
    except BaseException:
        excluded_sources = set()

    # Update BUILD.gn
    update_gn_var(
        f'./front_end/third_party/{folder_name}/BUILD.gn', 'SOURCES', [
            f'{folder_name}-tsconfig.json',
        ] + [
            name
            for name in members if name.startswith(f'package/{package_root}')
            and name not in excluded_sources and
            (name.endswith('.js') or name.endswith('.js.map')
             or name.endswith('.d.ts') or name.endswith('.d.ts.map'))
        ])

    # Update devtools_grd_files.gni
    update_gn_var(
        './config/gni/devtools_grd_files.gni',
        'grd_files_debug_sources', [
            f'front_end/third_party/{folder_name}/' + name
            for name in members if name.startswith(f'package/{package_root}')
            and name not in excluded_sources and name.endswith('.js')
        ] + [
            name for name in read_gn_var('./config/gni/devtools_grd_files.gni',
                                         'grd_files_debug_sources')
            if not name.startswith(f'front_end/third_party/{folder_name}')
        ])

    # Update README.chromium
    update_readme_version(
        f'./front_end/third_party/{folder_name}/README.chromium', version)

    tar.close()

    if args.upload_cl:
        subprocess.check_call(['git', 'cl', 'format'], cwd=DEVTOOLS_PATH)
        subprocess.check_call(['git', 'add', '-A'], cwd=DEVTOOLS_PATH)
        subprocess.check_call(
            ['git', 'commit', '-m', f'Update {package_name} to {version}'],
            cwd=DEVTOOLS_PATH)
        subprocess.check_call([
            'git', 'cl', 'upload', '-b', 'none', '-f', '-d', '--r-owners',
            '-s', '-a'
        ],
                              cwd=DEVTOOLS_PATH)

if args.create_branch:
    subprocess.check_call(['git', 'checkout', 'main'], cwd=DEVTOOLS_PATH)
