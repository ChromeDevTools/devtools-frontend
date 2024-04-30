#!/usr/bin/env vpython3
#
# Copyright 2023 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

# This file generates a TypeScript-ified version of blink's "deprecation.json5".
# We do this in order to get tyep-saftey of the JSON's content vs the
# deprecations defined in CDP.

import datetime
import json
import os
import sys
from os import path

PYJSON5_DIR = path.join(os.path.dirname(__file__), '..', '..', 'third_party',
                        'pyjson5', 'src')
sys.path.append(PYJSON5_DIR)

import json5  # pylint: disable=import-error

ROOT_DIRECTORY = path.join(path.dirname(__file__), '..', '..')
GENERATED_LOCATION = path.join(ROOT_DIRECTORY, 'front_end', 'generated',
                               'Deprecation.ts')
READ_LOCATION = path.join(ROOT_DIRECTORY, 'third_party', 'blink', 'renderer',
                          'core', 'frame', 'deprecation', 'deprecation.json5')

# Deprecations in this list are exempt from code generation as they are not
# dispatched to the DevTools.
EXEMPTED_FROM_DEVTOOLS_GENERATION = {
    "ThirdPartyCookieAccessWarning",
    "ThirdPartyCookieAccessError",
}


def deprecations_from_file(file_name):
    with open(file_name) as json5_file:
        doc = json5.loads(json5_file.read())

    # We turn the list of deprecations into two maps, both keyed by the deprecation name.
    # One contains the message + translation note.
    # The other contains the metadata such as milestone and chrome feature.
    meta = {}
    ui_strings = {}
    for entry in doc["data"]:
        if "obsolete_to_be_removed_after_milestone" in entry:
            continue

        name = entry["name"]

        if name in EXEMPTED_FROM_DEVTOOLS_GENERATION:
            continue

        meta_for_entry = {}
        if "milestone" in entry:
            meta_for_entry["milestone"] = entry["milestone"]
        if "chrome_status_feature" in entry:
            meta_for_entry["chromeStatusFeature"] = entry[
                "chrome_status_feature"]
        if len(meta_for_entry): meta[name] = meta_for_entry

        ui_strings[name] = {
            "message": entry["message"],
            "note": entry["translation_note"],
        }

    return meta, ui_strings


meta, ui_strings = deprecations_from_file(READ_LOCATION)
now = datetime.datetime.now()
with open(GENERATED_LOCATION, mode="w+") as f:
    f.write("// Copyright %d The Chromium Authors. All rights reserved.\n" %
            now.year)
    f.write(
        "// Use of this source code is governed by a BSD-style license that can be\n"
    )
    f.write("// found in the LICENSE file.\n")
    f.write("\n")
    f.write("// This file is auto-generated, do not edit manually.\n")
    f.write("// Re-generate with: npm run generate-protocol-resources\n")
    f.write("\n")
    f.write("export const UIStrings = {\n")
    for name, ui_string in ui_strings.items():
        message = ui_string["message"]
        note = ui_string["note"]
        f.write("  /**\n")
        f.write("   * @description %s\n" % note)
        f.write("   */\n")
        f.write("  %s: %s,\n" % (name, json.dumps(message)))
    f.write("};\n")
    f.write("\n")
    f.write("export interface DeprecationDescriptor {\n")
    f.write("  milestone?: number;\n")
    f.write("  chromeStatusFeature?: number;\n")
    f.write("}\n")
    f.write("\n")
    f.write(
        "export const DEPRECATIONS_METADATA: Partial<Record<string, DeprecationDescriptor>> = %s;\n"
        % json.dumps(meta, sort_keys=True, indent=2))
