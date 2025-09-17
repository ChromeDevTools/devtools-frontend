#!/usr/bin/env vpython3
# Copyright 2011 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Creates a grd file for packaging the inspector files."""

import os
import shlex
import sys
from xml.dom import minidom

kDevToolsResourcePrefix = 'IDR_DEVTOOLS_'
kGrdTemplate = '''<?xml version="1.0" encoding="UTF-8"?>
<grit latest_public_release="0" current_release="1">
  <outputs>
    <output filename="grit/devtools_resources.h" type="rc_header">
      <emit emit_type='prepend'></emit>
    </output>
    <output filename="grit/devtools_resources_map.cc" type="resource_file_map_source" />
    <output filename="grit/devtools_resources_map.h" type="resource_map_header" />

    <output filename="devtools_resources.pak" type="data_package" />
  </outputs>
  <release seq="1">
    <includes>
      <include name="COMPRESSED_PROTOCOL_JSON" file="${protocol_file}" use_base_dir="false" compress="brotli" type="BINDATA" skip_in_resource_map = "true"/>
    </includes>
  </release>
</grit>
'''


class ParsedArgs:

    def __init__(self, file_list, output_filename, compress):
        self.file_list = file_list
        file_list_file = open(file_list, 'r')
        file_list_contents = file_list_file.read()
        self.source_files = shlex.split(file_list_contents)
        self.output_filename = output_filename
        self.compress = compress


def parse_args(argv):
    # The arguments are of the format:
    #   --file_list <input_file_list>
    #   --output <output_file>
    #   --compress
    file_list_position = argv.index('--file_list')
    output_position = argv.index('--output')
    file_list = argv[file_list_position + 1]
    compress = argv.count('--compress') > 0
    return ParsedArgs(file_list, argv[output_position + 1], compress)


def make_name_from_filename(filename):
    return (filename.replace('/', '_').replace('\\', '_').replace('-', '_').replace('.', '_')).upper()


def add_file_to_grd(grd_doc, relative_filename, compress):
    includes_node = grd_doc.getElementsByTagName('includes')[0]
    includes_node.appendChild(grd_doc.createTextNode('\n      '))

    ext = os.path.splitext(relative_filename)[1]
    new_include_node = grd_doc.createElement('include')
    if compress and ext in ['.css', '.html', '.js', '.svg', '.json', '.md']:
        new_include_node.setAttribute('file',
                                      relative_filename + '.compressed')
    else:
        new_include_node.setAttribute('file', relative_filename)

    new_include_node.setAttribute('name', make_name_from_filename(relative_filename))
    new_include_node.setAttribute('resource_path', relative_filename)
    new_include_node.setAttribute('type', 'BINDATA')
    new_include_node.setAttribute('compress', 'false')
    includes_node.appendChild(new_include_node)


def main(argv):
    parsed_args = parse_args(argv[1:])

    doc = minidom.parseString(kGrdTemplate)

    written_filenames = set()
    for filename in parsed_args.source_files:
        # Avoid writing duplicate relative filenames.
        if filename in written_filenames:
            raise Exception("Duplicate file detected: %s" % filename)
        written_filenames.add(filename)
        add_file_to_grd(doc, filename, parsed_args.compress)

    with open(parsed_args.output_filename, 'wb') as output_file:
        output_file.write(doc.toxml(encoding='UTF-8'))


if __name__ == '__main__':
    sys.exit(main(sys.argv))
