// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// eslint-disable-next-line rulesdir/es_modules_import
import idl from '@webref/idl';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

import {SPECS} from './config.js';
import {addMetadata, getIDLProps, minimize} from './get-props.js';
import {getMissingTypes} from './util.js';

if (process.argv.length !== 3) {
  throw new Error('Please provide the path to devtools-frontend');
}

const files = await idl.listAll();
const names = Object.keys(SPECS);
const specs = await Promise.all(names.map(name => files[name].parse().then(idls => ({name, idls}))));

const output = addMetadata(getIDLProps(specs));

const missing = getMissingTypes(output);
for (const type of missing) {
  console.warn('Found missing type:', type);
}

const frontendPath = path.resolve(process.argv[2]);
const jsMetadataPath = path.join(frontendPath, 'front_end/models/javascript_metadata/');
const outPath = path.join(jsMetadataPath, 'DOMPinnedProperties.ts');
const thisPath = path.relative(frontendPath, url.fileURLToPath(import.meta.url));

const stringify = object => JSON.stringify(object, null, 2);

fs.writeFileSync(outPath, `
// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// Generated from ${thisPath}

/**
 * All the specs used when generating the DOM pinned properties dataset.
 */
export const SPECS = ${stringify(SPECS)};

export interface DOMPinnedWebIDLProp {
  // A flag specifying whether it's a "global" attribute.
  global?: boolean;
  // A bitfield of the specs in which the property is found.
  // If missing, it implies the default spec: "html".
  specs?: number;
  // The "states" in which this property is "applicable".
  rules?: Array<DOMPinnedWebIDLRule>;
}

export interface DOMPinnedWebIDLType {
  // An inherited Type.
  inheritance?: string;
  // A set of Types to also include properties from.
  includes?: Array<string>;
  // The properties defined on this Type.
  props?: {
    // A property name such as "checked".
    [PropName: string]: DOMPinnedWebIDLProp,
  };
  // The "states" in which only certain properties are "applicable".
  rules?: Array<DOMPinnedWebIDLRule>;
}

export interface DOMPinnedWebIDLRule {
  when: string;
  is: string;
}

export interface DOMPinnedPropertiesDataset {
  [TypeName: string]: DOMPinnedWebIDLType;
}

/**
 * The DOM pinned properties dataset. Generated from WebIDL data parsed from
 * the SPECS above.
 *
 * This is an object with WebIDL type names as keys and their WebIDL properties
 * and inheritance/include chains as values.
 */
export const DOMPinnedProperties: DOMPinnedPropertiesDataset = ${stringify(minimize(output))};

`);
