#!/usr/bin/env python3

# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import argparse
import contextlib
import json
import os
import re
import subprocess
import sys
import unittest

# The goal of this test is to verify e2e behavior of our test harness w.r.t how
# it reports test results.


class DevToolsTestHarness(unittest.TestCase):
    target_name = 'Default'
    build_dir = 'out/Default'
    gen_dir = 'out/Default/gen'
    debug_mode = False

    @contextlib.contextmanager
    def _expectations_file(self, content):
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
            f.write(content)
            expectations_file = f.name
        try:
            yield expectations_file
        finally:
            os.remove(expectations_file)

    def run_test_with_rdb(self, cmd_args):
        cmd = [
            "npm", "run", "rdb", "--", "vpython3", "third_party/node/node.py",
            "--output"
        ] + cmd_args
        process = subprocess.Popen(cmd,
                                   stderr=subprocess.PIPE,
                                   stdout=subprocess.PIPE,
                                   text=True)
        stdout, stderr = process.communicate()
        if getattr(self, 'debug_mode', False):
            sys.stdout.write(stdout)
            sys.stdout.write(stderr)

        match = re.search(
            r'rdb-stream: created invocation - .*?/ui/inv/([^\s"\']+)', stderr)
        if not match:
            match = re.search(r'invocations/([^\s"\']+)', stderr)

        self.assertIsNotNone(
            match,
            f"Failed to find rdb invocation ID in the output.\nStdout: {stdout}\nStderr: {stderr}"
        )

        invocation_id = match.group(1)
        if invocation_id.startswith('invocations/'):
            invocation_id = invocation_id[len('invocations/'):]

        query_cmd = ["rdb", "query", invocation_id, "-json"]
        query_process = subprocess.run(query_cmd,
                                       capture_output=True,
                                       text=True)
        self.assertEqual(query_process.returncode, 0,
                         f"rdb query failed: {query_process.stderr}")

        results = []
        for line in query_process.stdout.strip().split('\n'):
            line = line.strip()
            if not line or not line.startswith('{'):
                continue
            try:
                data = json.loads(line)
                if 'testResult' in data:
                    results.append(data['testResult'])
            except json.JSONDecodeError:
                pass

        return results, process.returncode

    def run_test_with_output(self, cmd_args):
        cmd = ["vpython3", "third_party/node/node.py", "--output"] + cmd_args
        process = subprocess.run(cmd,
                                 stdout=subprocess.PIPE,
                                 stderr=subprocess.PIPE,
                                 text=True)
        if getattr(self, 'debug_mode', False):
            sys.stdout.write(process.stdout)
            sys.stdout.write(process.stderr)
        return process.stdout, process.stderr, process.returncode


    def _resolve_test_file(self, test_file):
        if test_file.startswith("@"):
            rsp_path = test_file[1:]
            if os.path.isabs(rsp_path):
                return "@" + rsp_path
            return "@" + os.path.abspath(rsp_path)

        match = re.match(r'^(.*\.([tj]s))(.*)$', test_file)
        if match:
            path_part = match.group(1)
            suffix = match.group(3)
        else:
            path_part = test_file
            suffix = ""

        if path_part.endswith(".ts"):
            path_part = path_part[:-3] + ".js"

        if path_part.startswith(f"{self.build_dir}/"):
            pass
        elif path_part.startswith("gen/"):
            path_part = os.path.join(self.build_dir, path_part)
        else:
            path_part = os.path.join(self.gen_dir, path_part)
        return os.path.abspath(path_part) + suffix

    def run_unit_test(self, test_file):
        if isinstance(test_file, str):
            test_files = [test_file]
        else:
            test_files = test_file

        abs_test_files = [self._resolve_test_file(f) for f in test_files]
        cmd = [
            "node_modules/karma/bin/karma", "start",
            os.path.join(self.gen_dir, "test/unit/karma.conf.js"), "--"
        ] + abs_test_files
        return self.run_test_with_rdb(cmd)

    def run_e2e_test(self, test_file):
        abs_test_file = self._resolve_test_file(test_file)
        return self.run_test_with_rdb([
            os.path.join(self.gen_dir, "test/harness/run-mocha.js"),
            abs_test_file
        ])

    def test_unit(self):
        results, exit_code = self.run_unit_test(
            "test/harness/unit/unit.test.ts")
        self.assertEqual(exit_code, 0)
        self.assertEqual(
            len(results), 1,
            f"Expected exactly one test result, got {len(results)}")
        self.assertEqual(
            results[0].get('testId'),
            'test/harness/unit/unit.test.ts:unit:should_run_a_basic_unit_test_successfully'
        )
        self.assertEqual(results[0].get('status'), 'PASS')
        self.assertTrue(results[0].get('expected'))

    def test_unit_artifacts(self):
        results, exit_code = self.run_unit_test(
            "test/harness/unit/multi_logs.test.ts")
        self.assertEqual(exit_code, 0)
        self.assertEqual(
            len(results), 2,
            f"Expected exactly 2 test results, got {len(results)}")
        results.sort(key=lambda r: r.get('testId'))

        test_id_1 = results[0].get('testId')
        safe_id_1 = re.sub(r'[^a-zA-Z0-9_.-]', '_', test_id_1)
        log_path_1 = os.path.join(self.build_dir, 'artifacts', 'test-logs',
                                  f"{safe_id_1}.log")
        self.assertTrue(os.path.exists(log_path_1),
                        f"Artifact file {log_path_1} does not exist")
        with open(log_path_1, 'r') as f:
            content_1 = f.read()
        self.assertIn('HARNESS_UNIT_TEST_LOG_1', content_1)
        self.assertNotIn('HARNESS_UNIT_TEST_LOG_2', content_1)

        test_id_2 = results[1].get('testId')
        safe_id_2 = re.sub(r'[^a-zA-Z0-9_.-]', '_', test_id_2)
        log_path_2 = os.path.join(self.build_dir, 'artifacts', 'test-logs',
                                  f"{safe_id_2}.log")
        self.assertTrue(os.path.exists(log_path_2),
                        f"Artifact file {log_path_2} does not exist")
        with open(log_path_2, 'r') as f:
            content_2 = f.read()
        self.assertIn('HARNESS_UNIT_TEST_LOG_2', content_2)
        self.assertNotIn('HARNESS_UNIT_TEST_LOG_1', content_2)

    def test_unit_response_file(self):
        import tempfile
        abs_test_file_1 = self._resolve_test_file(
            "test/harness/unit/unit.test.ts")
        abs_test_file_2 = self._resolve_test_file(
            "test/harness/unit/unit_2.test.ts")
        with tempfile.NamedTemporaryFile(mode='w', suffix='.rsp',
                                         delete=False) as f:
            f.write(f"{abs_test_file_1}\n{abs_test_file_2}\n")
            rsp_file = f.name
        try:
            results, exit_code = self.run_unit_test(f"@{rsp_file}")
            self.assertEqual(exit_code, 0)
            self.assertEqual(
                len(results), 2,
                f"Expected exactly 2 test results, got {len(results)}")
            test_ids = [r.get('testId') for r in results]
            self.assertIn(
                'test/harness/unit/unit.test.ts:unit:should_run_a_basic_unit_test_successfully',
                test_ids)
            self.assertIn(
                'test/harness/unit/unit_2.test.ts:unit_2:should_run_a_second_basic_unit_test_successfully',
                test_ids)
            for r in results:
                self.assertEqual(r.get('status'), 'PASS')
        finally:
            os.unlink(rsp_file)

    def test_e2e(self):
        results, exit_code = self.run_e2e_test("test/harness/e2e/e2e.test.ts")
        self.assertEqual(exit_code, 0)
        self.assertEqual(
            len(results), 1,
            f"Expected exactly one test result, got {len(results)}")
        self.assertEqual(
            results[0].get('testId'),
            'test/harness/e2e/e2e.test.ts:test_harness_e2e_fixture:should_run_a_basic_e2e_test_successfully'
        )
        self.assertEqual(results[0].get('status'), 'PASS')
        self.assertTrue(results[0].get('expected'))

    def test_e2e_duplicate(self):
        results, exit_code = self.run_e2e_test(
            "test/harness/e2e/duplicate.test.ts")
        self.assertEqual(exit_code, 1)
        self.assertEqual(
            len(results), 0,
            f"Expected exactly 0 test result, got {len(results)}")

    def test_unit_duplicate(self):
        results, exit_code = self.run_unit_test(
            "test/harness/unit/duplicate.test.ts")
        self.assertEqual(exit_code, 1)

    def test_unit_hooks(self):
        results, exit_code = self.run_unit_test(
            "test/harness/unit/hooks.test.ts")
        self.assertEqual(exit_code, 1)
        self.assertEqual(
            len(results), 3,
            f"Expected exactly 3 test results, got {len(results)}")
        self.assertEqual(results[0].get('testId'),
                         'test/harness/unit/hooks.test.ts:block_1:run_1')
        for r in results:
            if r.get('status') == 'FAIL':
                self.assertFalse(r.get('expected'))
            else:
                self.assertTrue(r.get('expected'))
        self.assertEqual(results[0].get('status'), 'FAIL')
        self.assertEqual(results[1].get('testId'),
                         'test/harness/unit/hooks.test.ts:block_2:run_3')
        self.assertEqual(results[1].get('status'), 'PASS')
        self.assertEqual(results[2].get('testId'),
                         'test/harness/unit/hooks.test.ts:block_2:run_4')
        self.assertEqual(results[2].get('status'), 'PASS')

    def test_unit_global_before_hook(self):
        results, exit_code = self.run_unit_test(
            "test/harness/unit/global_before_hook_fail.test.ts")
        self.assertEqual(exit_code, 1)
        self.assertEqual(
            len(results), 0,
            f"Expected exactly 0 test result, got {len(results)}")

    def test_unit_multiple_files_hook_failure(self):
        results, exit_code = self.run_unit_test([
            "test/harness/unit/global_before_hook_fail.test.ts",
            "test/harness/unit/unit.test.ts"
        ])
        self.assertEqual(exit_code, 1)
        self.assertEqual(
            len(results), 0,
            f"Expected exactly 0 test results, got {len(results)}")

    def test_unit_global_after_hook(self):
        results, exit_code = self.run_unit_test(
            "test/harness/unit/global_after_hook_fail.test.ts")
        self.assertEqual(exit_code, 1)
        self.assertEqual(
            len(results), 1,
            f"Expected exactly 1 test result, got {len(results)}")
        self.assertEqual(
            results[0].get('testId'),
            'test/harness/unit/global_after_hook_fail.test.ts:block:run')
        self.assertEqual(results[0].get('status'), 'PASS')

    def test_unit_after_each_hook(self):
        results, exit_code = self.run_unit_test(
            "test/harness/unit/after_each_hook_fail.test.ts")
        self.assertEqual(exit_code, 1)
        self.assertEqual(
            len(results), 2,
            f"Expected exactly 2 test results, got {len(results)}")
        results.sort(key=lambda r: r.get('status'))
        self.assertEqual(
            results[0].get('testId'),
            'test/harness/unit/after_each_hook_fail.test.ts:block:run')
        self.assertEqual(results[0].get('status'), 'FAIL')
        self.assertEqual(
            results[1].get('testId'),
            'test/harness/unit/after_each_hook_fail.test.ts:block:run')
        self.assertEqual(results[1].get('status'), 'PASS')

    def test_unit_before_each_hook(self):
        results, exit_code = self.run_unit_test(
            "test/harness/unit/before_each_hook_fail.test.ts")
        self.assertEqual(exit_code, 1)
        self.assertEqual(
            len(results), 1,
            f"Expected exactly 1 test result, got {len(results)}")
        self.assertEqual(
            results[0].get('testId'),
            'test/harness/unit/before_each_hook_fail.test.ts:block:run')
        self.assertEqual(results[0].get('status'), 'FAIL')

    def test_unit_bail(self):
        abs_test_file = self._resolve_test_file(
            "test/harness/unit/errors.test.ts")
        results, exit_code = self.run_test_with_rdb([
            "node_modules/karma/bin/karma", "start",
            os.path.join(self.gen_dir, "test/unit/karma.conf.js"), "--",
            abs_test_file, "--bail"
        ])
        self.assertEqual(exit_code, 1)
        self.assertEqual(
            len(results), 3,
            f"Expected exactly 3 test results with --bail, got {len(results)}")
        self.assertEqual(results[0].get('testId'),
                         'test/harness/unit/errors.test.ts:block_1:run_1')
        self.assertEqual(results[0].get('status'), 'PASS')
        self.assertEqual(results[1].get('testId'),
                         'test/harness/unit/errors.test.ts:block_1:run_2')
        self.assertEqual(results[1].get('status'), 'PASS')
        self.assertEqual(results[2].get('testId'),
                         'test/harness/unit/errors.test.ts:block_2:run_3')
        self.assertEqual(results[2].get('status'), 'FAIL')

    def test_unit_ids(self):
        results, exit_code = self.run_unit_test(
            "test/harness/unit/hooks.test.ts:block_2:run_3")
        self.assertEqual(exit_code, 0)
        self.assertEqual(
            len(results), 1,
            f"Expected exactly one test result, got {len(results)}")
        self.assertEqual(results[0].get('testId'),
                         'test/harness/unit/hooks.test.ts:block_2:run_3')
        self.assertEqual(results[0].get('status'), 'PASS')

    def test_unit_expectations(self):
        with self._expectations_file(
                "crbug.com/123 [ mac linux win32 ] test/harness/unit/hooks.test.ts [ Failure Pass ]\n"
        ) as expectations_file:
            abs_test_file = self._resolve_test_file(
                "test/harness/unit/hooks.test.ts")
            results, exit_code = self.run_test_with_rdb([
                "node_modules/karma/bin/karma", "start",
                os.path.join(self.gen_dir, "test/unit/karma.conf.js"), "--",
                abs_test_file, f"--expectations-file={expectations_file}"
            ])
            self.assertEqual(exit_code, 1)
            self.assertEqual(len(results), 3)
            for r in results:
                self.assertTrue(r.get('expected', False))

    def test_unit_expectations_unexpected_pass(self):
        with self._expectations_file(
                "crbug.com/123 [ mac linux win32 ] test/harness/unit/unit.test.ts [ Failure ]\n"
        ) as expectations_file:
            abs_test_file = self._resolve_test_file(
                "test/harness/unit/unit.test.ts")
            results, exit_code = self.run_test_with_rdb([
                "node_modules/karma/bin/karma", "start",
                os.path.join(self.gen_dir, "test/unit/karma.conf.js"), "--",
                abs_test_file, f"--expectations-file={expectations_file}"
            ])
            self.assertEqual(exit_code, 1)  # Unexpected pass means exit code 1
            self.assertEqual(len(results), 1)
            for r in results:
                self.assertEqual(r['status'], 'PASS')
                self.assertFalse(r.get('expected', False))

    def test_unit_expectations_exact_id(self):
        with self._expectations_file(
                "crbug.com/123 [ mac linux win32 ] test/harness/unit/hooks.test.ts:block_1:run_1 [ Failure ]\n"
        ) as expectations_file:
            abs_test_file = self._resolve_test_file(
                "test/harness/unit/hooks.test.ts")
            results, exit_code = self.run_test_with_rdb([
                "node_modules/karma/bin/karma", "start",
                os.path.join(self.gen_dir, "test/unit/karma.conf.js"), "--",
                abs_test_file, f"--expectations-file={expectations_file}"
            ])
            self.assertEqual(exit_code, 1)  # run_2 fails and is unexpected
            self.assertEqual(len(results), 3)
            for r in results:
                if r.get('testId'
                         ) == 'test/harness/unit/hooks.test.ts:block_1:run_1':
                    self.assertTrue(r.get('expected', False))
                    self.assertEqual(r.get('status'), 'FAIL')
                else:
                    self.assertTrue(r.get('expected', False))
                    self.assertEqual(r.get('status'), 'PASS')

    def test_unit_expectations_skip_file(self):
        with self._expectations_file(
                "crbug.com/123 [ mac linux win32 ] test/harness/unit/unit.test.ts [ Skip ]\n"
        ) as expectations_file:
            abs_test_file = self._resolve_test_file(
                "test/harness/unit/unit.test.ts")
            abs_test_file_2 = self._resolve_test_file(
                "test/harness/unit/unit_2.test.ts")
            results, exit_code = self.run_test_with_rdb([
                "node_modules/karma/bin/karma", "start",
                os.path.join(self.gen_dir,
                             "test/unit/karma.conf.js"), "--", abs_test_file,
                abs_test_file_2, f"--expectations-file={expectations_file}"
            ])
            self.assertEqual(exit_code, 0)
            self.assertEqual(len(results), 2)
            results.sort(key=lambda r: r.get('testId'))
            self.assertEqual(results[0].get('status'), 'SKIP')
            self.assertEqual(results[1].get('status'), 'PASS')

    def test_unit_expectations_skip_exact_id(self):
        with self._expectations_file(
                "crbug.com/123 [ mac linux win32 ] test/harness/unit/unit.test.ts:unit:should_run_a_basic_unit_test_successfully [ Skip ]\n"
        ) as expectations_file:
            abs_test_file = self._resolve_test_file(
                "test/harness/unit/unit.test.ts")
            abs_test_file_2 = self._resolve_test_file(
                "test/harness/unit/unit_2.test.ts")
            results, exit_code = self.run_test_with_rdb([
                "node_modules/karma/bin/karma", "start",
                os.path.join(self.gen_dir,
                             "test/unit/karma.conf.js"), "--", abs_test_file,
                abs_test_file_2, f"--expectations-file={expectations_file}"
            ])
            self.assertEqual(exit_code, 0)
            self.assertEqual(len(results), 2)
            results.sort(key=lambda r: r.get('testId'))
            self.assertEqual(results[0].get('status'), 'SKIP')
            self.assertEqual(results[1].get('status'), 'PASS')

    def test_e2e_ids(self):
        results, exit_code = self.run_e2e_test(
            "test/harness/e2e/multiple.test.ts:multiple:run2")
        self.assertEqual(exit_code, 0)
        self.assertEqual(
            len(results), 1,
            f"Expected exactly one test result, got {len(results)}")
        self.assertEqual(results[0].get('testId'),
                         'test/harness/e2e/multiple.test.ts:multiple:run2')
        self.assertEqual(results[0].get('status'), 'PASS')

    def test_e2e_errors(self):
        results, exit_code = self.run_e2e_test(
            "test/harness/e2e/errors.test.ts")
        self.assertEqual(exit_code, 1)
        self.assertEqual(
            len(results), 4,
            f"Expected exactly 4 test results, got {len(results)}")
        self.assertEqual(results[0].get('testId'),
                         'test/harness/e2e/errors.test.ts:block_1:run_1')
        self.assertEqual(results[0].get('status'), 'PASS')
        self.assertEqual(results[1].get('testId'),
                         'test/harness/e2e/errors.test.ts:block_1:run_2')
        self.assertEqual(results[1].get('status'), 'PASS')
        self.assertEqual(results[2].get('testId'),
                         'test/harness/e2e/errors.test.ts:block_2:run_3')
        self.assertEqual(results[2].get('status'), 'FAIL')
        self.assertEqual(results[3].get('testId'),
                         'test/harness/e2e/errors.test.ts:block_2:run_4')
        self.assertEqual(results[3].get('status'), 'PASS')

    def test_e2e_bail(self):
        abs_test_file = self._resolve_test_file(
            "test/harness/e2e/errors.test.ts")
        results, exit_code = self.run_test_with_rdb([
            os.path.join(self.gen_dir, "test/harness/run-mocha.js"),
            abs_test_file, "--", "--bail"
        ])
        self.assertEqual(exit_code, 1)
        self.assertEqual(
            len(results), 3,
            f"Expected exactly 3 test results with --bail, got {len(results)}")
        self.assertEqual(results[0].get('testId'),
                         'test/harness/e2e/errors.test.ts:block_1:run_1')
        self.assertEqual(results[0].get('status'), 'PASS')
        self.assertEqual(results[1].get('testId'),
                         'test/harness/e2e/errors.test.ts:block_1:run_2')
        self.assertEqual(results[1].get('status'), 'PASS')
        self.assertEqual(results[2].get('testId'),
                         'test/harness/e2e/errors.test.ts:block_2:run_3')
        self.assertEqual(results[2].get('status'), 'FAIL')

    def test_e2e_repeat(self):
        abs_test_file = self._resolve_test_file("test/harness/e2e/e2e.test.ts")
        results, exit_code = self.run_test_with_rdb([
            os.path.join(self.gen_dir, "test/harness/run-mocha.js"),
            abs_test_file, "--", "--repeat=2"
        ])
        self.assertEqual(exit_code, 0)
        self.assertEqual(
            len(results), 2,
            f"Expected exactly 2 test results, got {len(results)}")

        # Initial test
        self.assertEqual(
            results[0].get('testId'),
            'test/harness/e2e/e2e.test.ts:test_harness_e2e_fixture:should_run_a_basic_e2e_test_successfully'
        )
        self.assertEqual(results[0].get('status'), 'PASS')
        # Repeated run
        self.assertEqual(
            results[1].get('testId'),
            'test/harness/e2e/e2e.test.ts:test_harness_e2e_fixture:should_run_a_basic_e2e_test_successfully'
        )
        self.assertEqual(results[1].get('status'), 'PASS')

    def test_e2e_expectations(self):
        with self._expectations_file(
                "crbug.com/123 [ mac linux win32 ] test/harness/e2e/errors.test.ts [ Failure Pass ]\n"
        ) as expectations_file:
            abs_test_file = self._resolve_test_file(
                "test/harness/e2e/errors.test.ts")
            results, exit_code = self.run_test_with_rdb([
                os.path.join(self.gen_dir, "test/harness/run-mocha.js"),
                abs_test_file, "--", f"--expectations-file={expectations_file}"
            ])
            self.assertEqual(exit_code, 0)
            self.assertEqual(len(results), 4)
            for r in results:
                self.assertTrue(r.get('expected', False))

    def test_e2e_expectations_unexpected_pass(self):
        with self._expectations_file(
                "crbug.com/123 [ mac linux win32 ] test/harness/e2e/errors.test.ts [ Failure ]\n"
        ) as expectations_file:
            abs_test_file = self._resolve_test_file(
                "test/harness/e2e/errors.test.ts")
            results, exit_code = self.run_test_with_rdb([
                os.path.join(self.gen_dir, "test/harness/run-mocha.js"),
                abs_test_file, "--", f"--expectations-file={expectations_file}"
            ])
            self.assertEqual(exit_code, 1)
            self.assertEqual(len(results), 4)
            for r in results:
                if r.get('status') == 'PASS':
                    self.assertFalse(r.get('expected', False))
                else:
                    self.assertTrue(r.get('expected', False))

    def test_e2e_expectations_exact_id(self):
        with self._expectations_file(
                "crbug.com/123 [ mac linux win32 ] test/harness/e2e/errors.test.ts:block_1:run_1 [ Failure ]\n"
        ) as expectations_file:
            abs_test_file = self._resolve_test_file(
                "test/harness/e2e/errors.test.ts")
            results, exit_code = self.run_test_with_rdb([
                os.path.join(self.gen_dir, "test/harness/run-mocha.js"),
                abs_test_file, "--", f"--expectations-file={expectations_file}"
            ])
            self.assertEqual(exit_code, 1)
            self.assertEqual(len(results), 4)
            for r in results:
                if r.get('testId'
                         ) == 'test/harness/e2e/errors.test.ts:block_1:run_1':
                    self.assertFalse(r.get('expected', False))
                elif r.get(
                        'testId'
                ) == 'test/harness/e2e/errors.test.ts:block_2:run_3':
                    self.assertFalse(r.get('expected', False))
                else:
                    self.assertTrue(r.get('expected', False))

    def test_e2e_expectations_skip_file(self):
        with self._expectations_file(
                "crbug.com/123 [ mac linux win32 ] test/harness/e2e/errors.test.ts [ Skip ]\n"
        ) as expectations_file:
            abs_test_file = self._resolve_test_file(
                "test/harness/e2e/errors.test.ts")
            results, exit_code = self.run_test_with_rdb([
                os.path.join(self.gen_dir, "test/harness/run-mocha.js"),
                abs_test_file, "--", f"--expectations-file={expectations_file}"
            ])
            self.assertEqual(exit_code, 0)
            self.assertEqual(len(results), 4)
            for r in results:
                self.assertEqual(r.get('status'), 'SKIP')

    def test_e2e_expectations_skip_exact_id(self):
        with self._expectations_file(
                "crbug.com/123 [ mac linux win32 ] test/harness/e2e/errors.test.ts:block_1:run_1 [ Skip ]\n"
        ) as expectations_file:
            abs_test_file = self._resolve_test_file(
                "test/harness/e2e/errors.test.ts")
            results, exit_code = self.run_test_with_rdb([
                os.path.join(self.gen_dir, "test/harness/run-mocha.js"),
                abs_test_file, "--", f"--expectations-file={expectations_file}"
            ])
            self.assertEqual(exit_code, 1)
            self.assertEqual(len(results), 4)
            for r in results:
                if r.get('testId'
                         ) == 'test/harness/e2e/errors.test.ts:block_1:run_1':
                    self.assertEqual(r.get('status'), 'SKIP')
                elif r.get(
                        'testId'
                ) == 'test/harness/e2e/errors.test.ts:block_2:run_3':
                    self.assertEqual(r.get('status'), 'FAIL')
                else:
                    self.assertEqual(r.get('status'), 'PASS')

    def test_unit_screenshot_retry(self):
        import sys
        if sys.platform != 'linux':
            return
        abs_test_file = self._resolve_test_file(
            "test/harness/unit/screenshot_retry.test.ts")
        results, exit_code = self.run_test_with_rdb([
            "node_modules/karma/bin/karma", "start",
            os.path.join(self.gen_dir, "test/unit/karma.conf.js"), "--",
            abs_test_file, "--retries=2"
        ])
        self.assertEqual(exit_code, 1)
        self.assertEqual(
            len(results), 2,
            f"Expected exactly 2 test results, got {len(results)}")

        results.sort(key=lambda r: r.get('testId'))

        self.assertEqual(
            results[0].get('testId'),
            'test/harness/unit/screenshot_retry.test.ts:screenshot_test_with_retries:should_fail_with_another_screenshot_error'
        )
        self.assertEqual(results[0].get('status'), 'FAIL')
        self.assertEqual(
            results[1].get('testId'),
            'test/harness/unit/screenshot_retry.test.ts:screenshot_test_with_retries:should_fail_with_screenshot_error'
        )
        self.assertEqual(results[1].get('status'), 'FAIL')

    def test_unit_screenshot_diff(self):
        import sys
        if sys.platform != 'linux':
            return
        abs_test_file = self._resolve_test_file(
            "test/harness/unit/screenshot_diff.test.ts")
        results, exit_code = self.run_test_with_rdb([
            "node_modules/karma/bin/karma", "start",
            os.path.join(self.gen_dir, "test/unit/karma.conf.js"), "--",
            abs_test_file
        ])
        self.assertEqual(exit_code, 1)
        self.assertEqual(
            len(results), 1,
            f"Expected exactly 1 test results, got {len(results)}")

        self.assertEqual(
            results[0].get('testId'),
            'test/harness/unit/screenshot_diff.test.ts:screenshot_test_with_diff:should_fail_with_screenshot_diff'
        )
        self.assertEqual(results[0].get('status'), 'FAIL')

        # Verify artifacts
        list_artifacts_cmd = [
            "rdb", "rpc", "luci.resultdb.v1.ResultDB", "ListArtifacts"
        ]
        query_process = subprocess.run(list_artifacts_cmd,
                                       input=json.dumps(
                                           {"parent": results[0].get('name')}),
                                       capture_output=True,
                                       text=True)
        self.assertEqual(query_process.returncode, 0,
                         f"rdb rpc failed: {query_process.stderr}")

        # We need to extract JSON past the Terms of Service warning if present
        stdout = query_process.stdout.strip()
        if stdout.startswith('Use of LUCI'):
            stdout = stdout.split('\n', 2)[-1]

        artifacts_resp = json.loads(stdout)
        artifacts = [
            a['artifactId'] for a in artifacts_resp.get('artifacts', [])
        ]
        self.assertIn('actual_image', artifacts)
        self.assertIn('expected_image', artifacts)
        self.assertIn('image_diff', artifacts)

    def test_unit_screenshot_diff_local(self):
        import sys
        if sys.platform != 'linux':
            return
        abs_test_file = self._resolve_test_file(
            "test/harness/unit/screenshot_diff.test.ts")
        cmd = [
            "node_modules/karma/bin/karma", "start",
            os.path.join(self.gen_dir, "test/unit/karma.conf.js"), "--",
            abs_test_file
        ]
        process = subprocess.run(cmd, capture_output=True, text=True)
        self.assertEqual(process.returncode, 1)

        errors_js_path = os.path.join(self.gen_dir,
                                      "test/.generated/errors.js")
        self.assertTrue(os.path.exists(errors_js_path),
                        "errors.js should exist")
        with open(errors_js_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("window.SCREENSHOT_ERRORS =", content)
        self.assertNotIn('"filePath":""', content,
                         "Screenshot error file paths should not be empty")

    def test_unit_repeat(self):
        abs_test_file = self._resolve_test_file(
            "test/harness/unit/unit.test.ts")
        results, exit_code = self.run_test_with_rdb([
            "node_modules/karma/bin/karma", "start",
            os.path.join(self.gen_dir, "test/unit/karma.conf.js"), "--",
            abs_test_file, "--repeat=2"
        ])
        self.assertEqual(exit_code, 0)
        self.assertEqual(
            len(results), 2,
            f"Expected exactly 2 test results, got {len(results)}")

        self.assertEqual(
            results[0].get('testId'),
            'test/harness/unit/unit.test.ts:unit:should_run_a_basic_unit_test_successfully'
        )
        self.assertEqual(results[0].get('status'), 'PASS')
        self.assertEqual(
            results[1].get('testId'),
            'test/harness/unit/unit.test.ts:unit:should_run_a_basic_unit_test_successfully'
        )
        self.assertEqual(results[1].get('status'), 'PASS')

    def test_unit_snapshot_repeat(self):
        abs_test_file = self._resolve_test_file(
            "test/harness/unit/snapshot.test.ts")
        results, exit_code = self.run_test_with_rdb([
            "node_modules/karma/bin/karma", "start",
            os.path.join(self.gen_dir, "test/unit/karma.conf.js"), "--",
            abs_test_file, "--repeat=2"
        ])
        self.assertEqual(exit_code, 0)
        self.assertEqual(
            len(results), 2,
            f"Expected exactly 2 test results, got {len(results)}")

        self.assertEqual(
            results[0].get('testId'),
            'test/harness/unit/snapshot.test.ts:snapshot_test_harness:supports_snapshot_assertion_in_test_harness'
        )
        self.assertEqual(results[0].get('status'), 'PASS')
        self.assertEqual(
            results[1].get('testId'),
            'test/harness/unit/snapshot.test.ts:snapshot_test_harness:supports_snapshot_assertion_in_test_harness'
        )
        self.assertEqual(results[1].get('status'), 'PASS')

    def test_get_test_id(self):
        cmd = [
            "vpython3", "third_party/node/node.py", "--output",
            "scripts/get_test_id.ts", "test/harness/unit/get_test_id.test.ts",
            "8", "10"
        ]
        process = subprocess.run(cmd, capture_output=True, text=True)
        self.assertEqual(process.returncode, 0,
                         f"get_test_id failed: {process.stderr}")
        expected_id = "test/harness/unit/get_test_id.test.ts:gettestid_fixture:nested_suite:target_test_case"
        self.assertEqual(process.stdout.strip(), expected_id)

    def test_unit_failure_summary(self):
        abs_test_file = self._resolve_test_file(
            "test/harness/unit/errors.test.ts")
        stdout, stderr, exit_code = self.run_test_with_output([
            "node_modules/karma/bin/karma", "start",
            os.path.join(self.gen_dir, "test/unit/karma.conf.js"), "--",
            abs_test_file
        ])
        self.assertEqual(exit_code, 1)
        self.assertIn("Failed tests (1):", stdout)
        self.assertIn("test/harness/unit/errors.test.ts:block_2:run_3", stdout)
        self.assertIn("To rerun:", stdout)
        self.assertIn(
            "npm run test -- test/harness/unit/errors.test.ts:block_2:run_3",
            stdout)

    def test_e2e_failure_summary(self):
        abs_test_file = self._resolve_test_file(
            "test/harness/e2e/errors.test.ts")
        stdout, stderr, exit_code = self.run_test_with_output([
            os.path.join(self.gen_dir, "test/harness/run-mocha.js"),
            abs_test_file
        ])
        self.assertEqual(exit_code, 1)
        self.assertIn("Failed tests (1):", stdout)
        self.assertIn("test/harness/e2e/errors.test.ts:block_2:run_3", stdout)
        self.assertIn("To rerun:", stdout)
        self.assertIn(
            "npm run test -- test/harness/e2e/errors.test.ts:block_2:run_3",
            stdout)

    def test_ai_evals_auth_helper(self):
        abs_test_file = self._resolve_test_file(
            "test/harness/e2e/auth-helper.test.ts")
        stdout, stderr, exit_code = self.run_test_with_output([
            os.path.join(self.gen_dir, "test/harness/run-mocha.js"),
            abs_test_file
        ])
        self.assertEqual(exit_code, 0)
        self.assertIn("passing", stdout)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='DevTools Test Harness')
    parser.add_argument('-t',
                        '--target',
                        default='Default',
                        help='Target build directory (default: Default)')
    parser.add_argument('--debug',
                        action='store_true',
                        help='Enable debug mode')
    args, unittest_args = parser.parse_known_args()

    DevToolsTestHarness.target_name = args.target
    DevToolsTestHarness.build_dir = os.path.join('out', args.target)
    DevToolsTestHarness.gen_dir = os.path.join(DevToolsTestHarness.build_dir,
                                               'gen')
    DevToolsTestHarness.debug_mode = args.debug

    unittest.main(argv=[sys.argv[0]] + unittest_args)
