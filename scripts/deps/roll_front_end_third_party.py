#!/usr/bin/env vpython3
#
# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import urllib.request
import tarfile
import os
import re
import sys
import subprocess
import json
import shutil
from pkg_resources import parse_version
import argparse

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import devtools_paths

THIRD_PARTY_NPM_PACKAGE_NAMES = [{
    "package_name": "puppeteer-core",
    "folder_name": "puppeteer",
    "package_root": "lib/esm",
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


def getStartAndEndIndexForGNVariable(content, variable):
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


def readGNVariable(filename, variable):
    with open(filename) as f:
        content = f.readlines()
        startIndex, endIndex = getStartAndEndIndexForGNVariable(
            content, variable)
        return [x.strip(' \t",\'\n') for x in content[startIndex:endIndex]]


def updateGNVariable(file, variable, files):
    content = None
    with open(file) as f:
        content = f.readlines()

    files.sort()
    startIndex, endIndex = getStartAndEndIndexForGNVariable(content, variable)
    newContent = content[:startIndex] + ['    "' + x + '",\n'
                                         for x in files] + content[endIndex:]

    with open(file, 'w') as f:
        f.write(''.join(newContent))


for package_info in THIRD_PARTY_NPM_PACKAGE_NAMES:
    package_name = package_info["package_name"]
    folder_name = package_info["folder_name"]
    package_root = package_info["package_root"]

    path = devtools_paths.root_path() + f'/front_end/third_party/{folder_name}'
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
        subprocess.check_call(['git', 'checkout', 'main'],
                              cwd=devtools_paths.root_path())
        subprocess.check_call(
            ['git', 'checkout', '-b', f'update-{folder_name}-{version}'],
            cwd=devtools_paths.root_path())

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

    # Update BUILD.gn
    updateGNVariable(
        f'./front_end/third_party/{folder_name}/BUILD.gn', 'sources', [
            f'{folder_name}-tsconfig.json',
        ] + [
            name for name in members
            if name.startswith(f'package/{package_root}') and
            (name.endswith('.js') or name.endswith('.js.map')
             or name.endswith('.d.ts') or name.endswith('.d.ts.map'))
        ])

    # Update devtools_grd_files.gni
    updateGNVariable(
        './config/gni/devtools_grd_files.gni', 'grd_files_debug_sources', [
            f'front_end/third_party/{folder_name}/' + name
            for name in members if name.startswith(f'package/{package_root}')
            and name.endswith('.js')
        ] + [
            name
            for name in readGNVariable('./config/gni/devtools_grd_files.gni',
                                       'grd_files_debug_sources')
            if not name.startswith(f'front_end/third_party/{folder_name}')
        ])

    tar.close()

    if args.upload_cl:
        subprocess.check_call(['git', 'cl', 'format'],
                              cwd=devtools_paths.root_path())
        subprocess.check_call(['git', 'add', '-A'],
                              cwd=devtools_paths.root_path())
        subprocess.check_call(
            ['git', 'commit', '-m', f'Update {package_name} to {version}'],
            cwd=devtools_paths.root_path())
        subprocess.check_call(
            ['git', 'cl', 'upload', '-b', 'none', '-f', '-d', '-s'],
            cwd=devtools_paths.root_path())

if args.create_branch:
    subprocess.check_call(['git', 'checkout', 'main'],
                          cwd=devtools_paths.root_path())
