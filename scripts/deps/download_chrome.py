#!/usr/bin/env python3
#
# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Used to download a pre-built version of Chrome for Testing for running
tests.
"""

import argparse
import io
import os
import shutil
import stat
import subprocess
import sys
import urllib.request
import zipfile

from set_lpac_acls import set_lpac_acls

def parse_options(cli_args):
    parser = argparse.ArgumentParser(description='Download Chrome')
    parser.add_argument('--url', help='download URL')
    parser.add_argument('--target', help='target directory')
    parser.add_argument(
        '--rename_from',
        help='path to directory to be renamed inside of the ZIP archive')
    parser.add_argument('--rename_to', help='new name for directory')
    parser.add_argument('--path_to_binary',
                        help='path to binary after extracting and renaming')
    parser.add_argument(
        '--version_number',
        help='version number to find out whether we need to re-download')
    return parser.parse_args(cli_args)


def handleAccessDeniedOnWindows(func, path, exc):
    if not os.name == 'nt':
        raise exc
    if not os.access(path, os.W_OK):
        # Is the error an access error?
        print("Retrying due to access error...")
        os.chmod(path, stat.S_IWUSR)
        func(path)
    else:
        raise exc


def download_and_extract(options):
    VERSION_NUMBER_FILE = os.path.join(options.target, 'version_number')
    EXPECTED_BINARY = os.path.join(options.target, options.path_to_binary)

    # Check whether we already downloaded pre-built Chrome with this version number.
    if os.path.exists(VERSION_NUMBER_FILE):
        with open(VERSION_NUMBER_FILE) as file:
            version_number = file.read().strip()
            if version_number == options.version_number:
                assert os.path.exists(EXPECTED_BINARY)
                return

    # Remove previous download.
    if os.path.exists(options.target):
        shutil.rmtree(options.target,
                      ignore_errors=False,
                      onerror=handleAccessDeniedOnWindows)

    try:
        # Download again and save version number.
        try:
            filehandle, headers = urllib.request.urlretrieve(options.url)
        except:
            print(
                "Using curl as fallback. You should probably update OpenSSL.")
            filehandle = io.BytesIO(
                subprocess.check_output(
                    ['curl', '--output', '-', '-sS', options.url]))
        zip_file = zipfile.ZipFile(filehandle, 'r')
        zip_file.extractall(path=options.target)
        shutil.move(os.path.join(options.target, options.rename_from),
                    os.path.join(options.target, options.rename_to))

    finally:
        urllib.request.urlcleanup()

    # Fix permissions. Doing this recursively is necessary for MacOS bundles.
    if os.path.isfile(EXPECTED_BINARY):
        os.chmod(EXPECTED_BINARY, 0o555)
        # On Linux, the crashpad_handler binary needs the +x bit, too.
        crashpad = os.path.join(os.path.dirname(EXPECTED_BINARY),
                                'chrome_crashpad_handler')
        if os.path.isfile(crashpad):
            os.chmod(crashpad, 0o555)
    else:
        for root, dirs, files in os.walk(EXPECTED_BINARY):
            for f in files:
                os.chmod(os.path.join(root, f), 0o555)
    with open(VERSION_NUMBER_FILE, 'w') as file:
        file.write(options.version_number)

    # On Windows we have to setup LPAC ACLs for the binary.
    # See https://bit.ly/31yqMJR.
    if os.name == 'nt':
        set_lpac_acls(os.path.dirname(EXPECTED_BINARY))


if __name__ == '__main__':
    OPTIONS = parse_options(sys.argv[1:])
    download_and_extract(OPTIONS)
