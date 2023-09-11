#!/usr/bin/env vpython3
# Copyright (c) 2011 Google Inc. All rights reserved.
# Copyright (c) 2012 Intel Corporation. All rights reserved.
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

import sys
import string
import re
from os import path

try:
    import json
except ImportError:
    import simplejson as json

ROOT_DIRECTORY = path.join(path.dirname(__file__), '..', '..')
GENERATED_LOCATION = path.join(ROOT_DIRECTORY, 'front_end', 'generated', 'InspectorBackendCommands.js')
READ_LOCATION = path.join(ROOT_DIRECTORY, 'third_party', 'blink', 'public', 'devtools_protocol', 'browser_protocol.json')


def fix_camel_case(name):
    prefix = ""
    if name[0] == "-":
        prefix = "Negative"
        name = name[1:]
    refined = re.sub(r'-(\w)', lambda pat: pat.group(1).upper(), name)
    refined = to_title_case(refined)
    return prefix + re.sub(r'(?i)HTML|XML|WML|API', lambda pat: pat.group(0).upper(), refined)


def to_title_case(name):
    return name[:1].upper() + name[1:]


class RawTypes(object):

    @staticmethod
    def get_js(json_type):
        if json_type == "boolean":
            return "boolean"
        elif json_type == "string":
            return "string"
        elif json_type == "binary":
            return "string"
        elif json_type == "array":
            return "array"
        elif json_type == "object":
            return "object"
        elif json_type == "integer":
            return "number"
        elif json_type == "number":
            return "number"
        elif json_type == "any":
            # Some rare types like AXValue.value have "any" type in the browser_protocol.pdl file
            # Raising an exception would then cause the script to stop.
            return "any"
        else:
            raise Exception("Unknown type: %s" % json_type)


class TypeData(object):

    def __init__(self, json_type):
        if "type" not in json_type:
            raise Exception("Unknown type")
        json_type_name = json_type["type"]
        self.raw_type_js_ = RawTypes.get_js(json_type_name)

    def get_raw_type_js(self):
        return self.raw_type_js_


class TypeMap:

    def __init__(self, api):
        self.map_ = {}
        for json_domain in api["domains"]:
            domain_name = json_domain["domain"]

            domain_map = {}
            self.map_[domain_name] = domain_map

            if "types" in json_domain:
                for json_type in json_domain["types"]:
                    type_name = json_type["id"]
                    type_data = TypeData(json_type)
                    domain_map[type_name] = type_data

    def get(self, domain_name, type_name):
        return self.map_[domain_name][type_name]


def resolve_param_raw_type_js(json_parameter, scope_domain_name):
    if "$ref" in json_parameter:
        json_ref = json_parameter["$ref"]
        return get_ref_data_js(json_ref, scope_domain_name)
    elif "type" in json_parameter:
        json_type = json_parameter["type"]
        return RawTypes.get_js(json_type)
    else:
        raise Exception("Unknown type")


def get_ref_data_js(json_ref, scope_domain_name):
    dot_pos = json_ref.find(".")
    if dot_pos == -1:
        domain_name = scope_domain_name
        type_name = json_ref
    else:
        domain_name = json_ref[:dot_pos]
        type_name = json_ref[dot_pos + 1:]

    return type_map.get(domain_name, type_name).get_raw_type_js()


input_file = open(READ_LOCATION, "r")
json_string = input_file.read()
json_api = json.loads(json_string)


class Templates:

    def get_this_script_path_(absolute_path):
        absolute_path = path.abspath(absolute_path)
        components = []

        def fill_recursive(path_part, depth):
            if depth <= 0 or path_part == '/':
                return
            fill_recursive(path.dirname(path_part), depth - 1)
            components.append(path.basename(path_part))

        # Typical path is either
        # .../devtools-frontend/scripts/build/code_generator_frontend.py
        # in a standalone checkout or
        # .../src/scripts/build/code_generator_frontend.py
        # inside of a chromium checkout. Let's take 3 components from the real
        # path then.
        fill_recursive(absolute_path, 3)

        return "/".join(components)

    file_header_ = (
        """// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
""" + "// File is generated by %s\n" % get_this_script_path_(sys.argv[0]) + """
/**
 * @typedef {{
 *  registerCommand: function(
 *      string&any,
 *      !Array.<!{
 *          name: string,
 *          type: string,
 *          optional: boolean,
 *          description: string,
 *          typeRef: string | null
 *      }>,
 *      !Array.<string>,
 *      string
 *  ): void,
 *  registerEnum: function(string&any, !Object<string, string>): void,
 *  registerEvent: function(string&any, !Array<string>): void,
 *  registerType: function(
 *      string&any,
 *      !Array.<!{
 *          name: string,
 *          type: string,
 *          optional: boolean,
 *          description: string,
 *          typeRef: string | null
 *      }>
 *  ): void,
 * }}
 */
// @ts-ignore typedef
export let InspectorBackendAPI;

/**
 * @param {!InspectorBackendAPI} inspectorBackend
 */
export function registerCommands(inspectorBackend) {
""")

    backend_js = string.Template(file_header_ + """

$domainInitializers
}
""")


type_map = TypeMap(json_api)


class Generator:
    backend_js_domain_initializer_list = []

    @staticmethod
    def go():
        for json_domain in json_api["domains"]:
            domain_name = json_domain["domain"]
            domain_name_lower = domain_name.lower()
            if domain_name_lower == "console":
                continue

            Generator.backend_js_domain_initializer_list.append("// %s.\n" % domain_name)

            if "types" in json_domain:
                for json_type in json_domain["types"]:
                    if "type" in json_type and json_type["type"] == "string" and "enum" in json_type:
                        enum_name = "%s.%s" % (domain_name, json_type["id"])
                        Generator.process_enum(json_type, enum_name)
                    elif json_type["type"] == "object":
                        if "properties" in json_type:
                            for json_property in json_type["properties"]:
                                if "type" in json_property and json_property["type"] == "string" and "enum" in json_property:
                                    enum_name = "%s.%s%s" % (domain_name, json_type["id"], to_title_case(json_property["name"]))
                                    Generator.process_enum(json_property, enum_name)

            if "events" in json_domain:
                for json_event in json_domain["events"]:
                    if "parameters" in json_event:
                        for param in json_event["parameters"]:
                            if "enum" in param:
                                enum_name = "%s.%sEvent%s" % (
                                    domain_name,
                                    to_title_case(json_event["name"]),
                                    to_title_case(param["name"]))
                                Generator.process_enum(param, enum_name)
                    Generator.process_event(json_event, domain_name)

            if "commands" in json_domain:
                for json_command in json_domain["commands"]:
                    if "parameters" in json_command:
                        for param in json_command["parameters"]:
                            if "enum" in param:
                                enum_name = "%s.%sRequest%s" % (
                                    domain_name,
                                    to_title_case(json_command["name"]),
                                    to_title_case(param["name"]))
                                Generator.process_enum(param, enum_name)
                    Generator.process_command(json_command, domain_name)

            if "types" in json_domain:
                for json_type in json_domain["types"]:
                    if json_type[
                            "type"] == "object" and "properties" in json_type:
                        Generator.process_type(json_type["properties"],
                                               domain_name, json_type["id"])
                    elif json_type["type"] == "array":
                        Generator.process_type([json_type], domain_name,
                                               json_type["id"])

            Generator.backend_js_domain_initializer_list.append("\n")

    @staticmethod
    def process_enum(json_enum, enum_name):
        enum_members = []
        for member in json_enum["enum"]:
            enum_members.append("%s: \"%s\"" % (fix_camel_case(member), member))

        Generator.backend_js_domain_initializer_list.append(
            "inspectorBackend.registerEnum(\"%s\", {%s});\n" % (enum_name, ", ".join(enum_members)))

    @staticmethod
    def process_event(json_event, domain_name):
        event_name = json_event["name"]

        json_parameters = json_event.get("parameters")

        backend_js_event_param_list = []
        if json_parameters:
            for parameter in json_parameters:
                parameter_name = parameter["name"]
                backend_js_event_param_list.append("\"%s\"" % parameter_name)

        Generator.backend_js_domain_initializer_list.append("inspectorBackend.registerEvent(\"%s.%s\", [%s]);\n" %
                                                            (domain_name, event_name, ", ".join(backend_js_event_param_list)))

    @staticmethod
    def format_description(description):
        description = description.replace('\r\n',
                                          ' ').replace('\r',
                                                       ' ').replace('\n', ' ')
        description = description.replace('"', '\\"')
        return description

    @staticmethod
    def convert_json_parameter(json_parameter, domain_name, enum_name):
        json_param_name = json_parameter.get("name") or json_parameter["id"]
        json_param_description = json_param_description = Generator.format_description(
            json_parameter.get("description", ""))

        type_ref = json_parameter.get("$ref")
        if type_ref:
            type_ref = type_ref if '.' in type_ref else "%s.%s" % (domain_name,
                                                                   type_ref)
        json_ref = ""
        js_bind_type = resolve_param_raw_type_js(json_parameter, domain_name)

        if js_bind_type == "array" and 'items' in json_parameter:
            if '$ref' in json_parameter['items']:
                json_ref = json_parameter['items']['$ref']
                type_ref = json_ref if '.' in json_ref else "%s.%s" % (
                    domain_name, json_ref)
            elif 'type' in json_parameter['items']:
                type_ref = json_parameter['items']['type']

        if js_bind_type == "object" and "$ref" in json_parameter:
            json_ref = json_parameter["$ref"]
            type_ref = json_ref if '.' in json_ref else "%s.%s" % (domain_name,
                                                                   json_ref)

        if (json_parameter.get("enum") and enum_name):
            type_ref = enum_name

        optional = json_parameter.get("optional", False)
        param_dict = {
            "name": json_param_name,
            "type": js_bind_type,
            "optional": optional,
            "description": json_param_description,
            "typeRef": type_ref
        }
        js_param_text = json.dumps(param_dict)

        return js_param_text

    @staticmethod
    def process_type(json_type, domain_name, type_id):
        js_param_list = []
        for json_parameter in json_type:
            js_param_text = Generator.convert_json_parameter(
                json_parameter, domain_name, None)
            js_param_list.append(js_param_text)

        js_parameters_text = ", ".join(js_param_list)

        Generator.backend_js_domain_initializer_list.append(
            "inspectorBackend.registerType(\"%s.%s\", [%s]);\n" % (
                domain_name,
                type_id,
                js_parameters_text,
            ))

    @staticmethod
    def process_command(json_command, domain_name):
        json_command_name = json_command["name"]
        json_command_description = json_command.get("description", "")
        js_parameters_text = ""
        if "parameters" in json_command:
            json_params = json_command["parameters"]
            js_param_list = []
            enum_name = None
            for json_parameter in json_params:
                if "enum" in json_parameter:
                    enum_name = "%s.%sRequest%s" % (
                        domain_name, to_title_case(json_command["name"]),
                        to_title_case(json_parameter["name"]))
                js_param_text = Generator.convert_json_parameter(
                    json_parameter, domain_name, enum_name)
                js_param_list.append(js_param_text)

            js_parameters_text = ", ".join(js_param_list)

        backend_js_reply_param_list = []
        if "returns" in json_command:
            for json_return in json_command["returns"]:
                json_return_name = json_return["name"]
                backend_js_reply_param_list.append("\"%s\"" % json_return_name)

        js_reply_list = "[%s]" % ", ".join(backend_js_reply_param_list)
        json_command_description = Generator.format_description(
            json_command_description)
        Generator.backend_js_domain_initializer_list.append(
            "inspectorBackend.registerCommand(\"%s.%s\", [%s], %s, \"%s\");\n"
            % (domain_name, json_command_name, js_parameters_text,
               js_reply_list, json_command_description))


Generator.go()

backend_js_file = open(GENERATED_LOCATION, "w+")

backend_js_file.write(
    Templates.backend_js.substitute(None, domainInitializers="".join(Generator.backend_js_domain_initializer_list)))

backend_js_file.close()
