# Copyright 2024 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

# This file extracts the `set_lpac_acls` function from
# chromium/src/testing/scripts/common.py.
# Otherwise we'd have to pull in all of chromium/src/testing.

# We need to set the lpac ACLs on windows for the CfT binary.
# See https://bit.ly/31yqMJR.

import argparse
import codecs
import contextlib
import logging
import os
import platform
import subprocess
import sys
import tempfile

logging.basicConfig(level=logging.INFO)

# ACL might be explicitly set or inherited.
CORRECT_ACL_VARIANTS = [
    'APPLICATION PACKAGE AUTHORITY' \
    '\\ALL RESTRICTED APPLICATION PACKAGES:(OI)(CI)(RX)', \
    'APPLICATION PACKAGE AUTHORITY' \
    '\\ALL RESTRICTED APPLICATION PACKAGES:(I)(OI)(CI)(RX)'
]

# pylint: disable=useless-object-inheritance


def set_lpac_acls(acl_dir, is_test_script=False):
    """Sets LPAC ACLs on a directory. Windows 10 only."""
    if platform.release() != '10':
        return
    try:
        existing_acls = subprocess.check_output(['icacls', acl_dir],
                                                stderr=subprocess.STDOUT,
                                                universal_newlines=True)
    except subprocess.CalledProcessError as e:
        logging.error('Failed to retrieve existing ACLs for directory %s',
                      acl_dir)
        logging.error('Command output: %s', e.output)
        sys.exit(e.returncode)
    acls_correct = False
    for acl in CORRECT_ACL_VARIANTS:
        if acl in existing_acls:
            acls_correct = True
    if not acls_correct:
        try:
            existing_acls = subprocess.check_output(
                ['icacls', acl_dir, '/grant', '*S-1-15-2-2:(OI)(CI)(RX)'],
                stderr=subprocess.STDOUT)
        except subprocess.CalledProcessError as e:
            logging.error('Failed to retrieve existing ACLs for directory %s',
                          acl_dir)
            logging.error('Command output: %s', e.output)
            sys.exit(e.returncode)
    if not is_test_script:
        return
    # Bots running on luci use hardlinks that do not have correct ACLs so these
    # must be manually overridden here.
    with temporary_file() as tempfile_path:
        subprocess.check_output(
            ['icacls', acl_dir, '/save', tempfile_path, '/t', '/q', '/c'],
            stderr=subprocess.STDOUT)
        # ACL files look like this, e.g. for c:\a\b\c\d\Release_x64
        #
        # Release_x64
        # D:AI(A;OICI;0x1200a9;;;S-1-15-2-2)(A;OICIID;FA;;;BA)
        # Release_x64\icudtl_extra.dat
        # D:AI(A;ID;0x1200a9;;;S-1-15-2-2)(A;ID;FA;;;BA)(A;ID;0x1301bf;;;BU)
        with codecs.open(tempfile_path, encoding='utf_16_le') as aclfile:
            for filename in aclfile:
                acl = next(aclfile).strip()
                full_filename = os.path.abspath(
                    os.path.join(acl_dir, os.pardir, filename.strip()))
                if 'S-1-15-2-2' in acl:
                    continue
                if os.path.isdir(full_filename):
                    continue
                subprocess.check_output(
                    ['icacls', full_filename, '/grant', '*S-1-15-2-2:(RX)'],
                    stderr=subprocess.STDOUT)


@contextlib.contextmanager
def temporary_file():
    fd, path = tempfile.mkstemp()
    os.close(fd)
    try:
        yield path
    finally:
        os.remove(path)


def script_main():
    parser = argparse.ArgumentParser(
        description='Sets App Container ACL on a directory')
    parser.add_argument("dir", help='Set ACL on this directory')
    set_lpac_acls(parser.parse_args().dir, is_test_script=True)


if __name__ == '__main__':
    script_main()
