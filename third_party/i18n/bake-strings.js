#!/usr/bin/env node
/* eslint-disable max-len, rulesdir/check_license_header */

/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const {collectAndBakeCtcStrings} = require('./collect-strings.js');

const [, , directory] = process.argv;

// Convert all the .ctc.json files in `directory` to JSON files in the LHL
// format in `directory`.
collectAndBakeCtcStrings(directory, directory);
