#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Fetches tryjob build statuses, per-test failure logs, text diffs, and
screenshot artifacts (actual_image, expected_image, image_diff) for a Gerrit CL.

Reuses ResultDB and Buildbucket helpers from scripts/tools/update_goldens.py.
"""

import argparse
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
import json
import os
import re
import subprocess
import sys

TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
if TOOLS_DIR not in sys.path:
    sys.path.insert(0, TOOLS_DIR)

import update_goldens  # pylint: disable=wrong-import-position

IMAGE_ARTIFACT_IDS = {
    'actual_image',
    'expected_image',
    'image_diff',
    'generated',
}

TEXT_ARTIFACT_IDS = {
    'stderr',
    'stdout',
    'crash_log',
    'command',
    'snippet',
    'actual_text',
    'expected_text',
    'text_diff',
    'pretty_text_diff',
}


class _HTMLStripper(HTMLParser):
    """Strips HTML tags from ResultDB summaryHtml while preserving line breaks."""

    def __init__(self):
        super().__init__()
        self._parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ('br', 'p', 'div', 'pre', 'li', 'tr'):
            self._parts.append('\n')

    def handle_data(self, data):
        self._parts.append(data)

    def get_text(self):
        return ''.join(self._parts).strip()

    def error(self, message):
        pass


def strip_html(html_text):
    """Converts ResultDB summaryHtml into readable plain text."""
    if not html_text:
        return ''
    parser = _HTMLStripper()
    parser.feed(html_text)
    return parser.get_text()


def sanitize_filename(name, max_len=120):
    """Sanitizes a test ID or step name for safe filesystem directory names."""
    sanitized = re.sub(r'[^A-Za-z0-9._-]+', '_', name).strip('_')
    if len(sanitized) > max_len:
        sanitized = sanitized[:max_len]
    return sanitized or 'unknown'


def get_artifact_extension(artifact):
    """Determines the file extension for a ResultDB artifact."""
    artifact_id = artifact.get('artifactId', '')
    content_type = artifact.get('contentType', '')
    if artifact_id in IMAGE_ARTIFACT_IDS or content_type.startswith('image/'):
        return '.png'
    if content_type == 'text/html' or artifact_id.endswith('_html'):
        return '.html'
    return '.txt'


def should_download_artifact(artifact):
    """Returns True if an artifact is an image, diff, or test failure log."""
    artifact_id = artifact.get('artifactId', '')
    content_type = artifact.get('contentType', '')
    if artifact_id in IMAGE_ARTIFACT_IDS or artifact_id in TEXT_ARTIFACT_IDS:
        return True
    if content_type.startswith('image/') or content_type.startswith('text/'):
        return True
    return False


def format_failure_log(detail):
    """Formats a comprehensive plain-text failure log from a ResultDB test result."""
    lines = [
        f"Test ID: {detail.get('testId', '')}",
        f"Result Name: {detail.get('name', '')}",
        f"Status: {detail.get('status', '')}",
        f"Expected: {detail.get('expected', False)}",
        f"Duration: {detail.get('duration', '')}",
    ]
    tags = detail.get('tags', [])
    if tags:
        lines.append('\nTags:')
        for tag in tags:
            lines.append(f"  {tag.get('key')}: {tag.get('value')}")

    failure_reason = detail.get('failureReason') or {}
    primary_error = failure_reason.get('primaryErrorMessage')
    if primary_error:
        lines.append('\nPrimary Error Message:')
        lines.append(primary_error)

    errors = failure_reason.get('errors') or []
    if len(errors) > 1:
        lines.append('\nAdditional Errors:')
        for err in errors:
            msg = err.get('message')
            if msg:
                lines.append(msg)

    summary_html = detail.get('summaryHtml')
    if summary_html:
        lines.append('\nSummary Output:')
        lines.append(strip_html(summary_html))

    return '\n'.join(lines) + '\n'


def fetch_failed_step_logs(build_id, builder_dir):
    """Fetches failed step logs via `bb get` and `bb log` when no RDB results exist."""
    step_logs = {}
    try:
        stdout = subprocess.check_output(
            ['bb', 'get', str(build_id), '-steps', '-json'], text=True)
        build_data = json.loads(stdout)
    except Exception:  # pylint: disable=broad-except
        return step_logs

    for step in build_data.get('steps', []):
        if step.get('status') not in ('FAILURE', 'INFRA_FAILURE'):
            continue
        step_name = step.get('name', '')
        if not step_name:
            continue
        safe_step = sanitize_filename(step_name)
        log_path = os.path.join(builder_dir, f'step_{safe_step}.log')
        try:
            log_output = subprocess.check_output(
                ['bb', 'log', str(build_id), step_name],
                text=True,
                stderr=subprocess.STDOUT)
            os.makedirs(builder_dir, exist_ok=True)
            with open(log_path, 'w', encoding='utf-8') as log_file:
                log_file.write(log_output)
            step_logs[step_name] = log_path
        except Exception:  # pylint: disable=broad-except
            continue
    return step_logs


def process_failed_test(detail, artifacts_for_test, builder, builder_dir,
                        test_filter_re, apply_goldens):
    """Writes failure_log.txt and downloads pre-fetched artifacts for a test."""
    test_id = detail.get('testId', '')
    screenshot_path = update_goldens.get_screenshot_path(detail)
    if test_filter_re and not (
            test_filter_re.search(test_id)
            or test_filter_re.search(detail.get('name', '')) or
        (screenshot_path and test_filter_re.search(screenshot_path))):
        return None
    safe_test_id = sanitize_filename(test_id)
    test_dir = os.path.join(builder_dir, safe_test_id)
    os.makedirs(test_dir, exist_ok=True)

    failure_log_path = os.path.join(test_dir, 'failure_log.txt')
    with open(failure_log_path, 'w', encoding='utf-8') as log_file:
        log_file.write(format_failure_log(detail))

    downloaded_artifacts = {}
    applied_golden_path = None

    for artifact in artifacts_for_test:
        if not should_download_artifact(artifact):
            continue
        artifact_id = artifact['artifactId']
        fetch_url = artifact.get('fetchUrl')
        if not fetch_url:
            continue
        ext = get_artifact_extension(artifact)
        filename = artifact_id if artifact_id.endswith(
            ext) else f'{artifact_id}{ext}'
        dest_path = os.path.join(test_dir, filename)
        update_goldens.download_individual_screenshot(dest_path, fetch_url)
        downloaded_artifacts[artifact_id] = dest_path

        if (apply_goldens and screenshot_path and 'linux' in builder
                and artifact_id in ('actual_image', 'generated')):
            update_goldens.download_individual_screenshot(
                screenshot_path, fetch_url)
            applied_golden_path = screenshot_path

    failure_reason = detail.get('failureReason') or {}
    return {
        'testId': test_id,
        'status': detail.get('status'),
        'primaryErrorMessage': failure_reason.get('primaryErrorMessage', ''),
        'screenshotPath': screenshot_path,
        'failureLogPath': failure_log_path,
        'artifacts': downloaded_artifacts,
        'appliedGoldenPath': applied_golden_path,
    }


def collect_cl_results(cl=None,
                       patchset=None,
                       builder_pattern=None,
                       test_filter=None,
                       output_dir=None,
                       apply_goldens=False):
    """Collects build statuses, failure logs, and artifacts for a CL/patchset."""
    raw_builds = update_goldens.read_try_results(patchset=patchset, cl=cl)
    latest_builds = update_goldens.filter_last_results(raw_builds)

    builder_re = re.compile(builder_pattern) if builder_pattern else None
    test_filter_re = re.compile(test_filter) if test_filter else None

    if not output_dir:
        output_dir = os.path.abspath('cl_test_results')
    os.makedirs(output_dir, exist_ok=True)

    summary = {
        'cl': cl,
        'patchset': patchset,
        'outputDir': output_dir,
        'builders': {},
    }

    for builder, build_info in sorted(latest_builds.items()):
        if builder_re and not builder_re.search(builder):
            continue
        if summary['cl'] is None:
            summary['cl'] = build_info.get('cl')
        if summary['patchset'] is None:
            summary['patchset'] = build_info.get('patch')

        builder_entry = {
            'buildId': build_info['id'],
            'status': build_info['status'],
            'patch': build_info['patch'],
            'summaryMarkdown': build_info.get('summaryMarkdown', ''),
            'failedTests': [],
            'failedStepLogs': {},
        }

        if build_info['status'] not in ('SUCCESS', 'STARTED', 'SCHEDULED'):
            builder_dir = os.path.join(output_dir, sanitize_filename(builder))
            unexpected = update_goldens.get_unexpected_results(
                build_info['id'])
            artifacts_by_result = update_goldens.get_unexpected_artifacts(
                build_info['id'])

            unique_failures = []
            seen_test_ids = set()
            for result_entry in unexpected.get('testResults', []):
                if result_entry.get('expected'):
                    continue
                if result_entry.get('status') not in ('FAIL', 'CRASH',
                                                      'ABORT'):
                    continue
                test_id = result_entry.get('testId', '')
                if test_id in seen_test_ids:
                    continue
                seen_test_ids.add(test_id)
                unique_failures.append(result_entry)

            if unique_failures:
                with ThreadPoolExecutor(max_workers=16) as executor:
                    futures = [
                        executor.submit(
                            process_failed_test, result_entry,
                            artifacts_by_result.get(result_entry['name'],
                                                    []), builder, builder_dir,
                            test_filter_re, apply_goldens)
                        for result_entry in unique_failures
                    ]
                    for future in futures:
                        test_report = future.result()
                        if test_report:
                            builder_entry['failedTests'].append(test_report)

            if not builder_entry['failedTests'] and not test_filter_re:
                builder_entry['failedStepLogs'] = fetch_failed_step_logs(
                    build_info['id'], builder_dir)

        summary['builders'][builder] = builder_entry

    summary_path = os.path.join(output_dir, 'summary.json')
    with open(summary_path, 'w', encoding='utf-8') as summary_file:
        json.dump(summary, summary_file, indent=2)
    summary['summaryJsonPath'] = summary_path
    return summary


def print_human_summary(summary):
    """Prints a concise human- and agent-readable summary of CL results."""
    print(f"CL {summary['cl']} (Patchset {summary['patchset']})")
    print(f"Artifacts & logs directory: {summary['outputDir']}")
    print(f"Summary JSON: {summary['summaryJsonPath']}\n")

    for builder, info in summary['builders'].items():
        print(f"[{info['status']}] {builder} (build {info['buildId']})")
        for test in info['failedTests']:
            print(f"  FAILED TEST: {test['testId']}")
            if test['primaryErrorMessage']:
                first_line = test['primaryErrorMessage'].splitlines()[0]
                print(f"    Error: {first_line}")
            if test['screenshotPath']:
                print(f"    Screenshot Golden Path: {test['screenshotPath']}")
            if test['appliedGoldenPath']:
                print(f"    Applied Golden: {test['appliedGoldenPath']}")
            print(f"    Failure Log: {test['failureLogPath']}")
            for art_id, art_path in sorted(test['artifacts'].items()):
                print(f"    Artifact [{art_id}]: {art_path}")
        for step_name, log_path in info['failedStepLogs'].items():
            print(f"  FAILED STEP [{step_name}]: {log_path}")


def build_parser():
    """Builds the CLI argument parser."""
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--cl',
                        type=int,
                        help='Gerrit CL number (auto-detected if omitted).')
    parser.add_argument('--patchset',
                        type=int,
                        help='Patchset number (latest if omitted).')
    parser.add_argument('--builder',
                        help='Regex to filter builders (e.g. "dtf_linux.*").')
    parser.add_argument(
        '--test-filter',
        help='Regex to filter failing test IDs (e.g. "DOMTreeWidget").')
    parser.add_argument(
        '--output-dir',
        default='cl_test_results',
        help='Directory to store failure logs and downloaded artifacts.')
    parser.add_argument(
        '--apply-goldens',
        action='store_true',
        help='Also copy Linux actual_image artifacts directly to test/goldens/.'
    )
    parser.add_argument('--json',
                        action='store_true',
                        help='Emit full JSON report to stdout.')
    return parser


def main(argv=None):
    parser = build_parser()
    options = parser.parse_args(argv)
    summary = collect_cl_results(cl=options.cl,
                                 patchset=options.patchset,
                                 builder_pattern=options.builder,
                                 test_filter=options.test_filter,
                                 output_dir=options.output_dir,
                                 apply_goldens=options.apply_goldens)
    if options.json:
        print(json.dumps(summary, indent=2))
    else:
        print_human_summary(summary)


if __name__ == '__main__':
    main()
