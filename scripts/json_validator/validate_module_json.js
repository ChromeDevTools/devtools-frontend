const fs = require('fs');
const path = require('path');

const utils = require('../utils');

const FRONTEND_PATH = path.resolve(__dirname, '..', '..', 'front_end');

const modules = [];
for (let dir of fs.readdirSync(FRONTEND_PATH)) {
  if (!utils.isDir(path.resolve(FRONTEND_PATH, dir)))
    continue;
  let module = path.resolve(dir, 'module.json');
  if (utils.isFile(path.resolve(FRONTEND_PATH, dir, 'module.json')))
    modules.push(dir);
}

const Ajv = require('ajv');
const ajv = new Ajv();
// This seems to be the most widely supported version of the schema.
ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
const schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'module.schema.json')));
const validate = ajv.compile(schema);

let totalErrors = 0;
for (let module of modules) {
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
if (totalErrors)
  console.log('module.json errors:', totalErrors);
process.exit(totalErrors);
