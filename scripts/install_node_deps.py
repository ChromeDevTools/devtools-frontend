#!/usr/bin/env python
#
# Copyright 2016 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Ensure node.js and npm modules are installed
"""

import os
from os import path
import shutil
import subprocess
import sys

import utils

MIN_NODE_VERSION = 4
LOCAL_NODE_VERSION = '4.5.0'

scripts_path = path.dirname(path.abspath(__file__))
install_local_node_path = path.join(scripts_path, 'local_node', 'node.py')
local_node_runtimes_path = path.join(scripts_path, 'local_node', 'runtimes')
local_node_binary_path = path.join(local_node_runtimes_path, LOCAL_NODE_VERSION, 'bin', 'node')
local_npm_binary_path = path.join(local_node_runtimes_path, LOCAL_NODE_VERSION, 'bin', 'npm')


def main():
    (node_path, npm_path) = resolve_node_paths()
    npm_install(npm_path)


def resolve_node_paths():
    if has_valid_global_node():
        if sys.platform == "win32":
            return (utils.which('node'), utils.which('npm.cmd'))
        return (utils.which('node'), utils.which('npm'))
    has_installed_local_node = path.isfile(local_node_binary_path)
    if has_installed_local_node:
        return (local_node_binary_path, local_npm_binary_path)
    if path.isdir(local_node_runtimes_path):
        shutil.rmtree(local_node_runtimes_path)
    if sys.platform == 'linux2' or sys.platform == 'darwin':
        install_node()
        return (local_node_binary_path, local_npm_binary_path)
    print('ERROR: Please install the latest node.js LTS version using the Windows installer:')
    print('https://nodejs.org/en/download/')
    raise


def has_valid_global_node():
    node_path = utils.which('node')
    if not node_path:
        return False
    node_process = popen([node_path, '--version'])
    (node_process_out, _) = node_process.communicate()
    if node_process.returncode != 0:
        return False
    major_version = node_process_out[1]
    return int(major_version) >= MIN_NODE_VERSION


def install_node():
    print('Installing node.js locally at {}'.format(local_node_runtimes_path))
    print('NOTE: this does not add to PATH or affect global node installation')
    node_env = {'NODE_VERSION': LOCAL_NODE_VERSION}
    install_node_process = popen([install_local_node_path, '--version'], env=node_env)
    (node_process_out, error) = install_node_process.communicate()
    if install_node_process.returncode != 0:
        print('Could not install node locally')
        print(error)
        raise
    print(node_process_out)


def npm_install(npm_path):
    print('Runing npm install using {}'.format(npm_path))
    npm_process = popen([npm_path, 'install'])
    (npm_process_out, _) = npm_process.communicate()
    if npm_process.returncode != 0:
        print('WARNING: npm install had an issue')
    print(npm_process_out)


def popen(arguments, env=None):
    return subprocess.Popen(arguments, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env)


if __name__ == '__main__':
    sys.exit(main())
