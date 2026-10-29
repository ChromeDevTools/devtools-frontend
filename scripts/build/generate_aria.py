#!/usr/bin/env vpython3
#
# Copyright 2018 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Generates ARIAProperties.ts from Blink's aria_properties.json5.

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
// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export interface AttributeConfig {
  default?: string;
  enum?: string[];
  isGlobal?: boolean;
  name: string;
  preventedOnRoles?: string[];
  supportedOnRoles?: string[];
  type: string;
}

export interface RoleConfig {
  abstract?: boolean;
  childrenPresentational?: boolean;
  deprecated?: boolean;
  implicitValues?: Record<string, string | boolean>;
  internalRoles?: string[];
  mustContain?: string[];
  name: string;
  nameFrom?: string[];
  nameRequired?: boolean;
  requiredAttributes?: string[];
  scope?: string | string[];
  superclasses?: string[];
}

export interface AriaMetadata {
  attrsNullNamespace?: boolean;
  export?: string;
  namespace?: string;
  namespacePrefix?: string;
  namespaceURI?: string;
}

export interface AriaConfig {
  attributes: AttributeConfig[];
  metadata?: AriaMetadata;
  roles: RoleConfig[];
}

'''


def properties_from_file(file_name):
    with open(file_name, encoding='utf-8') as json5_file:
        return json5.loads(json5_file.read())


def generate(properties):
    """Returns the contents of ARIAProperties.ts for the parsed JSON5."""
    return HEADER + 'export const config: AriaConfig = %s;\n' % json.dumps(
        properties, sort_keys=True, indent=1)


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--input',
                        required=True,
                        help='Path to aria_properties.json5')
    parser.add_argument('--output',
                        required=True,
                        help='Path of the ARIAProperties.ts to write')
    options = parser.parse_args(argv)

    contents = generate(properties_from_file(options.input))
    with open(options.output, 'w', encoding='utf-8', newline='\n') as f:
        f.write(contents)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
