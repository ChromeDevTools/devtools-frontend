#!/usr/bin/env vpython3
# Copyright 2014 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import datetime
import json
import os
import sys
from os import path

PYJSON5_DIR = os.path.join(os.path.dirname(__file__), '..', '..',
                           'third_party', 'pyjson5', 'src')
sys.path.append(PYJSON5_DIR)

import json5  # pylint: disable=import-error

ROOT_DIRECTORY = path.join(path.dirname(__file__), '..', '..')
GENERATED_LOCATION = path.join(ROOT_DIRECTORY, 'front_end', 'generated',
                               'SupportedCSSProperties.js')
READ_LOCATION = path.join(ROOT_DIRECTORY, 'third_party', 'blink', 'renderer',
                          'core', 'css', 'css_properties.json5')


def _keep_only_required_keys(entry):
    for key in list(entry.keys()):
        if key not in ("name", "longhands", "svg", "inherited", "keywords"):
            del entry[key]
    return entry


def properties_from_file(file_name):
    with open(file_name) as json5_file:
        doc = json5.loads(json5_file.read())

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
        properties.append(_keep_only_required_keys(entry))
        property_names[entry["name"]] = entry
        if "keywords" in entry:
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


properties, property_values, aliases_for = properties_from_file(READ_LOCATION)
now = datetime.datetime.now()
with open(GENERATED_LOCATION, "w+") as f:
    f.write('// Copyright %d The Chromium Authors\n' % now.year)
    f.write(
        '// Use of this source code is governed by a BSD-style license that can be\n'
    )
    f.write('// found in the LICENSE file.\n')
    f.write('\n')
    f.write('/* eslint-disable @stylistic/quotes, @stylistic/quote-props */\n')
    f.write("export const generatedProperties = %s;\n" %
            json.dumps(properties, sort_keys=True, indent=1))
    # sort keys to ensure entries are generated in a deterministic way to avoid inconsistencies across different OS
    f.write("export const generatedPropertyValues = %s;\n" %
            json.dumps(property_values, sort_keys=True, indent=1))
    f.write("export const generatedAliasesFor = new Map(%s);\n" %
            json.dumps(aliases_for, sort_keys=True, indent=1))
