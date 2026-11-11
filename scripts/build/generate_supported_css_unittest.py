#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Unit tests for generate_supported_css.py."""

import contextlib
import io
import json
import os
import tempfile
import unittest

import generate_supported_css

CSS_PROPERTIES_JSON5 = """\
{
  data: [
    // A shorthand; one of its longhands is internal and dropped.
    {
      name: "margin",
      longhands: ["margin-top", "margin-bottom", "-internal-margin"],
      affected_by_all: false,
    },
    {name: "margin-top", inherited: false, keywords: ["auto"], field_group: "*"},
    {
      name: "margin-bottom",
      keywords: ["auto", "-internal-keyword"],
      devtools_keywords: ["auto", "fit-content"],
    },
    // Longhands as a ;-separated string, all inherited.
    {name: "border-spacing", longhands: "border-spacing-x;border-spacing-y"},
    {name: "border-spacing-x", inherited: true},
    {name: "border-spacing-y", inherited: true},
    // A plain string entry.
    "color",
    {name: "-internal-visited-color"},
    {name: "-webkit-margin-top", alias_for: "margin-top"},
    {name: "accent-color", runtime_flag: "AccentColor"},
    {name: "anchor-name", runtime_flag: "NotInRuntimeFeatures"},
    {name: "all", affected_by_all: false},
  ],
}
"""

RUNTIME_ENABLED_FEATURES_JSON5 = """\
{
  data: [
    {name: "AccentColor", status: "stable"},
    {name: "Unrelated"},
  ],
}
"""


class GenerateSupportedCssTest(unittest.TestCase):

    def setUp(self):
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        self.css_properties = os.path.join(tmpdir.name, 'css_properties.json5')
        self.runtime_enabled_features = os.path.join(
            tmpdir.name, 'runtime_enabled_features.json5')
        self.output = os.path.join(tmpdir.name, 'SupportedCSSProperties.ts')
        with open(self.css_properties, 'w', encoding='utf-8') as f:
            f.write(CSS_PROPERTIES_JSON5)
        with open(self.runtime_enabled_features, 'w', encoding='utf-8') as f:
            f.write(RUNTIME_ENABLED_FEATURES_JSON5)

    def generate(self):
        code = generate_supported_css.main([
            '--css-properties', self.css_properties,
            '--runtime-enabled-features', self.runtime_enabled_features,
            '--output', self.output
        ])
        self.assertEqual(code, 0)
        with open(self.output, 'rb') as f:
            return f.read().decode('utf-8')

    def parse_export(self, contents, name):
        """Returns the JSON value of `export const <name>... = <json>;`."""
        start = contents.index('export const %s' % name)
        start = contents.index('= ', start) + len('= ')
        end = contents.index(';\n', start)
        value = contents[start:end]
        if value.startswith('new Map('):
            value = value[len('new Map('):-len(')')]
        return json.loads(value)

    def test_properties(self):
        contents = self.generate()

        properties = self.parse_export(contents, 'generatedProperties')
        # Sorted by name; internal properties and aliases are left out.
        self.assertEqual(
            properties,
            [
                {
                    'name': 'accent-color',
                    'runtime_flag': 'AccentColor',
                    'runtime_flag_status': 'stable',
                },
                # "all" expands to every property without longhands that is
                # affected by it.
                {
                    'longhands': [
                        'accent-color',
                        'anchor-name',
                        'border-spacing-x',
                        'border-spacing-y',
                        'color',
                        'margin-bottom',
                        'margin-top',
                    ],
                    'name':
                    'all',
                },
                # An unknown runtime flag gets no status.
                {
                    'name': 'anchor-name',
                    'runtime_flag': 'NotInRuntimeFeatures',
                },
                # All longhands are inherited, so the shorthand is too.
                {
                    'inherited': True,
                    'longhands': ['border-spacing-x', 'border-spacing-y'],
                    'name': 'border-spacing',
                },
                {
                    'inherited': True,
                    'name': 'border-spacing-x',
                },
                {
                    'inherited': True,
                    'name': 'border-spacing-y',
                },
                {
                    'name': 'color',
                },
                # Internal longhands are dropped, unknown keys like field_group
                # too. margin-top is not inherited, so margin is not either.
                {
                    'longhands': ['margin-top', 'margin-bottom'],
                    'name': 'margin',
                },
                {
                    'devtools_keywords': ['auto', 'fit-content'],
                    'keywords': ['auto', '-internal-keyword'],
                    'name': 'margin-bottom',
                },
                {
                    'inherited': False,
                    'keywords': ['auto'],
                    'name': 'margin-top',
                },
            ])

    def test_property_values_prefer_devtools_keywords(self):
        contents = self.generate()

        self.assertEqual(
            self.parse_export(contents, 'generatedPropertyValues'), {
                'margin-top': {
                    'values': ['auto']
                },
                'margin-bottom': {
                    'values': ['auto', 'fit-content']
                },
            })

    def test_aliases(self):
        contents = self.generate()

        self.assertEqual(self.parse_export(contents, 'generatedAliasesFor'),
                         [['-webkit-margin-top', 'margin-top']])

    def test_output_shape_is_deterministic_with_lf_newlines(self):
        first = self.generate()
        second = self.generate()

        self.assertEqual(first, second)
        self.assertNotIn('\r', first)
        self.assertTrue(
            first.startswith('// Copyright 2014 The Chromium Authors\n'))
        self.assertIn('export interface CSSProperty {\n', first)
        self.assertIn('export interface CSSPropertyValue {\n', first)
        self.assertTrue(first.endswith(');\n'))

    def test_always_rewrites_the_output(self):
        # Keeping the mtime of an unchanged output is run_with_restat.py's job,
        # so the generator must not skip the write itself.
        with open(self.output, 'w', encoding='utf-8') as f:
            f.write('stale')

        self.assertNotEqual(self.generate(), 'stale')

    def test_requires_all_paths(self):
        with contextlib.redirect_stderr(io.StringIO()) as stderr:
            with self.assertRaises(SystemExit) as cm:
                generate_supported_css.main(
                    ['--css-properties', self.css_properties])

        self.assertEqual(cm.exception.code, 2)
        self.assertIn('--runtime-enabled-features', stderr.getvalue())
        self.assertIn('--output', stderr.getvalue())


if __name__ == '__main__':
    unittest.main()
