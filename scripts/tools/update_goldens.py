#!/usr/bin/env python3
# Copyright 2023 The DevTools Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""This tool aims to assist you with screenshot changes.

Whenever your changes impact the screenshots in the Interaction tests you will
need to update (or add) those screenshots for all the supported platforms.

Assuming that you committed your current changes and uploaded the CL, you will
first need to trigger a group of special builders that will try to detect any
such screenshot changes. Use:
\x1b[32m  update_goldens.py trigger  \x1b[0m
for that.

After you wait for those builders to finish you will want to get the proposed
changes on your development environment. Simply run:
\x1b[32m  update_goldens.py update  \x1b[0m
If there are still builders that did not finish you will be notified and asked
to wait a little longer.

Finally inspect the screenshot changes that are now present (if any) on your
development machine. If they look as expected add, commit and upload. You
should not get any additional screenshot changes if you repeat the steps above,
provided you did not perform any additional changes in the code.
"""

import argparse
import json
import os
import re
import tempfile
import time
import subprocess
import sys


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
GSUTIL = os.path.join(DEPOT_TOOLS_DIR, 'gsutil.py')
VPYTHON = os.path.join(DEPOT_TOOLS_DIR, 'vpython3')
GOLDENS_DIR = os.path.join(BASE_DIR, 'test', 'interactions', 'goldens')

WARNING_BUILDERS_STILL_RUNNING = 'Patchset %s has builders that are still ' \
    'running.\nBuilders in progress:\n  %s\n'
WARNING_BUILDERS_FAILED = 'Patchset %s has builders that failed:\n  %s\n'
WARNING_BUILDERS_MISSING = 'Patchset %s does not have screenshot tests for ' \
    'all platform.\nOnly these builders found:\n  %s'
WARNING_GSUTIL_CONNECTIVITY = (
    'Ups! gsutil seems to not work for you right '
    'now.\nThis is either a connectivity problem or a configuration issue.\n'
    'Make sure you are logged in with your Google account and you are included '
    'in the devtools-dev@google.com group.\n'
    'Try running "./third_party/depot_tools/gsutil.py config" command.\n'
    'When prompted for a project id, please use "v8-infra".\n')
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
    if not options.command:
        parser.print_help()
        sys.exit(1)
    options.func(project_config, options)


def build_parser():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        formatter_class=argparse.RawTextHelpFormatter, epilog=__doc__)
    sp = parser.add_subparsers(dest='command')

    trigger_help = 'Triggers screenshot builders for the current patchset.'
    trigger_parser = sp.add_parser('trigger',
                                   description=trigger_help,
                                   help=trigger_help)
    trigger_parser.add_argument(
        '--ignore-triggered',
        action='store_true',
        help='Ignore any existing results or triggered builders on the '
        'current patch.')
    trigger_parser.set_defaults(func=trigger)

    update_help = 'Downloads the screenshots from the builders and applies ' \
        'them locally.'
    update_parser = sp.add_parser('update',
                                  description=update_help,
                                  help=update_help)
    mutually_exclusive = update_parser.add_mutually_exclusive_group()
    mutually_exclusive.add_argument(
        '--patchset',
        help='The patchset number from where to download screenshot changes. '
        'If not provided it defaults to the latest patchset.')
    update_parser.add_argument(
        '--ignore-failed',
        action='store_true',
        help='Ignore results comming from failed builders.')
    mutually_exclusive.add_argument(
        '--retry',
        action='store_true',
        help='Re-trigger failed builders (when dealing with flakes).')
    update_parser.add_argument('--wait-sec', type=int,
        help='Wait and retry update every specified number of seconds. ' \
            'Minimum value is 30s to avoid overwhelming Gerrit.')
    update_parser.set_defaults(func=update)

    help_help = 'Show help.'
    help_parser = sp.add_parser('help', description=help_help, help=help_help)
    help_parser.add_argument('name',
                             nargs='?',
                             help='Command to show help for')
    help_parser.set_defaults(func=get_help(parser, sp))

    parser.add_argument('--verbose',
                        action='store_true',
                        help='Show more debugging info')

    return parser


def trigger(project_config, options):
    check_results_exist(project_config, options.ignore_triggered)
    trigger_screenshots(project_config, options.verbose)


def update(project_config, options):
    test_clean_git()
    test_gsutil_connectivity(project_config)
    wait_sec = options.wait_sec
    if wait_sec:
        wait_sec = max(wait_sec, 30)
    apply_patch_to_local(project_config, options.patchset, wait_sec,
                         options.ignore_failed, options.retry, options.verbose)


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


def test_gsutil_connectivity(project_config):
    """Test if gsutil needs to be configured for current user."""
    process = subprocess.Popen(gsutil_cmd('ls', project_config.gs_root),
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    _, stderr = process.communicate()
    if process.returncode != 0:
        print(stderr.decode('utf-8'), '\n')
        print(WARNING_GSUTIL_CONNECTIVITY)
        sys.exit(0)


def apply_patch_to_local(project_config, patchset, wait_sec, ignore_failed,
                         retry, verbose):
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
        with tempfile.TemporaryDirectory() as patch_dir:
            patches = download_patches(project_config, results, patch_dir,
                                       verbose)
            git_apply_patch(patches, verbose)
        print(INFO_PATCHES_APPLIED)
        sys.exit(0)
    print(f'Waiting {wait_sec} seconds ...')
    time.sleep(wait_sec)
    apply_patch_to_local(project_config, patchset, wait_sec, ignore_failed,
                         retry, verbose)


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
          'Make sure to run `update_goldens.py trigger` first.')
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


def download_patches(project_config, results, destination_dir, verbose):
    """Interact with GS and retrieve the patches. Since we have build results
    from successfull screenshot builds we know that they uploaded patches in
    the expected location in the cloud.
    """
    patches = []
    for builder, result in results.items():
        gs_path = [
            project_config.gs_folder, builder,
            str(result['cl']),
            str(result['patch']), 'screenshot.patch'
        ]
        gs_location = '/'.join(gs_path)
        patch_platform = builder.split('_')[-2]
        local_path = os.path.join(destination_dir, patch_platform + '.patch')
        if verbose:
            print('Downloading patch file from: ' + gs_location)
        run_command(gsutil_cmd('cp', gs_location, local_path), verbose)
        patches.append(local_path)
    return patches


def git_apply_patch(patches, verbose):
    """Apply downloaded patches to the local repo."""
    screenshot_patches = [p for p in patches if check_patch(p)]
    if screenshot_patches:
        run_command(
            ['git', 'apply', *screenshot_patches], verbose,
            'Unable to apply this patch. Maybe run "git clean" before retry.')
    else:
        print('No other changes found.')
        sys.exit(0)


def check_patch(patch):
    """Check if a particular patch file is empty."""
    if os.stat(patch).st_size == 0:
        print('Ignoring empty patch:%s\n' % patch)
        return False
    return True


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


def gsutil_cmd(*args):
    return [VPYTHON, GSUTIL] + list(args)


if __name__ == '__main__':
    print(
        "Deprecation warning: this script is deprecated and will be removed.\n"
        "Please use `update_goldens_v2.py` instead.\n"
        "Make sure you familiarize yourself with the new script via "
        "`update_goldens_v2.py --help.`\n"
        "Note: removal pending deprecation in other projects.")
