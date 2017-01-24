# Copyright 2016 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

from os import path
import subprocess
import sys

scripts_path = path.dirname(path.dirname(path.abspath(__file__)))
devtools_path = path.dirname(scripts_path)
eslint_path = path.join(devtools_path, "devtools-node-modules", "third_party", "node_modules", ".bin", "eslint")
node_path = path.join(scripts_path, "local_node", "runtimes", "4.5.0", "bin", "node")

eslint_proc = subprocess.Popen(
    args=[node_path, eslint_path, "front_end"], cwd=devtools_path, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
(eslint_proc_out, _) = eslint_proc.communicate()
print(eslint_proc_out)

if eslint_proc.returncode != 0:
    print("ERRORS DETECTED")
    sys.exit(1)
print("No linting errors found")
sys.exit(0)
