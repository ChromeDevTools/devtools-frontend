#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Unit tests for generate_deprecations.py."""

import contextlib
import io
import json
import os
import tempfile
import textwrap
import unittest
from unittest import mock

import generate_deprecations

DEPRECATION_JSON5 = """\
{
  // Sample Blink deprecation definitions.
  data: [
    {
      name: "FeatureWithAllMetadata",
      message: "Use `NewAPI` instead of \\"OldAPI\\".",
      translation_note: "Warning shown when OldAPI is called.",
      web_features: ["kOldAPI"],
      milestone: 130,
      chrome_status_feature: 123456789,
    },
    {
      name: "FeatureWithoutMetadata",
      message: "Plain deprecation message.",
      translation_note: "Warning shown for plain feature.",
      web_features: [],
    },
    {
      name: "ObsoleteFeature",
      message: "Already removed.",
      translation_note: "Not needed.",
      obsolete_to_be_removed_after_milestone: 120,
    },
  ],
}
"""


class GenerateDeprecationsTest(unittest.TestCase):

    def setUp(self):
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        self.tmpdir = tmpdir.name
        self.input = os.path.join(tmpdir.name, 'deprecation.json5')
        self.output = os.path.join(tmpdir.name, 'Deprecation.ts')
        with open(self.input, 'w', encoding='utf-8') as f:
            f.write(DEPRECATION_JSON5)

    def generate(self, output_path=None):
        target = output_path or self.output
        code = generate_deprecations.main(
            ['--input', self.input, '--output', target])
        self.assertEqual(code, 0)
        with open(target, 'rb') as f:
            return f.read().decode('utf-8')

    def test_writes_ui_strings_and_metadata(self):
        contents = self.generate()

        self.assertTrue(
            contents.startswith('// Copyright 2023 The Chromium Authors\n'))
        self.assertIn(
            '  /**\n'
            '   * @description Warning shown when OldAPI is called.\n'
            '   */\n'
            '  FeatureWithAllMetadata: "Use `NewAPI` instead of \\"OldAPI\\".",\n',
            contents)
        self.assertIn(
            '  /**\n'
            '   * @description Warning shown for plain feature.\n'
            '   */\n'
            '  FeatureWithoutMetadata: "Plain deprecation message.",\n',
            contents)
        self.assertNotIn('ObsoleteFeature', contents)

        prefix = ('export const DEPRECATIONS_METADATA: '
                  'Partial<Record<string, DeprecationDescriptor>> = ')
        self.assertIn(prefix, contents)
        self.assertTrue(contents.endswith(';\n'))
        metadata = contents[contents.index(prefix) + len(prefix):-len(';\n')]
        self.assertEqual(
            json.loads(metadata), {
                'FeatureWithAllMetadata': {
                    'chromeStatusFeature': 123456789,
                    'milestone': 130,
                },
            })

    def test_skips_exempted_deprecations(self):
        with mock.patch.object(generate_deprecations,
                               'EXEMPTED_FROM_DEVTOOLS_GENERATION',
                               {'FeatureWithoutMetadata'}):
            contents = self.generate()

        self.assertIn('FeatureWithAllMetadata', contents)
        self.assertNotIn('FeatureWithoutMetadata', contents)

    def test_output_is_deterministic_and_uses_lf_newlines(self):
        first = self.generate()
        second = self.generate()

        self.assertEqual(first, second)
        self.assertNotIn('\r', first)

    def test_always_rewrites_the_output(self):
        with open(self.output, 'w', encoding='utf-8') as f:
            f.write('stale')

        contents = self.generate()

        self.assertNotEqual(contents, 'stale')

    def test_creates_missing_output_parent_directories(self):
        nested_output = os.path.join(self.tmpdir, 'nested', 'generated',
                                     'Deprecation.ts')

        contents = self.generate(output_path=nested_output)

        self.assertIn('export const UIStrings = {', contents)

    def test_requires_input_and_output(self):
        with contextlib.redirect_stderr(io.StringIO()) as stderr:
            with self.assertRaises(SystemExit) as cm:
                generate_deprecations.main(['--input', self.input])

        self.assertEqual(cm.exception.code, 2)
        self.assertIn('--output', stderr.getvalue())

    def test_rejects_invalid_json5(self):
        with open(self.input, 'w', encoding='utf-8') as f:
            f.write(
                textwrap.dedent('''\
                {
                  data: [
                '''))

        with self.assertRaises(ValueError):
            generate_deprecations.main(
                ['--input', self.input, '--output', self.output])
        self.assertFalse(os.path.exists(self.output))


if __name__ == '__main__':
    unittest.main()
