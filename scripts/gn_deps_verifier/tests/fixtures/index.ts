// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable */

import './bar.js';

import * as ext from 'external-module';

import type {baz} from './baz.js';
import data from './data.json';
import icon from './icon.svg';
import * as qux from './qux.js';
import Style from './style.css.js';

export {foo} from './foo.js';

async function doImport() {
  await import('./foo.js');
}
