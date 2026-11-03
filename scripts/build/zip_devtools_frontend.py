#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Creates devtools-frontend.zip for the remote DevTools server.

The archive contains every file that the hosted DevTools frontend at
chrome-devtools-frontend.appspot.com can serve: all files that end up in the
GRD (i.e. that are bundled with Chrome), plus the files that are only ever
fetched remotely (e.g. non-bundled locales).

The archive layout is independent of where DevTools lives in the source tree.
All files are stored with their path relative to the DevTools root output
directory, prefixed with `--prefix`, e.g.:

  devtools-frontend/front_end/devtools_app.html
  devtools-frontend/front_end/core/i18n/locales/de.json

The archive is deterministic: entries are sorted and use a fixed timestamp and
fixed permissions.
"""

import argparse
import json
import os
import posixpath
import sys
import zipfile

# Earliest timestamp representable in the ZIP format.
_ZIP_TIMESTAMP = (1980, 1, 1, 0, 0, 0)
_FILE_MODE = 0o644


def parse_args(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        '--file-list',
        action='append',
        required=True,
        help='JSON file containing a list of file paths, relative to '
        '--base-dir. Can be passed multiple times.')
    parser.add_argument('--base-dir',
                        required=True,
                        help='Directory the file paths are relative to.')
    parser.add_argument('--prefix',
                        required=True,
                        help='Directory prefix for all archive entries.')
    parser.add_argument('--output',
                        required=True,
                        help='Path of the zip file to create.')
    parser.add_argument('--depfile', help='Path of the depfile to write.')
    return parser.parse_args(argv)


def collect_files(file_lists):
    files = set()
    for file_list in file_lists:
        with open(file_list, 'r', encoding='utf-8') as f:
            files.update(
                posixpath.normpath(p.replace('\\', '/')) for p in json.load(f))
    for path in files:
        if path.startswith('../') or posixpath.isabs(path):
            raise ValueError(f'File {path} is outside of the base directory')
    return sorted(files)


def write_zip(output, base_dir, prefix, files):
    # Write to a temporary file first, so that an interrupted build never
    # leaves a truncated archive behind.
    tmp_output = output + '.tmp'
    with zipfile.ZipFile(tmp_output, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            info = zipfile.ZipInfo(posixpath.join(prefix, path),
                                   date_time=_ZIP_TIMESTAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = _FILE_MODE << 16
            with open(os.path.join(base_dir, path), 'rb') as f:
                archive.writestr(info, f.read())
    os.replace(tmp_output, output)


def write_depfile(depfile, output, base_dir, files):
    inputs = [
        os.path.join(base_dir, path).replace('\\', '/') for path in files
    ]
    with open(depfile, 'w', encoding='utf-8') as f:
        f.write(f"{output.replace(os.sep, '/')}: {' '.join(inputs)}\n")


def main(argv):
    args = parse_args(argv)
    files = collect_files(args.file_list)
    write_zip(args.output, args.base_dir, args.prefix, files)
    if args.depfile:
        write_depfile(args.depfile, args.output, args.base_dir, files)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
