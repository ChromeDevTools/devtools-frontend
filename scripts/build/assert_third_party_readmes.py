#!/usr/bin/env vpython3
# -*- coding: UTF-8 -*-
#
# Copyright 2022 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Asserts that all third_party packages are included in additional_readme_paths.json.
"""

import sys
import json


def main(argv):
    grd_sources = open(argv[1], 'r').read()
    listed_third_party_directories = open(argv[2], 'r').read()
    stamp_file = argv[3]

    grd_json = json.loads(grd_sources)
    listed_third_party_directories_json = json.loads(
        listed_third_party_directories)

    grd_json.sort()
    listed_third_party_directories_json.sort()

    return_code = 0
    found_directories = set()
    missing_directories = set()

    for grd_file in grd_json:
        if grd_file.startswith("front_end/third_party"):
            third_party_directory_name = grd_file.split("/")[2]
            found_directories.add(third_party_directory_name)
            if third_party_directory_name not in listed_third_party_directories_json:
                missing_directories.add(third_party_directory_name)

    for missing_directory in missing_directories:
        print(
            "Directory `" + missing_directory + "`" +
            " is not listed in the `additional_readme_paths.json` file " +
            " in `front_end/third_party`. Make sure to include all third_party"
            +
            " directories in the `.json` file to ensure all licenses are listed"
            + " in chrome://credits.\n")

        return_code = 1

    for listed_directory in listed_third_party_directories_json:
        if (listed_directory not in found_directories
                # TODO(crbug.com/1287519): Remove exception for codemirror 5
                and not listed_directory == "codemirror"
                and not listed_directory == "puppeteer"):
            print(
                "Directory `" + listed_directory + "`" +
                " is not included in `config/gni/devtools_grd_files.gni`." +
                " Make sure to only include third_party directories that are shipped"
                + " in Chromium.\n")

            return_code = 1

    with open(stamp_file, 'w', encoding="utf8") as fp:
        fp.write("")

    return return_code


if __name__ == '__main__':
    sys.exit(main(sys.argv))
