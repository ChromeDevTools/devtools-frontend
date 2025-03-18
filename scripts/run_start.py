#!/usr/bin/env vpython3
# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Start local DevTools front-end in Chrome.
"""

from os import path
import argparse
import devtools_paths
import logging
import platform
import subprocess
import sys

logger = logging.getLogger(__name__)

# The list of features that are enabled by default.
# These can be overridden with --disable-feature=FOO on the commandline
# if necessary.
ENABLE_FEATURES = [
    'DevToolsAutomaticFileSystems',
    'DevToolsCssValueTracing',
    'DevToolsFreeStyler:patching/true,user_tier/TESTERS',
    'DevToolsWellKnown',
]

# The list of features that are disabled by default.
# These can be overridden with --enable-feature=FOO on the commandline
# if necessary.
DISABLE_FEATURES = ['MediaRouter'] if platform.system() == 'Darwin' else []


def parse_options(args):
    parser = argparse.ArgumentParser(
        description='Run local DevTools front-end')
    parser.add_argument(
        '--browser',
        choices=['cft', 'canary'],
        default='cft',
        help=
        'launch in the specified browser, can be either "cft" (the default) or "canary"'
    )
    parser.add_argument('--canary',
                        action='store_const',
                        const='canary',
                        dest='browser',
                        help='launch in Chrome Canary')
    parser.add_argument('--enable-features',
                        action='append',
                        default=[],
                        help='enable experimental Chrome features')
    parser.add_argument('--disable-features',
                        action='append',
                        default=[],
                        help='disable experimental Chrome features')
    parser.add_argument('--no-auto-open-devtools-for-tabs',
                        action='store_true',
                        help='don\'t automatically open DevTools for new tabs')
    parser.add_argument(
        '-t',
        '--target',
        default='Default',
        help=
        'specify the target build subdirectory under //out (defaults to "Default")'
    )
    parser.add_argument('--verbose',
                        action='store_true',
                        help='enable verbose logging')
    parser.add_argument('URL',
                        nargs='*',
                        help='specify URL(s) to open by default')
    return parser.parse_args(args)


def build(options):
    """
    Build the DevTools front-end in the target identified by the `options`.
    """
    cwd = devtools_paths.root_path()
    outdir = path.join('out', options.target)
    autoninja = devtools_paths.autoninja_path()
    subprocess.check_call([autoninja, '-C', outdir], cwd=cwd)


def find_browser_binary(options):
    """
    Locate the correct browser binary (per `options`).
    """
    if options.browser == 'canary':
        binary = path.abspath(
            path.join(
                *{
                    'Linux': ('/usr', 'bin', 'google-chrome-canary'),
                    'Darwin': ('/Applications', 'Google Chrome Canary.app',
                               'Contents', 'MacOS', 'Google Chrome Canary'),
                }[platform.system()]))
        logger.debug('Located Chrome Canary binary in %s.', binary)
        return binary
    else:
        binary = devtools_paths.downloaded_chrome_binary_path()
        logger.debug('Located Chrome for Testing binary in %s.', binary)
        return binary


def start(options):
    """
    Launch Chrome with our custom DevTools front-end.
    """
    cwd = devtools_paths.root_path()
    args = [find_browser_binary(options)]

    # Custom flags for CfT.
    if options.browser == 'cft':
        args += ['--disable-infobars']  # Disable the CfT warning infobar.

    # Custom flags for macOS.
    if platform.system() == 'Darwin':
        args += ['--use-mock-keychain']

    # Disable/Enable experimental features, starting with defaults.
    args += ['--disable-features=%s' % f for f in DISABLE_FEATURES]
    args += ['--enable-features=%s' % f for f in ENABLE_FEATURES]
    args += ['--disable-features=%s' % f for f in options.disable_features]
    args += ['--enable-features=%s' % f for f in options.enable_features]

    # Open with our freshly built DevTools front-end.
    args += [
        '--custom-devtools-frontend=file://%s' %
        devtools_paths.custom_devtools_frontend_path(options.target)
    ]

    # Chrome flags and URLs.
    if not options.no_auto_open_devtools_for_tabs:
        args += ['--auto-open-devtools-for-tabs']
    args += options.URL

    # Launch Chrome.
    logger.debug('Launch Chrome: %s', ' '.join(args))
    subprocess.check_call(args, cwd=cwd)


if __name__ == '__main__':
    OPTIONS = parse_options(sys.argv[1:])
    logging.basicConfig(
        level=logging.DEBUG if OPTIONS.verbose else logging.INFO)
    build(OPTIONS)
    start(OPTIONS)
