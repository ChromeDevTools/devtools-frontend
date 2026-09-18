#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Unit tests for get_cl_test_results.py and update_goldens.py helpers."""

import os
import re
import tempfile
import unittest
from unittest import mock

import get_cl_test_results
import update_goldens


class GetClTestResultsTest(unittest.TestCase):

    def test_project_config_matches_rel_and_dbg(self):
        config = update_goldens.ProjectConfig(platforms=['linux'],
                                              builder_prefix='dtf')
        self.assertTrue(re.fullmatch(config.builder_pattern, 'dtf_linux_rel'))
        self.assertTrue(re.fullmatch(config.builder_pattern, 'dtf_linux_dbg'))
        self.assertFalse(re.fullmatch(config.builder_pattern, 'dtf_mac_rel'))

    def test_filter_last_results_prefers_newer_patch_and_id(self):
        builds = [
            {
                'id':
                '100',
                'status':
                'FAILURE',
                'builder': {
                    'builder': 'dtf_linux_dbg'
                },
                'tags': [{
                    'key': 'buildset',
                    'value': 'patch/gerrit/host/8420741/7'
                }],
            },
            {
                'id':
                '90',
                'status':
                'SUCCESS',
                'builder': {
                    'builder': 'dtf_linux_dbg'
                },
                'tags': [{
                    'key': 'buildset',
                    'value': 'patch/gerrit/host/8420741/8'
                }],
            },
            {
                'id':
                '95',
                'status':
                'FAILURE',
                'builder': {
                    'builder': 'dtf_linux_dbg'
                },
                'tags': [{
                    'key': 'buildset',
                    'value': 'patch/gerrit/host/8420741/8'
                }],
            },
        ]
        last = update_goldens.filter_last_results(builds)
        self.assertEqual(last['dtf_linux_dbg']['id'], 95)
        self.assertEqual(last['dtf_linux_dbg']['patch'], 8)

    @mock.patch('update_goldens.read_try_results')
    @mock.patch('update_goldens.get_unexpected_results')
    @mock.patch('update_goldens.get_unexpected_artifacts')
    @mock.patch('update_goldens.download_individual_screenshot')
    def test_collect_cl_results_downloads_logs_and_goldens(
            self, mock_download, mock_get_artifacts, mock_get_unexpected,
            mock_read_try):
        mock_read_try.return_value = [{
            'id':
            '888',
            'status':
            'FAILURE',
            'builder': {
                'builder': 'dtf_linux_dbg'
            },
            'tags': [{
                'key': 'buildset',
                'value': 'patch/gerrit/host/8420741/8'
            }],
        }]
        mock_get_unexpected.return_value = {
            'testResults': [
                {
                    'name':
                    'invocations/build-888/tests/dom_tree/results/1',
                    'testId':
                    'DOMTreeWidget/screenshot_test',
                    'status':
                    'FAIL',
                    'expected':
                    False,
                    'duration':
                    '1.2s',
                    'tags': [{
                        'key': 'screenshot_path',
                        'value': 'test/goldens/linux/elements/tree.png'
                    }],
                    'failureReason': {
                        'primaryErrorMessage': 'Screenshot mismatch by 2.5%'
                    },
                    'summaryHtml':
                    '<pre>Stack trace line 1<br>line 2</pre>',
                },
                {
                    'name': 'invocations/build-888/tests/dom_tree/results/2',
                    'testId': 'DOMTreeWidget/screenshot_test',
                    'status': 'FAIL',
                },
                {
                    'name': 'invocations/build-888/tests/dom_tree/results/3',
                    'testId': 'DOMTreeWidget/unexpected_pass_test',
                    'status': 'PASS',
                },
                {
                    'name': 'invocations/build-888/tests/other/results/1',
                    'testId': 'OtherSuite/unrelated_test',
                    'status': 'FAIL',
                },
            ]
        }
        mock_get_artifacts.return_value = {
            'invocations/build-888/tests/dom_tree/results/1': [
                {
                    'artifactId': 'actual_image',
                    'contentType': 'image/png',
                    'fetchUrl': 'https://example.com/actual.png'
                },
                {
                    'artifactId': 'expected_image',
                    'contentType': 'image/png',
                    'fetchUrl': 'https://example.com/expected.png'
                },
                {
                    'artifactId': 'image_diff',
                    'contentType': 'image/png',
                    'fetchUrl': 'https://example.com/diff.png'
                },
                {
                    'artifactId': 'stderr',
                    'contentType': 'text/plain',
                    'fetchUrl': 'https://example.com/stderr.txt'
                },
            ]
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            summary = get_cl_test_results.collect_cl_results(
                cl=8420741,
                patchset=8,
                test_filter='DOMTreeWidget',
                output_dir=tmpdir,
                apply_goldens=True)

            builder_report = summary['builders']['dtf_linux_dbg']
            self.assertEqual(len(builder_report['failedTests']), 1)
            test_report = builder_report['failedTests'][0]
            self.assertEqual(test_report['testId'],
                             'DOMTreeWidget/screenshot_test')
            self.assertEqual(test_report['appliedGoldenPath'],
                             'test/goldens/linux/elements/tree.png')
            self.assertTrue(os.path.exists(test_report['failureLogPath']))
            with open(test_report['failureLogPath'], encoding='utf-8') as f:
                log_content = f.read()
            self.assertIn('Screenshot mismatch by 2.5%', log_content)
            self.assertIn('Stack trace line 1', log_content)
            self.assertEqual(mock_download.call_count, 5)


if __name__ == '__main__':
    unittest.main()
