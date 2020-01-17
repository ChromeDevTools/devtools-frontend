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

import json
import os
import sys

PYJSON5_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'third_party', 'pyjson5', 'src')
sys.path.append(PYJSON5_DIR)

import json5  # pylint: disable=import-error


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
    for entry in doc["data"]:
        if type(entry) is str:
            entry = {"name": entry}
        if "alias_for" in entry:
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

    return properties, property_values


properties, property_values = properties_from_file(sys.argv[1])
with open(sys.argv[2], "w") as f:
    f.write("export const generatedProperties = %s;\n" % json.dumps(properties))
    f.write("export const generatedPropertyValues = %s;" % json.dumps(property_values))
