# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Runs an arbitrary command and preserves modification times for unchanged outputs.

Compilers (such as `tsc`) often rewrite output files unconditionally, updating
their modification timestamps (`mtime`) even when their contents have not
changed. In Ninja, this triggers cascading rebuilds of downstream targets.

This script acts as a transparent wrapper:
1. It records SHA1 hashes and modification timestamps (`mtime`) of existing
   tracked outputs before invoking the command.
2. It executes the specified compiler command.
3. If the command succeeds, it compares the SHA1 hash of each tracked output.
   If the content has not changed, the original `mtime` is restored.

When paired with Ninja's `restat = 1` action rule, unchanged outputs prevent
unnecessary downstream rebuilds, significantly accelerating incremental builds.

Usage:
  run_with_restat.py [<tracked_output>...] -- <command> [<command_args>...]

Any argument starting with '@' (e.g. '@path/to/response_file.rsp') is expanded
in-place, allowing all tracked outputs, the '--' separator, and compiler
arguments to be passed inside a single GN/Ninja response file:
  run_with_restat.py @{{response_file_name}}
"""

import hashlib
import os
import subprocess
import sys

_SCRIPTS_BUILD_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPTS_BUILD_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_BUILD_DIR)

from response_file import expand_response_files


def hash_file(path):
    h = hashlib.sha1()
    try:
        with open(path, 'rb') as f:
            while chunk := f.read(65536):
                h.update(chunk)
        return h.digest()
    except OSError:
        return None


def main():
    args = expand_response_files(sys.argv[1:])

    if '--' not in args:
        print(
            "Usage: run_with_restat.py [<tracked_output>...] -- <command> [args...]",
            file=sys.stderr)
        print("       (Arguments and @response_files are expanded in-place)",
              file=sys.stderr)
        sys.exit(1)

    dash_index = args.index('--')
    tracked_files = args[:dash_index]
    command_args = args[dash_index + 1:]

    if not command_args:
        print("Error: No command specified after '--'", file=sys.stderr)
        sys.exit(1)

    # Record existing state of tracked output files (nanosecond precision)
    before_state = {}
    for path in tracked_files:
        try:
            st = os.stat(path)
            digest = hash_file(path)
            if digest is not None:
                before_state[path] = (st.st_atime_ns, st.st_mtime_ns, digest)
        except OSError:
            pass

    # Execute the command
    ret = subprocess.call(command_args)
    if ret != 0:
        if ret < 0:
            sys.exit(128 - ret)
        sys.exit(ret)

    # Restore exact nanosecond timestamps for tracked files whose contents are identical
    for path, (old_atime_ns, old_mtime_ns, old_digest) in before_state.items():
        if os.path.exists(path):
            try:
                new_digest = hash_file(path)
                if new_digest == old_digest:
                    os.utime(path, ns=(old_atime_ns, old_mtime_ns))
            except OSError:
                pass

    sys.exit(0)


if __name__ == '__main__':
    main()
