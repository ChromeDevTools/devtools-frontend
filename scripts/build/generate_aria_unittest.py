#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Unit tests for generate_aria.py."""

import contextlib
import io
import json
import os
import tempfile
import textwrap
import unittest

import generate_aria

# Exercises what JSON5 allows on top of JSON: comments, unquoted keys,
# single quotes and trailing commas.
ARIA_PROPERTIES_JSON5 = """\
{
  // Metadata about the generated file.
  metadata: {
    namespace: 'ARIA',
    export: 'CORE_EXPORT',
  },
  attributes: [
    {
      name: 'aria-checked',
      type: 'token',
      enum: ['true', 'false', 'mixed', 'undefined'],
      default: 'undefined',
      supportedOnRoles: ['checkbox', 'menuitemcheckbox'],
    },
    {
      name: 'aria-label',
      type: 'string',
      isGlobal: true,
    },
  ],
  roles: [
    {
      name: 'checkbox',
      superclasses: ['input'],
      nameFrom: ['contents', 'author'],
      nameRequired: true,
      implicitValues: {'aria-checked': false},
    },
  ],
}
"""


class GenerateAriaTest(unittest.TestCase):

    def setUp(self):
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        self.input = os.path.join(tmpdir.name, 'aria_properties.json5')
        self.output = os.path.join(tmpdir.name, 'ARIAProperties.ts')
        with open(self.input, 'w', encoding='utf-8') as f:
            f.write(ARIA_PROPERTIES_JSON5)

    def generate(self):
        code = generate_aria.main(
            ['--input', self.input, '--output', self.output])
        self.assertEqual(code, 0)
        with open(self.output, 'rb') as f:
            return f.read().decode('utf-8')

    def test_writes_the_config_as_a_typed_constant(self):
        contents = self.generate()

        self.assertTrue(
            contents.startswith('// Copyright 2018 The Chromium Authors\n'))
        self.assertIn('export interface AriaConfig {\n', contents)
        prefix = 'export const config: AriaConfig = '
        self.assertIn(prefix, contents)
        self.assertTrue(contents.endswith(';\n'))

        # The constant is the JSON5 input as JSON, with sorted keys.
        config = contents[contents.index(prefix) + len(prefix):-len(';\n')]
        self.assertEqual(
            json.loads(config), {
                'metadata': {
                    'namespace': 'ARIA',
                    'export': 'CORE_EXPORT',
                },
                'attributes': [
                    {
                        'name': 'aria-checked',
                        'type': 'token',
                        'enum': ['true', 'false', 'mixed', 'undefined'],
                        'default': 'undefined',
                        'supportedOnRoles': ['checkbox', 'menuitemcheckbox'],
                    },
                    {
                        'name': 'aria-label',
                        'type': 'string',
                        'isGlobal': True,
                    },
                ],
                'roles': [{
                    'name': 'checkbox',
                    'superclasses': ['input'],
                    'nameFrom': ['contents', 'author'],
                    'nameRequired': True,
                    'implicitValues': {
                        'aria-checked': False
                    },
                }],
            })
        self.assertEqual(
            config.splitlines()[:3],
            ['{', ' "attributes": [', '  {'],
        )

    def test_output_is_deterministic_and_uses_lf_newlines(self):
        first = self.generate()
        second = self.generate()

        self.assertEqual(first, second)
        self.assertNotIn('\r', first)

    def test_always_rewrites_the_output(self):
        # Keeping the mtime of an unchanged output is run_with_restat.py's job,
        # so the generator must not skip the write itself.
        with open(self.output, 'w', encoding='utf-8') as f:
            f.write('stale')

        contents = self.generate()

        self.assertNotEqual(contents, 'stale')

    def test_requires_input_and_output(self):
        with contextlib.redirect_stderr(io.StringIO()) as stderr:
            with self.assertRaises(SystemExit) as cm:
                generate_aria.main(['--input', self.input])

        self.assertEqual(cm.exception.code, 2)
        self.assertIn('--output', stderr.getvalue())

    def test_rejects_invalid_json5(self):
        with open(self.input, 'w', encoding='utf-8') as f:
            f.write(
                textwrap.dedent('''\
                {
                  attributes: [
                '''))

        with self.assertRaises(ValueError):
            generate_aria.main(
                ['--input', self.input, '--output', self.output])
        self.assertFalse(os.path.exists(self.output))


if __name__ == '__main__':
    unittest.main()
