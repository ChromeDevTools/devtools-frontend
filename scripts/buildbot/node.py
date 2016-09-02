#!/usr/bin/env python
# Copyright (c) 2016 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import os
import shutil
import sys
import subprocess
import tarfile
import tempfile
import urllib2

THIS_DIR = os.path.dirname(os.path.abspath(__file__))

DEFAULT_VERSION = '4.5.0'
BUCKET = 'chromium-nodejs'


def install_latest_node_js(version, tmp_dir):
    target_dir = os.path.join(THIS_DIR, 'runtimes', version)
    version_file = os.path.join(target_dir, 'VERSION')

    if sys.platform == 'win32':
        bin_location = os.path.join(target_dir, 'node.exe')
    else:
        bin_location = os.path.join(target_dir, 'bin', 'node')

    # We assume that, if the VERSION file exists, then the installation is good.
    if os.path.exists(version_file):
        with open(version_file, 'r') as f:
            if f.read() == version:
                return bin_location

    # TODO(hinoka): This probably doesn't work that well on Windows...
    shutil.rmtree(target_dir, ignore_errors=True)

    # Get the target name correct.
    if sys.platform == 'win32':
        target = 'node.exe'
    elif sys.platform == 'darwin':
        target = 'node-v%s-darwin-x86.tar.gz' % version
    elif sys.platform == 'linux2':
        target = 'node-v%s-linux-x86.tar.gz' % version
    else:
        raise Exception('Unrecognized platform %s' % sys.platform)

    dest = os.path.join(tmp_dir, 'node_download')
    url = 'https://storage.googleapis.com/%s/%s/%s' % (
        BUCKET, version, target)
    print('Fetching %s' % url)
    u = urllib2.urlopen(url)
    with open(dest, 'wb') as f:
        while True:
            chunk = u.read(2 ** 20)
            if not chunk:
                break
            f.write(chunk)

    # When multiple node.py instances run at the same time for the first time,
    # the check to see whether or not the installation occured already.  But then
    # they all race to see who's the first to run shutil.move(), which obviously
    # fails for everyone other than the first instance.  This CL makes
    # os.rename() not fail, since its assumed that if it fails that means
    # someone else already created an installation.
    #
    # Another approach is to use an flock, but then it starts to get messy when
    # you have to keep polling filesystem state to see if another instance
    # finished, or add timeouts to remove an flock if it was left on the system by
    # a failed attempt, etc, etc.  This just seemed like a less flaky solution,
    # despite the fact that it means multiple network requests are spawned.
    write_version = True
    if sys.platform != 'win32':
        # The Windows version comes as a self contained executable, the other
        # versions come as a tar.gz that needs to be extracted.
        with tarfile.open(dest, 'r:gz') as f:
            f.extractall(path=tmp_dir)
        try:
            os.mkdir(os.path.join(THIS_DIR, 'runtimes'))
            os.rename(os.path.join(tmp_dir, target[:-len('.tar.gz')]),
                      target_dir)
        except OSError:
            write_version = False
        os.remove(dest)
    else:
        try:
            # Still potentiall racy, from python docs:
            # "On Windows...there may be no way to implement an atomic rename when dst
            # names an existing file."
            os.mkdir(target_dir)
            os.rename(dest, bin_location)
        except OSError:
            write_version = False

    if write_version:
        with open(version_file, 'w') as f:
            f.write(version)

    return bin_location


def main(mode=None):
    version = os.environ.get('NODE_VERSION', DEFAULT_VERSION)
    try:
        tmp_dir = tempfile.mkdtemp(dir=THIS_DIR)
        bin_location = install_latest_node_js(version, tmp_dir)
    finally:
        if os.path.exists(tmp_dir):
            shutil.rmtree(tmp_dir)

    if mode == 'npm':
        # TODO(hinoka): How about Windows...?
        bin_location = os.path.join(os.path.dirname(bin_location), 'npm')

    return subprocess.call([bin_location, ] + sys.argv[1:])


if __name__ == '__main__':
    sys.exit(main())
