// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import fs from 'node:fs/promises';
import path from 'node:path';

import {writeIfChanged} from './write-if-changed.js';

const [, , src, dest] = process.argv;

const srcPath = path.join(process.cwd(), src);
const destPath = path.join(process.cwd(), dest);

const srcContents = await fs.readFile(srcPath);
await writeIfChanged(destPath, srcContents);
