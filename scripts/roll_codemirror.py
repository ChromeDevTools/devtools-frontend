# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Helper script to update CodeMirror from upstream.
"""

import argparse
import glob
import os
import shutil
import subprocess
import sys


def parse_options(cli_args):
    parser = argparse.ArgumentParser(description='Roll CodeMirror')
    parser.add_argument('cm_dir', help='CodeMirror directory')
    parser.add_argument('devtools_dir', help='DevTools directory')
    return parser.parse_args(cli_args)


def run_npm(options):
    print 'Building CodeMirror in %s' % os.path.abspath(options.cm_dir)
    subprocess.check_output(['npm', 'install'], cwd=options.cm_dir, stderr=subprocess.PIPE)
    subprocess.check_output(['npm', 'run', 'build'], cwd=options.cm_dir, stderr=subprocess.PIPE)


def copy_lib_files(options):
    print 'Copying codemirror.js and codemirror.css'
    result = ''
    target_dir = os.path.join(options.devtools_dir, 'front_end', 'cm')

    with open(os.path.join(options.cm_dir, 'lib', 'codemirror.js'), 'r') as read:
        lines = read.readlines()
    with open(os.path.join(target_dir, 'codemirror.js'), 'w') as write:
        for line in lines:
            if 'CodeMirror.version =' in line:
                result = line.strip()
            write.write(line)

    with open(os.path.join(options.cm_dir, 'lib', 'codemirror.css'), 'r') as read:
        lines = read.readlines()
    found_stop = False
    with open(os.path.join(target_dir, 'codemirror.css'), 'w') as write:
        for line in lines:
            if found_stop:
                write.write(line)
            elif '/* STOP */' in line:
                found_stop = True
    assert found_stop
    return result


def copy_headless_file(options):
    print 'Copying runmode-standalone.js into headlesscodemirror.js'
    source_file = os.path.join(options.cm_dir, 'addon', 'runmode', 'runmode-standalone.js')
    target_file = os.path.join(options.devtools_dir, 'front_end', 'cm_headless', 'headlesscodemirror.js')

    with open(source_file, 'r') as read:
        lines = read.readlines()
    with open(target_file, 'w') as write:
        write.write('// Content of the function is equal to runmode-standalone.js file\n')
        write.write('// from CodeMirror distribution\n')
        write.write('(function(window) {\n')
        for line in lines:
            write.write(line)
        write.write('}(this))\n')


def find_and_copy_js_files(source_dir, target_dir, filter_fn):
    for f in os.listdir(target_dir):
        if not filter_fn(f):
            continue
        target_file = os.path.join(target_dir, f)
        if not os.path.isfile(os.path.join(target_dir, f)):
            continue
        source = glob.glob(os.path.join(source_dir, '*', f))
        assert len(source) == 1
        source_file = source[0]
        print 'Copying %s from %s' % (target_file, source_file)
        shutil.copyfile(source_file, target_file)


def copy_cm_files(options):
    source_dir = os.path.join(options.cm_dir, 'addon')
    target_dir = os.path.join(options.devtools_dir, 'front_end', 'cm')

    def cm_filter(f):
        return f.endswith('.js') and f != 'codemirror.js'

    find_and_copy_js_files(source_dir, target_dir, cm_filter)


def copy_cm_modes_files(options):
    source_dir = os.path.join(options.cm_dir, 'mode')
    target_dir = os.path.join(options.devtools_dir, 'front_end', 'cm_modes')

    def cm_modes_filter(f):
        return f.endswith('.js') and f != 'DefaultCodeMirrorMimeMode.js'

    find_and_copy_js_files(source_dir, target_dir, cm_modes_filter)


def copy_cm_web_modes_files(options):
    source_dir = os.path.join(options.cm_dir, 'mode')
    target_dir = os.path.join(options.devtools_dir, 'front_end', 'cm_web_modes')

    def cm_web_modes_filter(f):
        return f.endswith('.js')

    find_and_copy_js_files(source_dir, target_dir, cm_web_modes_filter)


if __name__ == '__main__':
    OPTIONS = parse_options(sys.argv[1:])
    run_npm(OPTIONS)
    copy_cm_files(OPTIONS)
    copy_cm_modes_files(OPTIONS)
    copy_cm_web_modes_files(OPTIONS)
    copy_headless_file(OPTIONS)
    VERSION = copy_lib_files(OPTIONS)
    print VERSION
