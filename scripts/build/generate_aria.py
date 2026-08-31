#!/usr/bin/env vpython3
#
# Copyright 2018 The Chromium Authors
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
                               'ARIAProperties.ts')
READ_LOCATION = path.join(ROOT_DIRECTORY, 'third_party', 'blink', 'renderer',
                          'core', 'html', 'aria_properties.json5')


def properties_from_file(file_name):
    with open(os.path.abspath(file_name)) as json5_file:
        properties = json5.loads(json5_file.read())
        return properties


ARIA_PROPERTIES = properties_from_file(READ_LOCATION)
now = datetime.datetime.now()
with open(GENERATED_LOCATION, "w+", newline='\n') as f:
    f.write('// Copyright %d The Chromium Authors\n' % now.year)
    f.write(
        '// Use of this source code is governed by a BSD-style license that can be\n'
    )
    f.write('// found in the LICENSE file.\n')
    f.write('export interface AttributeConfig {\n')
    f.write('  default?: string;\n')
    f.write('  enum?: string[];\n')
    f.write('  isGlobal?: boolean;\n')
    f.write('  name: string;\n')
    f.write('  preventedOnRoles?: string[];\n')
    f.write('  supportedOnRoles?: string[];\n')
    f.write('  type: string;\n')
    f.write('}\n\n')
    f.write('export interface RoleConfig {\n')
    f.write('  abstract?: boolean;\n')
    f.write('  childrenPresentational?: boolean;\n')
    f.write('  deprecated?: boolean;\n')
    f.write('  implicitValues?: Record<string, string | boolean>;\n')
    f.write('  internalRoles?: string[];\n')
    f.write('  mustContain?: string[];\n')
    f.write('  name: string;\n')
    f.write('  nameFrom?: string[];\n')
    f.write('  nameRequired?: boolean;\n')
    f.write('  requiredAttributes?: string[];\n')
    f.write('  scope?: string | string[];\n')
    f.write('  superclasses?: string[];\n')
    f.write('}\n\n')
    f.write('export interface AriaMetadata {\n')
    f.write('  attrsNullNamespace?: boolean;\n')
    f.write('  export?: string;\n')
    f.write('  namespace?: string;\n')
    f.write('  namespacePrefix?: string;\n')
    f.write('  namespaceURI?: string;\n')
    f.write('}\n\n')
    f.write('export interface AriaConfig {\n')
    f.write('  attributes: AttributeConfig[];\n')
    f.write('  metadata?: AriaMetadata;\n')
    f.write('  roles: RoleConfig[];\n')
    f.write('}\n\n')
    f.write("export const config: AriaConfig = %s;\n" %
            json.dumps(ARIA_PROPERTIES, sort_keys=True, indent=1))
