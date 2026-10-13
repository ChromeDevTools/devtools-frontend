#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Runs the scripts defined in package.json without depending on npm.

Usage:
  dt.py                    List the available scripts.
  dt.py <script> [args]    Run the package.json script <script>.

Everything after <script> is forwarded to the script as-is, `--` included.
Unlike with `npm run`, options don't need `--` to get past dt.py, so
`npm run test -- foo` becomes `dt.py test foo`.

This reproduces the parts of `npm run` that the scripts in package.json rely
on:
  * `pre<script>` and `post<script>` run before and after <script>.
  * Scripts run from the directory containing package.json, through the
    platform shell (`sh -c` or `cmd /c`), with node_modules/.bin on the PATH.

Like the scripts themselves, this needs `vpython3` (depot_tools) on the PATH.
"""

import argparse
import json
import os
import shlex
import signal
import subprocess
import sys

REPO_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DESCRIPTION = """\
Runs a script from package.json without npm. Arguments after the script name
are forwarded to it as-is."""


def load_scripts(package_json_path):
    """Returns the "scripts" of the package.json file at the given path."""
    with open(package_json_path, encoding='utf-8') as f:
        return json.load(f).get('scripts', {})


def quote_arg(arg):
    """Quotes `arg` so that the platform shell passes it on unchanged.

    On Windows this is best effort: the quoting follows the rules for
    splitting a command line into arguments, but does not escape the special
    characters of cmd.exe, such as & or |.
    """
    if os.name == 'nt':
        return subprocess.list2cmdline([arg])
    return shlex.quote(arg)


def plan_commands(scripts, name, args):
    """Returns the shell commands that running script `name` consists of.

    Like `npm run`, this runs `pre<name>` and `post<name>` around the script if
    they exist, and appends `args` to the script.
    """
    commands = []
    if f'pre{name}' in scripts:
        commands.append(scripts[f'pre{name}'])
    quoted_args = [quote_arg(arg) for arg in args]
    commands.append(' '.join([scripts[name]] + quoted_args))
    if f'post{name}' in scripts:
        commands.append(scripts[f'post{name}'])
    return commands


def script_env(root):
    """Returns the environment scripts run in, set up like `npm run` does."""
    env = dict(os.environ)
    bin_dir = os.path.join(root, 'node_modules', '.bin')
    env['PATH'] = os.pathsep.join(filter(None, [bin_dir, env.get('PATH')]))
    return env


def run_command(command, cwd, env):
    """Runs `command` in the platform shell and returns its exit code.

    Like `subprocess.call`, this returns -N for a command that was killed by
    signal N (POSIX).
    """
    try:
        return subprocess.call(command, shell=True, cwd=cwd, env=env)
    except KeyboardInterrupt:
        # subprocess has given the child a moment to exit, and killed it if it
        # didn't. Report the interruption the way a shell does.
        return 128 + signal.SIGINT


def format_scripts(scripts):
    """Returns a listing of the scripts and the commands they run."""
    width = max(map(len, scripts), default=0)
    lines = ['scripts:']
    for name, command in scripts.items():
        lines.append(f'  {name:<{width}}  {command}')
    return '\n'.join(lines)


def create_parser(scripts):
    """Returns the parser for the arguments that dt.py itself takes."""
    parser = argparse.ArgumentParser(
        prog='dt.py',
        usage='%(prog)s [-h] [script] [args ...]',
        description=DESCRIPTION,
        epilog=format_scripts(scripts),
        formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('script',
                        nargs='?',
                        choices=list(scripts),
                        metavar='script',
                        help='the script to run; omit to list the scripts')
    return parser


def split_argv(argv):
    """Splits `argv` into the arguments for dt.py and those for the script.

    The script is named by the first argument that is not an option. The
    arguments after it are for the script and have to reach it untouched, so
    they are kept away from argparse, which would try to make sense of the
    options among them.
    """
    for index, arg in enumerate(argv):
        if not arg.startswith('-'):
            return argv[:index + 1], argv[index + 1:]
    return argv, []


def main(argv=None, root=REPO_ROOT):
    """Runs the script named in the arguments and returns an exit code."""
    argv = sys.argv[1:] if argv is None else argv
    scripts = load_scripts(os.path.join(root, 'package.json'))
    parser = create_parser(scripts)
    own_args, script_args = split_argv(argv)
    name = parser.parse_args(own_args).script
    if name is None:
        parser.print_help()
        return 0

    env = script_env(root)
    for command in plan_commands(scripts, name, script_args):
        print(f'$ {command}', file=sys.stderr)
        returncode = run_command(command, root, env)
        if returncode:
            return returncode
    return 0


if __name__ == '__main__':
    sys.exit(main())
