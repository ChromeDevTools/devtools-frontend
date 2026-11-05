#!/usr/bin/env vpython3
# Copyright 2023 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Generates Deprecation.ts from Blink's deprecation.json5.

Runs as a generated_ts() action (see front_end/generated/BUILD.gn) and always
writes its output: scripts/build/run_with_restat.py keeps the mtime of an
output that did not change. scripts/tools/collect_strings.py runs it as well,
to collect its UIStrings for the Translation Console.
"""

import argparse
import json
import os
import sys

PYJSON5_DIR = os.path.join(os.path.dirname(__file__), '..', '..',
                           'third_party', 'pyjson5', 'src')
sys.path.append(PYJSON5_DIR)

import json5  # pylint: disable=import-error,wrong-import-position

HEADER = '''\
// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'''

# Deprecations in this list are exempt from code generation as they are not
# dispatched to the DevTools.
EXEMPTED_FROM_DEVTOOLS_GENERATION = set()


def deprecations_from_file(file_name):
    with open(file_name, encoding='utf-8') as json5_file:
        doc = json5.loads(json5_file.read())

    # We turn the list of deprecations into two maps, both keyed by the
    # deprecation name. One contains the message + translation note; the other
    # contains the metadata such as milestone and chrome feature.
    meta = {}
    ui_strings = {}
    for entry in doc['data']:
        if 'obsolete_to_be_removed_after_milestone' in entry:
            continue

        name = entry['name']
        if name in EXEMPTED_FROM_DEVTOOLS_GENERATION:
            continue

        meta_for_entry = {}
        if 'milestone' in entry:
            meta_for_entry['milestone'] = entry['milestone']
        if 'chrome_status_feature' in entry:
            meta_for_entry['chromeStatusFeature'] = entry[
                'chrome_status_feature']
        if meta_for_entry:
            meta[name] = meta_for_entry

        ui_strings[name] = {
            'message': entry['message'],
            'note': entry['translation_note'],
        }

    return meta, ui_strings


def generate(meta, ui_strings):
    """Returns the contents of Deprecation.ts for the parsed deprecations."""
    lines = [HEADER, 'export const UIStrings = {\n']
    for name, ui_string in ui_strings.items():
        lines.append('  /**\n')
        lines.append('   * @description %s\n' % ui_string['note'])
        lines.append('   */\n')
        lines.append('  %s: %s,\n' % (name, json.dumps(ui_string['message'])))
    lines.append('} as const;\n\n')
    lines.append('export interface DeprecationDescriptor {\n')
    lines.append('  milestone?: number;\n')
    lines.append('  chromeStatusFeature?: number;\n')
    lines.append('}\n\n')
    lines.append(
        'export const DEPRECATIONS_METADATA: Partial<Record<string, DeprecationDescriptor>> = %s;\n'
        % json.dumps(meta, sort_keys=True, indent=2))
    return ''.join(lines)


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--input',
                        required=True,
                        help='Path to deprecation.json5')
    parser.add_argument('--output',
                        required=True,
                        help='Path of the Deprecation.ts to write')
    options = parser.parse_args(argv)

    contents = generate(*deprecations_from_file(options.input))
    output_dir = os.path.dirname(options.output)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    with open(options.output, 'w', encoding='utf-8', newline='\n') as f:
        f.write(contents)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
