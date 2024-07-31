#!/usr/bin/env vpython3
#
# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Use this script to update node_modules instead of
running npm install manually. To upgrade a dependency, change the version
number in package.json below and run this script, which can be done with `npm run
install-deps` locally.
"""

import os
import os.path as path
import json
import subprocess
import sys
from collections import OrderedDict

scripts_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(scripts_path)

import devtools_paths

LICENSES = [
    "MIT",
    "Apache-2.0",
    "BSD",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "CC0-1.0",
    "CC-BY-3.0",
    "CC-BY-4.0",
    "ISC",
    "MPL-2.0",
    "Python-2.0",
    "W3C",
]


def load_json_file(location):
    # By default, json load uses a standard Python dictionary, which is not ordered.
    # To prevent subsequent invocations of this script to erroneously alter the order
    # of keys defined in package.json files, we should use an `OrderedDict`. This
    # ensures not only that we use a strict ordering, it will also make sure we maintain
    # the order defined by the NPM packages themselves. That in turn is important, since
    # NPM packages can define `exports`, where the order of entrypoints is crucial for
    # how an NPM package is loaded. If you would change the order, it could break loading
    # that package.
    return json.load(location, object_pairs_hook=OrderedDict)


DEPS = {}

pkg_file = path.join(devtools_paths.devtools_root_path(), 'package.json')
with open(pkg_file, 'r+') as pkg_file:
    DEPS = load_json_file(pkg_file)["devDependencies"]


def exec_command(cmd):
    try:
        new_env = os.environ.copy()
        cmd_proc_result = subprocess.check_call(
            cmd, cwd=devtools_paths.devtools_root_path(), env=new_env)
    except Exception as error:
        print(error)
        return True

    return False


def ensure_licenses():
    cmd = [
        devtools_paths.node_path(),
        devtools_paths.license_checker_path(), '--onlyAllow',
        ('%s' % (';'.join(LICENSES)))
    ]

    return exec_command(cmd)


def strip_private_fields():
    # npm adds private fields which need to be stripped.
    packages = []
    for root, _, filenames in os.walk(devtools_paths.node_modules_path()):
        if 'package.json' in filenames:
            packages.append(path.join(root, 'package.json'))

    for pkg in packages:
        with open(pkg, 'r+') as pkg_file:
            try:
                pkg_data = load_json_file(pkg_file)
                updated_pkg_data = pkg_data.copy()

                # Remove anything that begins with an underscore, as these are
                # the private fields in a package.json
                for key in pkg_data.keys():
                    if key.find('_') == 0:
                        updated_pkg_data.pop(key)

                pkg_file.truncate(0)
                pkg_file.seek(0)
                json.dump(updated_pkg_data,
                          pkg_file,
                          indent=2,
                          separators=(',', ': '))
                pkg_file.write('\n')
            except:
                print('Unable to fix: %s, %s' % (pkg, sys.exc_info()))
                return True

    return False


def remove_package_json_entries():
    with open(devtools_paths.package_json_path(), 'r+') as pkg_file:
        try:
            pkg_data = load_json_file(pkg_file)

            # Remove the dependencies and devDependencies from the root package.json
            # so that they can't be used to overwrite the node_modules managed by this file.
            for key in pkg_data.keys():
                if key.find('dependencies') == 0:
                    pkg_data.pop(key)

            pkg_file.truncate(0)
            pkg_file.seek(0)
            json.dump(pkg_data, pkg_file, indent=2, separators=(',', ': '))
            pkg_file.write('\n')
        except:
            print('Unable to fix: %s' % pkg)
            return True
    return False


def addClangFormat():
    with open(path.join(devtools_paths.node_modules_path(), '.clang-format'),
              'w+') as clang_format_file:
        try:
            clang_format_file.write('DisableFormat: true\n')
        except:
            print('Unable to write .clang-format file')
            return True
    return False


def addOwnersFile():
    with open(path.join(devtools_paths.node_modules_path(), 'OWNERS'),
              'w+') as owners_file:
        try:
            owners_file.write('file://config/owner/INFRA_OWNERS\n')
        except:
            print('Unable to write OWNERS file')
            return True
    return False


def addChromiumReadme():
    with open(path.join(devtools_paths.node_modules_path(), 'README.chromium'),
              'w+') as readme_file:
        try:
            readme_file.write(
                'This directory hosts all packages downloaded from NPM that are used in either the build system or infrastructure scripts.\n'
            )
            readme_file.write(
                'If you want to make any changes to this directory, please see "scripts/deps/manage_node_deps.py".\n'
            )
        except:
            print('Unable to write README.chromium file')
            return True
    return False


def run_npm_command():
    for (name, version) in DEPS.items():
        if (version.find('^') == 0):
            print(
                'Versions must be locked to a specific version; remove ^ from the start of the version.'
            )
            return True

    # Modern npm versions do not cause extra updates so it is not necessary to run clean install.
    if exec_command([
            'npm',
            'install',
    ]):
        return True

    # To minimize disk usage for Chrome DevTools node_modules, always try to dedupe dependencies.
    # We need to perform this every time, as the order of dependencies added could lead to a
    # non-optimal dependency tree, resulting in unnecessary disk usage.
    if exec_command([
            'npm',
            'dedupe',
    ]):
        return True

    if remove_package_json_entries():
        return True

    if strip_private_fields():
        return True

    if addClangFormat():
        return True

    if addOwnersFile():
        return True

    if addChromiumReadme():
        return True

    return ensure_licenses()


npm_errors_found = run_npm_command()

if npm_errors_found:
    print('npm command failed')
    exit(1)
