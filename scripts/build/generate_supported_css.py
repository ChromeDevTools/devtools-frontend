#!/usr/bin/env vpython3
# Copyright 2014 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Generates SupportedCSSProperties.ts from Blink's css_properties.json5.

Runs as a generated_ts() action (see front_end/generated/BUILD.gn) and always
writes its output: scripts/build/run_with_restat.py keeps the mtime of an
output that did not change.
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
// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export interface CSSProperty {
  name: string;
  longhands?: string[];
  inherited?: boolean;
  svg?: boolean;
  keywords?: string[];
  devtools_keywords?: string[];
  is_property?: boolean;
  is_descriptor?: boolean;
  runtime_flag?: string;
  runtime_flag_status?: string | null;
}

export interface CSSPropertyValue {
  values: string[];
}

'''


def _keep_only_required_keys(entry):
    for key in list(entry.keys()):
        if key not in ("name", "longhands", "svg", "inherited", "keywords",
                       "is_property", "is_descriptor", "runtime_flag",
                       "runtime_flag_status", "devtools_keywords"):
            del entry[key]
    return entry


def _load_json5(file_name):
    with open(file_name, encoding='utf-8') as json5_file:
        return json5.loads(json5_file.read())


def properties_from_file(css_properties_file, runtime_enabled_features_file):
    """Returns (properties, property_values, aliases_for) for the JSON5 files.

    properties: the non-internal CSS properties, sorted by name, with their
        longhands filtered down to supported ones and `inherited` set on
        shorthands whose longhands are all inherited.
    property_values: the keyword values per property name.
    aliases_for: [alias, property] pairs, sorted by alias.
    """
    doc = _load_json5(css_properties_file)
    runtime_features_data = _load_json5(runtime_enabled_features_file)

    # Create a map for easy lookup of feature status
    runtime_features_map = {
        item['name']: item.get('status')
        for item in runtime_features_data['data']
    }

    properties = []
    property_names = {}
    property_values = {}
    affected_by_all = set()
    aliases_for = []
    for entry in doc["data"]:
        if type(entry) is str:
            entry = {"name": entry}
        if "alias_for" in entry:
            aliases_for.append([entry["name"], entry["alias_for"]])
            continue
        # Filter out internal properties.
        if entry["name"].startswith("-internal-"):
            continue
        # affected_by_all defaults to True if missing
        if "affected_by_all" not in entry or entry["affected_by_all"]:
            if not 'longhands' in entry:
                affected_by_all.add(entry['name'])
        if "runtime_flag" in entry and entry[
                "runtime_flag"] in runtime_features_map:
            status = runtime_features_map[entry["runtime_flag"]]
            entry["runtime_flag_status"] = status
        properties.append(_keep_only_required_keys(entry))
        property_names[entry["name"]] = entry
        # If devtools_keywords is specified, it is given precedence over keywords.
        # This is because there might be values in keywords which are actually not
        # supported in the browser yet (e.g. due to experimental flags).
        if "devtools_keywords" in entry:
            devtools_keywords = [
                keyword for keyword in entry["devtools_keywords"]
                if not keyword.startswith("-internal-")
            ]
            property_values[entry["name"]] = {"values": devtools_keywords}
        elif "keywords" in entry:
            keywords = [
                keyword for keyword in entry["keywords"]
                if not keyword.startswith("-internal-")
            ]
            property_values[entry["name"]] = {"values": keywords}

    properties.sort(key=lambda entry: entry["name"])
    aliases_for.sort(key=lambda entry: entry[0])

    # Filter out unsupported longhands.
    for property in properties:
        longhands = property.get("longhands")
        if not longhands:
            if property['name'] != 'all':
                continue
            longhands = list(sorted(affected_by_all))
        if type(longhands) is str:
            longhands = longhands.split(";")
        longhands = [
            longhand for longhand in longhands if longhand in property_names
        ]
        if not longhands:
            del property["longhands"]
        else:
            property["longhands"] = longhands
        all_inherited = True
        for longhand in longhands:
            longhand_property = property_names[longhand]
            all_inherited = all_inherited and (
                "inherited"
                in longhand_property) and longhand_property["inherited"]
        if all_inherited:
            property["inherited"] = True

    return properties, property_values, aliases_for


def generate(properties, property_values, aliases_for):
    """Returns the contents of SupportedCSSProperties.ts."""
    # sort keys to ensure entries are generated in a deterministic way to
    # avoid inconsistencies across different OS
    return HEADER + (
        'export const generatedProperties: CSSProperty[] = %s;\n' %
        json.dumps(properties, sort_keys=True, indent=1) +
        'export const generatedPropertyValues: Record<string, CSSPropertyValue> = %s;\n'
        % json.dumps(property_values, sort_keys=True, indent=1) +
        'export const generatedAliasesFor: Map<string, string> = new Map(%s);\n'
        % json.dumps(aliases_for, sort_keys=True, indent=1))


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--css-properties',
                        required=True,
                        help='Path to css_properties.json5')
    parser.add_argument('--runtime-enabled-features',
                        required=True,
                        help='Path to runtime_enabled_features.json5')
    parser.add_argument('--output',
                        required=True,
                        help='Path of the SupportedCSSProperties.ts to write')
    options = parser.parse_args(argv)

    contents = generate(*properties_from_file(
        options.css_properties, options.runtime_enabled_features))
    with open(options.output, 'w', encoding='utf-8', newline='\n') as f:
        f.write(contents)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
