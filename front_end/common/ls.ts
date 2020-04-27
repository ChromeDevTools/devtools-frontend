// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* We want to be able to use ls for TypeScript land and make it really
 * easy to import e.g. we want to be able to call ls`foo` in a TS file
 * and not Common.UIString.ls`foo` so it's a bit easier and less verbose.
 * At the time of writing all of Common hasn't been TypeScriptified so
 * we create this import-and-export so from TypeScript we can import the
 * file directly via: import { ls } from '../common/ls.js'; which is
 * exempt from the ESLint module importing rules (see
 * rulesdir/es_modules_import for code + test case).
 */
export {ls} from './UIString.js';
