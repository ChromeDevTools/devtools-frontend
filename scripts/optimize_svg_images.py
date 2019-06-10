#!/usr/bin/env python
# Copyright (c) 2014 Google Inc. All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are
# met:
#
#     * Redistributions of source code must retain the above copyright
# notice, this list of conditions and the following disclaimer.
#     * Redistributions in binary form must reproduce the above
# copyright notice, this list of conditions and the following disclaimer
# in the documentation and/or other materials provided with the
# distribution.
#     * Neither the name of Google Inc. nor the names of its
# contributors may be used to endorse or promote products derived from
# this software without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
# A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
# OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
# LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
# DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
# THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

import os
import os.path
import subprocess
import sys

from build import devtools_file_hashes

try:
    import json
except ImportError:
    import simplejson as json

scripts_path = os.path.dirname(os.path.abspath(__file__))
devtools_path = os.path.dirname(scripts_path)
blink_source_path = os.path.dirname(devtools_path)
blink_path = os.path.dirname(blink_source_path)
chromium_src_path = os.path.dirname(os.path.dirname(blink_path))
devtools_frontend_path = os.path.join(devtools_path, "front_end")
images_path = os.path.join(devtools_frontend_path, "Images")
image_sources_path = os.path.join(images_path, "src")
HASHES_FILE_NAME = "optimize_svg.hashes"
HASHES_FILE_PATH = os.path.join(image_sources_path, HASHES_FILE_NAME)

file_names = os.listdir(image_sources_path)
svg_file_paths = [os.path.join(image_sources_path, file_name) for file_name in file_names if file_name.endswith(".svg")]
SVG_FILE_PATHS_TO_OPTIMIZE = devtools_file_hashes.files_with_invalid_hashes(HASHES_FILE_PATH, svg_file_paths)
SVG_FILE_NAMES = [os.path.basename(file_path) for file_path in SVG_FILE_PATHS_TO_OPTIMIZE]


def check_installed(app_name):
    proc = subprocess.Popen("which %s" % app_name, stdout=subprocess.PIPE, shell=True)
    proc.communicate()
    if proc.returncode != 0:
        print "This script needs \"%s\" to be installed." % app_name
        sys.exit(1)


check_installed("npx")


def optimize_svg(svg_input_path):
    svg_output_path = os.path.join(images_path, os.path.basename(svg_input_path))
    optimize_command = "npx svgo -i %s -o %s" % (svg_input_path, svg_output_path)
    proc = subprocess.Popen(optimize_command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=True, cwd=chromium_src_path)
    return proc


if len(SVG_FILE_NAMES):
    print "%d unoptimized svg files found." % len(SVG_FILE_NAMES)
else:
    print "All svg files are already optimized."
    sys.exit()

processes = {}
for svg_file_path in SVG_FILE_PATHS_TO_OPTIMIZE:
    name = os.path.splitext(os.path.basename(svg_file_path))[0]
    processes[name] = optimize_svg(svg_file_path)

for file_name, proc in processes.items():
    (optimize_out, _) = proc.communicate()
    print("Optimization of %s finished: %s" % (file_name, optimize_out))

devtools_file_hashes.update_file_hashes(HASHES_FILE_PATH, svg_file_paths)
