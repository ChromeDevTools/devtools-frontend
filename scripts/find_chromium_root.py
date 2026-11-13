#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Finds the root of the Chromium checkout that DevTools is part of (if any).

DevTools can live in different places:

  * In a standalone checkout: `<gclient root>/devtools-frontend`.
  * Inside a Chromium checkout, e.g. `<gclient root>/src/third_party/devtools`
    or `<gclient root>/src/third_party/devtools-frontend/src`.

Instead of hard-coding the location of DevTools inside Chromium, we look for
the closest `.gclient` file in the ancestors of the DevTools directory and
check where DevTools is relative to the solutions listed in there:

  * DevTools is strictly inside of a solution's directory: that solution is
    the Chromium checkout (typically `src`).
  * DevTools is a solution itself or is not covered by any solution: we are
    in a standalone checkout.

If there is no `.gclient` file at all (e.g. in a Chromium source tarball), we
fall back to looking for `chrome/VERSION` in the ancestors of the DevTools
directory. If that doesn't exist either, we are in a standalone checkout.

Symbolic links are intentionally not resolved. This way a standalone checkout
that is symlinked into a Chromium checkout is treated as part of Chromium when
it is accessed via the symlink.

Use `find_chromium_root()` from Python, or run this file as a script. The
script prints the absolute path of the Chromium root, or nothing for a
standalone checkout. This is how `devtools_paths.js` reuses this logic.
"""

import argparse
import os
import sys

GCLIENT_FILE_NAME = '.gclient'
CHROME_VERSION_FILE = ('chrome', 'VERSION')


class GclientParseError(Exception):
    """Raised when the `.gclient` file can't be understood."""


def _default_devtools_root():
    # Don't resolve symlinks here, see module docstring.
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def find_gclient_root(start_dir):
    """Returns the closest directory at or above `start_dir` that contains a
    `.gclient` file, or None if there is no such directory."""
    current = os.path.abspath(start_dir)
    while True:
        if os.path.isfile(os.path.join(current, GCLIENT_FILE_NAME)):
            return current
        parent = os.path.dirname(current)
        if parent == current:
            return None
        current = parent


def find_chromium_root_by_version_file(devtools_root):
    """Returns the closest directory above `devtools_root` that contains a
    `chrome/VERSION` file, or None if there is no such directory.

    This is the fallback for Chromium checkouts without a `.gclient` file,
    e.g. source tarballs.
    """
    current = os.path.dirname(os.path.abspath(devtools_root))
    while True:
        if os.path.isfile(os.path.join(current, *CHROME_VERSION_FILE)):
            return current
        parent = os.path.dirname(current)
        if parent == current:
            return None
        current = parent


def parse_gclient_solution_names(gclient_file):
    """Returns the names of the solutions listed in the given `.gclient` file.

    A `.gclient` file is a Python file, so we execute it the same way gclient
    does and look at the resulting `solutions`.
    """
    scope = {}
    try:
        with open(gclient_file, 'r', encoding='utf-8') as f:
            exec(compile(f.read(), gclient_file, 'exec'), scope)  # pylint: disable=exec-used
    except Exception as e:  # pylint: disable=broad-except
        raise GclientParseError(f'Unable to parse {gclient_file}: {e}') from e

    solutions = scope.get('solutions', [])
    if not isinstance(solutions, (list, tuple)):
        raise GclientParseError(
            f'`solutions` in {gclient_file} is not a list.')

    names = []
    for solution in solutions:
        name = solution.get('name') if isinstance(solution, dict) else None
        if not isinstance(name, str) or not name:
            raise GclientParseError(
                f'Solution without a name in {gclient_file}: {solution!r}')
        names.append(name)
    return names


def _is_strictly_inside(directory, child):
    directory = os.path.normcase(directory)
    child = os.path.normcase(child)
    if directory == child:
        return False
    try:
        return os.path.commonpath([directory, child]) == directory
    except ValueError:
        # E.g. different drives on Windows.
        return False


def find_chromium_root(devtools_root=None):
    """Returns the absolute path to the root of the Chromium checkout (the
    `chromium/src` directory) that contains DevTools, or None if DevTools is
    a standalone checkout.

    Args:
      devtools_root: The root directory of DevTools. Defaults to the DevTools
          directory that contains this file. Symlinks are not resolved.

    Raises:
      GclientParseError: The `.gclient` file was found but can't be parsed.
    """
    if devtools_root is None:
        devtools_root = _default_devtools_root()
    devtools_root = os.path.abspath(devtools_root)

    gclient_root = find_gclient_root(devtools_root)
    if gclient_root is None:
        return find_chromium_root_by_version_file(devtools_root)

    gclient_file = os.path.join(gclient_root, GCLIENT_FILE_NAME)
    for name in parse_gclient_solution_names(gclient_file):
        solution_dir = os.path.normpath(os.path.join(gclient_root, name))
        if _is_strictly_inside(solution_dir, devtools_root):
            return solution_dir
    return None


def main(argv):
    parser = argparse.ArgumentParser(description=(
        'Prints the root of the Chromium checkout that DevTools is part of. '
        'Prints nothing if DevTools is a standalone checkout.'))
    parser.add_argument(
        '--devtools-root',
        help=('Root directory of DevTools. Symlinks are not resolved. '
              'Defaults to the checkout that contains this script.'))
    options = parser.parse_args(argv)

    try:
        chromium_root = find_chromium_root(options.devtools_root)
    except GclientParseError as e:
        print(e, file=sys.stderr)
        return 1

    if chromium_root is not None:
        print(chromium_root)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
