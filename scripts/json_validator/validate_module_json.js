// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const fs = require('fs');
const path = require('path');

const FRONTEND_PATH = path.resolve(__dirname, '..', '..', 'front_end');

const modules = [];
for (const dir of fs.readdirSync(FRONTEND_PATH)) {
  if (!fs.lstatSync(path.resolve(FRONTEND_PATH, dir)).isDirectory()) {
    continue;
  }
  if (fs.existsSync(path.resolve(FRONTEND_PATH, dir, 'module.json'))) {
    modules.push(dir);
  }
}

const Ajv = require('ajv');
const ajv = new Ajv({schemaId: 'id'});
// This seems to be the most widely supported version of the schema.
ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));

const schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'module.schema.json')));
const validate = ajv.compile(schema);

let totalErrors = 0;
for (const module of modules) {
  const moduleObject = JSON.parse(fs.readFileSync(path.resolve(FRONTEND_PATH, module, 'module.json')));
  const valid = validate(moduleObject);
  if (!valid) {
    console.log('Issue with ./front_end/' + module + '/module.json:');
    totalErrors++;
    validate.errors.sort((a, b) => b.dataPath.length - a.dataPath.length);
    const error = validate.errors[0];
    console.log('  ', error.dataPath, error.message, error.params);
    console.log('');
  }
}
if (totalErrors) {
  console.log('module.json errors:', totalErrors);
}
process.exit(totalErrors);
