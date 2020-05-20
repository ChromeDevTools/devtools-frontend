/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Utility that prints WebAssembly module function imports/exports.

var fs = require('fs');
var WasmParserTransform = require('../dist/WasmParserTransform.js');
var ParserTransform = WasmParserTransform.BinaryReaderTransform;
var WasmParser = require('../dist/WasmParser.js');
var BinaryReaderState = WasmParser.BinaryReaderState;
var bytesToString = WasmParser.bytesToString;
var ExternalKind = WasmParser.ExternalKind;

// Reads imports/exports related information.
function readFile(path, callback) {
  // Open binary stream.
  var wasmStream = fs.createReadStream(path);
  // Pipe data to the WasmParserTransform object.
  var transform = new ParserTransform();
  var stream = wasmStream.pipe(transform);
  var result = {
    types: [],
    imports: [],
    exports: [],
    functions: [],
  };
  stream.on('data', function (data) {
    // Collect entries from Type, Import, Export, and Function
    // sections.
    switch (data.state) {
      case BinaryReaderState.TYPE_SECTION_ENTRY:
        result.types.push(data.result);
        break;
      case BinaryReaderState.IMPORT_SECTION_ENTRY:
        result.imports.push(data.result);
        break;
      case BinaryReaderState.EXPORT_SECTION_ENTRY:
        result.exports.push(data.result);
        break;
      case BinaryReaderState.FUNCTION_SECTION_ENTRY:
        result.functions.push(data.result);
        break;
    }
  });
  stream.on('end', function () {
    callback(null, result);
  });
  stream.on('error', function (err) {
    callback(err);
  });
}

var TypeStrings = ['i32', 'i64', 'f32', 'f64']; // -1..-4
function printType(type) {
  var params = [];
  for (var i = 0; i < type.params.length; i++)
    params.push(TypeStrings[-type.params[i] - 1]);
  var returns = [];
  for (var i = 0; i < type.returns.length; i++)
    returns.push(TypeStrings[-type.returns[i] - 1]);
  return '(' + params.join(',') + ')=>(' + returns.join(',') + ')';
}

var path = process.argv[2] || './test/malloc.wasm';
readFile(path, function (err, data) {
  if (err) {
    console.error(err);
    return;
  }

  // Print function imports: imports data references function signature (type).
  console.log('Imports:');
  var funcImports = [];
  data.imports.forEach(function (i) {
    if (i.kind == ExternalKind.Function) {
      funcImports.push(i);
      console.log('  ' + bytesToString(i.module) + '::' + bytesToString(i.field) +
                  ' : ' + printType(data.types[i.funcTypeIndex]));
    }
  });
  // Print function imports: exports data references import or function, which
  // references function signature (type).
  console.log('Exports:');
  data.exports.forEach(function (i) {
    if (i.kind == ExternalKind.Function) {
      var funcTypeIndex = i.index < funcImports.length ?
        data.imports[i.index].funcTypeIndex :
        data.functions[i.index - funcImports.length].typeIndex;
      console.log('  ' + bytesToString(i.field) +
                  ' : ' + printType(data.types[funcTypeIndex]));
    }
  });
});
