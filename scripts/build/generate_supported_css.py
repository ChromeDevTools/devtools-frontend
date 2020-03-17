#!/usr/bin/env python
# Copyright (c) 2014 Google Inc. All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are
# met:
#
#     * Redistributions of source code must retain the above copyright
# notice, this list of conditions and the following disclaimer.
#     * Redistributions in binary form must reproduce the above
# copyright notice, this list of conditions and the following disclaimer
# in the documentation and/or other materials provided with the
# distribution.
#     * Neither the name of Google Inc. nor the names of its
# contributors may be used to endorse or promote products derived from
# this software without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
# A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
# OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
# LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
# DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
# THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

import datetime
import json
import os
import sys
from os import path

PYJSON5_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'third_party', 'pyjson5', 'src')
sys.path.append(PYJSON5_DIR)

import json5  # pylint: disable=import-error

ROOT_DIRECTORY = path.join(path.dirname(__file__), '..', '..')
GENERATED_LOCATION = path.join(ROOT_DIRECTORY, 'front_end', 'generated', 'SupportedCSSProperties.js')
READ_LOCATION = path.join(ROOT_DIRECTORY, 'third_party', 'blink', 'renderer', 'core', 'css', 'css_properties.json5')


def _keep_only_required_keys(entry):
    for key in entry.keys():
        if key not in ("name", "longhands", "svg", "inherited", "keywords"):
            del entry[key]
    return entry


def properties_from_file(file_name):
    with open(file_name) as json5_file:
        doc = json5.loads(json5_file.read())

    properties = []
    property_names = {}
    property_values = {}
    aliases_for = {}
    for entry in doc["data"]:
        if type(entry) is str:
            entry = {"name": entry}
        if "alias_for" in entry:
            aliases_for[entry["name"]] = entry["alias_for"]
            continue
        properties.append(_keep_only_required_keys(entry))
        property_names[entry["name"]] = entry
        if "keywords" in entry:
            property_values[entry["name"]] = {"values": entry["keywords"]}

    properties.sort(key=lambda entry: entry["name"])

    # Filter out unsupported longhands.
    for property in properties:
        longhands = property.get("longhands")
        if not longhands:
            continue
        if type(longhands) is str:
            longhands = longhands.split(";")
        longhands = [longhand for longhand in longhands if longhand in property_names]
        if not longhands:
            del property["longhands"]
        else:
            property["longhands"] = longhands
        all_inherited = True
        for longhand in longhands:
            longhand_property = property_names[longhand]
            all_inherited = all_inherited and ("inherited" in longhand_property) and longhand_property["inherited"]
        if all_inherited:
            property["inherited"] = True

    return properties, property_values, aliases_for


properties, property_values, aliases_for = properties_from_file(READ_LOCATION)
now = datetime.datetime.now()
with open(GENERATED_LOCATION, "w+") as f:
    f.write('// Copyright %d The Chromium Authors. All rights reserved.\n' % now.year)
    f.write('// Use of this source code is governed by a BSD-style license that can be\n')
    f.write('// found in the LICENSE file.\n')
    f.write('\n')
    f.write("export const generatedProperties = %s;\n" % json.dumps(properties))
    # sort keys to ensure entries are generated in a deterministic way to avoid inconsistencies across different OS
    f.write("export const generatedPropertyValues = %s;\n" % json.dumps(property_values, sort_keys=True))
    f.write("export const generatedAliasesFor = new Map(Object.entries(%s));\n" % json.dumps(aliases_for, sort_keys=True))
