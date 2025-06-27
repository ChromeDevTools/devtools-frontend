#!/usr/bin/env python3
# Copyright 2023 The DevTools Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""The purpose of this CLI tool is to help you manage changes to screenshots in
tests across multiple platforms.

For more information, see test/README.md.

If you've made changes that impact the screenshots, you'll need to update them
for all supported platforms. Assuming you've committed your changes and
uploaded the CL, you'll need to trigger a dry run in Gerrit or execute the
command:
\x1b[32m git cl try \x1b[0m

After waiting for the dry run to complete, you can execute the command:
\x1b[32m update_goldens.py \x1b[0m

Any failing test will generate updated screenshots, which will be downloaded and
applied to your local change. Inspect the status of your working copy for any
such screenshot updates. If you have new screenshots and they look as expected,
add, commit, and upload the changes. If you repeat the steps above without
making any additional changes to the code, you should not have any more
screenshot tests failing.
"""

import argparse
import json
import os
import re
import time
import shutil
import ssl
import subprocess
import sys
import urllib.request

ssl._create_default_https_context = ssl._create_unverified_context

class ProjectConfig:
    def __init__(self,
                 name='devtools-frontend',
                 gs_root='gs://devtools-frontend-screenshots',
                 builder_prefix='devtools_screenshot',
                 platforms=None,
                 ignore_failed_builders=False):
        self.name = name
        self.gs_root = gs_root
        self.gs_folder = self.gs_root + '/screenshots'
        self.builder_prefix = builder_prefix
        self.platforms = platforms or ['linux', 'mac', 'win']
        platforms_re = "|".join(self.platforms)
        self.builder_pattern = (f'{self.builder_prefix}_({platforms_re})_rel')
        self.ignore_failed_builders = ignore_failed_builders


TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.normpath(os.path.join(TOOLS_DIR, '..', '..'))
DEPOT_TOOLS_DIR = os.path.join(BASE_DIR, 'third_party', 'depot_tools')
VPYTHON = os.path.join(DEPOT_TOOLS_DIR, 'vpython3')
GOLDENS_DIR = os.path.join(BASE_DIR, 'test', 'goldens')

WARNING_BUILDERS_STILL_RUNNING = 'Patchset %s has builders that are still ' \
    'running.\nBuilders in progress:\n  %s\n'
WARNING_BUILDERS_FAILED = 'Patchset %s has builders that failed:\n  %s\n'
WARNING_BUILDERS_MISSING = 'Patchset %s does not have screenshot tests for ' \
    'all platform.\nOnly these builders found:\n  %s'
WARNING_GCS_CONNECTIVITY = (
    'Ups! "gcloud storage" seems to not work for you right '
    'now.\nThis is either a connectivity problem or a configuration issue.\n'
    'Make sure you are logged in with your Google account and you are included '
    'in the devtools-dev@google.com group.\n'
    'Try running "gcloud config set core/project v8-infra" command.\n')
WARNING_GIT_DIRTY = 'Before attempting to apply screenshot patches, please' \
    'make sure your local repo is clean.\nFolder %s seems to contain ' \
    'un-committed changes.' % GOLDENS_DIR
WARNING_RESULTS_EXIST = 'Screenshot builders were already triggered for the' \
    ' current patch!'

INFO_BUILDERS_TRIGGERED = 'Screenshot builders were triggered for the ' \
    'current patchset.'
INFO_PATCHES_APPLIED = 'Patches containing screenshot updates were ' \
    'applied to your local repo.\n To quickly see what is new just run "git ' \
    'status".'

def main(project_config, *args):
    parser = build_parser()
    options = parser.parse_args(*args)
    update(project_config, options)


def build_parser():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        formatter_class=argparse.RawTextHelpFormatter, epilog=__doc__)

    parser.add_argument('--wait-sec', type=int,
        help='Wait and retry update every specified number of seconds. ' \
            'Minimum value is 30s to avoid overwhelming Gerrit.')
    parser.set_defaults(func=update)
    parser.add_argument('--verbose',
                        action='store_true',
                        help='Show more debugging info')

    #Deprecated options. These are no longer used, but are kept here
    #to avoid breaking existing scripts."""
    parser.add_argument('--patchset',
                        help='Deprecated. Not used by this tool.')
    parser.add_argument('--ignore-failed',
                        help='Deprecated. Not used by this tool.')
    parser.add_argument('--retry', help='Deprecated. Not used by this tool.')

    return parser

def update(project_config, options):
    test_clean_git()
    wait_sec = options.wait_sec
    if wait_sec:
        wait_sec = max(wait_sec, 30)
    query_rdb_for_screenshots(project_config, options.patchset, wait_sec,
                              options.ignore_failed, options.retry,
                              options.verbose)


def query_rdb_for_screenshots(project_config, patchset, wait_sec,
                              ignore_failed, retry, verbose):
    """Download and apply the patches from the builders."""
    results = screenshot_results(project_config, patchset)
    check_not_empty(results)
    check_all_platforms(project_config, results)
    retry, should_wait = check_all_success(project_config, results, wait_sec,
                                           ignore_failed, retry)
    if retry:
        # Avoiding to force the user to run a 'trigger' command
        trigger_screenshots(project_config, retry)
        sys.exit(0)
    if not should_wait:
        download_generated_imgs(results)
        print(INFO_PATCHES_APPLIED)
        sys.exit(0)
    print(f'Waiting {wait_sec} seconds ...')
    time.sleep(wait_sec)
    query_rdb_for_screenshots(project_config, patchset, wait_sec,
                              ignore_failed, retry, verbose)


def download_generated_imgs(try_results):
    for _, try_result in try_results.items():
        if try_result['status'] == 'FAILURE':
            unexpected_results = get_unexpected_results(try_result['id'])
            for result in unexpected_results['testResults']:
                result = get_result_with_tags(result['name'])
                screenshot_path = get_screenshot_path(result)
                if not screenshot_path:
                    continue
                artifacts = list_artifacts(result['name'])
                for artifact in artifacts['artifacts']:
                    if artifact['artifactId'] in ['actual_image', 'generated']:
                        download_individual_screenshot(screenshot_path,
                                                       artifact['fetchUrl'])


def get_unexpected_results(invocation_suffix):
    invocation_id = f'build-{invocation_suffix}'
    return _rdb_rpc(
        'QueryTestResults', {
            "invocations": [f'invocations/{invocation_id}'],
            "predicate": {
                "excludeExonerated": True,
                "expectancy": "VARIANTS_WITH_ONLY_UNEXPECTED_RESULTS",
            }
        })


def get_result_with_tags(name):
    return _rdb_rpc('GetTestResult', {"name": name})


def list_artifacts(name):
    return _rdb_rpc('ListArtifacts', {
        "parent": name,
    })


def download_individual_screenshot(screenshot_path, fetchUrl):
    with urllib.request.urlopen(fetchUrl) as response:
        os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
        with open(screenshot_path, 'w+b') as screenshot_file:
            shutil.copyfileobj(response, screenshot_file)


def _rdb_rpc(service, request_payload):
    results_command = ['rdb', 'rpc', 'luci.resultdb.v1.ResultDB']
    results_command.append(service)
    p = subprocess.Popen(results_command,
                         stdin=subprocess.PIPE,
                         stdout=subprocess.PIPE,
                         stderr=subprocess.PIPE,
                         text=True)

    stdout, stderr = p.communicate(json.dumps(request_payload))
    if p.returncode != 0:
        # rdb doesn't return unique status codes for different errors, so we have to
        # just match on the output.
        if 'interactive login is required' in stderr:
            print("Authentication is required to fetch test metadata.\n" +
                  "Please run:\n\trdb auth-login\nand try again")
        else:
            print(f'rdb rpc {service} failed with: {stderr}')
        sys.exit(1)

    return json.loads(stdout)


def get_screenshot_path(individual_result):
    for tag in individual_result['tags']:
        if tag['key'] == 'run_phase' and tag['value'] != 'default':
            return None
        if tag['key'] == 'screenshot_path':
            return tag['value'].replace('\\', '/')
    return None

def get_help(parser, subparsers):
    def _help(options):
        if options.name:
            subparsers.choices[options.name].print_help()
        else:
            parser.print_help()

    return _help


def check_results_exist(project_config, ignore_triggered):
    """Verify the existence of previously triggered builders."""
    results = screenshot_results(project_config)
    if results:
        print(WARNING_RESULTS_EXIST)
        if not ignore_triggered:
            sys.exit(1)
        print('Ignoring ...')


def trigger_screenshots(project_config, verbose, builders=None):
    """Trigger screenshot builders for the current patch."""
    if not builders:
        builders = [
            f'{project_config.builder_prefix}_{p}_rel'
            for p in project_config.platforms
        ]
    try_command = f'git cl try -B {project_config.name}/try ' + ' '.join(
        [f'-b {b}' for b in builders])
    run_command(try_command.split(), verbose)
    print(INFO_BUILDERS_TRIGGERED)


def test_clean_git():
    """Test if the local repo can accept a patch with screenshots."""
    stdout = subprocess.check_output(
        ['git', 'status', '--porcelain', '--', GOLDENS_DIR])
    if stdout:
        print(stdout.decode('utf-8'))
        print(WARNING_GIT_DIRTY)
        sys.exit(0)


def screenshot_results(project_config, patchset=None):
    """Select only screenshot builders results."""
    results = read_try_results(patchset)
    screenshots = filter_screenshots(project_config, results)
    return filter_last_results(screenshots)


def read_try_results(patchset):
    """Collect results from the existing try-jobs."""
    results_command = ['git', 'cl', 'try-results', '--json=-']
    if patchset:
        results_command.extend(['-p', patchset])
    stdout = subprocess.check_output(results_command)
    if stdout:
        try:
            return json.loads(stdout)
        except Exception as e:
            print(f'Unable to parse try-results output. \n{str(e)}\n')
            print('Usually this goes away if you set SKIP_GCE_AUTH_FOR_GIT=1.')
            sys.exit(1)
    return {}


def filter_screenshots(project_config, results):
    """Remove results comming from other builders."""
    sht_results = []

    for r in results:
        if re.fullmatch(project_config.builder_pattern,
                        r['builder']['builder']):
            sht_results.append(r)
    return sht_results


def filter_last_results(results):
    """Select only the last results for each builder on the current patch."""
    last_results = {}
    for result in results:
        builder = result['builder']['builder']
        abbreviated_result = abbreviate_result(result)
        if not is_newer(abbreviated_result, last_results, builder):
            continue
        last_results[builder] = abbreviated_result
    return last_results


def abbreviate_result(result):
    cl, patch = find_buildset(result)
    build_id = int(result['id'])
    status = result['status']
    return dict(id=build_id, status=status, cl=cl, patch=patch)


def is_newer(abbreviated_result, last_results, builder):
    maybe_older = last_results.get(builder)
    if maybe_older:
        if not maybe_older['id'] > abbreviated_result['id']:
            return False
    return True


def find_buildset(result):
    """Select the CL number and the patch number from the result."""
    for t in result['tags']:
        if t['key'] == 'buildset':
            components = t['value'].split('/')
            return int(components[-2]), int(components[-1])
    raise RuntimeError('Cannot find tag buildset in a try-job result')


def check_not_empty(results):
    if results:
        return
    print('No screenshot test results found! ' +
          'Make sure to run CQ against your change first.')
    sys.exit(1)


def check_all_platforms(project_config, results):
    """Warn if any platform was not covered."""
    patchset = list(results.values())[0]['patch']
    if len(results) < len(project_config.platforms):
        print(WARNING_BUILDERS_MISSING %
              (patchset, '\n  '.join(results.keys())))


def check_all_success(project_config, results, wait_sec, ignore_failed, retry):
    """Verify and react to the presence of in progress or failed builds.
    Returns tuple (list of failed builders, boolean whether to wait)
    The list might be used to re-trigger if --retry options is set.
    The boolean, if true, will make the script wait and later make
    another attempt to collect results.
    """
    in_progress, failed = find_exceptions(results)
    if in_progress:
        warn_on_exceptions(results, in_progress,
                           WARNING_BUILDERS_STILL_RUNNING)
        return builders_in_progress(wait_sec)
    if failed and not project_config.ignore_failed_builders:
        warn_on_exceptions(results, failed, WARNING_BUILDERS_FAILED)
        return builders_failed(results, failed, ignore_failed, retry)
    return ([], False)


def find_exceptions(results):
    """Find the two kinds of results that we cannot process: builds in progress
    and failed builds"""
    assert results
    in_progress = []
    failed = []
    for builder, result in results.items():
        if result['status'] in ['STARTED', 'SCHEDULED']:
            in_progress.append(builder)
        elif result['status'] != 'SUCCESS':
            failed.append(builder)
    return in_progress, failed


def warn_on_exceptions(results, exceptions, warning):
    patchset = list(results.values())[0]['patch']
    status_lines = builder_status(results, exceptions)
    print(warning % (patchset, status_lines))


def builders_in_progress(wait_sec):
    if wait_sec:
        return ([], True)
    sys.exit(1)


def builders_failed(results, exceptions, ignore_failed, retry):
    if ignore_failed:
        for f in exceptions:
            results.pop(f)
        return ([], False)
    if retry:
        return (exceptions, False)
    sys.exit(1)


def builder_status(results, builders):
    return '\n  '.join(f'{b}: {results[b]["status"]}' for b in builders)


def run_command(command, verbose, message=None):
    """Run command and deal with return code and output from the subprocess"""
    process = subprocess.Popen(command,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    if verbose:
        print(stdout.decode('utf-8'))
    if process.returncode != 0:
        print(stderr.decode('utf-8'))
        if message:
            print(message)
        else:
            print('Ups! Something went wrong.')
        print('Try --verbose to debug.')
        sys.exit(1)


if __name__ == '__main__':
    main(
        ProjectConfig(platforms=['linux'],
                      builder_prefix='dtf',
                      ignore_failed_builders=True), sys.argv[1:])
