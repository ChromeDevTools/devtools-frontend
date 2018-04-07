#!/usr/bin/env python
# Copyright 2016 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import sys
import zipfile

if len(sys.argv) < 3:
    print('Usage: {} <src> <dest>'.format(sys.argv[0]))
    print(' <src> full path to zip file to be extracted')
    print(' <dest> full path to destination folder')
    sys.exit(1)

src = sys.argv[1]
dest = sys.argv[2]

zip_ref = zipfile.ZipFile(src, 'r')
zip_ref.extractall(dest)
zip_ref.close()
