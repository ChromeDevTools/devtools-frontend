// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// Generated from javascript_natives/helpers.js

export const NativeFunctions = [
  {
    name: 'eval',
    signatures: [['x']]
  },
  {
    name: 'parseInt',
    signatures: [['string','?radix']]
  },
  {
    name: 'parseFloat',
    signatures: [['string']]
  },
  {
    name: 'isNaN',
    signatures: [['number']]
  },
  {
    name: 'isFinite',
    signatures: [['number']]
  },
  {
    name: 'decodeURI',
    signatures: [['encodedURI']]
  },
  {
    name: 'decodeURIComponent',
    signatures: [['encodedURIComponent']]
  },
  {
    name: 'encodeURI',
    signatures: [['uri']]
  },
  {
    name: 'encodeURIComponent',
    signatures: [['uriComponent']]
  },
  {
    name: 'escape',
    signatures: [['string']],
    receiver: 'Window'
  },
  {
    name: 'escape',
    signatures: [['ident']],
    receiver: 'CSS'
  },
  {
    name: 'unescape',
    signatures: [['string']]
  },
  {
    name: 'toString',
    signatures: [['?radix']],
    receiver: 'Number'
  },
  {
    name: 'get',
    signatures: [['?options']],
    receiver: 'CredentialsContainer'
  },
  {
    name: 'get',
    signatures: [['name']],
    receiver: 'CustomElementRegistry'
  },
  {
    name: 'get',
    signatures: [['name']],
    receiver: 'FormData'
  },
  {
    name: 'get',
    signatures: [['name'],['key']],
    receiver: 'Headers'
  },
  {
    name: 'get',
    signatures: [['query'],['key']],
    receiver: 'IDBIndex'
  },
  {
    name: 'get',
    signatures: [['query'],['key']],
    receiver: 'IDBObjectStore'
  },
  {
    name: 'get',
    signatures: [['keyId']],
    receiver: 'MediaKeyStatusMap'
  },
  {
    name: 'get',
    signatures: [['name']],
    receiver: 'URLSearchParams'
  },
  {
    name: 'get',
    signatures: [['property']],
    receiver: 'StylePropertyMapReadOnly'
  },
  {
    name: 'get',
    signatures: [['id']],
    receiver: 'BackgroundFetchManager'
  },
  {
    name: 'get',
    signatures: [['name'],['?options']],
    receiver: 'CookieStore'
  },
  {
    name: 'get',
    signatures: [['instrumentKey']],
    receiver: 'PaymentInstruments'
  },
  {
    name: 'get',
    signatures: [['id']],
    receiver: 'Clients'
  },
  {
    name: 'get',
    signatures: [['key']],
    receiver: 'XRHand'
  },
  {
    name: 'set',
    signatures: [['v']],
    receiver: 'PropertyDescriptor'
  },
  {
    name: 'set',
    signatures: [['array','?offset']],
    receiver: 'Int8Array'
  },
  {
    name: 'set',
    signatures: [['array','?offset']],
    receiver: 'Uint8Array'
  },
  {
    name: 'set',
    signatures: [['array','?offset']],
    receiver: 'Uint8ClampedArray'
  },
  {
    name: 'set',
    signatures: [['array','?offset']],
    receiver: 'Int16Array'
  },
  {
    name: 'set',
    signatures: [['array','?offset']],
    receiver: 'Uint16Array'
  },
  {
    name: 'set',
    signatures: [['array','?offset']],
    receiver: 'Int32Array'
  },
  {
    name: 'set',
    signatures: [['array','?offset']],
    receiver: 'Uint32Array'
  },
  {
    name: 'set',
    signatures: [['array','?offset']],
    receiver: 'Float32Array'
  },
  {
    name: 'set',
    signatures: [['array','?offset']],
    receiver: 'Float64Array'
  },
  {
    name: 'set',
    signatures: [['name','value','?fileName'],['name','value','?filename']],
    receiver: 'FormData'
  },
  {
    name: 'set',
    signatures: [['name','value'],['key','value']],
    receiver: 'Headers'
  },
  {
    name: 'set',
    signatures: [['name','value']],
    receiver: 'URLSearchParams'
  },
  {
    name: 'set',
    signatures: [['property','...values']],
    receiver: 'StylePropertyMap'
  },
  {
    name: 'set',
    signatures: [['cookieInit'],['name','value']],
    receiver: 'CookieStore'
  },
  {
    name: 'set',
    signatures: [['instrumentKey','details']],
    receiver: 'PaymentInstruments'
  },
  {
    name: 'set',
    signatures: [['key','value','?options']],
    receiver: 'SharedStorage'
  },
  {
    name: 'toLocaleString',
    signatures: [['?locales','?options']],
    receiver: 'Date'
  },
  {
    name: 'toLocaleString',
    signatures: [['?locales','?options']],
    receiver: 'Number'
  },
  {
    name: 'hasOwnProperty',
    signatures: [['v']]
  },
  {
    name: 'isPrototypeOf',
    signatures: [['v']]
  },
  {
    name: 'propertyIsEnumerable',
    signatures: [['v']]
  },
  {
    name: 'getPrototypeOf',
    signatures: [['o']]
  },
  {
    name: 'getOwnPropertyDescriptor',
    signatures: [['o','p']]
  },
  {
    name: 'getOwnPropertyNames',
    signatures: [['o']]
  },
  {
    name: 'create',
    signatures: [['o','?properties']],
    static: true,
    receiver: 'Object'
  },
  {
    name: 'create',
    signatures: [['?options']],
    receiver: 'CredentialsContainer'
  },
  {
    name: 'defineProperty',
    signatures: [['o','p','attributes']]
  },
  {
    name: 'defineProperties',
    signatures: [['o','properties']]
  },
  {
    name: 'seal',
    signatures: [['o']]
  },
  {
    name: 'freeze',
    signatures: [['a'],['f'],['o']]
  },
  {
    name: 'preventExtensions',
    signatures: [['o']]
  },
  {
    name: 'isSealed',
    signatures: [['o']]
  },
  {
    name: 'isFrozen',
    signatures: [['o']]
  },
  {
    name: 'isExtensible',
    signatures: [['o']]
  },
  {
    name: 'keys',
    signatures: [['o']],
    static: true,
    receiver: 'Object'
  },
  {
    name: 'keys',
    signatures: [['?request','?options']],
    receiver: 'Cache'
  },
  {
    name: 'apply',
    signatures: [['thisArg','?argArray']],
    receiver: 'Function'
  },
  {
    name: 'apply',
    signatures: [['thisArg','?args']],
    receiver: 'CallableFunction'
  },
  {
    name: 'apply',
    signatures: [['thisArg','?args']],
    receiver: 'NewableFunction'
  },
  {
    name: 'call',
    signatures: [['thisArg','...argArray']],
    receiver: 'Function'
  },
  {
    name: 'call',
    signatures: [['thisArg','...args']],
    receiver: 'CallableFunction'
  },
  {
    name: 'call',
    signatures: [['thisArg','...args']],
    receiver: 'NewableFunction'
  },
  {
    name: 'bind',
    signatures: [['thisArg','...argArray']],
    receiver: 'Function'
  },
  {
    name: 'bind',
    signatures: [['thisArg','?arg0','?arg1','?arg2','?arg3'],['thisArg','...args']],
    receiver: 'CallableFunction'
  },
  {
    name: 'bind',
    signatures: [['thisArg','?arg0','?arg1','?arg2','?arg3'],['thisArg','...args']],
    receiver: 'NewableFunction'
  },
  {
    name: 'charAt',
    signatures: [['pos']]
  },
  {
    name: 'charCodeAt',
    signatures: [['index']]
  },
  {
    name: 'concat',
    signatures: [['...strings']],
    receiver: 'String'
  },
  {
    name: 'concat',
    signatures: [['...items']],
    receiver: 'ReadonlyArray'
  },
  {
    name: 'concat',
    signatures: [['...items']],
    receiver: 'Array'
  },
  {
    name: 'indexOf',
    signatures: [['searchString','?position']],
    receiver: 'String'
  },
  {
    name: 'indexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'ReadonlyArray'
  },
  {
    name: 'indexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Array'
  },
  {
    name: 'indexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Int8Array'
  },
  {
    name: 'indexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Uint8Array'
  },
  {
    name: 'indexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Uint8ClampedArray'
  },
  {
    name: 'indexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Int16Array'
  },
  {
    name: 'indexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Uint16Array'
  },
  {
    name: 'indexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Int32Array'
  },
  {
    name: 'indexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Uint32Array'
  },
  {
    name: 'indexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Float32Array'
  },
  {
    name: 'indexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Float64Array'
  },
  {
    name: 'lastIndexOf',
    signatures: [['searchString','?position']],
    receiver: 'String'
  },
  {
    name: 'lastIndexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'ReadonlyArray'
  },
  {
    name: 'lastIndexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Array'
  },
  {
    name: 'lastIndexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Int8Array'
  },
  {
    name: 'lastIndexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Uint8Array'
  },
  {
    name: 'lastIndexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Uint8ClampedArray'
  },
  {
    name: 'lastIndexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Int16Array'
  },
  {
    name: 'lastIndexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Uint16Array'
  },
  {
    name: 'lastIndexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Int32Array'
  },
  {
    name: 'lastIndexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Uint32Array'
  },
  {
    name: 'lastIndexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Float32Array'
  },
  {
    name: 'lastIndexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Float64Array'
  },
  {
    name: 'localeCompare',
    signatures: [['that','?locales','?options']]
  },
  {
    name: 'match',
    signatures: [['regexp']],
    receiver: 'String'
  },
  {
    name: 'match',
    signatures: [['request','?options']],
    receiver: 'Cache'
  },
  {
    name: 'match',
    signatures: [['request','?options']],
    receiver: 'CacheStorage'
  },
  {
    name: 'match',
    signatures: [['request','?options']],
    receiver: 'BackgroundFetchRegistration'
  },
  {
    name: 'replace',
    signatures: [['searchValue','replaceValue'],['searchValue','replacer']],
    receiver: 'String'
  },
  {
    name: 'replace',
    signatures: [['token','newToken']],
    receiver: 'DOMTokenList'
  },
  {
    name: 'replace',
    signatures: [['url']],
    receiver: 'Location'
  },
  {
    name: 'replace',
    signatures: [['text']],
    receiver: 'CSSStyleSheet'
  },
  {
    name: 'search',
    signatures: [['regexp']]
  },
  {
    name: 'slice',
    signatures: [['?start','?end']],
    receiver: 'String'
  },
  {
    name: 'slice',
    signatures: [['?start','?end']],
    receiver: 'ReadonlyArray'
  },
  {
    name: 'slice',
    signatures: [['?start','?end']],
    receiver: 'ConcatArray'
  },
  {
    name: 'slice',
    signatures: [['?start','?end']],
    receiver: 'Array'
  },
  {
    name: 'slice',
    signatures: [['begin','?end']],
    receiver: 'ArrayBuffer'
  },
  {
    name: 'slice',
    signatures: [['?start','?end']],
    receiver: 'Int8Array'
  },
  {
    name: 'slice',
    signatures: [['?start','?end']],
    receiver: 'Uint8Array'
  },
  {
    name: 'slice',
    signatures: [['?start','?end']],
    receiver: 'Uint8ClampedArray'
  },
  {
    name: 'slice',
    signatures: [['?start','?end']],
    receiver: 'Int16Array'
  },
  {
    name: 'slice',
    signatures: [['?start','?end']],
    receiver: 'Uint16Array'
  },
  {
    name: 'slice',
    signatures: [['?start','?end']],
    receiver: 'Int32Array'
  },
  {
    name: 'slice',
    signatures: [['?start','?end']],
    receiver: 'Uint32Array'
  },
  {
    name: 'slice',
    signatures: [['?start','?end']],
    receiver: 'Float32Array'
  },
  {
    name: 'slice',
    signatures: [['?start','?end']],
    receiver: 'Float64Array'
  },
  {
    name: 'slice',
    signatures: [['?start','?end','?contentType']],
    receiver: 'Blob'
  },
  {
    name: 'split',
    signatures: [['separator','?limit']]
  },
  {
    name: 'substring',
    signatures: [['start','?end']]
  },
  {
    name: 'toLocaleLowerCase',
    signatures: [['?locales']]
  },
  {
    name: 'toLocaleUpperCase',
    signatures: [['?locales']]
  },
  {
    name: 'substr',
    signatures: [['from','?length']]
  },
  {
    name: 'fromCharCode',
    signatures: [['...codes']]
  },
  {
    name: 'toFixed',
    signatures: [['?fractionDigits']]
  },
  {
    name: 'toExponential',
    signatures: [['?fractionDigits']]
  },
  {
    name: 'toPrecision',
    signatures: [['?precision']]
  },
  {
    name: 'abs',
    signatures: [['x']]
  },
  {
    name: 'acos',
    signatures: [['x']]
  },
  {
    name: 'asin',
    signatures: [['x']]
  },
  {
    name: 'atan',
    signatures: [['x']]
  },
  {
    name: 'atan2',
    signatures: [['y','x']]
  },
  {
    name: 'ceil',
    signatures: [['x']]
  },
  {
    name: 'cos',
    signatures: [['x']]
  },
  {
    name: 'exp',
    signatures: [['x']]
  },
  {
    name: 'floor',
    signatures: [['x']]
  },
  {
    name: 'log',
    signatures: [['x']],
    receiver: 'Math'
  },
  {
    name: 'log',
    signatures: [['...data']],
    receiver: 'Console'
  },
  {
    name: 'log',
    signatures: [['...data']],
    receiver: 'console'
  },
  {
    name: 'max',
    signatures: [['...values']]
  },
  {
    name: 'min',
    signatures: [['...values']]
  },
  {
    name: 'pow',
    signatures: [['x','y']]
  },
  {
    name: 'round',
    signatures: [['x']]
  },
  {
    name: 'sin',
    signatures: [['x']]
  },
  {
    name: 'sqrt',
    signatures: [['x']]
  },
  {
    name: 'tan',
    signatures: [['x']]
  },
  {
    name: 'toLocaleDateString',
    signatures: [['?locales','?options']]
  },
  {
    name: 'toLocaleTimeString',
    signatures: [['?locales','?options']]
  },
  {
    name: 'setTime',
    signatures: [['time']]
  },
  {
    name: 'setMilliseconds',
    signatures: [['ms']]
  },
  {
    name: 'setUTCMilliseconds',
    signatures: [['ms']]
  },
  {
    name: 'setSeconds',
    signatures: [['sec','?ms']]
  },
  {
    name: 'setUTCSeconds',
    signatures: [['sec','?ms']]
  },
  {
    name: 'setMinutes',
    signatures: [['min','?sec','?ms']]
  },
  {
    name: 'setUTCMinutes',
    signatures: [['min','?sec','?ms']]
  },
  {
    name: 'setHours',
    signatures: [['hours','?min','?sec','?ms']]
  },
  {
    name: 'setUTCHours',
    signatures: [['hours','?min','?sec','?ms']]
  },
  {
    name: 'setDate',
    signatures: [['date']]
  },
  {
    name: 'setUTCDate',
    signatures: [['date']]
  },
  {
    name: 'setMonth',
    signatures: [['month','?date']]
  },
  {
    name: 'setUTCMonth',
    signatures: [['month','?date']]
  },
  {
    name: 'setFullYear',
    signatures: [['year','?month','?date']]
  },
  {
    name: 'setUTCFullYear',
    signatures: [['year','?month','?date']]
  },
  {
    name: 'toJSON',
    signatures: [['?key']],
    receiver: 'Date'
  },
  {
    name: 'parse',
    signatures: [['s']],
    static: true,
    receiver: 'Date'
  },
  {
    name: 'parse',
    signatures: [['text','?reviver']],
    receiver: 'JSON'
  },
  {
    name: 'UTC',
    signatures: [['year','month','?date','?hours','?minutes','?seconds','?ms']]
  },
  {
    name: 'exec',
    signatures: [['string']],
    receiver: 'RegExp'
  },
  {
    name: 'exec',
    signatures: [['?input','?baseURL']],
    receiver: 'URLPattern'
  },
  {
    name: 'test',
    signatures: [['string']],
    receiver: 'RegExp'
  },
  {
    name: 'test',
    signatures: [['?input','?baseURL']],
    receiver: 'URLPattern'
  },
  {
    name: 'compile',
    signatures: [['pattern','?flags']]
  },
  {
    name: 'stringify',
    signatures: [['value','?replacer','?space']]
  },
  {
    name: 'join',
    signatures: [['?separator']]
  },
  {
    name: 'every',
    signatures: [['predicate','?thisArg']]
  },
  {
    name: 'some',
    signatures: [['predicate','?thisArg']]
  },
  {
    name: 'forEach',
    signatures: [['callbackfn','?thisArg']]
  },
  {
    name: 'map',
    signatures: [['callbackfn','?thisArg']]
  },
  {
    name: 'filter',
    signatures: [['predicate','?thisArg']]
  },
  {
    name: 'reduce',
    signatures: [['callbackfn','?initialValue']]
  },
  {
    name: 'reduceRight',
    signatures: [['callbackfn','?initialValue']]
  },
  {
    name: 'push',
    signatures: [['...items']]
  },
  {
    name: 'sort',
    signatures: [['?compareFn']],
    receiver: 'Array'
  },
  {
    name: 'sort',
    signatures: [['?compareFn']],
    receiver: 'Int8Array'
  },
  {
    name: 'sort',
    signatures: [['?compareFn']],
    receiver: 'Uint8Array'
  },
  {
    name: 'sort',
    signatures: [['?compareFn']],
    receiver: 'Uint8ClampedArray'
  },
  {
    name: 'sort',
    signatures: [['?compareFn']],
    receiver: 'Int16Array'
  },
  {
    name: 'sort',
    signatures: [['?compareFn']],
    receiver: 'Uint16Array'
  },
  {
    name: 'sort',
    signatures: [['?compareFn']],
    receiver: 'Int32Array'
  },
  {
    name: 'sort',
    signatures: [['?compareFn']],
    receiver: 'Uint32Array'
  },
  {
    name: 'sort',
    signatures: [['?compareFn']],
    receiver: 'Float32Array'
  },
  {
    name: 'sort',
    signatures: [['?compareFn']],
    receiver: 'Float64Array'
  },
  {
    name: 'splice',
    signatures: [['start','?deleteCount','...items']]
  },
  {
    name: 'unshift',
    signatures: [['...items']]
  },
  {
    name: 'isArray',
    signatures: [['arg']]
  },
  {
    name: 'then',
    signatures: [['?onfulfilled','?onrejected']]
  },
  {
    name: 'catch',
    signatures: [['?onrejected']]
  },
  {
    name: 'isView',
    signatures: [['arg']]
  },
  {
    name: 'getFloat32',
    signatures: [['byteOffset','?littleEndian']]
  },
  {
    name: 'getFloat64',
    signatures: [['byteOffset','?littleEndian']]
  },
  {
    name: 'getInt8',
    signatures: [['byteOffset']]
  },
  {
    name: 'getInt16',
    signatures: [['byteOffset','?littleEndian']]
  },
  {
    name: 'getInt32',
    signatures: [['byteOffset','?littleEndian']]
  },
  {
    name: 'getUint8',
    signatures: [['byteOffset']]
  },
  {
    name: 'getUint16',
    signatures: [['byteOffset','?littleEndian']]
  },
  {
    name: 'getUint32',
    signatures: [['byteOffset','?littleEndian']]
  },
  {
    name: 'setFloat32',
    signatures: [['byteOffset','value','?littleEndian']]
  },
  {
    name: 'setFloat64',
    signatures: [['byteOffset','value','?littleEndian']]
  },
  {
    name: 'setInt8',
    signatures: [['byteOffset','value']]
  },
  {
    name: 'setInt16',
    signatures: [['byteOffset','value','?littleEndian']]
  },
  {
    name: 'setInt32',
    signatures: [['byteOffset','value','?littleEndian']]
  },
  {
    name: 'setUint8',
    signatures: [['byteOffset','value']]
  },
  {
    name: 'setUint16',
    signatures: [['byteOffset','value','?littleEndian']]
  },
  {
    name: 'setUint32',
    signatures: [['byteOffset','value','?littleEndian']]
  },
  {
    name: 'copyWithin',
    signatures: [['target','start','?end']]
  },
  {
    name: 'fill',
    signatures: [['value','?start','?end']],
    receiver: 'Int8Array'
  },
  {
    name: 'fill',
    signatures: [['value','?start','?end']],
    receiver: 'Uint8Array'
  },
  {
    name: 'fill',
    signatures: [['value','?start','?end']],
    receiver: 'Uint8ClampedArray'
  },
  {
    name: 'fill',
    signatures: [['value','?start','?end']],
    receiver: 'Int16Array'
  },
  {
    name: 'fill',
    signatures: [['value','?start','?end']],
    receiver: 'Uint16Array'
  },
  {
    name: 'fill',
    signatures: [['value','?start','?end']],
    receiver: 'Int32Array'
  },
  {
    name: 'fill',
    signatures: [['value','?start','?end']],
    receiver: 'Uint32Array'
  },
  {
    name: 'fill',
    signatures: [['value','?start','?end']],
    receiver: 'Float32Array'
  },
  {
    name: 'fill',
    signatures: [['value','?start','?end']],
    receiver: 'Float64Array'
  },
  {
    name: 'fill',
    signatures: [['?fillRule'],['path','?fillRule']],
    receiver: 'CanvasDrawPath'
  },
  {
    name: 'fill',
    signatures: [['?winding'],['path','?winding']],
    receiver: 'CanvasRenderingContext2D'
  },
  {
    name: 'fill',
    signatures: [['?winding'],['path','?winding']],
    receiver: 'OffscreenCanvasRenderingContext2D'
  },
  {
    name: 'fill',
    signatures: [['?winding'],['path','?winding']],
    receiver: 'PaintRenderingContext2D'
  },
  {
    name: 'find',
    signatures: [['predicate','?thisArg']],
    receiver: 'Int8Array'
  },
  {
    name: 'find',
    signatures: [['predicate','?thisArg']],
    receiver: 'Uint8Array'
  },
  {
    name: 'find',
    signatures: [['predicate','?thisArg']],
    receiver: 'Uint8ClampedArray'
  },
  {
    name: 'find',
    signatures: [['predicate','?thisArg']],
    receiver: 'Int16Array'
  },
  {
    name: 'find',
    signatures: [['predicate','?thisArg']],
    receiver: 'Uint16Array'
  },
  {
    name: 'find',
    signatures: [['predicate','?thisArg']],
    receiver: 'Int32Array'
  },
  {
    name: 'find',
    signatures: [['predicate','?thisArg']],
    receiver: 'Uint32Array'
  },
  {
    name: 'find',
    signatures: [['predicate','?thisArg']],
    receiver: 'Float32Array'
  },
  {
    name: 'find',
    signatures: [['predicate','?thisArg']],
    receiver: 'Float64Array'
  },
  {
    name: 'find',
    signatures: [['?string','?caseSensitive','?backwards','?wrap','?wholeWord','?searchInFrames','?showDialog']],
    receiver: 'Window'
  },
  {
    name: 'findIndex',
    signatures: [['predicate','?thisArg']]
  },
  {
    name: 'subarray',
    signatures: [['?begin','?end']]
  },
  {
    name: 'of',
    signatures: [['...items']]
  },
  {
    name: 'from',
    signatures: [['arrayLike','?mapfn','?thisArg']]
  },
  {
    name: 'drawArraysInstancedANGLE',
    signatures: [['mode','first','count','primcount']]
  },
  {
    name: 'drawElementsInstancedANGLE',
    signatures: [['mode','count','type','offset','primcount']]
  },
  {
    name: 'vertexAttribDivisorANGLE',
    signatures: [['index','divisor']]
  },
  {
    name: 'abort',
    signatures: [['?reason']],
    receiver: 'AbortController'
  },
  {
    name: 'abort',
    signatures: [['?reason']],
    receiver: 'WritableStream'
  },
  {
    name: 'abort',
    signatures: [['?reason']],
    receiver: 'WritableStreamDefaultWriter'
  },
  {
    name: 'abort',
    signatures: [['reason']],
    receiver: 'UnderlyingSinkBase'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'AbortSignal'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'AbstractWorker'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'Animation'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'AudioBufferSourceNode'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'AudioContext'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'AudioScheduledSourceNode'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'AudioWorkletNode'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'BaseAudioContext'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'BroadcastChannel'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'CSSAnimation'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'CSSTransition'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'CanvasCaptureMediaStreamTrack'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'ConstantSourceNode'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'Document'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'DocumentAndElementEventHandlers'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'Element'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'EventSource'
  },
  {
    name: 'addEventListener',
    signatures: [['type','callback','?options'],['type','listener','?options']],
    receiver: 'EventTarget'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'FileReader'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'FontFaceSet'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'GlobalEventHandlers'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLAnchorElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLAreaElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLAudioElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLBRElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLBaseElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLBodyElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLButtonElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLCanvasElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLDListElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLDataElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLDataListElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLDetailsElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLDialogElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLDirectoryElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLDivElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLDocument'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLEmbedElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLFieldSetElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLFontElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLFormElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLFrameElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLFrameSetElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLHRElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLHeadElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLHeadingElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLHtmlElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLIFrameElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLImageElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLInputElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLLIElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLLabelElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLLegendElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLLinkElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLMapElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLMarqueeElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLMediaElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLMenuElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLMetaElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLMeterElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLModElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLOListElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLObjectElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLOptGroupElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLOptionElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLOutputElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLParagraphElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLParamElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLPictureElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLPreElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLProgressElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLQuoteElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLScriptElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLSelectElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLSlotElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLSourceElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLSpanElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLStyleElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTableCaptionElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTableCellElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTableColElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTableDataCellElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTableElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTableHeaderCellElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTableRowElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTableSectionElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTemplateElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTextAreaElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTimeElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTitleElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTrackElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLUListElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLUnknownElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLVideoElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'IDBDatabase'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'IDBOpenDBRequest'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'IDBRequest'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'IDBTransaction'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'MathMLElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'MediaDevices'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'MediaKeySession'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'MediaQueryList'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'MediaRecorder'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'MediaSource'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'MediaStream'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'MediaStreamTrack'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'MessagePort'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'Notification'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'OfflineAudioContext'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'OscillatorNode'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'PaymentRequest'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'Performance'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'PermissionStatus'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'PictureInPictureWindow'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'RTCDTMFSender'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'RTCDataChannel'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'RTCDtlsTransport'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'RTCPeerConnection'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'RemotePlayback'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGAElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGAnimateElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGAnimateMotionElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGAnimateTransformElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGAnimationElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGCircleElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGClipPathElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGComponentTransferFunctionElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGDefsElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGDescElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGEllipseElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEBlendElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEColorMatrixElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEComponentTransferElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFECompositeElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEConvolveMatrixElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEDiffuseLightingElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEDisplacementMapElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEDistantLightElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEDropShadowElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEFloodElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEFuncAElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEFuncBElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEFuncGElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEFuncRElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEGaussianBlurElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEImageElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEMergeElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEMergeNodeElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEMorphologyElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEOffsetElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEPointLightElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFESpecularLightingElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFESpotLightElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFETileElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFETurbulenceElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFilterElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGForeignObjectElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGGElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGGeometryElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGGradientElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGGraphicsElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGImageElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGLineElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGLinearGradientElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGMPathElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGMarkerElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGMaskElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGMetadataElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGPathElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGPatternElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGPolygonElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGPolylineElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGRadialGradientElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGRectElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGSVGElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGScriptElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGSetElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGStopElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGStyleElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGSwitchElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGSymbolElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGTSpanElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGTextContentElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGTextElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGTextPathElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGTextPositioningElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGTitleElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGUseElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGViewElement'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'ScreenOrientation'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'ScriptProcessorNode'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'ServiceWorker'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'ServiceWorkerContainer'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'ServiceWorkerRegistration'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'ShadowRoot'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SharedWorker'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SourceBuffer'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SourceBufferList'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SpeechSynthesis'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SpeechSynthesisUtterance'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'TextTrack'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'TextTrackCue'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'TextTrackList'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'VTTCue'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'VisualViewport'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'WebSocket'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'Window'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'WindowEventHandlers'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'Worker'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'XMLDocument'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'XMLHttpRequest'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'XMLHttpRequestEventTarget'
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'XMLHttpRequestUpload'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'AbortSignal'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'AbstractWorker'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'Animation'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'AudioBufferSourceNode'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'AudioContext'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'AudioScheduledSourceNode'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'AudioWorkletNode'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'BaseAudioContext'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'BroadcastChannel'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'CSSAnimation'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'CSSTransition'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'CanvasCaptureMediaStreamTrack'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'ConstantSourceNode'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'Document'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'DocumentAndElementEventHandlers'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'Element'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'EventSource'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','callback','?options'],['type','listener','?options']],
    receiver: 'EventTarget'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'FileReader'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'FontFaceSet'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'GlobalEventHandlers'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLAnchorElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLAreaElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLAudioElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLBRElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLBaseElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLBodyElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLButtonElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLCanvasElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLDListElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLDataElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLDataListElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLDetailsElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLDialogElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLDirectoryElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLDivElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLDocument'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLEmbedElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLFieldSetElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLFontElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLFormElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLFrameElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLFrameSetElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLHRElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLHeadElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLHeadingElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLHtmlElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLIFrameElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLImageElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLInputElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLLIElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLLabelElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLLegendElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLLinkElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLMapElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLMarqueeElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLMediaElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLMenuElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLMetaElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLMeterElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLModElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLOListElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLObjectElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLOptGroupElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLOptionElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLOutputElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLParagraphElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLParamElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLPictureElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLPreElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLProgressElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLQuoteElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLScriptElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLSelectElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLSlotElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLSourceElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLSpanElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLStyleElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTableCaptionElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTableCellElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTableColElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTableDataCellElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTableElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTableHeaderCellElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTableRowElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTableSectionElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTemplateElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTextAreaElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTimeElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTitleElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLTrackElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLUListElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLUnknownElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'HTMLVideoElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'IDBDatabase'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'IDBOpenDBRequest'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'IDBRequest'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'IDBTransaction'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'MathMLElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'MediaDevices'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'MediaKeySession'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'MediaQueryList'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'MediaRecorder'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'MediaSource'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'MediaStream'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'MediaStreamTrack'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'MessagePort'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'Notification'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'OfflineAudioContext'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'OscillatorNode'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'PaymentRequest'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'Performance'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'PermissionStatus'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'PictureInPictureWindow'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'RTCDTMFSender'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'RTCDataChannel'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'RTCDtlsTransport'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'RTCPeerConnection'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'RemotePlayback'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGAElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGAnimateElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGAnimateMotionElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGAnimateTransformElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGAnimationElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGCircleElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGClipPathElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGComponentTransferFunctionElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGDefsElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGDescElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGEllipseElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEBlendElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEColorMatrixElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEComponentTransferElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFECompositeElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEConvolveMatrixElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEDiffuseLightingElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEDisplacementMapElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEDistantLightElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEDropShadowElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEFloodElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEFuncAElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEFuncBElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEFuncGElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEFuncRElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEGaussianBlurElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEImageElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEMergeElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEMergeNodeElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEMorphologyElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEOffsetElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFEPointLightElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFESpecularLightingElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFESpotLightElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFETileElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFETurbulenceElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGFilterElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGForeignObjectElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGGElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGGeometryElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGGradientElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGGraphicsElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGImageElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGLineElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGLinearGradientElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGMPathElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGMarkerElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGMaskElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGMetadataElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGPathElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGPatternElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGPolygonElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGPolylineElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGRadialGradientElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGRectElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGSVGElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGScriptElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGSetElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGStopElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGStyleElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGSwitchElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGSymbolElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGTSpanElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGTextContentElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGTextElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGTextPathElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGTextPositioningElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGTitleElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGUseElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SVGViewElement'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'ScreenOrientation'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'ScriptProcessorNode'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'ServiceWorker'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'ServiceWorkerContainer'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'ServiceWorkerRegistration'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'ShadowRoot'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SharedWorker'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SourceBuffer'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SourceBufferList'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SpeechSynthesis'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'SpeechSynthesisUtterance'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'TextTrack'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'TextTrackCue'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'TextTrackList'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'VTTCue'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'VisualViewport'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'WebSocket'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'Window'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'WindowEventHandlers'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'Worker'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'XMLDocument'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'XMLHttpRequest'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'XMLHttpRequestEventTarget'
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']],
    receiver: 'XMLHttpRequestUpload'
  },
  {
    name: 'getByteFrequencyData',
    signatures: [['array']]
  },
  {
    name: 'getByteTimeDomainData',
    signatures: [['array']]
  },
  {
    name: 'getFloatFrequencyData',
    signatures: [['array']]
  },
  {
    name: 'getFloatTimeDomainData',
    signatures: [['array']]
  },
  {
    name: 'animate',
    signatures: [['keyframes','?options']]
  },
  {
    name: 'getAnimations',
    signatures: [['?options']],
    receiver: 'Animatable'
  },
  {
    name: 'cancel',
    signatures: [['?reason']],
    receiver: 'ReadableStream'
  },
  {
    name: 'cancel',
    signatures: [['?reason']],
    receiver: 'ReadableStreamGenericReader'
  },
  {
    name: 'cancel',
    signatures: [['?reason']],
    receiver: 'UnderlyingSourceBase'
  },
  {
    name: 'finish',
    signatures: [['?descriptor']],
    receiver: 'GPUCommandEncoder'
  },
  {
    name: 'finish',
    signatures: [['?descriptor']],
    receiver: 'GPURenderBundleEncoder'
  },
  {
    name: 'updatePlaybackRate',
    signatures: [['playbackRate'],['playback_rate']]
  },
  {
    name: 'updateTiming',
    signatures: [['?timing']]
  },
  {
    name: 'cancelAnimationFrame',
    signatures: [['handle']]
  },
  {
    name: 'requestAnimationFrame',
    signatures: [['callback']]
  },
  {
    name: 'copyFromChannel',
    signatures: [['destination','channelNumber','?bufferOffset']]
  },
  {
    name: 'copyToChannel',
    signatures: [['source','channelNumber','?bufferOffset']]
  },
  {
    name: 'getChannelData',
    signatures: [['channel'],['channelIndex']]
  },
  {
    name: 'start',
    signatures: [['?when','?offset','?duration'],['?when','?grainOffset','?grainDuration']],
    receiver: 'AudioBufferSourceNode'
  },
  {
    name: 'start',
    signatures: [['?when']],
    receiver: 'AudioScheduledSourceNode'
  },
  {
    name: 'start',
    signatures: [['?timeslice']],
    receiver: 'MediaRecorder'
  },
  {
    name: 'start',
    signatures: [['index']],
    receiver: 'TimeRanges'
  },
  {
    name: 'start',
    signatures: [['?callback']],
    receiver: 'DocumentTransition'
  },
  {
    name: 'start',
    signatures: [['controller']],
    receiver: 'UnderlyingSinkBase'
  },
  {
    name: 'start',
    signatures: [['stream']],
    receiver: 'UnderlyingSourceBase'
  },
  {
    name: 'start',
    signatures: [['remoteParameters','?role']],
    receiver: 'RTCIceTransport'
  },
  {
    name: 'close',
    signatures: [['?code','?reason']],
    receiver: 'WebSocket'
  },
  {
    name: 'close',
    signatures: [['?returnValue']],
    receiver: 'HTMLDialogElement'
  },
  {
    name: 'close',
    signatures: [['?options']],
    receiver: 'TCPSocket'
  },
  {
    name: 'close',
    signatures: [['?options']],
    receiver: 'UDPSocket'
  },
  {
    name: 'close',
    signatures: [['?closeInfo']],
    receiver: 'WebSocketStream'
  },
  {
    name: 'close',
    signatures: [['?closeInfo']],
    receiver: 'WebTransport'
  },
  {
    name: 'createMediaElementSource',
    signatures: [['mediaElement']]
  },
  {
    name: 'createMediaStreamSource',
    signatures: [['mediaStream']]
  },
  {
    name: 'suspend',
    signatures: [['suspendTime']],
    receiver: 'OfflineAudioContext'
  },
  {
    name: 'setOrientation',
    signatures: [['x','y','z','xUp','yUp','zUp']],
    receiver: 'AudioListener'
  },
  {
    name: 'setOrientation',
    signatures: [['x','y','z']],
    receiver: 'PannerNode'
  },
  {
    name: 'setPosition',
    signatures: [['x','y','z']],
    receiver: 'AudioListener'
  },
  {
    name: 'setPosition',
    signatures: [['x','y','z']],
    receiver: 'PannerNode'
  },
  {
    name: 'setPosition',
    signatures: [['node','?offset']],
    receiver: 'Selection'
  },
  {
    name: 'connect',
    signatures: [['destinationParam','?output'],['destination','?output','?input'],['destinationNode','?output','?input']],
    receiver: 'AudioNode'
  },
  {
    name: 'disconnect',
    signatures: [['?output'],['destinationNode','?output','?input'],['destinationParam','?output'],['destination','?output','?input']],
    receiver: 'AudioNode'
  },
  {
    name: 'cancelAndHoldAtTime',
    signatures: [['cancelTime'],['startTime']]
  },
  {
    name: 'cancelScheduledValues',
    signatures: [['cancelTime'],['startTime']]
  },
  {
    name: 'exponentialRampToValueAtTime',
    signatures: [['value','endTime'],['value','time']]
  },
  {
    name: 'linearRampToValueAtTime',
    signatures: [['value','endTime'],['value','time']]
  },
  {
    name: 'setTargetAtTime',
    signatures: [['target','startTime','timeConstant'],['target','time','timeConstant']]
  },
  {
    name: 'setValueAtTime',
    signatures: [['value','startTime'],['value','time']]
  },
  {
    name: 'setValueCurveAtTime',
    signatures: [['values','startTime','duration'],['values','time','duration']]
  },
  {
    name: 'stop',
    signatures: [['?when']],
    receiver: 'AudioScheduledSourceNode'
  },
  {
    name: 'createBuffer',
    signatures: [['numberOfChannels','length','sampleRate'],['numberOfChannels','numberOfFrames','sampleRate']],
    receiver: 'BaseAudioContext'
  },
  {
    name: 'createBuffer',
    signatures: [['descriptor']],
    receiver: 'GPUDevice'
  },
  {
    name: 'createChannelMerger',
    signatures: [['?numberOfInputs']]
  },
  {
    name: 'createChannelSplitter',
    signatures: [['?numberOfOutputs']]
  },
  {
    name: 'createDelay',
    signatures: [['?maxDelayTime']]
  },
  {
    name: 'createIIRFilter',
    signatures: [['feedforward','feedback'],['feedForward','feedBack']]
  },
  {
    name: 'createPeriodicWave',
    signatures: [['real','imag','?constraints']]
  },
  {
    name: 'createScriptProcessor',
    signatures: [['?bufferSize','?numberOfInputChannels','?numberOfOutputChannels']]
  },
  {
    name: 'decodeAudioData',
    signatures: [['audioData','?successCallback','?errorCallback']]
  },
  {
    name: 'getFrequencyResponse',
    signatures: [['frequencyHz','magResponse','phaseResponse']]
  },
  {
    name: 'postMessage',
    signatures: [['message']],
    receiver: 'BroadcastChannel'
  },
  {
    name: 'postMessage',
    signatures: [['message','transfer'],['message','?options']],
    receiver: 'MessagePort'
  },
  {
    name: 'postMessage',
    signatures: [['message','transfer'],['message','?options']],
    receiver: 'ServiceWorker'
  },
  {
    name: 'postMessage',
    signatures: [['message','?options'],['message','targetOrigin','?transfer']],
    receiver: 'Window'
  },
  {
    name: 'postMessage',
    signatures: [['message','transfer'],['message','?options']],
    receiver: 'Worker'
  },
  {
    name: 'postMessage',
    signatures: [['message','?options']],
    receiver: 'HTMLPortalElement'
  },
  {
    name: 'postMessage',
    signatures: [['message','?options']],
    receiver: 'PortalHost'
  },
  {
    name: 'postMessage',
    signatures: [['message','transfer'],['message','?options']],
    receiver: 'DedicatedWorkerGlobalScope'
  },
  {
    name: 'postMessage',
    signatures: [['message','transfer'],['message','?options']],
    receiver: 'Client'
  },
  {
    name: 'deleteRule',
    signatures: [['index']],
    receiver: 'CSSGroupingRule'
  },
  {
    name: 'deleteRule',
    signatures: [['select']],
    receiver: 'CSSKeyframesRule'
  },
  {
    name: 'deleteRule',
    signatures: [['index']],
    receiver: 'CSSStyleSheet'
  },
  {
    name: 'insertRule',
    signatures: [['rule','?index']]
  },
  {
    name: 'appendRule',
    signatures: [['rule']]
  },
  {
    name: 'findRule',
    signatures: [['select']]
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'CSSRuleList'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'CSSStyleDeclaration'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'DOMRectList'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'DOMStringList'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'DOMTokenList'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'FileList'
  },
  {
    name: 'item',
    signatures: [['?nameOrIndex']],
    receiver: 'HTMLAllCollection'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'HTMLCollectionBase'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'HTMLCollectionOf'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'HTMLSelectElement'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'MediaList'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'MimeTypeArray'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'NamedNodeMap'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'NodeList'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'NodeListOf'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'Plugin'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'PluginArray'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'SpeechRecognitionResult'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'SpeechRecognitionResultList'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'StyleSheetList'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'TouchList'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'AccessibleNodeList'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'HTMLCollection'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'SpeechGrammarList'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'SQLResultSetRowList'
  },
  {
    name: 'getPropertyPriority',
    signatures: [['property']]
  },
  {
    name: 'getPropertyValue',
    signatures: [['property']]
  },
  {
    name: 'removeProperty',
    signatures: [['property']]
  },
  {
    name: 'setProperty',
    signatures: [['property','value','?priority']]
  },
  {
    name: 'addRule',
    signatures: [['?selector','?style','?index']]
  },
  {
    name: 'removeRule',
    signatures: [['?index']]
  },
  {
    name: 'add',
    signatures: [['request']],
    receiver: 'Cache'
  },
  {
    name: 'add',
    signatures: [['...tokens']],
    receiver: 'DOMTokenList'
  },
  {
    name: 'add',
    signatures: [['data','?type'],['file']],
    receiver: 'DataTransferItemList'
  },
  {
    name: 'add',
    signatures: [['element','?before']],
    receiver: 'HTMLOptionsCollection'
  },
  {
    name: 'add',
    signatures: [['element','?before']],
    receiver: 'HTMLSelectElement'
  },
  {
    name: 'add',
    signatures: [['value','?key']],
    receiver: 'IDBObjectStore'
  },
  {
    name: 'add',
    signatures: [['node','?before']],
    receiver: 'AccessibleNodeList'
  },
  {
    name: 'add',
    signatures: [['...values']],
    receiver: 'CSSNumericValue'
  },
  {
    name: 'add',
    signatures: [['key']],
    receiver: 'CustomStateSet'
  },
  {
    name: 'add',
    signatures: [['description']],
    receiver: 'ContentIndex'
  },
  {
    name: 'add',
    signatures: [['a','b']],
    receiver: 'MLGraphBuilder'
  },
  {
    name: 'add',
    signatures: [['install_url']],
    receiver: 'SubApps'
  },
  {
    name: 'addAll',
    signatures: [['requests']]
  },
  {
    name: 'delete',
    signatures: [['request','?options']],
    receiver: 'Cache'
  },
  {
    name: 'delete',
    signatures: [['cacheName']],
    receiver: 'CacheStorage'
  },
  {
    name: 'delete',
    signatures: [['name']],
    receiver: 'FormData'
  },
  {
    name: 'delete',
    signatures: [['name'],['key']],
    receiver: 'Headers'
  },
  {
    name: 'delete',
    signatures: [['query'],['key']],
    receiver: 'IDBObjectStore'
  },
  {
    name: 'delete',
    signatures: [['name']],
    receiver: 'URLSearchParams'
  },
  {
    name: 'delete',
    signatures: [['property']],
    receiver: 'StylePropertyMap'
  },
  {
    name: 'delete',
    signatures: [['name']],
    receiver: 'StorageBucketManager'
  },
  {
    name: 'delete',
    signatures: [['id']],
    receiver: 'ContentIndex'
  },
  {
    name: 'delete',
    signatures: [['name'],['options']],
    receiver: 'CookieStore'
  },
  {
    name: 'delete',
    signatures: [['name']],
    receiver: 'NativeIOFileManager'
  },
  {
    name: 'delete',
    signatures: [['instrumentKey']],
    receiver: 'PaymentInstruments'
  },
  {
    name: 'delete',
    signatures: [['key']],
    receiver: 'SharedStorage'
  },
  {
    name: 'matchAll',
    signatures: [['?request','?options']],
    receiver: 'Cache'
  },
  {
    name: 'matchAll',
    signatures: [['?request','?options']],
    receiver: 'BackgroundFetchRegistration'
  },
  {
    name: 'matchAll',
    signatures: [['?options']],
    receiver: 'Clients'
  },
  {
    name: 'put',
    signatures: [['request','response']],
    receiver: 'Cache'
  },
  {
    name: 'put',
    signatures: [['value','?key']],
    receiver: 'IDBObjectStore'
  },
  {
    name: 'has',
    signatures: [['cacheName']],
    receiver: 'CacheStorage'
  },
  {
    name: 'has',
    signatures: [['name']],
    receiver: 'FormData'
  },
  {
    name: 'has',
    signatures: [['name'],['key']],
    receiver: 'Headers'
  },
  {
    name: 'has',
    signatures: [['keyId']],
    receiver: 'MediaKeyStatusMap'
  },
  {
    name: 'has',
    signatures: [['name']],
    receiver: 'URLSearchParams'
  },
  {
    name: 'has',
    signatures: [['property']],
    receiver: 'StylePropertyMapReadOnly'
  },
  {
    name: 'has',
    signatures: [['instrumentKey']],
    receiver: 'PaymentInstruments'
  },
  {
    name: 'open',
    signatures: [['cacheName']],
    receiver: 'CacheStorage'
  },
  {
    name: 'open',
    signatures: [['?unused1','?unused2'],['?type','?replace'],['url','name','features']],
    receiver: 'Document'
  },
  {
    name: 'open',
    signatures: [['name','?version']],
    receiver: 'IDBFactory'
  },
  {
    name: 'open',
    signatures: [['?url','?target','?features']],
    receiver: 'Window'
  },
  {
    name: 'open',
    signatures: [['method','url','?async','?username','?password']],
    receiver: 'XMLHttpRequest'
  },
  {
    name: 'open',
    signatures: [['name','?options']],
    receiver: 'StorageBucketManager'
  },
  {
    name: 'open',
    signatures: [['?options']],
    receiver: 'EyeDropper'
  },
  {
    name: 'open',
    signatures: [['name']],
    receiver: 'NativeIOFileManager'
  },
  {
    name: 'drawImage',
    signatures: [['image','dx','dy','?dw','?dh'],['image','sx','sy','sw','sh','dx','dy','dw','dh']],
    receiver: 'CanvasDrawImage'
  },
  {
    name: 'drawImage',
    signatures: [['image','x','y','?width','?height'],['image','sx','sy','sw','sh','dx','dy','dw','dh']],
    receiver: 'CanvasRenderingContext2D'
  },
  {
    name: 'drawImage',
    signatures: [['image','x','y','?width','?height'],['image','sx','sy','sw','sh','dx','dy','dw','dh']],
    receiver: 'OffscreenCanvasRenderingContext2D'
  },
  {
    name: 'drawImage',
    signatures: [['image','x','y','?width','?height'],['image','sx','sy','sw','sh','dx','dy','dw','dh']],
    receiver: 'PaintRenderingContext2D'
  },
  {
    name: 'clip',
    signatures: [['?fillRule'],['path','?fillRule']],
    receiver: 'CanvasDrawPath'
  },
  {
    name: 'clip',
    signatures: [['?winding'],['path','?winding']],
    receiver: 'CanvasRenderingContext2D'
  },
  {
    name: 'clip',
    signatures: [['?winding'],['path','?winding']],
    receiver: 'OffscreenCanvasRenderingContext2D'
  },
  {
    name: 'clip',
    signatures: [['?winding'],['path','?winding']],
    receiver: 'PaintRenderingContext2D'
  },
  {
    name: 'isPointInPath',
    signatures: [['x','y','?fillRule'],['path','x','y','?fillRule']],
    receiver: 'CanvasDrawPath'
  },
  {
    name: 'isPointInPath',
    signatures: [['x','y','?winding'],['path','x','y','?winding']],
    receiver: 'CanvasRenderingContext2D'
  },
  {
    name: 'isPointInPath',
    signatures: [['x','y','?winding'],['path','x','y','?winding']],
    receiver: 'OffscreenCanvasRenderingContext2D'
  },
  {
    name: 'isPointInPath',
    signatures: [['x','y','?winding'],['path','x','y','?winding']],
    receiver: 'PaintRenderingContext2D'
  },
  {
    name: 'isPointInStroke',
    signatures: [['x','y'],['path','x','y']],
    receiver: 'CanvasDrawPath'
  },
  {
    name: 'isPointInStroke',
    signatures: [['?point']],
    receiver: 'SVGGeometryElement'
  },
  {
    name: 'isPointInStroke',
    signatures: [['x','y'],['path','x','y']],
    receiver: 'CanvasRenderingContext2D'
  },
  {
    name: 'isPointInStroke',
    signatures: [['x','y'],['path','x','y']],
    receiver: 'OffscreenCanvasRenderingContext2D'
  },
  {
    name: 'isPointInStroke',
    signatures: [['x','y'],['path','x','y']],
    receiver: 'PaintRenderingContext2D'
  },
  {
    name: 'stroke',
    signatures: [['?path']]
  },
  {
    name: 'createConicGradient',
    signatures: [['startAngle','x','y']],
    receiver: 'CanvasFillStrokeStyles'
  },
  {
    name: 'createConicGradient',
    signatures: [['startAngle','cx','cy']],
    receiver: 'CanvasRenderingContext2D'
  },
  {
    name: 'createConicGradient',
    signatures: [['startAngle','centerX','centerY']],
    receiver: 'OffscreenCanvasRenderingContext2D'
  },
  {
    name: 'createConicGradient',
    signatures: [['startAngle','cx','cy']],
    receiver: 'PaintRenderingContext2D'
  },
  {
    name: 'createLinearGradient',
    signatures: [['x0','y0','x1','y1']]
  },
  {
    name: 'createPattern',
    signatures: [['image','repetition']],
    receiver: 'CanvasFillStrokeStyles'
  },
  {
    name: 'createPattern',
    signatures: [['image','repetitionType']],
    receiver: 'CanvasRenderingContext2D'
  },
  {
    name: 'createPattern',
    signatures: [['image','repetitionType']],
    receiver: 'OffscreenCanvasRenderingContext2D'
  },
  {
    name: 'createPattern',
    signatures: [['image','repetitionType']],
    receiver: 'PaintRenderingContext2D'
  },
  {
    name: 'createRadialGradient',
    signatures: [['x0','y0','r0','x1','y1','r1']]
  },
  {
    name: 'addColorStop',
    signatures: [['offset','color']]
  },
  {
    name: 'createImageData',
    signatures: [['imagedata'],['sw','sh','?settings']],
    receiver: 'CanvasImageData'
  },
  {
    name: 'createImageData',
    signatures: [['imagedata'],['sw','sh','?imageDataSettings']],
    receiver: 'CanvasRenderingContext2D'
  },
  {
    name: 'createImageData',
    signatures: [['imagedata'],['sw','sh','?imageDataSettings']],
    receiver: 'OffscreenCanvasRenderingContext2D'
  },
  {
    name: 'getImageData',
    signatures: [['sx','sy','sw','sh','?settings']],
    receiver: 'CanvasImageData'
  },
  {
    name: 'getImageData',
    signatures: [['sx','sy','sw','sh','?imageDataSettings']],
    receiver: 'CanvasRenderingContext2D'
  },
  {
    name: 'getImageData',
    signatures: [['sx','sy','sw','sh','?imageDataSettings']],
    receiver: 'OffscreenCanvasRenderingContext2D'
  },
  {
    name: 'putImageData',
    signatures: [['imagedata','dx','dy','?dirtyX','?dirtyY','?dirtyWidth','?dirtyHeight']]
  },
  {
    name: 'arc',
    signatures: [['x','y','radius','startAngle','endAngle','?counterclockwise'],['x','y','radius','startAngle','endAngle','?anticlockwise']]
  },
  {
    name: 'arcTo',
    signatures: [['x1','y1','x2','y2','radius']]
  },
  {
    name: 'bezierCurveTo',
    signatures: [['cp1x','cp1y','cp2x','cp2y','x','y']]
  },
  {
    name: 'ellipse',
    signatures: [['x','y','radiusX','radiusY','rotation','startAngle','endAngle','?counterclockwise'],['x','y','radiusX','radiusY','rotation','startAngle','endAngle','?anticlockwise']]
  },
  {
    name: 'lineTo',
    signatures: [['x','y']]
  },
  {
    name: 'moveTo',
    signatures: [['x','y']],
    receiver: 'CanvasPath'
  },
  {
    name: 'moveTo',
    signatures: [['x','y']],
    receiver: 'Window'
  },
  {
    name: 'moveTo',
    signatures: [['parent','name']],
    receiver: 'EntrySync'
  },
  {
    name: 'moveTo',
    signatures: [['parent','?name','?successCallback','?errorCallback']],
    receiver: 'Entry'
  },
  {
    name: 'quadraticCurveTo',
    signatures: [['cpx','cpy','x','y']]
  },
  {
    name: 'rect',
    signatures: [['x','y','w','h'],['x','y','width','height']]
  },
  {
    name: 'setLineDash',
    signatures: [['segments']],
    receiver: 'CanvasPathDrawingStyles'
  },
  {
    name: 'setLineDash',
    signatures: [['dash']],
    receiver: 'CanvasRenderingContext2D'
  },
  {
    name: 'setLineDash',
    signatures: [['dash']],
    receiver: 'OffscreenCanvasRenderingContext2D'
  },
  {
    name: 'setLineDash',
    signatures: [['dash']],
    receiver: 'PaintRenderingContext2D'
  },
  {
    name: 'setTransform',
    signatures: [['?transform']],
    receiver: 'CanvasPattern'
  },
  {
    name: 'setTransform',
    signatures: [['?transform'],['a','b','c','d','e','f']],
    receiver: 'CanvasTransform'
  },
  {
    name: 'setTransform',
    signatures: [['?transform'],['a','b','c','d','e','f']],
    receiver: 'CanvasRenderingContext2D'
  },
  {
    name: 'setTransform',
    signatures: [['?transform'],['a','b','c','d','e','f']],
    receiver: 'OffscreenCanvasRenderingContext2D'
  },
  {
    name: 'setTransform',
    signatures: [['?transform'],['a','b','c','d','e','f']],
    receiver: 'PaintRenderingContext2D'
  },
  {
    name: 'clearRect',
    signatures: [['x','y','w','h']],
    receiver: 'CanvasRect'
  },
  {
    name: 'clearRect',
    signatures: [['x','y','width','height']],
    receiver: 'CanvasRenderingContext2D'
  },
  {
    name: 'clearRect',
    signatures: [['x','y','width','height']],
    receiver: 'OffscreenCanvasRenderingContext2D'
  },
  {
    name: 'clearRect',
    signatures: [['x','y','width','height']],
    receiver: 'PaintRenderingContext2D'
  },
  {
    name: 'fillRect',
    signatures: [['x','y','w','h']],
    receiver: 'CanvasRect'
  },
  {
    name: 'fillRect',
    signatures: [['x','y','width','height']],
    receiver: 'CanvasRenderingContext2D'
  },
  {
    name: 'fillRect',
    signatures: [['x','y','width','height']],
    receiver: 'OffscreenCanvasRenderingContext2D'
  },
  {
    name: 'fillRect',
    signatures: [['x','y','width','height']],
    receiver: 'PaintRenderingContext2D'
  },
  {
    name: 'strokeRect',
    signatures: [['x','y','w','h']],
    receiver: 'CanvasRect'
  },
  {
    name: 'strokeRect',
    signatures: [['x','y','width','height']],
    receiver: 'CanvasRenderingContext2D'
  },
  {
    name: 'strokeRect',
    signatures: [['x','y','width','height']],
    receiver: 'OffscreenCanvasRenderingContext2D'
  },
  {
    name: 'strokeRect',
    signatures: [['x','y','width','height']],
    receiver: 'PaintRenderingContext2D'
  },
  {
    name: 'fillText',
    signatures: [['text','x','y','?maxWidth']]
  },
  {
    name: 'measureText',
    signatures: [['text']]
  },
  {
    name: 'strokeText',
    signatures: [['text','x','y','?maxWidth']]
  },
  {
    name: 'rotate',
    signatures: [['angle']],
    receiver: 'CanvasTransform'
  },
  {
    name: 'rotate',
    signatures: [['?rotX','?rotY','?rotZ']],
    receiver: 'DOMMatrixReadOnly'
  },
  {
    name: 'rotate',
    signatures: [['angle']],
    receiver: 'SVGMatrix'
  },
  {
    name: 'rotate',
    signatures: [['angle']],
    receiver: 'CanvasRenderingContext2D'
  },
  {
    name: 'rotate',
    signatures: [['angle']],
    receiver: 'OffscreenCanvasRenderingContext2D'
  },
  {
    name: 'rotate',
    signatures: [['angle']],
    receiver: 'PaintRenderingContext2D'
  },
  {
    name: 'scale',
    signatures: [['x','y']],
    receiver: 'CanvasTransform'
  },
  {
    name: 'scale',
    signatures: [['?scaleX','?scaleY','?scaleZ','?originX','?originY','?originZ']],
    receiver: 'DOMMatrixReadOnly'
  },
  {
    name: 'scale',
    signatures: [['scaleFactor']],
    receiver: 'SVGMatrix'
  },
  {
    name: 'scale',
    signatures: [['x','y']],
    receiver: 'CanvasRenderingContext2D'
  },
  {
    name: 'scale',
    signatures: [['x','y']],
    receiver: 'OffscreenCanvasRenderingContext2D'
  },
  {
    name: 'scale',
    signatures: [['x','y']],
    receiver: 'PaintRenderingContext2D'
  },
  {
    name: 'transform',
    signatures: [['a','b','c','d','e','f']]
  },
  {
    name: 'translate',
    signatures: [['x','y']],
    receiver: 'CanvasTransform'
  },
  {
    name: 'translate',
    signatures: [['?tx','?ty','?tz']],
    receiver: 'DOMMatrixReadOnly'
  },
  {
    name: 'translate',
    signatures: [['x','y']],
    receiver: 'SVGMatrix'
  },
  {
    name: 'translate',
    signatures: [['x','y']],
    receiver: 'CanvasRenderingContext2D'
  },
  {
    name: 'translate',
    signatures: [['x','y']],
    receiver: 'OffscreenCanvasRenderingContext2D'
  },
  {
    name: 'translate',
    signatures: [['x','y']],
    receiver: 'PaintRenderingContext2D'
  },
  {
    name: 'drawFocusIfNeeded',
    signatures: [['element'],['path','element']]
  },
  {
    name: 'appendData',
    signatures: [['data']]
  },
  {
    name: 'deleteData',
    signatures: [['offset','count']],
    receiver: 'CharacterData'
  },
  {
    name: 'deleteData',
    signatures: [['key']],
    receiver: 'LockScreenData'
  },
  {
    name: 'insertData',
    signatures: [['offset','data']]
  },
  {
    name: 'replaceData',
    signatures: [['offset','count','data']]
  },
  {
    name: 'substringData',
    signatures: [['offset','count']]
  },
  {
    name: 'after',
    signatures: [['...nodes']]
  },
  {
    name: 'before',
    signatures: [['...nodes']]
  },
  {
    name: 'remove',
    signatures: [['...tokens']],
    receiver: 'DOMTokenList'
  },
  {
    name: 'remove',
    signatures: [['index']],
    receiver: 'DataTransferItemList'
  },
  {
    name: 'remove',
    signatures: [['index']],
    receiver: 'HTMLOptionsCollection'
  },
  {
    name: 'remove',
    signatures: [['?index']],
    receiver: 'HTMLSelectElement'
  },
  {
    name: 'remove',
    signatures: [['start','end']],
    receiver: 'SourceBuffer'
  },
  {
    name: 'remove',
    signatures: [['index']],
    receiver: 'AccessibleNodeList'
  },
  {
    name: 'remove',
    signatures: [['?options']],
    receiver: 'FileSystemHandle'
  },
  {
    name: 'remove',
    signatures: [['successCallback','?errorCallback']],
    receiver: 'Entry'
  },
  {
    name: 'remove',
    signatures: [['app_id']],
    receiver: 'SubApps'
  },
  {
    name: 'replaceWith',
    signatures: [['...nodes']]
  },
  {
    name: 'read',
    signatures: [['?options']],
    receiver: 'Clipboard'
  },
  {
    name: 'read',
    signatures: [['view']],
    receiver: 'ReadableStreamBYOBReader'
  },
  {
    name: 'read',
    signatures: [['buffer','options']],
    receiver: 'FileSystemSyncAccessHandle'
  },
  {
    name: 'read',
    signatures: [['buffer','file_offset']],
    receiver: 'NativeIOFileSync'
  },
  {
    name: 'read',
    signatures: [['buffer','file_offset']],
    receiver: 'NativeIOFile'
  },
  {
    name: 'write',
    signatures: [['data']],
    receiver: 'Clipboard'
  },
  {
    name: 'write',
    signatures: [['...text'],['text']],
    receiver: 'Document'
  },
  {
    name: 'write',
    signatures: [['?chunk']],
    receiver: 'WritableStreamDefaultWriter'
  },
  {
    name: 'write',
    signatures: [['chunk','controller']],
    receiver: 'UnderlyingSinkBase'
  },
  {
    name: 'write',
    signatures: [['buffer','options']],
    receiver: 'FileSystemSyncAccessHandle'
  },
  {
    name: 'write',
    signatures: [['data']],
    receiver: 'FileSystemWritableFileStream'
  },
  {
    name: 'write',
    signatures: [['data']],
    receiver: 'FileWriterSync'
  },
  {
    name: 'write',
    signatures: [['data']],
    receiver: 'FileWriter'
  },
  {
    name: 'write',
    signatures: [['buffer','file_offset']],
    receiver: 'NativeIOFileSync'
  },
  {
    name: 'write',
    signatures: [['buffer','file_offset']],
    receiver: 'NativeIOFile'
  },
  {
    name: 'write',
    signatures: [['message','?options']],
    receiver: 'NDEFReader'
  },
  {
    name: 'writeText',
    signatures: [['data']]
  },
  {
    name: 'getType',
    signatures: [['type']]
  },
  {
    name: 'initCompositionEvent',
    signatures: [['typeArg','?bubblesArg','?cancelableArg','?viewArg','?dataArg'],['type','?bubbles','?cancelable','?view','?data']]
  },
  {
    name: 'store',
    signatures: [['credential']]
  },
  {
    name: 'getRandomValues',
    signatures: [['array']]
  },
  {
    name: 'define',
    signatures: [['name','constructor','?options']]
  },
  {
    name: 'upgrade',
    signatures: [['root']]
  },
  {
    name: 'whenDefined',
    signatures: [['name']]
  },
  {
    name: 'initCustomEvent',
    signatures: [['type','?bubbles','?cancelable','?detail']]
  },
  {
    name: 'createDocument',
    signatures: [['namespace','qualifiedName','?doctype'],['namespaceURI','qualifiedName','?doctype']]
  },
  {
    name: 'createDocumentType',
    signatures: [['qualifiedName','publicId','systemId']]
  },
  {
    name: 'createHTMLDocument',
    signatures: [['?title']]
  },
  {
    name: 'hasFeature',
    signatures: [['...args']]
  },
  {
    name: 'multiplySelf',
    signatures: [['?other']]
  },
  {
    name: 'preMultiplySelf',
    signatures: [['?other']]
  },
  {
    name: 'rotateAxisAngleSelf',
    signatures: [['?x','?y','?z','?angle']]
  },
  {
    name: 'rotateFromVectorSelf',
    signatures: [['?x','?y']]
  },
  {
    name: 'rotateSelf',
    signatures: [['?rotX','?rotY','?rotZ']]
  },
  {
    name: 'scale3dSelf',
    signatures: [['?scale','?originX','?originY','?originZ']]
  },
  {
    name: 'scaleSelf',
    signatures: [['?scaleX','?scaleY','?scaleZ','?originX','?originY','?originZ']]
  },
  {
    name: 'setMatrixValue',
    signatures: [['transformList']]
  },
  {
    name: 'skewXSelf',
    signatures: [['?sx']]
  },
  {
    name: 'skewYSelf',
    signatures: [['?sy']]
  },
  {
    name: 'translateSelf',
    signatures: [['?tx','?ty','?tz']]
  },
  {
    name: 'multiply',
    signatures: [['?other']],
    receiver: 'DOMMatrixReadOnly'
  },
  {
    name: 'multiply',
    signatures: [['secondMatrix']],
    receiver: 'SVGMatrix'
  },
  {
    name: 'rotateAxisAngle',
    signatures: [['?x','?y','?z','?angle']]
  },
  {
    name: 'rotateFromVector',
    signatures: [['?x','?y']],
    receiver: 'DOMMatrixReadOnly'
  },
  {
    name: 'rotateFromVector',
    signatures: [['x','y']],
    receiver: 'SVGMatrix'
  },
  {
    name: 'scale3d',
    signatures: [['?scale','?originX','?originY','?originZ']]
  },
  {
    name: 'scaleNonUniform',
    signatures: [['?scaleX','?scaleY']],
    receiver: 'DOMMatrixReadOnly'
  },
  {
    name: 'scaleNonUniform',
    signatures: [['scaleFactorX','scaleFactorY']],
    receiver: 'SVGMatrix'
  },
  {
    name: 'skewX',
    signatures: [['?sx']],
    receiver: 'DOMMatrixReadOnly'
  },
  {
    name: 'skewX',
    signatures: [['angle']],
    receiver: 'SVGMatrix'
  },
  {
    name: 'skewY',
    signatures: [['?sy']],
    receiver: 'DOMMatrixReadOnly'
  },
  {
    name: 'skewY',
    signatures: [['angle']],
    receiver: 'SVGMatrix'
  },
  {
    name: 'transformPoint',
    signatures: [['?point']]
  },
  {
    name: 'parseFromString',
    signatures: [['string','type'],['str','type','?options']]
  },
  {
    name: 'matrixTransform',
    signatures: [['?matrix']],
    receiver: 'DOMPointReadOnly'
  },
  {
    name: 'matrixTransform',
    signatures: [['matrix']],
    receiver: 'SVGPoint'
  },
  {
    name: 'contains',
    signatures: [['string']],
    receiver: 'DOMStringList'
  },
  {
    name: 'contains',
    signatures: [['token']],
    receiver: 'DOMTokenList'
  },
  {
    name: 'contains',
    signatures: [['other']],
    receiver: 'Node'
  },
  {
    name: 'supports',
    signatures: [['token']],
    receiver: 'DOMTokenList'
  },
  {
    name: 'supports',
    signatures: [['conditionText'],['property','value']],
    receiver: 'CSS'
  },
  {
    name: 'toggle',
    signatures: [['token','?force']]
  },
  {
    name: 'clearData',
    signatures: [['?format']]
  },
  {
    name: 'getData',
    signatures: [['format']],
    receiver: 'DataTransfer'
  },
  {
    name: 'getData',
    signatures: [['key']],
    receiver: 'LockScreenData'
  },
  {
    name: 'setData',
    signatures: [['format','data']],
    receiver: 'DataTransfer'
  },
  {
    name: 'setData',
    signatures: [['data']],
    receiver: 'PendingBeacon'
  },
  {
    name: 'setData',
    signatures: [['key','data']],
    receiver: 'LockScreenData'
  },
  {
    name: 'setDragImage',
    signatures: [['image','x','y']]
  },
  {
    name: 'getAsString',
    signatures: [['callback']]
  },
  {
    name: 'clear',
    signatures: [['mask']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'adoptNode',
    signatures: [['node']]
  },
  {
    name: 'caretRangeFromPoint',
    signatures: [['?x','?y']]
  },
  {
    name: 'createAttribute',
    signatures: [['localName']]
  },
  {
    name: 'createAttributeNS',
    signatures: [['namespace','qualifiedName'],['namespaceURI','qualifiedName']]
  },
  {
    name: 'createCDATASection',
    signatures: [['data']]
  },
  {
    name: 'createComment',
    signatures: [['data']]
  },
  {
    name: 'createElement',
    signatures: [['localName','?options'],['tagName','?options']]
  },
  {
    name: 'createElementNS',
    signatures: [['namespaceURI','qualifiedName','?options'],['namespace','qualifiedName','?options']]
  },
  {
    name: 'createEvent',
    signatures: [['eventInterface'],['eventType']]
  },
  {
    name: 'createNodeIterator',
    signatures: [['root','?whatToShow','?filter']]
  },
  {
    name: 'createProcessingInstruction',
    signatures: [['target','data']]
  },
  {
    name: 'createTextNode',
    signatures: [['data']]
  },
  {
    name: 'createTreeWalker',
    signatures: [['root','?whatToShow','?filter']]
  },
  {
    name: 'execCommand',
    signatures: [['commandId','?showUI','?value']]
  },
  {
    name: 'getElementById',
    signatures: [['elementId']]
  },
  {
    name: 'getElementsByClassName',
    signatures: [['classNames']]
  },
  {
    name: 'getElementsByName',
    signatures: [['elementName']]
  },
  {
    name: 'getElementsByTagName',
    signatures: [['qualifiedName'],['localName']]
  },
  {
    name: 'getElementsByTagNameNS',
    signatures: [['namespaceURI','localName'],['namespace','localName']]
  },
  {
    name: 'importNode',
    signatures: [['node','?deep']]
  },
  {
    name: 'queryCommandEnabled',
    signatures: [['commandId']]
  },
  {
    name: 'queryCommandIndeterm',
    signatures: [['commandId']]
  },
  {
    name: 'queryCommandState',
    signatures: [['commandId']]
  },
  {
    name: 'queryCommandSupported',
    signatures: [['commandId']]
  },
  {
    name: 'queryCommandValue',
    signatures: [['commandId']]
  },
  {
    name: 'writeln',
    signatures: [['...text'],['text']]
  },
  {
    name: 'elementFromPoint',
    signatures: [['x','y']]
  },
  {
    name: 'elementsFromPoint',
    signatures: [['x','y']]
  },
  {
    name: 'attachShadow',
    signatures: [['init'],['shadowRootInitDict']]
  },
  {
    name: 'closest',
    signatures: [['selector'],['selectors']]
  },
  {
    name: 'getAttribute',
    signatures: [['qualifiedName'],['name']]
  },
  {
    name: 'getAttributeNS',
    signatures: [['namespace','localName'],['namespaceURI','localName']]
  },
  {
    name: 'getAttributeNode',
    signatures: [['qualifiedName'],['name']]
  },
  {
    name: 'getAttributeNodeNS',
    signatures: [['namespace','localName'],['namespaceURI','localName']]
  },
  {
    name: 'hasAttribute',
    signatures: [['qualifiedName'],['name']]
  },
  {
    name: 'hasAttributeNS',
    signatures: [['namespace','localName'],['namespaceURI','localName']]
  },
  {
    name: 'hasPointerCapture',
    signatures: [['pointerId']]
  },
  {
    name: 'insertAdjacentElement',
    signatures: [['where','element']]
  },
  {
    name: 'insertAdjacentHTML',
    signatures: [['position','text']]
  },
  {
    name: 'insertAdjacentText',
    signatures: [['where','data']]
  },
  {
    name: 'matches',
    signatures: [['selectors']]
  },
  {
    name: 'releasePointerCapture',
    signatures: [['pointerId']]
  },
  {
    name: 'removeAttribute',
    signatures: [['qualifiedName'],['name']]
  },
  {
    name: 'removeAttributeNS',
    signatures: [['namespace','localName'],['namespaceURI','localName']]
  },
  {
    name: 'removeAttributeNode',
    signatures: [['attr']]
  },
  {
    name: 'requestFullscreen',
    signatures: [['?options']]
  },
  {
    name: 'requestPointerLock',
    signatures: [['?options']]
  },
  {
    name: 'scroll',
    signatures: [['?options'],['x','y']]
  },
  {
    name: 'scrollBy',
    signatures: [['?options'],['x','y']]
  },
  {
    name: 'scrollIntoView',
    signatures: [['?arg']]
  },
  {
    name: 'scrollTo',
    signatures: [['?options'],['x','y']]
  },
  {
    name: 'setAttribute',
    signatures: [['qualifiedName','value'],['name','value']]
  },
  {
    name: 'setAttributeNS',
    signatures: [['namespace','qualifiedName','value'],['namespaceURI','name','value']]
  },
  {
    name: 'setAttributeNode',
    signatures: [['attr']]
  },
  {
    name: 'setAttributeNodeNS',
    signatures: [['attr']]
  },
  {
    name: 'setPointerCapture',
    signatures: [['pointerId']]
  },
  {
    name: 'toggleAttribute',
    signatures: [['qualifiedName','?force']]
  },
  {
    name: 'webkitMatchesSelector',
    signatures: [['selectors']]
  },
  {
    name: 'initEvent',
    signatures: [['type','?bubbles','?cancelable']]
  },
  {
    name: 'handleEvent',
    signatures: [['object']]
  },
  {
    name: 'dispatchEvent',
    signatures: [['event']]
  },
  {
    name: 'readAsArrayBuffer',
    signatures: [['blob']]
  },
  {
    name: 'readAsBinaryString',
    signatures: [['blob']]
  },
  {
    name: 'readAsDataURL',
    signatures: [['blob']]
  },
  {
    name: 'readAsText',
    signatures: [['blob','?encoding'],['blob','?label']],
    receiver: 'FileReader'
  },
  {
    name: 'readAsText',
    signatures: [['blob','?label']],
    receiver: 'FileReaderSync'
  },
  {
    name: 'getDirectory',
    signatures: [['?path','?options','?successCallback','?errorCallback']],
    receiver: 'FileSystemDirectoryEntry'
  },
  {
    name: 'getDirectory',
    signatures: [['path','flags']],
    receiver: 'DirectoryEntrySync'
  },
  {
    name: 'getDirectory',
    signatures: [['path','?options','?successCallback','?errorCallback']],
    receiver: 'DirectoryEntry'
  },
  {
    name: 'getFile',
    signatures: [['?path','?options','?successCallback','?errorCallback']],
    receiver: 'FileSystemDirectoryEntry'
  },
  {
    name: 'getFile',
    signatures: [['path','flags']],
    receiver: 'DirectoryEntrySync'
  },
  {
    name: 'getFile',
    signatures: [['path','?options','?successCallback','?errorCallback']],
    receiver: 'DirectoryEntry'
  },
  {
    name: 'getDirectoryHandle',
    signatures: [['name','?options']]
  },
  {
    name: 'getFileHandle',
    signatures: [['name','?options']]
  },
  {
    name: 'removeEntry',
    signatures: [['name','?options']]
  },
  {
    name: 'resolve',
    signatures: [['possibleDescendant'],['possibleChild']]
  },
  {
    name: 'readEntries',
    signatures: [['successCallback','?errorCallback']],
    receiver: 'FileSystemDirectoryReader'
  },
  {
    name: 'readEntries',
    signatures: [['successCallback','?errorCallback']],
    receiver: 'DirectoryReader'
  },
  {
    name: 'getParent',
    signatures: [['?successCallback','?errorCallback']],
    receiver: 'FileSystemEntry'
  },
  {
    name: 'getParent',
    signatures: [['?successCallback','?errorCallback']],
    receiver: 'Entry'
  },
  {
    name: 'file',
    signatures: [['successCallback','?errorCallback']],
    receiver: 'FileSystemFileEntry'
  },
  {
    name: 'file',
    signatures: [['successCallback','?errorCallback']],
    receiver: 'FileEntry'
  },
  {
    name: 'isSameEntry',
    signatures: [['other']]
  },
  {
    name: 'load',
    signatures: [['font','?text']],
    receiver: 'FontFaceSet'
  },
  {
    name: 'load',
    signatures: [['sessionId']],
    receiver: 'MediaKeySession'
  },
  {
    name: 'load',
    signatures: [['buffer']],
    receiver: 'MLModelLoader'
  },
  {
    name: 'check',
    signatures: [['font','?text']]
  },
  {
    name: 'append',
    signatures: [['name','value','?fileName'],['name','value','?filename']],
    receiver: 'FormData'
  },
  {
    name: 'append',
    signatures: [['name','value']],
    receiver: 'Headers'
  },
  {
    name: 'append',
    signatures: [['...nodes']],
    receiver: 'ParentNode'
  },
  {
    name: 'append',
    signatures: [['name','value']],
    receiver: 'URLSearchParams'
  },
  {
    name: 'append',
    signatures: [['property','...values']],
    receiver: 'StylePropertyMap'
  },
  {
    name: 'append',
    signatures: [['key','value']],
    receiver: 'SharedStorage'
  },
  {
    name: 'getAll',
    signatures: [['name']],
    receiver: 'FormData'
  },
  {
    name: 'getAll',
    signatures: [['?query','?count']],
    receiver: 'IDBIndex'
  },
  {
    name: 'getAll',
    signatures: [['?query','?count']],
    receiver: 'IDBObjectStore'
  },
  {
    name: 'getAll',
    signatures: [['name']],
    receiver: 'URLSearchParams'
  },
  {
    name: 'getAll',
    signatures: [['property']],
    receiver: 'StylePropertyMapReadOnly'
  },
  {
    name: 'getAll',
    signatures: [['name'],['?options']],
    receiver: 'CookieStore'
  },
  {
    name: 'clearWatch',
    signatures: [['watchId'],['watchID']]
  },
  {
    name: 'getCurrentPosition',
    signatures: [['successCallback','?errorCallback','?options']]
  },
  {
    name: 'watchPosition',
    signatures: [['successCallback','?errorCallback','?options']]
  },
  {
    name: 'namedItem',
    signatures: [['name']],
    receiver: 'HTMLAllCollection'
  },
  {
    name: 'namedItem',
    signatures: [['name']],
    receiver: 'HTMLCollection'
  },
  {
    name: 'namedItem',
    signatures: [['name']],
    receiver: 'HTMLCollectionOf'
  },
  {
    name: 'namedItem',
    signatures: [['name']],
    receiver: 'HTMLFormControlsCollection'
  },
  {
    name: 'namedItem',
    signatures: [['name']],
    receiver: 'HTMLSelectElement'
  },
  {
    name: 'namedItem',
    signatures: [['name']],
    receiver: 'MimeTypeArray'
  },
  {
    name: 'namedItem',
    signatures: [['name']],
    receiver: 'Plugin'
  },
  {
    name: 'namedItem',
    signatures: [['name']],
    receiver: 'PluginArray'
  },
  {
    name: 'namedItem',
    signatures: [['?name']],
    receiver: 'RTCStatsResponse'
  },
  {
    name: 'setCustomValidity',
    signatures: [['error']]
  },
  {
    name: 'captureStream',
    signatures: [['?frameRequestRate'],['?frameRate']],
    receiver: 'HTMLCanvasElement'
  },
  {
    name: 'getContext',
    signatures: [['contextId','?options'],['contextId','?attributes']],
    receiver: 'HTMLCanvasElement'
  },
  {
    name: 'getContext',
    signatures: [['contextType','?attributes']],
    receiver: 'OffscreenCanvas'
  },
  {
    name: 'toBlob',
    signatures: [['callback','?type','?quality']]
  },
  {
    name: 'toDataURL',
    signatures: [['?type','?quality']]
  },
  {
    name: 'requestSubmit',
    signatures: [['?submitter']]
  },
  {
    name: 'submit',
    signatures: [['buffers']],
    receiver: 'GPUQueue'
  },
  {
    name: 'decode',
    signatures: [['?input','?options']],
    receiver: 'TextDecoder'
  },
  {
    name: 'decode',
    signatures: [['chunk']],
    receiver: 'AudioDecoder'
  },
  {
    name: 'decode',
    signatures: [['chunk']],
    receiver: 'VideoDecoder'
  },
  {
    name: 'select',
    signatures: [['properties','?options']],
    receiver: 'ContactsManager'
  },
  {
    name: 'setRangeText',
    signatures: [['replacement','?start','?end','?selectionMode']]
  },
  {
    name: 'setSelectionRange',
    signatures: [['start','end','?direction']]
  },
  {
    name: 'stepDown',
    signatures: [['?n']]
  },
  {
    name: 'stepUp',
    signatures: [['?n']]
  },
  {
    name: 'addTextTrack',
    signatures: [['kind','?label','?language']]
  },
  {
    name: 'canPlayType',
    signatures: [['type']]
  },
  {
    name: 'fastSeek',
    signatures: [['time']]
  },
  {
    name: 'setMediaKeys',
    signatures: [['mediaKeys']]
  },
  {
    name: 'focus',
    signatures: [['?options']],
    receiver: 'HTMLOrSVGElement'
  },
  {
    name: 'focus',
    signatures: [['?options']],
    receiver: 'HTMLOrForeignElement'
  },
  {
    name: 'focus',
    signatures: [['focus_behavior']],
    receiver: 'FocusableMediaStreamTrack'
  },
  {
    name: 'assign',
    signatures: [['...nodes']],
    receiver: 'HTMLSlotElement'
  },
  {
    name: 'assign',
    signatures: [['url']],
    receiver: 'Location'
  },
  {
    name: 'assignedElements',
    signatures: [['?options']]
  },
  {
    name: 'assignedNodes',
    signatures: [['?options']]
  },
  {
    name: 'deleteRow',
    signatures: [['index']]
  },
  {
    name: 'insertRow',
    signatures: [['?index']]
  },
  {
    name: 'deleteCell',
    signatures: [['index']]
  },
  {
    name: 'insertCell',
    signatures: [['?index']]
  },
  {
    name: 'back',
    signatures: [['?options']],
    receiver: 'Navigation'
  },
  {
    name: 'forward',
    signatures: [['?options']],
    receiver: 'Navigation'
  },
  {
    name: 'go',
    signatures: [['?delta']]
  },
  {
    name: 'pushState',
    signatures: [['data','unused','?url'],['data','title','?url']]
  },
  {
    name: 'replaceState',
    signatures: [['data','unused','?url'],['data','title','?url']]
  },
  {
    name: 'advance',
    signatures: [['count']]
  },
  {
    name: 'continue',
    signatures: [['?key']]
  },
  {
    name: 'continuePrimaryKey',
    signatures: [['key','primaryKey']]
  },
  {
    name: 'update',
    signatures: [['value']],
    receiver: 'IDBCursor'
  },
  {
    name: 'update',
    signatures: [['response']],
    receiver: 'MediaKeySession'
  },
  {
    name: 'createObjectStore',
    signatures: [['name','?options']]
  },
  {
    name: 'deleteObjectStore',
    signatures: [['name']]
  },
  {
    name: 'transaction',
    signatures: [['storeNames','?mode','?options']],
    receiver: 'IDBDatabase'
  },
  {
    name: 'transaction',
    signatures: [['callback','?errorCallback','?successCallback']],
    receiver: 'Database'
  },
  {
    name: 'cmp',
    signatures: [['first','second']]
  },
  {
    name: 'deleteDatabase',
    signatures: [['name']]
  },
  {
    name: 'count',
    signatures: [['?query'],['?key']],
    receiver: 'IDBIndex'
  },
  {
    name: 'count',
    signatures: [['?query'],['?key']],
    receiver: 'IDBObjectStore'
  },
  {
    name: 'count',
    signatures: [['?label']],
    receiver: 'Console'
  },
  {
    name: 'count',
    signatures: [['?label']],
    receiver: 'console'
  },
  {
    name: 'getAllKeys',
    signatures: [['?query','?count']]
  },
  {
    name: 'getKey',
    signatures: [['query'],['key']],
    receiver: 'IDBIndex'
  },
  {
    name: 'getKey',
    signatures: [['query'],['key']],
    receiver: 'IDBObjectStore'
  },
  {
    name: 'getKey',
    signatures: [['name']],
    receiver: 'PushSubscription'
  },
  {
    name: 'openCursor',
    signatures: [['?query','?direction'],['?range','?direction']]
  },
  {
    name: 'openKeyCursor',
    signatures: [['?query','?direction'],['?range','?direction']]
  },
  {
    name: 'includes',
    signatures: [['key']]
  },
  {
    name: 'createIndex',
    signatures: [['name','keyPath','?options']]
  },
  {
    name: 'deleteIndex',
    signatures: [['name']]
  },
  {
    name: 'index',
    signatures: [['name']]
  },
  {
    name: 'objectStore',
    signatures: [['name']]
  },
  {
    name: 'transferFromImageBitmap',
    signatures: [['bitmap']]
  },
  {
    name: 'observe',
    signatures: [['target']],
    receiver: 'IntersectionObserver'
  },
  {
    name: 'observe',
    signatures: [['target','?options']],
    receiver: 'MutationObserver'
  },
  {
    name: 'observe',
    signatures: [['?options']],
    receiver: 'PerformanceObserver'
  },
  {
    name: 'observe',
    signatures: [['target','?options']],
    receiver: 'ResizeObserver'
  },
  {
    name: 'unobserve',
    signatures: [['target']]
  },
  {
    name: 'getModifierState',
    signatures: [['keyArg']]
  },
  {
    name: 'initKeyboardEvent',
    signatures: [['typeArg','?bubblesArg','?cancelableArg','?viewArg','?keyArg','?locationArg','?ctrlKey','?altKey','?shiftKey','?metaKey'],['type','?bubbles','?cancelable','?view','?keyIdentifier','?location','?ctrlKey','?altKey','?shiftKey','?metaKey']]
  },
  {
    name: 'setKeyframes',
    signatures: [['keyframes']]
  },
  {
    name: 'reload',
    signatures: [['?options']],
    receiver: 'Navigation'
  },
  {
    name: 'query',
    signatures: [['permissionDesc'],['permission']],
    receiver: 'Permissions'
  },
  {
    name: 'request',
    signatures: [['name','callback'],['name','options','callback']],
    receiver: 'LockManager'
  },
  {
    name: 'request',
    signatures: [['permissions']],
    receiver: 'Permissions'
  },
  {
    name: 'request',
    signatures: [['?type']],
    receiver: 'WakeLock'
  },
  {
    name: 'decodingInfo',
    signatures: [['configuration']]
  },
  {
    name: 'encodingInfo',
    signatures: [['configuration']]
  },
  {
    name: 'getDisplayMedia',
    signatures: [['?constraints']]
  },
  {
    name: 'getUserMedia',
    signatures: [['?constraints']],
    receiver: 'MediaDevices'
  },
  {
    name: 'getUserMedia',
    signatures: [['constraints','successCallback','errorCallback']],
    receiver: 'Navigator'
  },
  {
    name: 'generateRequest',
    signatures: [['initDataType','initData']]
  },
  {
    name: 'createSession',
    signatures: [['?sessionType']]
  },
  {
    name: 'setServerCertificate',
    signatures: [['serverCertificate']]
  },
  {
    name: 'appendMedium',
    signatures: [['medium']]
  },
  {
    name: 'deleteMedium',
    signatures: [['medium']]
  },
  {
    name: 'addListener',
    signatures: [['callback'],['listener']]
  },
  {
    name: 'removeListener',
    signatures: [['callback'],['listener']]
  },
  {
    name: 'setActionHandler',
    signatures: [['action','handler']]
  },
  {
    name: 'setPositionState',
    signatures: [['?state']]
  },
  {
    name: 'addSourceBuffer',
    signatures: [['type'],['config']]
  },
  {
    name: 'endOfStream',
    signatures: [['?error']]
  },
  {
    name: 'removeSourceBuffer',
    signatures: [['sourceBuffer'],['buffer']]
  },
  {
    name: 'setLiveSeekableRange',
    signatures: [['start','end']]
  },
  {
    name: 'addTrack',
    signatures: [['track']],
    receiver: 'MediaStream'
  },
  {
    name: 'addTrack',
    signatures: [['track','...streams']],
    receiver: 'RTCPeerConnection'
  },
  {
    name: 'getTrackById',
    signatures: [['trackId']],
    receiver: 'MediaStream'
  },
  {
    name: 'getTrackById',
    signatures: [['id']],
    receiver: 'TextTrackList'
  },
  {
    name: 'getTrackById',
    signatures: [['id']],
    receiver: 'AudioTrackList'
  },
  {
    name: 'getTrackById',
    signatures: [['id']],
    receiver: 'VideoTrackList'
  },
  {
    name: 'removeTrack',
    signatures: [['track']],
    receiver: 'MediaStream'
  },
  {
    name: 'removeTrack',
    signatures: [['sender']],
    receiver: 'RTCPeerConnection'
  },
  {
    name: 'applyConstraints',
    signatures: [['?constraints']]
  },
  {
    name: 'initMessageEvent',
    signatures: [['type','?bubbles','?cancelable','?data','?origin','?lastEventId','?source','?ports']]
  },
  {
    name: 'initMouseEvent',
    signatures: [['typeArg','canBubbleArg','cancelableArg','viewArg','detailArg','screenXArg','screenYArg','clientXArg','clientYArg','ctrlKeyArg','altKeyArg','shiftKeyArg','metaKeyArg','buttonArg','relatedTargetArg'],['type','?bubbles','?cancelable','?view','?detail','?screenX','?screenY','?clientX','?clientY','?ctrlKey','?altKey','?shiftKey','?metaKey','?button','?relatedTarget']]
  },
  {
    name: 'initMutationEvent',
    signatures: [['typeArg','?bubblesArg','?cancelableArg','?relatedNodeArg','?prevValueArg','?newValueArg','?attrNameArg','?attrChangeArg'],['?type','?bubbles','?cancelable','?relatedNode','?prevValue','?newValue','?attrName','?attrChange']]
  },
  {
    name: 'getNamedItem',
    signatures: [['qualifiedName'],['name']]
  },
  {
    name: 'getNamedItemNS',
    signatures: [['namespace','localName'],['namespaceURI','localName']]
  },
  {
    name: 'removeNamedItem',
    signatures: [['qualifiedName'],['name']]
  },
  {
    name: 'removeNamedItemNS',
    signatures: [['namespace','localName'],['namespaceURI','localName']]
  },
  {
    name: 'setNamedItem',
    signatures: [['attr']]
  },
  {
    name: 'setNamedItemNS',
    signatures: [['attr']]
  },
  {
    name: 'canShare',
    signatures: [['?data']]
  },
  {
    name: 'requestMediaKeySystemAccess',
    signatures: [['keySystem','supportedConfigurations']]
  },
  {
    name: 'sendBeacon',
    signatures: [['url','?data']]
  },
  {
    name: 'share',
    signatures: [['?data']]
  },
  {
    name: 'vibrate',
    signatures: [['pattern']]
  },
  {
    name: 'registerProtocolHandler',
    signatures: [['scheme','url']]
  },
  {
    name: 'appendChild',
    signatures: [['node']],
    receiver: 'Node'
  },
  {
    name: 'appendChild',
    signatures: [['child']],
    receiver: 'AccessibleNode'
  },
  {
    name: 'cloneNode',
    signatures: [['?deep']]
  },
  {
    name: 'compareDocumentPosition',
    signatures: [['other']]
  },
  {
    name: 'getRootNode',
    signatures: [['?options']]
  },
  {
    name: 'insertBefore',
    signatures: [['node','child']]
  },
  {
    name: 'isDefaultNamespace',
    signatures: [['namespace'],['namespaceURI']]
  },
  {
    name: 'isEqualNode',
    signatures: [['otherNode']]
  },
  {
    name: 'isSameNode',
    signatures: [['otherNode']]
  },
  {
    name: 'lookupNamespaceURI',
    signatures: [['prefix']],
    receiver: 'Node'
  },
  {
    name: 'lookupNamespaceURI',
    signatures: [['?prefix']],
    receiver: 'XPathNSResolver'
  },
  {
    name: 'lookupPrefix',
    signatures: [['namespace'],['namespaceURI']]
  },
  {
    name: 'removeChild',
    signatures: [['child']]
  },
  {
    name: 'replaceChild',
    signatures: [['node','child']]
  },
  {
    name: 'bindVertexArrayOES',
    signatures: [['arrayObject']],
    receiver: 'OES_vertex_array_object'
  },
  {
    name: 'bindVertexArrayOES',
    signatures: [['?arrayObject']],
    receiver: 'OESVertexArrayObject'
  },
  {
    name: 'deleteVertexArrayOES',
    signatures: [['arrayObject']],
    receiver: 'OES_vertex_array_object'
  },
  {
    name: 'deleteVertexArrayOES',
    signatures: [['?arrayObject']],
    receiver: 'OESVertexArrayObject'
  },
  {
    name: 'isVertexArrayOES',
    signatures: [['arrayObject']],
    receiver: 'OES_vertex_array_object'
  },
  {
    name: 'isVertexArrayOES',
    signatures: [['?arrayObject']],
    receiver: 'OESVertexArrayObject'
  },
  {
    name: 'framebufferTextureMultiviewOVR',
    signatures: [['target','attachment','texture','level','baseViewIndex','numViews']]
  },
  {
    name: 'setPeriodicWave',
    signatures: [['periodicWave']]
  },
  {
    name: 'prepend',
    signatures: [['...nodes']]
  },
  {
    name: 'querySelector',
    signatures: [['selectors']]
  },
  {
    name: 'querySelectorAll',
    signatures: [['selectors']]
  },
  {
    name: 'replaceChildren',
    signatures: [['...nodes']]
  },
  {
    name: 'addPath',
    signatures: [['path','?transform']]
  },
  {
    name: 'show',
    signatures: [['?detailsPromise']],
    receiver: 'PaymentRequest'
  },
  {
    name: 'updateWith',
    signatures: [['detailsPromise']]
  },
  {
    name: 'complete',
    signatures: [['?result'],['?paymentResult']],
    receiver: 'PaymentResponse'
  },
  {
    name: 'complete',
    signatures: [['merchantSessionPromise']],
    receiver: 'MerchantValidationEvent'
  },
  {
    name: 'retry',
    signatures: [['?errorFields']]
  },
  {
    name: 'clearMarks',
    signatures: [['?markName']]
  },
  {
    name: 'clearMeasures',
    signatures: [['?measureName']]
  },
  {
    name: 'getEntriesByName',
    signatures: [['name','?type'],['name','?entryType']]
  },
  {
    name: 'getEntriesByType',
    signatures: [['type'],['entryType']]
  },
  {
    name: 'mark',
    signatures: [['markName','?markOptions']]
  },
  {
    name: 'measure',
    signatures: [['measureName','?startOrMeasureOptions','?endMark']]
  },
  {
    name: 'setResourceTimingBufferSize',
    signatures: [['maxSize']]
  },
  {
    name: 'refresh',
    signatures: [['?reload']]
  },
  {
    name: 'permissionState',
    signatures: [['?options']]
  },
  {
    name: 'subscribe',
    signatures: [['?options']],
    receiver: 'PushManager'
  },
  {
    name: 'subscribe',
    signatures: [['subscriptions']],
    receiver: 'CookieStoreManager'
  },
  {
    name: 'unsubscribe',
    signatures: [['subscriptions']],
    receiver: 'CookieStoreManager'
  },
  {
    name: 'insertDTMF',
    signatures: [['tones','?duration','?interToneGap']]
  },
  {
    name: 'send',
    signatures: [['data']],
    receiver: 'RTCDataChannel'
  },
  {
    name: 'send',
    signatures: [['data']],
    receiver: 'WebSocket'
  },
  {
    name: 'send',
    signatures: [['?body']],
    receiver: 'XMLHttpRequest'
  },
  {
    name: 'send',
    signatures: [['command']],
    receiver: 'InspectorOverlayHost'
  },
  {
    name: 'send',
    signatures: [['message'],['data']],
    receiver: 'PresentationConnection'
  },
  {
    name: 'send',
    signatures: [['data','?timestamp']],
    receiver: 'MIDIOutput'
  },
  {
    name: 'addIceCandidate',
    signatures: [['?candidate','?successCallback','?failureCallback']]
  },
  {
    name: 'addTransceiver',
    signatures: [['trackOrKind','?init']]
  },
  {
    name: 'createAnswer',
    signatures: [['?options'],['successCallback','failureCallback']]
  },
  {
    name: 'createDataChannel',
    signatures: [['label','?dataChannelDict']]
  },
  {
    name: 'createOffer',
    signatures: [['?options'],['successCallback','failureCallback','?options']]
  },
  {
    name: 'getStats',
    signatures: [['?selector'],['?callbackOrSelector','?legacySelector']],
    receiver: 'RTCPeerConnection'
  },
  {
    name: 'setConfiguration',
    signatures: [['?configuration']]
  },
  {
    name: 'setLocalDescription',
    signatures: [['?description','?successCallback','?failureCallback']]
  },
  {
    name: 'setRemoteDescription',
    signatures: [['description','?successCallback','?failureCallback']]
  },
  {
    name: 'replaceTrack',
    signatures: [['withTrack']]
  },
  {
    name: 'setParameters',
    signatures: [['parameters']]
  },
  {
    name: 'setStreams',
    signatures: [['...streams']]
  },
  {
    name: 'setCodecPreferences',
    signatures: [['codecs']]
  },
  {
    name: 'collapse',
    signatures: [['?toStart']],
    receiver: 'Range'
  },
  {
    name: 'collapse',
    signatures: [['node','?offset']],
    receiver: 'Selection'
  },
  {
    name: 'compareBoundaryPoints',
    signatures: [['how','sourceRange']]
  },
  {
    name: 'comparePoint',
    signatures: [['node','offset']]
  },
  {
    name: 'createContextualFragment',
    signatures: [['fragment']]
  },
  {
    name: 'insertNode',
    signatures: [['node']]
  },
  {
    name: 'intersectsNode',
    signatures: [['node']]
  },
  {
    name: 'isPointInRange',
    signatures: [['node','offset']]
  },
  {
    name: 'selectNode',
    signatures: [['node']]
  },
  {
    name: 'selectNodeContents',
    signatures: [['node']]
  },
  {
    name: 'setEnd',
    signatures: [['node','offset']]
  },
  {
    name: 'setEndAfter',
    signatures: [['node']]
  },
  {
    name: 'setEndBefore',
    signatures: [['node']]
  },
  {
    name: 'setStart',
    signatures: [['node','offset']]
  },
  {
    name: 'setStartAfter',
    signatures: [['node']]
  },
  {
    name: 'setStartBefore',
    signatures: [['node']]
  },
  {
    name: 'surroundContents',
    signatures: [['newParent']]
  },
  {
    name: 'getReader',
    signatures: [['?options']]
  },
  {
    name: 'pipeThrough',
    signatures: [['transform','?options']]
  },
  {
    name: 'pipeTo',
    signatures: [['destination','?options']]
  },
  {
    name: 'enqueue',
    signatures: [['?chunk']],
    receiver: 'ReadableStreamDefaultController'
  },
  {
    name: 'enqueue',
    signatures: [['?chunk']],
    receiver: 'TransformStreamDefaultController'
  },
  {
    name: 'enqueue',
    signatures: [['chunk']],
    receiver: 'ReadableByteStreamController'
  },
  {
    name: 'error',
    signatures: [['?e']],
    receiver: 'ReadableStreamDefaultController'
  },
  {
    name: 'error',
    signatures: [['?reason']],
    receiver: 'TransformStreamDefaultController'
  },
  {
    name: 'error',
    signatures: [['?e']],
    receiver: 'WritableStreamDefaultController'
  },
  {
    name: 'error',
    signatures: [['...data']],
    receiver: 'Console'
  },
  {
    name: 'error',
    signatures: [['...data']],
    receiver: 'console'
  },
  {
    name: 'error',
    signatures: [['?e']],
    receiver: 'ReadableByteStreamController'
  },
  {
    name: 'cancelWatchAvailability',
    signatures: [['?id']]
  },
  {
    name: 'prompt',
    signatures: [['?message','?_default'],['?message','?defaultValue']],
    receiver: 'Window'
  },
  {
    name: 'watchAvailability',
    signatures: [['callback']]
  },
  {
    name: 'convertToSpecifiedUnits',
    signatures: [['unitType']]
  },
  {
    name: 'newValueSpecifiedUnits',
    signatures: [['unitType','valueInSpecifiedUnits']]
  },
  {
    name: 'beginElementAt',
    signatures: [['offset']]
  },
  {
    name: 'endElementAt',
    signatures: [['offset']]
  },
  {
    name: 'setStdDeviation',
    signatures: [['stdDeviationX','stdDeviationY']]
  },
  {
    name: 'getPointAtLength',
    signatures: [['distance']]
  },
  {
    name: 'isPointInFill',
    signatures: [['?point']]
  },
  {
    name: 'getBBox',
    signatures: [['?options']]
  },
  {
    name: 'appendItem',
    signatures: [['newItem']]
  },
  {
    name: 'getItem',
    signatures: [['index']],
    receiver: 'SVGLengthList'
  },
  {
    name: 'getItem',
    signatures: [['index']],
    receiver: 'SVGNumberList'
  },
  {
    name: 'getItem',
    signatures: [['index']],
    receiver: 'SVGPointList'
  },
  {
    name: 'getItem',
    signatures: [['index']],
    receiver: 'SVGStringList'
  },
  {
    name: 'getItem',
    signatures: [['index']],
    receiver: 'SVGTransformList'
  },
  {
    name: 'getItem',
    signatures: [['key']],
    receiver: 'Storage'
  },
  {
    name: 'getItem',
    signatures: [['dimension1Index','...dimensionNIndexes']],
    receiver: 'VBArray'
  },
  {
    name: 'initialize',
    signatures: [['newItem']]
  },
  {
    name: 'insertItemBefore',
    signatures: [['newItem','index']],
    receiver: 'SVGLengthList'
  },
  {
    name: 'insertItemBefore',
    signatures: [['newItem','index']],
    receiver: 'SVGNumberList'
  },
  {
    name: 'insertItemBefore',
    signatures: [['newItem','index']],
    receiver: 'SVGPointList'
  },
  {
    name: 'insertItemBefore',
    signatures: [['newItem','index'],['item','index']],
    receiver: 'SVGStringList'
  },
  {
    name: 'insertItemBefore',
    signatures: [['newItem','index']],
    receiver: 'SVGTransformList'
  },
  {
    name: 'removeItem',
    signatures: [['index']],
    receiver: 'SVGLengthList'
  },
  {
    name: 'removeItem',
    signatures: [['index']],
    receiver: 'SVGNumberList'
  },
  {
    name: 'removeItem',
    signatures: [['index']],
    receiver: 'SVGPointList'
  },
  {
    name: 'removeItem',
    signatures: [['index']],
    receiver: 'SVGStringList'
  },
  {
    name: 'removeItem',
    signatures: [['index']],
    receiver: 'SVGTransformList'
  },
  {
    name: 'removeItem',
    signatures: [['key']],
    receiver: 'Storage'
  },
  {
    name: 'replaceItem',
    signatures: [['newItem','index']]
  },
  {
    name: 'setOrientToAngle',
    signatures: [['angle']]
  },
  {
    name: 'checkEnclosure',
    signatures: [['element','rect']]
  },
  {
    name: 'checkIntersection',
    signatures: [['element','rect']]
  },
  {
    name: 'createSVGTransformFromMatrix',
    signatures: [['?matrix']]
  },
  {
    name: 'getEnclosureList',
    signatures: [['rect','referenceElement']]
  },
  {
    name: 'getIntersectionList',
    signatures: [['rect','referenceElement']]
  },
  {
    name: 'setCurrentTime',
    signatures: [['seconds']]
  },
  {
    name: 'suspendRedraw',
    signatures: [['maxWaitMilliseconds']]
  },
  {
    name: 'unsuspendRedraw',
    signatures: [['suspendHandleID'],['suspendHandleId']]
  },
  {
    name: 'getCharNumAtPosition',
    signatures: [['?point']]
  },
  {
    name: 'getEndPositionOfChar',
    signatures: [['charnum']]
  },
  {
    name: 'getExtentOfChar',
    signatures: [['charnum']]
  },
  {
    name: 'getRotationOfChar',
    signatures: [['charnum']]
  },
  {
    name: 'getStartPositionOfChar',
    signatures: [['charnum']]
  },
  {
    name: 'getSubStringLength',
    signatures: [['charnum','nchars']]
  },
  {
    name: 'selectSubString',
    signatures: [['charnum','nchars']]
  },
  {
    name: 'setMatrix',
    signatures: [['?matrix']]
  },
  {
    name: 'setRotate',
    signatures: [['angle','cx','cy']]
  },
  {
    name: 'setScale',
    signatures: [['sx','sy']]
  },
  {
    name: 'setSkewX',
    signatures: [['angle']]
  },
  {
    name: 'setSkewY',
    signatures: [['angle']]
  },
  {
    name: 'setTranslate',
    signatures: [['tx','ty']]
  },
  {
    name: 'lock',
    signatures: [['orientation']],
    receiver: 'ScreenOrientation'
  },
  {
    name: 'lock',
    signatures: [['?keyCodes']],
    receiver: 'Keyboard'
  },
  {
    name: 'addRange',
    signatures: [['range']]
  },
  {
    name: 'containsNode',
    signatures: [['node','?allowPartialContainment']]
  },
  {
    name: 'extend',
    signatures: [['node','?offset']]
  },
  {
    name: 'getRangeAt',
    signatures: [['index']]
  },
  {
    name: 'removeRange',
    signatures: [['range']]
  },
  {
    name: 'selectAllChildren',
    signatures: [['node']]
  },
  {
    name: 'setBaseAndExtent',
    signatures: [['anchorNode','anchorOffset','focusNode','focusOffset'],['baseNode','baseOffset','extentNode','extentOffset']]
  },
  {
    name: 'getRegistration',
    signatures: [['?clientURL'],['?documentURL']]
  },
  {
    name: 'register',
    signatures: [['scriptURL','?options'],['url','?options']],
    receiver: 'ServiceWorkerContainer'
  },
  {
    name: 'register',
    signatures: [['tag','?options']],
    receiver: 'PeriodicSyncManager'
  },
  {
    name: 'register',
    signatures: [['tag']],
    receiver: 'SyncManager'
  },
  {
    name: 'getNotifications',
    signatures: [['?filter']]
  },
  {
    name: 'showNotification',
    signatures: [['title','?options']]
  },
  {
    name: 'unregister',
    signatures: [['tag']],
    receiver: 'PeriodicSyncManager'
  },
  {
    name: 'appendBuffer',
    signatures: [['data']]
  },
  {
    name: 'changeType',
    signatures: [['type'],['config']]
  },
  {
    name: 'speak',
    signatures: [['utterance']]
  },
  {
    name: 'key',
    signatures: [['index']]
  },
  {
    name: 'setItem',
    signatures: [['key','value']]
  },
  {
    name: 'initStorageEvent',
    signatures: [['type','?bubbles','?cancelable','?key','?oldValue','?newValue','?url','?storageArea']]
  },
  {
    name: 'matchMedium',
    signatures: [['?mediaquery']]
  },
  {
    name: 'decrypt',
    signatures: [['algorithm','key','data']]
  },
  {
    name: 'deriveBits',
    signatures: [['algorithm','baseKey','length']]
  },
  {
    name: 'deriveKey',
    signatures: [['algorithm','baseKey','derivedKeyType','extractable','keyUsages']]
  },
  {
    name: 'digest',
    signatures: [['algorithm','data']]
  },
  {
    name: 'encrypt',
    signatures: [['algorithm','key','data']]
  },
  {
    name: 'exportKey',
    signatures: [['format','key']]
  },
  {
    name: 'generateKey',
    signatures: [['algorithm','extractable','keyUsages']]
  },
  {
    name: 'importKey',
    signatures: [['format','keyData','algorithm','extractable','keyUsages']]
  },
  {
    name: 'sign',
    signatures: [['algorithm','key','data']]
  },
  {
    name: 'unwrapKey',
    signatures: [['format','wrappedKey','unwrappingKey','unwrapAlgorithm','unwrappedKeyAlgorithm','extractable','keyUsages']]
  },
  {
    name: 'verify',
    signatures: [['algorithm','key','signature','data']]
  },
  {
    name: 'wrapKey',
    signatures: [['format','key','wrappingKey','wrapAlgorithm']]
  },
  {
    name: 'splitText',
    signatures: [['offset']]
  },
  {
    name: 'encode',
    signatures: [['?input']],
    receiver: 'TextEncoder'
  },
  {
    name: 'encode',
    signatures: [['data']],
    receiver: 'AudioEncoder'
  },
  {
    name: 'encode',
    signatures: [['frame','?options']],
    receiver: 'VideoEncoder'
  },
  {
    name: 'encodeInto',
    signatures: [['source','destination']]
  },
  {
    name: 'addCue',
    signatures: [['cue']]
  },
  {
    name: 'removeCue',
    signatures: [['cue']]
  },
  {
    name: 'getCueById',
    signatures: [['id']]
  },
  {
    name: 'end',
    signatures: [['index']],
    receiver: 'TimeRanges'
  },
  {
    name: 'initUIEvent',
    signatures: [['typeArg','?bubblesArg','?cancelableArg','?viewArg','?detailArg'],['type','?bubbles','?cancelable','?view','?detail']]
  },
  {
    name: 'getTranslatedShaderSource',
    signatures: [['shader']]
  },
  {
    name: 'drawBuffersWEBGL',
    signatures: [['buffers']]
  },
  {
    name: 'multiDrawArraysInstancedWEBGL',
    signatures: [['mode','firstsList','firstsOffset','countsList','countsOffset','instanceCountsList','instanceCountsOffset','drawcount']]
  },
  {
    name: 'multiDrawArraysWEBGL',
    signatures: [['mode','firstsList','firstsOffset','countsList','countsOffset','drawcount']]
  },
  {
    name: 'multiDrawElementsInstancedWEBGL',
    signatures: [['mode','countsList','countsOffset','type','offsetsList','offsetsOffset','instanceCountsList','instanceCountsOffset','drawcount']]
  },
  {
    name: 'multiDrawElementsWEBGL',
    signatures: [['mode','countsList','countsOffset','type','offsetsList','offsetsOffset','drawcount']]
  },
  {
    name: 'beginQuery',
    signatures: [['target','query']]
  },
  {
    name: 'beginTransformFeedback',
    signatures: [['primitiveMode']]
  },
  {
    name: 'bindBufferBase',
    signatures: [['target','index','buffer']]
  },
  {
    name: 'bindBufferRange',
    signatures: [['target','index','buffer','offset','size']]
  },
  {
    name: 'bindSampler',
    signatures: [['unit','sampler']]
  },
  {
    name: 'bindTransformFeedback',
    signatures: [['target','tf'],['target','feedback']]
  },
  {
    name: 'bindVertexArray',
    signatures: [['array'],['vertexArray']]
  },
  {
    name: 'blitFramebuffer',
    signatures: [['srcX0','srcY0','srcX1','srcY1','dstX0','dstY0','dstX1','dstY1','mask','filter']]
  },
  {
    name: 'clearBufferfi',
    signatures: [['buffer','drawbuffer','depth','stencil']]
  },
  {
    name: 'clearBufferfv',
    signatures: [['buffer','drawbuffer','values','?srcOffset'],['buffer','drawbuffer','value','?srcOffset']]
  },
  {
    name: 'clearBufferiv',
    signatures: [['buffer','drawbuffer','values','?srcOffset'],['buffer','drawbuffer','value','?srcOffset']]
  },
  {
    name: 'clearBufferuiv',
    signatures: [['buffer','drawbuffer','values','?srcOffset'],['buffer','drawbuffer','value','?srcOffset']]
  },
  {
    name: 'clientWaitSync',
    signatures: [['sync','flags','timeout']]
  },
  {
    name: 'compressedTexImage3D',
    signatures: [['target','level','internalformat','width','height','depth','border','imageSize','offset'],['target','level','internalformat','width','height','depth','border','srcData','?srcOffset','?srcLengthOverride'],['target','level','internalformat','width','height','depth','border','data','?srcOffset','?srcLengthOverride']]
  },
  {
    name: 'compressedTexSubImage3D',
    signatures: [['target','level','xoffset','yoffset','zoffset','width','height','depth','format','imageSize','offset'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','srcData','?srcOffset','?srcLengthOverride'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','data','?srcOffset','?srcLengthOverride']]
  },
  {
    name: 'copyBufferSubData',
    signatures: [['readTarget','writeTarget','readOffset','writeOffset','size']]
  },
  {
    name: 'copyTexSubImage3D',
    signatures: [['target','level','xoffset','yoffset','zoffset','x','y','width','height']]
  },
  {
    name: 'createSampler',
    signatures: [['?descriptor']],
    receiver: 'GPUDevice'
  },
  {
    name: 'deleteQuery',
    signatures: [['query']]
  },
  {
    name: 'deleteSampler',
    signatures: [['sampler']]
  },
  {
    name: 'deleteSync',
    signatures: [['sync']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'deleteSync',
    signatures: [['name']],
    receiver: 'NativeIOFileManager'
  },
  {
    name: 'deleteTransformFeedback',
    signatures: [['tf'],['feedback']]
  },
  {
    name: 'deleteVertexArray',
    signatures: [['vertexArray']]
  },
  {
    name: 'drawArraysInstanced',
    signatures: [['mode','first','count','instanceCount']]
  },
  {
    name: 'drawBuffers',
    signatures: [['buffers']]
  },
  {
    name: 'drawElementsInstanced',
    signatures: [['mode','count','type','offset','instanceCount']]
  },
  {
    name: 'drawRangeElements',
    signatures: [['mode','start','end','count','type','offset']]
  },
  {
    name: 'endQuery',
    signatures: [['target']]
  },
  {
    name: 'fenceSync',
    signatures: [['condition','flags']]
  },
  {
    name: 'framebufferTextureLayer',
    signatures: [['target','attachment','texture','level','layer']]
  },
  {
    name: 'getActiveUniformBlockName',
    signatures: [['program','uniformBlockIndex']]
  },
  {
    name: 'getActiveUniformBlockParameter',
    signatures: [['program','uniformBlockIndex','pname']]
  },
  {
    name: 'getActiveUniforms',
    signatures: [['program','uniformIndices','pname']]
  },
  {
    name: 'getBufferSubData',
    signatures: [['target','srcByteOffset','dstBuffer','?dstOffset','?length'],['target','srcByteOffset','dstData','?dstOffset','?length']]
  },
  {
    name: 'getFragDataLocation',
    signatures: [['program','name']]
  },
  {
    name: 'getIndexedParameter',
    signatures: [['target','index']]
  },
  {
    name: 'getInternalformatParameter',
    signatures: [['target','internalformat','pname']]
  },
  {
    name: 'getQuery',
    signatures: [['target','pname']]
  },
  {
    name: 'getQueryParameter',
    signatures: [['query','pname']]
  },
  {
    name: 'getSamplerParameter',
    signatures: [['sampler','pname']]
  },
  {
    name: 'getSyncParameter',
    signatures: [['sync','pname']]
  },
  {
    name: 'getTransformFeedbackVarying',
    signatures: [['program','index']]
  },
  {
    name: 'getUniformBlockIndex',
    signatures: [['program','uniformBlockName']]
  },
  {
    name: 'getUniformIndices',
    signatures: [['program','uniformNames']]
  },
  {
    name: 'invalidateFramebuffer',
    signatures: [['target','attachments']]
  },
  {
    name: 'invalidateSubFramebuffer',
    signatures: [['target','attachments','x','y','width','height']]
  },
  {
    name: 'isQuery',
    signatures: [['query']]
  },
  {
    name: 'isSampler',
    signatures: [['sampler']]
  },
  {
    name: 'isSync',
    signatures: [['sync']]
  },
  {
    name: 'isTransformFeedback',
    signatures: [['tf'],['feedback']]
  },
  {
    name: 'isVertexArray',
    signatures: [['vertexArray']]
  },
  {
    name: 'readBuffer',
    signatures: [['src'],['mode']]
  },
  {
    name: 'renderbufferStorageMultisample',
    signatures: [['target','samples','internalformat','width','height']]
  },
  {
    name: 'samplerParameterf',
    signatures: [['sampler','pname','param']]
  },
  {
    name: 'samplerParameteri',
    signatures: [['sampler','pname','param']]
  },
  {
    name: 'texImage3D',
    signatures: [['target','level','internalformat','width','height','depth','border','format','type','pboOffset'],['target','level','internalformat','width','height','depth','border','format','type','source'],['target','level','internalformat','width','height','depth','border','format','type','srcData','?srcOffset'],['target','level','internalformat','width','height','depth','border','format','type','offset'],['target','level','internalformat','width','height','depth','border','format','type','data'],['target','level','internalformat','width','height','depth','border','format','type','image'],['target','level','internalformat','width','height','depth','border','format','type','canvas'],['target','level','internalformat','width','height','depth','border','format','type','offscreenCanvas'],['target','level','internalformat','width','height','depth','border','format','type','video'],['target','level','internalformat','width','height','depth','border','format','type','frame'],['target','level','internalformat','width','height','depth','border','format','type','bitmap'],['target','level','internalformat','width','height','depth','border','format','type','pixels','?srcOffset']]
  },
  {
    name: 'texStorage2D',
    signatures: [['target','levels','internalformat','width','height']]
  },
  {
    name: 'texStorage3D',
    signatures: [['target','levels','internalformat','width','height','depth']]
  },
  {
    name: 'texSubImage3D',
    signatures: [['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','pboOffset'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','source'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','offset'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','data'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','image'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','canvas'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','offscreenCanvas'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','video'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','frame'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','bitmap'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','srcData','?srcOffset'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','pixels','?srcOffset']]
  },
  {
    name: 'transformFeedbackVaryings',
    signatures: [['program','varyings','bufferMode']]
  },
  {
    name: 'uniform1ui',
    signatures: [['location','v0']]
  },
  {
    name: 'uniform1uiv',
    signatures: [['location','data','?srcOffset','?srcLength'],['location','v','?srcOffset','?srcLength']]
  },
  {
    name: 'uniform2ui',
    signatures: [['location','v0','v1']]
  },
  {
    name: 'uniform2uiv',
    signatures: [['location','data','?srcOffset','?srcLength'],['location','v','?srcOffset','?srcLength']]
  },
  {
    name: 'uniform3ui',
    signatures: [['location','v0','v1','v2']]
  },
  {
    name: 'uniform3uiv',
    signatures: [['location','data','?srcOffset','?srcLength'],['location','v','?srcOffset','?srcLength']]
  },
  {
    name: 'uniform4ui',
    signatures: [['location','v0','v1','v2','v3']]
  },
  {
    name: 'uniform4uiv',
    signatures: [['location','data','?srcOffset','?srcLength'],['location','v','?srcOffset','?srcLength']]
  },
  {
    name: 'uniformBlockBinding',
    signatures: [['program','uniformBlockIndex','uniformBlockBinding']]
  },
  {
    name: 'uniformMatrix2x3fv',
    signatures: [['location','transpose','data','?srcOffset','?srcLength'],['location','transpose','value','?srcOffset','?srcLength']]
  },
  {
    name: 'uniformMatrix2x4fv',
    signatures: [['location','transpose','data','?srcOffset','?srcLength'],['location','transpose','value','?srcOffset','?srcLength']]
  },
  {
    name: 'uniformMatrix3x2fv',
    signatures: [['location','transpose','data','?srcOffset','?srcLength'],['location','transpose','value','?srcOffset','?srcLength']]
  },
  {
    name: 'uniformMatrix3x4fv',
    signatures: [['location','transpose','data','?srcOffset','?srcLength'],['location','transpose','value','?srcOffset','?srcLength']]
  },
  {
    name: 'uniformMatrix4x2fv',
    signatures: [['location','transpose','data','?srcOffset','?srcLength'],['location','transpose','value','?srcOffset','?srcLength']]
  },
  {
    name: 'uniformMatrix4x3fv',
    signatures: [['location','transpose','data','?srcOffset','?srcLength'],['location','transpose','value','?srcOffset','?srcLength']]
  },
  {
    name: 'vertexAttribDivisor',
    signatures: [['index','divisor']]
  },
  {
    name: 'vertexAttribI4i',
    signatures: [['index','x','y','z','w']]
  },
  {
    name: 'vertexAttribI4iv',
    signatures: [['index','values'],['index','v']]
  },
  {
    name: 'vertexAttribI4ui',
    signatures: [['index','x','y','z','w']]
  },
  {
    name: 'vertexAttribI4uiv',
    signatures: [['index','values'],['index','v']]
  },
  {
    name: 'vertexAttribIPointer',
    signatures: [['index','size','type','stride','offset']]
  },
  {
    name: 'waitSync',
    signatures: [['sync','flags','timeout']]
  },
  {
    name: 'bufferData',
    signatures: [['target','size','usage'],['target','srcData','usage','?srcOffset','?length']],
    receiver: 'WebGL2RenderingContextOverloads'
  },
  {
    name: 'bufferData',
    signatures: [['target','size','usage'],['target','data','usage']],
    receiver: 'WebGLRenderingContextOverloads'
  },
  {
    name: 'bufferData',
    signatures: [['target','size','usage'],['target','data','usage']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'bufferData',
    signatures: [['target','srcData','usage','srcOffset','?length']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'bufferSubData',
    signatures: [['target','dstByteOffset','srcData','?srcOffset','?length']],
    receiver: 'WebGL2RenderingContextOverloads'
  },
  {
    name: 'bufferSubData',
    signatures: [['target','offset','data']],
    receiver: 'WebGLRenderingContextOverloads'
  },
  {
    name: 'bufferSubData',
    signatures: [['target','offset','data']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'bufferSubData',
    signatures: [['target','dstByteOffset','srcData','srcOffset','?length']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'compressedTexImage2D',
    signatures: [['target','level','internalformat','width','height','border','imageSize','offset'],['target','level','internalformat','width','height','border','srcData','?srcOffset','?srcLengthOverride']],
    receiver: 'WebGL2RenderingContextOverloads'
  },
  {
    name: 'compressedTexImage2D',
    signatures: [['target','level','internalformat','width','height','border','data']],
    receiver: 'WebGLRenderingContextOverloads'
  },
  {
    name: 'compressedTexImage2D',
    signatures: [['target','level','internalformat','width','height','border','data']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'compressedTexImage2D',
    signatures: [['target','level','internalformat','width','height','border','imageSize','offset'],['target','level','internalformat','width','height','border','data','srcOffset','?srcLengthOverride']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'compressedTexSubImage2D',
    signatures: [['target','level','xoffset','yoffset','width','height','format','imageSize','offset'],['target','level','xoffset','yoffset','width','height','format','srcData','?srcOffset','?srcLengthOverride']],
    receiver: 'WebGL2RenderingContextOverloads'
  },
  {
    name: 'compressedTexSubImage2D',
    signatures: [['target','level','xoffset','yoffset','width','height','format','data']],
    receiver: 'WebGLRenderingContextOverloads'
  },
  {
    name: 'compressedTexSubImage2D',
    signatures: [['target','level','xoffset','yoffset','width','height','format','data']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'compressedTexSubImage2D',
    signatures: [['target','level','xoffset','yoffset','width','height','format','imageSize','offset'],['target','level','xoffset','yoffset','width','height','format','data','srcOffset','?srcLengthOverride']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'readPixels',
    signatures: [['x','y','width','height','format','type','dstData','?dstOffset'],['x','y','width','height','format','type','offset']],
    receiver: 'WebGL2RenderingContextOverloads'
  },
  {
    name: 'readPixels',
    signatures: [['x','y','width','height','format','type','pixels']],
    receiver: 'WebGLRenderingContextOverloads'
  },
  {
    name: 'readPixels',
    signatures: [['x','y','width','height','format','type','pixels']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'readPixels',
    signatures: [['x','y','width','height','format','type','offset'],['x','y','width','height','format','type','dstData','offset']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'texImage2D',
    signatures: [['target','level','internalformat','format','type','source'],['target','level','internalformat','width','height','border','format','type','pixels'],['target','level','internalformat','width','height','border','format','type','pboOffset'],['target','level','internalformat','width','height','border','format','type','source'],['target','level','internalformat','width','height','border','format','type','srcData','srcOffset']],
    receiver: 'WebGL2RenderingContextOverloads'
  },
  {
    name: 'texImage2D',
    signatures: [['target','level','internalformat','format','type','source'],['target','level','internalformat','width','height','border','format','type','pixels']],
    receiver: 'WebGLRenderingContextOverloads'
  },
  {
    name: 'texImage2D',
    signatures: [['target','level','internalformat','format','type','pixels'],['target','level','internalformat','format','type','image'],['target','level','internalformat','format','type','canvas'],['target','level','internalformat','format','type','offscreenCanvas'],['target','level','internalformat','format','type','video'],['target','level','internalformat','format','type','bitmap'],['target','level','internalformat','format','type','frame'],['target','level','internalformat','width','height','border','format','type','pixels']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'texImage2D',
    signatures: [['target','level','internalformat','width','height','border','format','type','offset'],['target','level','internalformat','width','height','border','format','type','data'],['target','level','internalformat','width','height','border','format','type','image'],['target','level','internalformat','width','height','border','format','type','canvas'],['target','level','internalformat','width','height','border','format','type','offscreenCanvas'],['target','level','internalformat','width','height','border','format','type','video'],['target','level','internalformat','width','height','border','format','type','frame'],['target','level','internalformat','width','height','border','format','type','bitmap'],['target','level','internalformat','width','height','border','format','type','srcData','srcOffset']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'texSubImage2D',
    signatures: [['target','level','xoffset','yoffset','format','type','source'],['target','level','xoffset','yoffset','width','height','format','type','pixels'],['target','level','xoffset','yoffset','width','height','format','type','pboOffset'],['target','level','xoffset','yoffset','width','height','format','type','source'],['target','level','xoffset','yoffset','width','height','format','type','srcData','srcOffset']],
    receiver: 'WebGL2RenderingContextOverloads'
  },
  {
    name: 'texSubImage2D',
    signatures: [['target','level','xoffset','yoffset','format','type','source'],['target','level','xoffset','yoffset','width','height','format','type','pixels']],
    receiver: 'WebGLRenderingContextOverloads'
  },
  {
    name: 'texSubImage2D',
    signatures: [['target','level','xoffset','yoffset','format','type','pixels'],['target','level','xoffset','yoffset','format','type','image'],['target','level','xoffset','yoffset','format','type','canvas'],['target','level','xoffset','yoffset','format','type','offscreenCanvas'],['target','level','xoffset','yoffset','format','type','video'],['target','level','xoffset','yoffset','format','type','bitmap'],['target','level','xoffset','yoffset','format','type','frame'],['target','level','xoffset','yoffset','width','height','format','type','pixels']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'texSubImage2D',
    signatures: [['target','level','xoffset','yoffset','width','height','format','type','offset'],['target','level','xoffset','yoffset','width','height','format','type','data'],['target','level','xoffset','yoffset','width','height','format','type','image'],['target','level','xoffset','yoffset','width','height','format','type','canvas'],['target','level','xoffset','yoffset','width','height','format','type','offscreenCanvas'],['target','level','xoffset','yoffset','width','height','format','type','video'],['target','level','xoffset','yoffset','width','height','format','type','frame'],['target','level','xoffset','yoffset','width','height','format','type','bitmap'],['target','level','xoffset','yoffset','width','height','format','type','srcData','srcOffset']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'uniform1fv',
    signatures: [['location','data','?srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextOverloads'
  },
  {
    name: 'uniform1fv',
    signatures: [['location','v']],
    receiver: 'WebGLRenderingContextOverloads'
  },
  {
    name: 'uniform1fv',
    signatures: [['location','v']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'uniform1fv',
    signatures: [['location','v','srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'uniform1iv',
    signatures: [['location','data','?srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextOverloads'
  },
  {
    name: 'uniform1iv',
    signatures: [['location','v']],
    receiver: 'WebGLRenderingContextOverloads'
  },
  {
    name: 'uniform1iv',
    signatures: [['location','v']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'uniform1iv',
    signatures: [['location','v','srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'uniform2fv',
    signatures: [['location','data','?srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextOverloads'
  },
  {
    name: 'uniform2fv',
    signatures: [['location','v']],
    receiver: 'WebGLRenderingContextOverloads'
  },
  {
    name: 'uniform2fv',
    signatures: [['location','v']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'uniform2fv',
    signatures: [['location','v','srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'uniform2iv',
    signatures: [['location','data','?srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextOverloads'
  },
  {
    name: 'uniform2iv',
    signatures: [['location','v']],
    receiver: 'WebGLRenderingContextOverloads'
  },
  {
    name: 'uniform2iv',
    signatures: [['location','v']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'uniform2iv',
    signatures: [['location','v','srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'uniform3fv',
    signatures: [['location','data','?srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextOverloads'
  },
  {
    name: 'uniform3fv',
    signatures: [['location','v']],
    receiver: 'WebGLRenderingContextOverloads'
  },
  {
    name: 'uniform3fv',
    signatures: [['location','v']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'uniform3fv',
    signatures: [['location','v','srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'uniform3iv',
    signatures: [['location','data','?srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextOverloads'
  },
  {
    name: 'uniform3iv',
    signatures: [['location','v']],
    receiver: 'WebGLRenderingContextOverloads'
  },
  {
    name: 'uniform3iv',
    signatures: [['location','v']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'uniform3iv',
    signatures: [['location','v','srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'uniform4fv',
    signatures: [['location','data','?srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextOverloads'
  },
  {
    name: 'uniform4fv',
    signatures: [['location','v']],
    receiver: 'WebGLRenderingContextOverloads'
  },
  {
    name: 'uniform4fv',
    signatures: [['location','v']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'uniform4fv',
    signatures: [['location','v','srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'uniform4iv',
    signatures: [['location','data','?srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextOverloads'
  },
  {
    name: 'uniform4iv',
    signatures: [['location','v']],
    receiver: 'WebGLRenderingContextOverloads'
  },
  {
    name: 'uniform4iv',
    signatures: [['location','v']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'uniform4iv',
    signatures: [['location','v','srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'uniformMatrix2fv',
    signatures: [['location','transpose','data','?srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextOverloads'
  },
  {
    name: 'uniformMatrix2fv',
    signatures: [['location','transpose','value']],
    receiver: 'WebGLRenderingContextOverloads'
  },
  {
    name: 'uniformMatrix2fv',
    signatures: [['location','transpose','array']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'uniformMatrix2fv',
    signatures: [['location','transpose','array','srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'uniformMatrix3fv',
    signatures: [['location','transpose','data','?srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextOverloads'
  },
  {
    name: 'uniformMatrix3fv',
    signatures: [['location','transpose','value']],
    receiver: 'WebGLRenderingContextOverloads'
  },
  {
    name: 'uniformMatrix3fv',
    signatures: [['location','transpose','array']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'uniformMatrix3fv',
    signatures: [['location','transpose','array','srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'uniformMatrix4fv',
    signatures: [['location','transpose','data','?srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextOverloads'
  },
  {
    name: 'uniformMatrix4fv',
    signatures: [['location','transpose','value']],
    receiver: 'WebGLRenderingContextOverloads'
  },
  {
    name: 'uniformMatrix4fv',
    signatures: [['location','transpose','array']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'uniformMatrix4fv',
    signatures: [['location','transpose','array','srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'activeTexture',
    signatures: [['texture']]
  },
  {
    name: 'attachShader',
    signatures: [['program','shader']]
  },
  {
    name: 'bindAttribLocation',
    signatures: [['program','index','name']]
  },
  {
    name: 'bindBuffer',
    signatures: [['target','buffer']]
  },
  {
    name: 'bindFramebuffer',
    signatures: [['target','framebuffer']]
  },
  {
    name: 'bindRenderbuffer',
    signatures: [['target','renderbuffer']]
  },
  {
    name: 'bindTexture',
    signatures: [['target','texture']]
  },
  {
    name: 'blendColor',
    signatures: [['red','green','blue','alpha']]
  },
  {
    name: 'blendEquation',
    signatures: [['mode']]
  },
  {
    name: 'blendEquationSeparate',
    signatures: [['modeRGB','modeAlpha']]
  },
  {
    name: 'blendFunc',
    signatures: [['sfactor','dfactor']]
  },
  {
    name: 'blendFuncSeparate',
    signatures: [['srcRGB','dstRGB','srcAlpha','dstAlpha']]
  },
  {
    name: 'checkFramebufferStatus',
    signatures: [['target']]
  },
  {
    name: 'clearColor',
    signatures: [['red','green','blue','alpha']]
  },
  {
    name: 'clearDepth',
    signatures: [['depth']]
  },
  {
    name: 'clearStencil',
    signatures: [['s']]
  },
  {
    name: 'colorMask',
    signatures: [['red','green','blue','alpha']]
  },
  {
    name: 'compileShader',
    signatures: [['shader']]
  },
  {
    name: 'copyTexImage2D',
    signatures: [['target','level','internalformat','x','y','width','height','border']]
  },
  {
    name: 'copyTexSubImage2D',
    signatures: [['target','level','xoffset','yoffset','x','y','width','height']]
  },
  {
    name: 'createShader',
    signatures: [['type']]
  },
  {
    name: 'createTexture',
    signatures: [['descriptor']],
    receiver: 'GPUDevice'
  },
  {
    name: 'cullFace',
    signatures: [['mode']]
  },
  {
    name: 'deleteBuffer',
    signatures: [['buffer']]
  },
  {
    name: 'deleteFramebuffer',
    signatures: [['framebuffer']]
  },
  {
    name: 'deleteProgram',
    signatures: [['program']]
  },
  {
    name: 'deleteRenderbuffer',
    signatures: [['renderbuffer']]
  },
  {
    name: 'deleteShader',
    signatures: [['shader']]
  },
  {
    name: 'deleteTexture',
    signatures: [['texture']]
  },
  {
    name: 'depthFunc',
    signatures: [['func']]
  },
  {
    name: 'depthMask',
    signatures: [['flag']]
  },
  {
    name: 'depthRange',
    signatures: [['zNear','zFar']]
  },
  {
    name: 'detachShader',
    signatures: [['program','shader']]
  },
  {
    name: 'disable',
    signatures: [['cap']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'disableVertexAttribArray',
    signatures: [['index']]
  },
  {
    name: 'drawArrays',
    signatures: [['mode','first','count']]
  },
  {
    name: 'drawElements',
    signatures: [['mode','count','type','offset']]
  },
  {
    name: 'enable',
    signatures: [['cap']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'enableVertexAttribArray',
    signatures: [['index']]
  },
  {
    name: 'framebufferRenderbuffer',
    signatures: [['target','attachment','renderbuffertarget','renderbuffer']]
  },
  {
    name: 'framebufferTexture2D',
    signatures: [['target','attachment','textarget','texture','level']]
  },
  {
    name: 'frontFace',
    signatures: [['mode']]
  },
  {
    name: 'generateMipmap',
    signatures: [['target']]
  },
  {
    name: 'getActiveAttrib',
    signatures: [['program','index']]
  },
  {
    name: 'getActiveUniform',
    signatures: [['program','index']]
  },
  {
    name: 'getAttachedShaders',
    signatures: [['program']]
  },
  {
    name: 'getAttribLocation',
    signatures: [['program','name']]
  },
  {
    name: 'getBufferParameter',
    signatures: [['target','pname']]
  },
  {
    name: 'getExtension',
    signatures: [['extensionName'],['name']]
  },
  {
    name: 'getFramebufferAttachmentParameter',
    signatures: [['target','attachment','pname']]
  },
  {
    name: 'getParameter',
    signatures: [['pname']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'getParameter',
    signatures: [['namespaceURI','localName']],
    receiver: 'XSLTProcessor'
  },
  {
    name: 'getProgramInfoLog',
    signatures: [['program']]
  },
  {
    name: 'getProgramParameter',
    signatures: [['program','pname']]
  },
  {
    name: 'getRenderbufferParameter',
    signatures: [['target','pname']]
  },
  {
    name: 'getShaderInfoLog',
    signatures: [['shader']]
  },
  {
    name: 'getShaderParameter',
    signatures: [['shader','pname']]
  },
  {
    name: 'getShaderPrecisionFormat',
    signatures: [['shadertype','precisiontype']]
  },
  {
    name: 'getShaderSource',
    signatures: [['shader']]
  },
  {
    name: 'getTexParameter',
    signatures: [['target','pname']]
  },
  {
    name: 'getUniform',
    signatures: [['program','location']]
  },
  {
    name: 'getUniformLocation',
    signatures: [['program','name']]
  },
  {
    name: 'getVertexAttrib',
    signatures: [['index','pname']]
  },
  {
    name: 'getVertexAttribOffset',
    signatures: [['index','pname']]
  },
  {
    name: 'hint',
    signatures: [['target','mode']]
  },
  {
    name: 'isBuffer',
    signatures: [['buffer']]
  },
  {
    name: 'isEnabled',
    signatures: [['cap']]
  },
  {
    name: 'isFramebuffer',
    signatures: [['framebuffer']]
  },
  {
    name: 'isProgram',
    signatures: [['program']]
  },
  {
    name: 'isRenderbuffer',
    signatures: [['renderbuffer']]
  },
  {
    name: 'isShader',
    signatures: [['shader']]
  },
  {
    name: 'isTexture',
    signatures: [['texture']]
  },
  {
    name: 'lineWidth',
    signatures: [['width']]
  },
  {
    name: 'linkProgram',
    signatures: [['program']]
  },
  {
    name: 'pixelStorei',
    signatures: [['pname','param']]
  },
  {
    name: 'polygonOffset',
    signatures: [['factor','units']]
  },
  {
    name: 'renderbufferStorage',
    signatures: [['target','internalformat','width','height']]
  },
  {
    name: 'sampleCoverage',
    signatures: [['value','invert']]
  },
  {
    name: 'scissor',
    signatures: [['x','y','width','height']]
  },
  {
    name: 'shaderSource',
    signatures: [['shader','source'],['shader','string']]
  },
  {
    name: 'stencilFunc',
    signatures: [['func','ref','mask']]
  },
  {
    name: 'stencilFuncSeparate',
    signatures: [['face','func','ref','mask']]
  },
  {
    name: 'stencilMask',
    signatures: [['mask']]
  },
  {
    name: 'stencilMaskSeparate',
    signatures: [['face','mask']]
  },
  {
    name: 'stencilOp',
    signatures: [['fail','zfail','zpass']]
  },
  {
    name: 'stencilOpSeparate',
    signatures: [['face','fail','zfail','zpass']]
  },
  {
    name: 'texParameterf',
    signatures: [['target','pname','param']]
  },
  {
    name: 'texParameteri',
    signatures: [['target','pname','param']]
  },
  {
    name: 'uniform1f',
    signatures: [['location','x']]
  },
  {
    name: 'uniform1i',
    signatures: [['location','x']]
  },
  {
    name: 'uniform2f',
    signatures: [['location','x','y']]
  },
  {
    name: 'uniform2i',
    signatures: [['location','x','y']]
  },
  {
    name: 'uniform3f',
    signatures: [['location','x','y','z']]
  },
  {
    name: 'uniform3i',
    signatures: [['location','x','y','z']]
  },
  {
    name: 'uniform4f',
    signatures: [['location','x','y','z','w']]
  },
  {
    name: 'uniform4i',
    signatures: [['location','x','y','z','w']]
  },
  {
    name: 'useProgram',
    signatures: [['program']]
  },
  {
    name: 'validateProgram',
    signatures: [['program']]
  },
  {
    name: 'vertexAttrib1f',
    signatures: [['index','x'],['indx','x']]
  },
  {
    name: 'vertexAttrib1fv',
    signatures: [['index','values'],['indx','values']]
  },
  {
    name: 'vertexAttrib2f',
    signatures: [['index','x','y'],['indx','x','y']]
  },
  {
    name: 'vertexAttrib2fv',
    signatures: [['index','values'],['indx','values']]
  },
  {
    name: 'vertexAttrib3f',
    signatures: [['index','x','y','z'],['indx','x','y','z']]
  },
  {
    name: 'vertexAttrib3fv',
    signatures: [['index','values'],['indx','values']]
  },
  {
    name: 'vertexAttrib4f',
    signatures: [['index','x','y','z','w'],['indx','x','y','z','w']]
  },
  {
    name: 'vertexAttrib4fv',
    signatures: [['index','values'],['indx','values']]
  },
  {
    name: 'vertexAttribPointer',
    signatures: [['index','size','type','normalized','stride','offset'],['indx','size','type','normalized','stride','offset']]
  },
  {
    name: 'viewport',
    signatures: [['x','y','width','height']]
  },
  {
    name: 'alert',
    signatures: [['?message']]
  },
  {
    name: 'cancelIdleCallback',
    signatures: [['handle']]
  },
  {
    name: 'confirm',
    signatures: [['?message']]
  },
  {
    name: 'getComputedStyle',
    signatures: [['elt','?pseudoElt']]
  },
  {
    name: 'matchMedia',
    signatures: [['query']]
  },
  {
    name: 'moveBy',
    signatures: [['x','y']]
  },
  {
    name: 'requestIdleCallback',
    signatures: [['callback','?options']]
  },
  {
    name: 'resizeBy',
    signatures: [['x','y']]
  },
  {
    name: 'resizeTo',
    signatures: [['width','height'],['x','y']]
  },
  {
    name: 'atob',
    signatures: [['data']]
  },
  {
    name: 'btoa',
    signatures: [['data']]
  },
  {
    name: 'clearInterval',
    signatures: [['?id']]
  },
  {
    name: 'clearTimeout',
    signatures: [['?id']]
  },
  {
    name: 'createImageBitmap',
    signatures: [['image','?options'],['image','sx','sy','sw','sh','?options']],
    receiver: 'WindowOrWorkerGlobalScope'
  },
  {
    name: 'createImageBitmap',
    signatures: [['image','?options'],['imageBitmap','?options'],['image','sx','sy','sw','sh','?options'],['imageBitmap','sx','sy','sw','sh','?options']],
    receiver: 'Window'
  },
  {
    name: 'createImageBitmap',
    signatures: [['imageBitmap','?options'],['imageBitmap','sx','sy','sw','sh','?options']],
    receiver: 'WorkerGlobalScope'
  },
  {
    name: 'fetch',
    signatures: [['input','?init']],
    receiver: 'WindowOrWorkerGlobalScope'
  },
  {
    name: 'fetch',
    signatures: [['input','?init']],
    receiver: 'Window'
  },
  {
    name: 'fetch',
    signatures: [['input','?init']],
    receiver: 'WorkerGlobalScope'
  },
  {
    name: 'fetch',
    signatures: [['id','requests','?options']],
    receiver: 'BackgroundFetchManager'
  },
  {
    name: 'queueMicrotask',
    signatures: [['callback']]
  },
  {
    name: 'reportError',
    signatures: [['e']]
  },
  {
    name: 'setInterval',
    signatures: [['handler','?timeout','...arguments']]
  },
  {
    name: 'setTimeout',
    signatures: [['handler','?timeout','...arguments']]
  },
  {
    name: 'addModule',
    signatures: [['moduleURL','?options']],
    receiver: 'Worklet'
  },
  {
    name: 'addModule',
    signatures: [['moduleURL']],
    receiver: 'SharedStorageWorklet'
  },
  {
    name: 'getResponseHeader',
    signatures: [['name']]
  },
  {
    name: 'overrideMimeType',
    signatures: [['mime']]
  },
  {
    name: 'setRequestHeader',
    signatures: [['name','value']]
  },
  {
    name: 'serializeToString',
    signatures: [['root']]
  },
  {
    name: 'createExpression',
    signatures: [['expression','?resolver']]
  },
  {
    name: 'createNSResolver',
    signatures: [['nodeResolver']]
  },
  {
    name: 'evaluate',
    signatures: [['expression','contextNode','?resolver','?type','?result']],
    receiver: 'XPathEvaluatorBase'
  },
  {
    name: 'evaluate',
    signatures: [['contextNode','?type','?result'],['contextNode','?type','?inResult']],
    receiver: 'XPathExpression'
  },
  {
    name: 'evaluate',
    signatures: [['expression','contextNode','?resolver','?type','?inResult']],
    receiver: 'Document'
  },
  {
    name: 'evaluate',
    signatures: [['expression','contextNode','?resolver','?type','?inResult']],
    receiver: 'XPathEvaluator'
  },
  {
    name: 'snapshotItem',
    signatures: [['index']]
  },
  {
    name: 'importStylesheet',
    signatures: [['style']]
  },
  {
    name: 'removeParameter',
    signatures: [['namespaceURI','localName']]
  },
  {
    name: 'setParameter',
    signatures: [['namespaceURI','localName','value']]
  },
  {
    name: 'transformToDocument',
    signatures: [['source']]
  },
  {
    name: 'transformToFragment',
    signatures: [['source','output']]
  },
  {
    name: 'assert',
    signatures: [['?condition','...data']]
  },
  {
    name: 'countReset',
    signatures: [['?label']]
  },
  {
    name: 'debug',
    signatures: [['...data']]
  },
  {
    name: 'dir',
    signatures: [['?item','?options']]
  },
  {
    name: 'dirxml',
    signatures: [['...data']]
  },
  {
    name: 'group',
    signatures: [['...data']]
  },
  {
    name: 'groupCollapsed',
    signatures: [['...data']]
  },
  {
    name: 'info',
    signatures: [['...data']]
  },
  {
    name: 'table',
    signatures: [['?tabularData','?properties']]
  },
  {
    name: 'time',
    signatures: [['?label']]
  },
  {
    name: 'timeEnd',
    signatures: [['?label']]
  },
  {
    name: 'timeLog',
    signatures: [['?label','...data']]
  },
  {
    name: 'timeStamp',
    signatures: [['?label']]
  },
  {
    name: 'trace',
    signatures: [['...data']]
  },
  {
    name: 'warn',
    signatures: [['...data']]
  },
  {
    name: 'importScripts',
    signatures: [['...urls']]
  },
  {
    name: 'Write',
    signatures: [['s']]
  },
  {
    name: 'WriteLine',
    signatures: [['s']]
  },
  {
    name: 'WriteBlankLines',
    signatures: [['intLines']]
  },
  {
    name: 'Read',
    signatures: [['characters']]
  },
  {
    name: 'Skip',
    signatures: [['characters']]
  },
  {
    name: 'lbound',
    signatures: [['?dimension']]
  },
  {
    name: 'ubound',
    signatures: [['?dimension']]
  },
  {
    name: 'Animation',
    signatures: [['?effect','?timeline']]
  },
  {
    name: 'DocumentTimeline',
    signatures: [['?options']]
  },
  {
    name: 'KeyframeEffect',
    signatures: [['source'],['target','keyframes','?options']]
  },
  {
    name: 'ScrollTimeline',
    signatures: [['?options']]
  },
  {
    name: 'AccessibleNodeList',
    signatures: [['?nodes']]
  },
  {
    name: '',
    signatures: [['index','node']],
    receiver: 'AccessibleNodeList'
  },
  {
    name: '',
    signatures: [['index']],
    receiver: 'DataTransferItemList'
  },
  {
    name: '',
    signatures: [['index']],
    receiver: 'CSSKeyframesRule'
  },
  {
    name: '',
    signatures: [['name'],['property','?propertyValue']],
    receiver: 'CSSStyleDeclaration'
  },
  {
    name: '',
    signatures: [['index']],
    receiver: 'CSSNumericArray'
  },
  {
    name: '',
    signatures: [['index','?val']],
    receiver: 'CSSTransformValue'
  },
  {
    name: '',
    signatures: [['index','?val']],
    receiver: 'CSSUnparsedValue'
  },
  {
    name: '',
    signatures: [['name']],
    receiver: 'StyleSheetList'
  },
  {
    name: '',
    signatures: [['name','?value']],
    receiver: 'DOMStringMap'
  },
  {
    name: '',
    signatures: [['index'],['name']],
    receiver: 'Window'
  },
  {
    name: '',
    signatures: [['index']],
    receiver: 'HTMLFormControlsCollection'
  },
  {
    name: '',
    signatures: [['index'],['name']],
    receiver: 'HTMLFormElement'
  },
  {
    name: '',
    signatures: [['index','?option'],['name']],
    receiver: 'HTMLOptionsCollection'
  },
  {
    name: '',
    signatures: [['index','option']],
    receiver: 'HTMLSelectElement'
  },
  {
    name: '',
    signatures: [['index']],
    receiver: 'RadioNodeList'
  },
  {
    name: '',
    signatures: [['index']],
    receiver: 'HTMLAllCollection'
  },
  {
    name: '',
    signatures: [['name','?value']],
    receiver: 'HTMLEmbedElement'
  },
  {
    name: '',
    signatures: [['name','?value']],
    receiver: 'HTMLObjectElement'
  },
  {
    name: '',
    signatures: [['index']],
    receiver: 'AudioTrackList'
  },
  {
    name: '',
    signatures: [['index']],
    receiver: 'TextTrackCueList'
  },
  {
    name: '',
    signatures: [['index']],
    receiver: 'TextTrackList'
  },
  {
    name: '',
    signatures: [['index']],
    receiver: 'VideoTrackList'
  },
  {
    name: '',
    signatures: [['index','newItem']],
    receiver: 'SVGLengthList'
  },
  {
    name: '',
    signatures: [['index','newItem']],
    receiver: 'SVGNumberList'
  },
  {
    name: '',
    signatures: [['index','newItem']],
    receiver: 'SVGPointList'
  },
  {
    name: '',
    signatures: [['index','newItem']],
    receiver: 'SVGStringList'
  },
  {
    name: '',
    signatures: [['index','newItem']],
    receiver: 'SVGTransformList'
  },
  {
    name: '',
    signatures: [['index']],
    receiver: 'SourceBufferList'
  },
  {
    name: '',
    signatures: [['index']],
    receiver: 'TrackDefaultList'
  },
  {
    name: '',
    signatures: [['name']],
    receiver: 'RTCStatsResponse'
  },
  {
    name: '',
    signatures: [['index']],
    receiver: 'ImageTrackList'
  },
  {
    name: '',
    signatures: [['index']],
    receiver: 'XRInputSourceArray'
  },
  {
    name: 'CSSStyleSheet',
    signatures: [['?options']]
  },
  {
    name: 'replaceSync',
    signatures: [['text']]
  },
  {
    name: 'CSSHSL',
    signatures: [['h','s','l','?alpha']]
  },
  {
    name: 'CSSHWB',
    signatures: [['h','w','b','?alpha']]
  },
  {
    name: 'CSSKeywordValue',
    signatures: [['keyword']]
  },
  {
    name: 'CSSMathClamp',
    signatures: [['lower','value','upper']]
  },
  {
    name: 'CSSMathInvert',
    signatures: [['arg']]
  },
  {
    name: 'CSSMathMax',
    signatures: [['...args']]
  },
  {
    name: 'CSSMathMin',
    signatures: [['...args']]
  },
  {
    name: 'CSSMathNegate',
    signatures: [['arg']]
  },
  {
    name: 'CSSMathProduct',
    signatures: [['...args']]
  },
  {
    name: 'CSSMathSum',
    signatures: [['...args']]
  },
  {
    name: 'CSSMatrixComponent',
    signatures: [['matrix','?options']]
  },
  {
    name: 'sub',
    signatures: [['...values']]
  },
  {
    name: 'mul',
    signatures: [['...values']]
  },
  {
    name: 'div',
    signatures: [['...values']]
  },
  {
    name: 'equals',
    signatures: [['...values']]
  },
  {
    name: 'to',
    signatures: [['unit']]
  },
  {
    name: 'toSum',
    signatures: [['...units']]
  },
  {
    name: 'CSSPerspective',
    signatures: [['length']]
  },
  {
    name: 'CSSPositionValue',
    signatures: [['x','y']]
  },
  {
    name: 'CSSRGB',
    signatures: [['r','g','b','?alpha']]
  },
  {
    name: 'CSSRotate',
    signatures: [['angleValue'],['x','y','z','angle']]
  },
  {
    name: 'CSSScale',
    signatures: [['x','y','?z']]
  },
  {
    name: 'CSSSkewX',
    signatures: [['ax']]
  },
  {
    name: 'CSSSkewY',
    signatures: [['ay']]
  },
  {
    name: 'CSSSkew',
    signatures: [['ax','ay']]
  },
  {
    name: 'CSSTransformValue',
    signatures: [['transforms']]
  },
  {
    name: 'CSSTranslate',
    signatures: [['x','y','?z']]
  },
  {
    name: 'CSSUnitValue',
    signatures: [['value','unit']]
  },
  {
    name: 'number',
    signatures: [['value']]
  },
  {
    name: 'percent',
    signatures: [['value']]
  },
  {
    name: 'em',
    signatures: [['value']]
  },
  {
    name: 'ex',
    signatures: [['value']]
  },
  {
    name: 'ch',
    signatures: [['value']]
  },
  {
    name: 'rem',
    signatures: [['value']]
  },
  {
    name: 'vw',
    signatures: [['value']]
  },
  {
    name: 'vh',
    signatures: [['value']]
  },
  {
    name: 'vi',
    signatures: [['value']]
  },
  {
    name: 'vb',
    signatures: [['value']]
  },
  {
    name: 'vmin',
    signatures: [['value']]
  },
  {
    name: 'vmax',
    signatures: [['value']]
  },
  {
    name: 'svw',
    signatures: [['value']]
  },
  {
    name: 'svh',
    signatures: [['value']]
  },
  {
    name: 'svi',
    signatures: [['value']]
  },
  {
    name: 'svb',
    signatures: [['value']]
  },
  {
    name: 'svmin',
    signatures: [['value']]
  },
  {
    name: 'svmax',
    signatures: [['value']]
  },
  {
    name: 'lvw',
    signatures: [['value']]
  },
  {
    name: 'lvh',
    signatures: [['value']]
  },
  {
    name: 'lvi',
    signatures: [['value']]
  },
  {
    name: 'lvb',
    signatures: [['value']]
  },
  {
    name: 'lvmin',
    signatures: [['value']]
  },
  {
    name: 'lvmax',
    signatures: [['value']]
  },
  {
    name: 'dvw',
    signatures: [['value']]
  },
  {
    name: 'dvh',
    signatures: [['value']]
  },
  {
    name: 'dvi',
    signatures: [['value']]
  },
  {
    name: 'dvb',
    signatures: [['value']]
  },
  {
    name: 'dvmin',
    signatures: [['value']]
  },
  {
    name: 'dvmax',
    signatures: [['value']]
  },
  {
    name: 'cqw',
    signatures: [['value']]
  },
  {
    name: 'cqh',
    signatures: [['value']]
  },
  {
    name: 'cqi',
    signatures: [['value']]
  },
  {
    name: 'cqb',
    signatures: [['value']]
  },
  {
    name: 'cqmin',
    signatures: [['value']]
  },
  {
    name: 'cqmax',
    signatures: [['value']]
  },
  {
    name: 'cm',
    signatures: [['value']]
  },
  {
    name: 'mm',
    signatures: [['value']]
  },
  {
    name: 'in',
    signatures: [['value']]
  },
  {
    name: 'pt',
    signatures: [['value']]
  },
  {
    name: 'pc',
    signatures: [['value']]
  },
  {
    name: 'px',
    signatures: [['value']]
  },
  {
    name: 'Q',
    signatures: [['value']]
  },
  {
    name: 'deg',
    signatures: [['value']]
  },
  {
    name: 'grad',
    signatures: [['value']]
  },
  {
    name: 'rad',
    signatures: [['value']]
  },
  {
    name: 'turn',
    signatures: [['value']]
  },
  {
    name: 's',
    signatures: [['value']]
  },
  {
    name: 'ms',
    signatures: [['value']]
  },
  {
    name: 'Hz',
    signatures: [['value']]
  },
  {
    name: 'kHz',
    signatures: [['value']]
  },
  {
    name: 'dpi',
    signatures: [['value']]
  },
  {
    name: 'dpcm',
    signatures: [['value']]
  },
  {
    name: 'dppx',
    signatures: [['value']]
  },
  {
    name: 'fr',
    signatures: [['value']]
  },
  {
    name: 'CSSUnparsedValue',
    signatures: [['members']]
  },
  {
    name: 'CSSVariableReferenceValue',
    signatures: [['variable','?fallback']]
  },
  {
    name: 'FontFaceSetLoadEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'FontFace',
    signatures: [['family','source','?descriptors']]
  },
  {
    name: 'MediaQueryListEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'registerProperty',
    signatures: [['definition']]
  },
  {
    name: 'setElement',
    signatures: [['element','tag','?options']]
  },
  {
    name: 'Comment',
    signatures: [['?data']]
  },
  {
    name: 'hasTrustToken',
    signatures: [['issuer']]
  },
  {
    name: 'DOMException',
    signatures: [['?message','?name']]
  },
  {
    name: 'getInnerHTML',
    signatures: [['?options']]
  },
  {
    name: 'isVisible',
    signatures: [['?options']]
  },
  {
    name: 'scrollIntoViewIfNeeded',
    signatures: [['?centerIfNeeded']]
  },
  {
    name: 'CustomEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'next',
    signatures: [['?value']],
    receiver: 'Iterator'
  },
  {
    name: 'MutationObserver',
    signatures: [['callback']]
  },
  {
    name: 'setApplyScroll',
    signatures: [['scrollStateCallback','nativeScrollBehavior']]
  },
  {
    name: 'setDistributeScroll',
    signatures: [['scrollStateCallback','nativeScrollBehavior']]
  },
  {
    name: 'expand',
    signatures: [['?unit']]
  },
  {
    name: 'StaticRange',
    signatures: [['init']]
  },
  {
    name: 'Text',
    signatures: [['?data']]
  },
  {
    name: 'CharacterBoundsUpdateEvent',
    signatures: [['type','?options']]
  },
  {
    name: 'EditContext',
    signatures: [['?options']]
  },
  {
    name: 'updateSelection',
    signatures: [['start','end']]
  },
  {
    name: 'updateControlBounds',
    signatures: [['controlBounds']]
  },
  {
    name: 'updateSelectionBounds',
    signatures: [['selectionBounds']]
  },
  {
    name: 'updateCharacterBounds',
    signatures: [['rangeStart','characterBounds']]
  },
  {
    name: 'updateText',
    signatures: [['start','end','newText']]
  },
  {
    name: 'TextFormatUpdateEvent',
    signatures: [['type','?options']]
  },
  {
    name: 'TextFormat',
    signatures: [['?options']]
  },
  {
    name: 'TextUpdateEvent',
    signatures: [['type','?options']]
  },
  {
    name: 'modify',
    signatures: [['?alter','?direction','?granularity']]
  },
  {
    name: 'AnimationEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'AnimationPlaybackEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'ClipboardEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'CompositionEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'DragEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'ErrorEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'FocusEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'HashChangeEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'InputEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'KeyboardEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'MessageEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'MouseEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'OverscrollEvent',
    signatures: [['type','bubbles','?eventInitDict']]
  },
  {
    name: 'PageTransitionEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'PointerEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'PopStateEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'ProgressEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'PromiseRejectionEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'SecurityPolicyViolationEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'initTextEvent',
    signatures: [['?type','?bubbles','?cancelable','?view','?data']]
  },
  {
    name: 'TouchEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'TransitionEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'UIEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'WheelEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'Headers',
    signatures: [['?init']]
  },
  {
    name: 'Request',
    signatures: [['input','?init']]
  },
  {
    name: 'Response',
    signatures: [['?body','?init']]
  },
  {
    name: 'Blob',
    signatures: [['?blobParts','?options']]
  },
  {
    name: 'File',
    signatures: [['fileBits','fileName','?options']]
  },
  {
    name: 'createSelectorDirective',
    signatures: [['arg']]
  },
  {
    name: 'TextDirective',
    signatures: [['?options']]
  },
  {
    name: 'getHighEntropyValues',
    signatures: [['hints']]
  },
  {
    name: 'PendingBeacon',
    signatures: [['url','?options']]
  },
  {
    name: 'ReportingObserver',
    signatures: [['callback','?options']]
  },
  {
    name: 'isInputPending',
    signatures: [['?options']]
  },
  {
    name: 'getComputedAccessibleNode',
    signatures: [['element']]
  },
  {
    name: 'webkitRequestAnimationFrame',
    signatures: [['callback']]
  },
  {
    name: 'webkitCancelAnimationFrame',
    signatures: [['id']]
  },
  {
    name: 'webkitRequestFullScreen',
    signatures: [['?options']]
  },
  {
    name: 'webkitRequestFullscreen',
    signatures: [['?options']]
  },
  {
    name: 'DOMMatrixReadOnly',
    signatures: [['?init']]
  },
  {
    name: 'DOMMatrix',
    signatures: [['?init']]
  },
  {
    name: 'DOMPointReadOnly',
    signatures: [['?x','?y','?z','?w']]
  },
  {
    name: 'DOMPoint',
    signatures: [['?x','?y','?z','?w']]
  },
  {
    name: 'DOMQuad',
    signatures: [['?p1','?p2','?p3','?p4']]
  },
  {
    name: 'DOMRectReadOnly',
    signatures: [['?x','?y','?width','?height']]
  },
  {
    name: 'DOMRect',
    signatures: [['?x','?y','?width','?height']]
  },
  {
    name: 'Highlight',
    signatures: [['...initRanges']]
  },
  {
    name: 'convertToBlob',
    signatures: [['?options']]
  },
  {
    name: 'ImageData',
    signatures: [['sw','sh','?settings'],['data','sw','?sh','?settings']]
  },
  {
    name: 'CloseWatcher',
    signatures: [['?options']]
  },
  {
    name: 'reportEvent',
    signatures: [['event']]
  },
  {
    name: 'FormDataEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'FormData',
    signatures: [['?form']]
  },
  {
    name: 'Option',
    signatures: [['?data','?value','?defaultSelected','?selected']]
  },
  {
    name: 'SubmitEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'Image',
    signatures: [['?width','?height']]
  },
  {
    name: 'Audio',
    signatures: [['?src']]
  },
  {
    name: 'activate',
    signatures: [['?options']]
  },
  {
    name: 'PortalActivateEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'TrackEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'VTTCue',
    signatures: [['startTime','endTime','text']]
  },
  {
    name: 'InputDeviceCapabilities',
    signatures: [['?deviceInitDict']]
  },
  {
    name: 'Touch',
    signatures: [['initDict']]
  },
  {
    name: 'copyText',
    signatures: [['text']]
  },
  {
    name: 'showContextMenuAtPoint',
    signatures: [['x','y','items','?document']]
  },
  {
    name: 'sendMessageToEmbedder',
    signatures: [['message']]
  },
  {
    name: 'IntersectionObserver',
    signatures: [['callback','?options']]
  },
  {
    name: 'layoutNextFragment',
    signatures: [['?options']]
  },
  {
    name: 'registerLayout',
    signatures: [['name','layoutCtor']]
  },
  {
    name: 'watch',
    signatures: [['signals','callback']]
  },
  {
    name: 'writeMessage',
    signatures: [['buffer','handles']]
  },
  {
    name: 'readMessage',
    signatures: [['?flags']]
  },
  {
    name: 'writeData',
    signatures: [['buffer','?options']]
  },
  {
    name: 'discardData',
    signatures: [['numBytes','?options']]
  },
  {
    name: 'readData',
    signatures: [['buffer','?options']]
  },
  {
    name: 'mapBuffer',
    signatures: [['offset','numBytes']]
  },
  {
    name: 'duplicateBufferHandle',
    signatures: [['?options']]
  },
  {
    name: 'MojoInterfaceInterceptor',
    signatures: [['interfaceName','?scope']]
  },
  {
    name: 'MojoInterfaceRequestEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'NavigateEvent',
    signatures: [['type','eventInit']]
  },
  {
    name: 'transitionWhile',
    signatures: [['newNavigationAction','?options']]
  },
  {
    name: 'NavigationCurrentEntryChangeEvent',
    signatures: [['type','eventInit']]
  },
  {
    name: 'updateCurrentEntry',
    signatures: [['options']]
  },
  {
    name: 'navigate',
    signatures: [['url','?options']],
    receiver: 'Navigation'
  },
  {
    name: 'navigate',
    signatures: [['url']],
    receiver: 'WindowClient'
  },
  {
    name: 'traverseTo',
    signatures: [['key','?options']]
  },
  {
    name: 'OffscreenCanvas',
    signatures: [['width','height']]
  },
  {
    name: 'setValueAndClosePopup',
    signatures: [['numberValue','stringValue']]
  },
  {
    name: 'setValue',
    signatures: [['value']]
  },
  {
    name: 'localizeNumberString',
    signatures: [['numberString']]
  },
  {
    name: 'formatMonth',
    signatures: [['year','zeroBaseMonth']]
  },
  {
    name: 'formatShortMonth',
    signatures: [['year','zeroBaseMonth']]
  },
  {
    name: 'formatWeek',
    signatures: [['year','weekNumber','localizedStartDate']]
  },
  {
    name: 'setWindowRect',
    signatures: [['x','y','width','height']]
  },
  {
    name: 'ScrollState',
    signatures: [['?scrollStateInit']]
  },
  {
    name: 'consumeDelta',
    signatures: [['x','y']]
  },
  {
    name: 'allowsFeature',
    signatures: [['feature','?origin']]
  },
  {
    name: 'getAllowlistForFeature',
    signatures: [['feature']]
  },
  {
    name: 'ResizeObserver',
    signatures: [['callback']]
  },
  {
    name: 'ByteLengthQueuingStrategy',
    signatures: [['init']]
  },
  {
    name: 'CountQueuingStrategy',
    signatures: [['init']]
  },
  {
    name: 'ReadableStreamBYOBReader',
    signatures: [['stream']]
  },
  {
    name: 'respond',
    signatures: [['bytesWritten']]
  },
  {
    name: 'respondWithNewView',
    signatures: [['view']]
  },
  {
    name: 'ReadableStreamDefaultReader',
    signatures: [['stream']]
  },
  {
    name: 'ReadableStream',
    signatures: [['?underlyingSource','?strategy']]
  },
  {
    name: 'TransformStream',
    signatures: [['?transformer','?writableStrategy','?readableStrategy']]
  },
  {
    name: 'WritableStream',
    signatures: [['?underlyingSink','?strategy']]
  },
  {
    name: 'PerformanceMark',
    signatures: [['markName','?markOptions']]
  },
  {
    name: 'PerformanceObserver',
    signatures: [['callback']]
  },
  {
    name: 'Profiler',
    signatures: [['options']]
  },
  {
    name: 'createPolicy',
    signatures: [['policyName','?policyOptions']]
  },
  {
    name: 'isHTML',
    signatures: [['checkedObject']]
  },
  {
    name: 'isScript',
    signatures: [['checkedObject']]
  },
  {
    name: 'isScriptURL',
    signatures: [['checkedObject']]
  },
  {
    name: 'getAttributeType',
    signatures: [['tagName','attribute','?elementNS','?attrNs']]
  },
  {
    name: 'getPropertyType',
    signatures: [['tagName','property','?elementNS']]
  },
  {
    name: 'getTypeMapping',
    signatures: [['?ns']]
  },
  {
    name: 'createHTML',
    signatures: [['input','...args']]
  },
  {
    name: 'createScript',
    signatures: [['input','...args']]
  },
  {
    name: 'createScriptURL',
    signatures: [['input','...args']]
  },
  {
    name: 'URLSearchParams',
    signatures: [['?init']]
  },
  {
    name: 'URL',
    signatures: [['url','?base']]
  },
  {
    name: 'SharedWorker',
    signatures: [['scriptURL','?options']]
  },
  {
    name: 'Worker',
    signatures: [['scriptURL','?options']]
  },
  {
    name: 'setTrustToken',
    signatures: [['trustToken']]
  },
  {
    name: 'joinAdInterestGroup',
    signatures: [['group','durationSeconds']]
  },
  {
    name: 'leaveAdInterestGroup',
    signatures: [['?group']]
  },
  {
    name: 'runAdAuction',
    signatures: [['config']]
  },
  {
    name: 'adAuctionComponents',
    signatures: [['numComponents']]
  },
  {
    name: 'deprecatedURNToURL',
    signatures: [['uuid_url']]
  },
  {
    name: 'deprecatedReplaceInURN',
    signatures: [['uuid_url','replacements']]
  },
  {
    name: 'createAdRequest',
    signatures: [['config']]
  },
  {
    name: 'finalizeAd',
    signatures: [['ads','config']]
  },
  {
    name: 'registerAnimator',
    signatures: [['name','animatorCtor']]
  },
  {
    name: 'WorkletAnimation',
    signatures: [['animatorName','effects','?timeline','?options']]
  },
  {
    name: 'BeforeInstallPromptEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'setSinkId',
    signatures: [['sinkId']]
  },
  {
    name: 'BackgroundFetchEvent',
    signatures: [['type','init']]
  },
  {
    name: 'BackgroundFetchUpdateUIEvent',
    signatures: [['type','init']]
  },
  {
    name: 'updateUI',
    signatures: [['?options']]
  },
  {
    name: 'PeriodicSyncEvent',
    signatures: [['type','init']]
  },
  {
    name: 'SyncEvent',
    signatures: [['type','init']]
  },
  {
    name: 'setAppBadge',
    signatures: [['?contents']]
  },
  {
    name: 'watchAdvertisements',
    signatures: [['?options']]
  },
  {
    name: 'getDescriptor',
    signatures: [['descriptor']]
  },
  {
    name: 'getDescriptors',
    signatures: [['?descriptor']]
  },
  {
    name: 'writeValue',
    signatures: [['value']]
  },
  {
    name: 'writeValueWithResponse',
    signatures: [['value']]
  },
  {
    name: 'writeValueWithoutResponse',
    signatures: [['value']]
  },
  {
    name: 'getPrimaryService',
    signatures: [['service']]
  },
  {
    name: 'getPrimaryServices',
    signatures: [['?service']]
  },
  {
    name: 'getCharacteristic',
    signatures: [['characteristic']]
  },
  {
    name: 'getCharacteristics',
    signatures: [['?characteristic']]
  },
  {
    name: 'requestDevice',
    signatures: [['?options']],
    receiver: 'Bluetooth'
  },
  {
    name: 'requestDevice',
    signatures: [['options']],
    receiver: 'HID'
  },
  {
    name: 'requestDevice',
    signatures: [['?descriptor']],
    receiver: 'GPUAdapter'
  },
  {
    name: 'requestDevice',
    signatures: [['options']],
    receiver: 'USB'
  },
  {
    name: 'requestLEScan',
    signatures: [['?options']]
  },
  {
    name: 'MediaStreamTrackGenerator',
    signatures: [['kind'],['init']]
  },
  {
    name: 'MediaStreamTrackProcessor',
    signatures: [['init'],['track','?bufferSize']]
  },
  {
    name: 'BroadcastChannel',
    signatures: [['name']]
  },
  {
    name: 'setExpires',
    signatures: [['expires']]
  },
  {
    name: 'CanvasFilter',
    signatures: [['init']]
  },
  {
    name: 'CanvasFormattedTextRun',
    signatures: [['text']]
  },
  {
    name: 'CanvasFormattedText',
    signatures: [['?text']]
  },
  {
    name: 'getRun',
    signatures: [['index']]
  },
  {
    name: 'appendRun',
    signatures: [['newRun']]
  },
  {
    name: 'setRun',
    signatures: [['index','run']]
  },
  {
    name: 'insertRun',
    signatures: [['index','run']]
  },
  {
    name: 'deleteRun',
    signatures: [['index','?length']]
  },
  {
    name: 'roundRect',
    signatures: [['x','y','w','h','?radii']]
  },
  {
    name: 'scrollPathIntoView',
    signatures: [['?path']]
  },
  {
    name: 'fillFormattedText',
    signatures: [['formattedText','x','y','wrapWidth','?height']]
  },
  {
    name: 'Path2D',
    signatures: [['?path']]
  },
  {
    name: 'ClipboardItem',
    signatures: [['items','?options']]
  },
  {
    name: 'CompressionStream',
    signatures: [['format']]
  },
  {
    name: 'DecompressionStream',
    signatures: [['format']]
  },
  {
    name: 'ContentIndexEvent',
    signatures: [['type','init']]
  },
  {
    name: 'FederatedCredential',
    signatures: [['data']]
  },
  {
    name: 'login',
    signatures: [['?request']]
  },
  {
    name: 'revoke',
    signatures: [['hint']],
    receiver: 'FederatedCredential'
  },
  {
    name: 'revoke',
    signatures: [['permission']],
    receiver: 'Permissions'
  },
  {
    name: 'PasswordCredential',
    signatures: [['data'],['form']]
  },
  {
    name: 'registerPaint',
    signatures: [['name','paintCtor']]
  },
  {
    name: 'updateInkTrailStartPoint',
    signatures: [['evt','style']]
  },
  {
    name: 'requestPresenter',
    signatures: [['?param']]
  },
  {
    name: 'DeviceMotionEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'DeviceOrientationEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'TCPSocket',
    signatures: [['remoteAddress','remotePort','?options']]
  },
  {
    name: 'UDPSocket',
    signatures: [['address','port','?options']]
  },
  {
    name: 'TextDecoderStream',
    signatures: [['?label','?options']]
  },
  {
    name: 'TextDecoder',
    signatures: [['?label','?options']]
  },
  {
    name: 'MediaEncryptedEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'MediaKeyMessageEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'getStatusForPolicy',
    signatures: [['policy']]
  },
  {
    name: 'EventSource',
    signatures: [['url','?eventSourceInitDict']]
  },
  {
    name: 'createWritable',
    signatures: [['?options']]
  },
  {
    name: 'move',
    signatures: [['new_entry_name'],['destination_directory','?new_entry_name']]
  },
  {
    name: 'queryPermission',
    signatures: [['?descriptor']]
  },
  {
    name: 'requestPermission',
    signatures: [['?descriptor']]
  },
  {
    name: 'truncate',
    signatures: [['size']]
  },
  {
    name: 'seek',
    signatures: [['offset']],
    receiver: 'FileSystemWritableFileStream'
  },
  {
    name: 'seek',
    signatures: [['position']],
    receiver: 'FileWriterSync'
  },
  {
    name: 'seek',
    signatures: [['position']],
    receiver: 'FileWriter'
  },
  {
    name: 'showOpenFilePicker',
    signatures: [['?options']]
  },
  {
    name: 'showSaveFilePicker',
    signatures: [['?options']]
  },
  {
    name: 'showDirectoryPicker',
    signatures: [['?options']]
  },
  {
    name: 'webkitRequestFileSystem',
    signatures: [['type','size','?successCallback','?errorCallback']],
    receiver: 'DedicatedWorkerGlobalScope'
  },
  {
    name: 'webkitRequestFileSystem',
    signatures: [['type','size','?successCallback','?errorCallback']],
    receiver: 'SharedWorkerGlobalScope'
  },
  {
    name: 'webkitRequestFileSystem',
    signatures: [['type','size','successCallback','?errorCallback']],
    receiver: 'Window'
  },
  {
    name: 'webkitRequestFileSystemSync',
    signatures: [['type','size']]
  },
  {
    name: 'webkitResolveLocalFileSystemURL',
    signatures: [['url','successCallback','?errorCallback']]
  },
  {
    name: 'webkitResolveLocalFileSystemSyncURL',
    signatures: [['url']]
  },
  {
    name: 'isolatedFileSystem',
    signatures: [['fileSystemId','registeredName']]
  },
  {
    name: 'upgradeDraggedFileSystemPermissions',
    signatures: [['domFileSystem']]
  },
  {
    name: 'removeRecursively',
    signatures: [['successCallback','?errorCallback']],
    receiver: 'DirectoryEntry'
  },
  {
    name: 'getMetadata',
    signatures: [['successCallback','?errorCallback']],
    receiver: 'Entry'
  },
  {
    name: 'copyTo',
    signatures: [['parent','name']],
    receiver: 'EntrySync'
  },
  {
    name: 'copyTo',
    signatures: [['parent','?name','?successCallback','?errorCallback']],
    receiver: 'Entry'
  },
  {
    name: 'copyTo',
    signatures: [['destination','options']],
    receiver: 'AudioData'
  },
  {
    name: 'copyTo',
    signatures: [['destination']],
    receiver: 'EncodedAudioChunk'
  },
  {
    name: 'copyTo',
    signatures: [['destination']],
    receiver: 'EncodedVideoChunk'
  },
  {
    name: 'copyTo',
    signatures: [['destination','?options']],
    receiver: 'VideoFrame'
  },
  {
    name: 'createWriter',
    signatures: [['successCallback','?errorCallback']],
    receiver: 'FileEntry'
  },
  {
    name: 'queryLocalFonts',
    signatures: [['?options']]
  },
  {
    name: 'GamepadAxisEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'GamepadButtonEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'GamepadEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'playEffect',
    signatures: [['type','params']]
  },
  {
    name: 'addStroke',
    signatures: [['stroke']]
  },
  {
    name: 'removeStroke',
    signatures: [['stroke']]
  },
  {
    name: 'startDrawing',
    signatures: [['?hints']]
  },
  {
    name: 'addPoint',
    signatures: [['point']]
  },
  {
    name: 'createHandwritingRecognizer',
    signatures: [['constraint']]
  },
  {
    name: 'queryHandwritingRecognizer',
    signatures: [['constraint']]
  },
  {
    name: 'HIDConnectionEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'sendReport',
    signatures: [['reportId','data']]
  },
  {
    name: 'sendFeatureReport',
    signatures: [['reportId','data']]
  },
  {
    name: 'receiveFeatureReport',
    signatures: [['reportId']]
  },
  {
    name: 'ImageCapture',
    signatures: [['track']]
  },
  {
    name: 'takePhoto',
    signatures: [['?photoSettings']]
  },
  {
    name: 'batchGetAll',
    signatures: [['?keys','?count']]
  },
  {
    name: 'IDBVersionChangeEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'setConsumer',
    signatures: [['consumer']]
  },
  {
    name: 'BlobEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'MediaRecorder',
    signatures: [['stream','?options']]
  },
  {
    name: 'MediaMetadata',
    signatures: [['?init']]
  },
  {
    name: 'setMicrophoneActive',
    signatures: [['active']]
  },
  {
    name: 'setCameraActive',
    signatures: [['active']]
  },
  {
    name: 'appendEncodedChunks',
    signatures: [['chunks']]
  },
  {
    name: 'TrackDefaultList',
    signatures: [['?trackDefaults']]
  },
  {
    name: 'TrackDefault',
    signatures: [['type','language','label','kinds','?byteStreamTrackID']]
  },
  {
    name: 'cropTo',
    signatures: [['crop_id']]
  },
  {
    name: 'getDisplayMediaSet',
    signatures: [['?constraints']]
  },
  {
    name: 'setCaptureHandleConfig',
    signatures: [['?config']]
  },
  {
    name: 'produceCropId',
    signatures: [['target']]
  },
  {
    name: 'MediaStreamEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'MediaStreamTrackEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'MediaStream',
    signatures: [['?stream'],['tracks']]
  },
  {
    name: 'webkitGetUserMedia',
    signatures: [['constraints','successCallback','errorCallback']]
  },
  {
    name: 'OverconstrainedError',
    signatures: [['constraint','message']]
  },
  {
    name: 'MLModelLoader',
    signatures: [['context']]
  },
  {
    name: 'compute',
    signatures: [['inputs']]
  },
  {
    name: 'createContext',
    signatures: [['?options']]
  },
  {
    name: 'MLGraphBuilder',
    signatures: [['context']]
  },
  {
    name: 'input',
    signatures: [['name','desc']]
  },
  {
    name: 'constant',
    signatures: [['desc','bufferView']]
  },
  {
    name: 'openSync',
    signatures: [['name']]
  },
  {
    name: 'rename',
    signatures: [['old_name','new_name']]
  },
  {
    name: 'renameSync',
    signatures: [['old_name','new_name']]
  },
  {
    name: 'requestCapacity',
    signatures: [['requested_capacity']]
  },
  {
    name: 'requestCapacitySync',
    signatures: [['released_capacity']]
  },
  {
    name: 'releaseCapacity',
    signatures: [['released_capacity']]
  },
  {
    name: 'releaseCapacitySync',
    signatures: [['released_capacity']]
  },
  {
    name: 'setLength',
    signatures: [['length']]
  },
  {
    name: 'unregisterProtocolHandler',
    signatures: [['scheme','url']]
  },
  {
    name: 'NDEFMessage',
    signatures: [['messageInit']]
  },
  {
    name: 'scan',
    signatures: [['?options']]
  },
  {
    name: 'makeReadOnly',
    signatures: [['?options']]
  },
  {
    name: 'NDEFReadingEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'NDEFRecord',
    signatures: [['recordInit']]
  },
  {
    name: 'NotificationEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'Notification',
    signatures: [['title','?options']]
  },
  {
    name: 'TimestampTrigger',
    signatures: [['timestamp']]
  },
  {
    name: 'AbortPaymentEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'respondWith',
    signatures: [['paymentAbortedResponse']],
    receiver: 'AbortPaymentEvent'
  },
  {
    name: 'respondWith',
    signatures: [['canMakePaymentResponse']],
    receiver: 'CanMakePaymentEvent'
  },
  {
    name: 'respondWith',
    signatures: [['response']],
    receiver: 'PaymentRequestEvent'
  },
  {
    name: 'respondWith',
    signatures: [['r']],
    receiver: 'FetchEvent'
  },
  {
    name: 'CanMakePaymentEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'getDetails',
    signatures: [['itemIds']]
  },
  {
    name: 'consume',
    signatures: [['purchaseToken']]
  },
  {
    name: 'getDigitalGoodsService',
    signatures: [['paymentMethod']]
  },
  {
    name: 'MerchantValidationEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'enableDelegations',
    signatures: [['delegations']]
  },
  {
    name: 'PaymentMethodChangeEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'PaymentRequestEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'openWindow',
    signatures: [['url']]
  },
  {
    name: 'changePaymentMethod',
    signatures: [['methodName','?methodDetails']]
  },
  {
    name: 'changeShippingAddress',
    signatures: [['shippingAddress']]
  },
  {
    name: 'changeShippingOption',
    signatures: [['shippingOption']]
  },
  {
    name: 'PaymentRequestUpdateEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'PaymentRequest',
    signatures: [['methodData','?details','?options']]
  },
  {
    name: 'RTCDataChannelEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'RTCDTMFToneChangeEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'RTCErrorEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'RTCError',
    signatures: [['init','?message']]
  },
  {
    name: 'RTCIceCandidate',
    signatures: [['?candidateInitDict']]
  },
  {
    name: 'gather',
    signatures: [['options']]
  },
  {
    name: 'addRemoteCandidate',
    signatures: [['remoteCandidate']]
  },
  {
    name: 'stat',
    signatures: [['name']]
  },
  {
    name: 'RTCPeerConnectionIceErrorEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'RTCPeerConnectionIceEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'RTCPeerConnection',
    signatures: [['?configuration','?mediaConstraints']]
  },
  {
    name: 'setOfferedRtpHeaderExtensions',
    signatures: [['headerExtensionsToOffer']]
  },
  {
    name: 'RTCSessionDescription',
    signatures: [['?descriptionInitDict']]
  },
  {
    name: 'requestAll',
    signatures: [['permissions']]
  },
  {
    name: 'PictureInPictureEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'requestPictureInPictureWindow',
    signatures: [['options']]
  },
  {
    name: 'PresentationConnectionAvailableEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'PresentationConnectionCloseEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'PresentationRequest',
    signatures: [['url'],['urls']]
  },
  {
    name: 'reconnect',
    signatures: [['id']]
  },
  {
    name: 'PushEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'PushSubscriptionChangeEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'queryUsageAndQuota',
    signatures: [['storageType','?usageCallback','?errorCallback']],
    receiver: 'DeprecatedStorageInfo'
  },
  {
    name: 'queryUsageAndQuota',
    signatures: [['usageCallback','?errorCallback']],
    receiver: 'DeprecatedStorageQuota'
  },
  {
    name: 'requestQuota',
    signatures: [['storageType','newQuotaInBytes','?quotaCallback','?errorCallback']],
    receiver: 'DeprecatedStorageInfo'
  },
  {
    name: 'requestQuota',
    signatures: [['newQuotaInBytes','?quotaCallback','?errorCallback']],
    receiver: 'DeprecatedStorageQuota'
  },
  {
    name: 'DOMError',
    signatures: [['name','?message']]
  },
  {
    name: 'setHTML',
    signatures: [['markup','?options']]
  },
  {
    name: 'Sanitizer',
    signatures: [['?config']]
  },
  {
    name: 'sanitize',
    signatures: [['input']]
  },
  {
    name: 'sanitizeFor',
    signatures: [['element','markup']]
  },
  {
    name: 'postTask',
    signatures: [['callback','?options']]
  },
  {
    name: 'isAncestor',
    signatures: [['parentId']]
  },
  {
    name: 'TaskController',
    signatures: [['?init']]
  },
  {
    name: 'setPriority',
    signatures: [['priority']]
  },
  {
    name: 'TaskPriorityChangeEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'AbsoluteOrientationSensor',
    signatures: [['?sensorOptions']]
  },
  {
    name: 'Accelerometer',
    signatures: [['?sensorOptions']]
  },
  {
    name: 'AmbientLightSensor',
    signatures: [['?sensorOptions']]
  },
  {
    name: 'GravitySensor',
    signatures: [['?sensorOptions']]
  },
  {
    name: 'Gyroscope',
    signatures: [['?sensorOptions']]
  },
  {
    name: 'LinearAccelerationSensor',
    signatures: [['?sensorOptions']]
  },
  {
    name: 'Magnetometer',
    signatures: [['?sensorOptions']]
  },
  {
    name: 'populateMatrix',
    signatures: [['targetBuffer']]
  },
  {
    name: 'RelativeOrientationSensor',
    signatures: [['?sensorOptions']]
  },
  {
    name: 'SensorErrorEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'requestPort',
    signatures: [['?options']]
  },
  {
    name: 'ExtendableEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'waitUntil',
    signatures: [['f']]
  },
  {
    name: 'ExtendableMessageEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'FetchEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'addPerformanceEntry',
    signatures: [['entry']]
  },
  {
    name: 'InstallEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'setHeaderValue',
    signatures: [['value']]
  },
  {
    name: 'BarcodeDetector',
    signatures: [['?barcodeDetectorOptions']]
  },
  {
    name: 'FaceDetector',
    signatures: [['?faceDetectorOptions']]
  },
  {
    name: 'detect',
    signatures: [['image']]
  },
  {
    name: 'selectURL',
    signatures: [['name','urls','?options']]
  },
  {
    name: 'run',
    signatures: [['name','?options']]
  },
  {
    name: 'addFromUri',
    signatures: [['src','?weight']]
  },
  {
    name: 'addFromString',
    signatures: [['string','?weight']]
  },
  {
    name: 'SpeechRecognitionErrorEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'SpeechRecognitionEvent',
    signatures: [['type','?initDict']]
  },
  {
    name: 'SpeechSynthesisErrorEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'SpeechSynthesisEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'SpeechSynthesisUtterance',
    signatures: [['?text']]
  },
  {
    name: 'StorageEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'URLPattern',
    signatures: [['?input','?baseURL']]
  },
  {
    name: 'requestVideoFrameCallback',
    signatures: [['callback']]
  },
  {
    name: 'cancelVideoFrameCallback',
    signatures: [['handle']]
  },
  {
    name: 'VirtualKeyboardGeometryChangeEvent',
    signatures: [['type']]
  },
  {
    name: 'AnalyserNode',
    signatures: [['context','?options']]
  },
  {
    name: 'AudioBufferSourceNode',
    signatures: [['context','?options']]
  },
  {
    name: 'AudioBuffer',
    signatures: [['options']]
  },
  {
    name: 'AudioContext',
    signatures: [['?contextOptions']]
  },
  {
    name: 'AudioProcessingEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'registerProcessor',
    signatures: [['name','processorCtor']]
  },
  {
    name: 'AudioWorkletNode',
    signatures: [['context','name','?options']]
  },
  {
    name: 'BiquadFilterNode',
    signatures: [['context','?options']]
  },
  {
    name: 'ChannelMergerNode',
    signatures: [['context','?options']]
  },
  {
    name: 'ChannelSplitterNode',
    signatures: [['context','?options']]
  },
  {
    name: 'ConstantSourceNode',
    signatures: [['context','?options']]
  },
  {
    name: 'ConvolverNode',
    signatures: [['context','?options']]
  },
  {
    name: 'DelayNode',
    signatures: [['context','?options']]
  },
  {
    name: 'DynamicsCompressorNode',
    signatures: [['context','?options']]
  },
  {
    name: 'GainNode',
    signatures: [['context','?options']]
  },
  {
    name: 'IIRFilterNode',
    signatures: [['context','options']]
  },
  {
    name: 'MediaElementAudioSourceNode',
    signatures: [['context','options']]
  },
  {
    name: 'MediaStreamAudioDestinationNode',
    signatures: [['context','?options']]
  },
  {
    name: 'MediaStreamAudioSourceNode',
    signatures: [['context','options']]
  },
  {
    name: 'OfflineAudioCompletionEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'OfflineAudioContext',
    signatures: [['options'],['numberOfChannels','numberOfFrames','sampleRate']]
  },
  {
    name: 'OscillatorNode',
    signatures: [['context','?options']]
  },
  {
    name: 'PannerNode',
    signatures: [['context','?options']]
  },
  {
    name: 'PeriodicWave',
    signatures: [['context','?options']]
  },
  {
    name: 'StereoPannerNode',
    signatures: [['context','?options']]
  },
  {
    name: 'WaveShaperNode',
    signatures: [['context','?options']]
  },
  {
    name: 'AudioData',
    signatures: [['init']]
  },
  {
    name: 'allocationSize',
    signatures: [['options']],
    receiver: 'AudioData'
  },
  {
    name: 'allocationSize',
    signatures: [['?options']],
    receiver: 'VideoFrame'
  },
  {
    name: 'AudioDecoder',
    signatures: [['init']]
  },
  {
    name: 'configure',
    signatures: [['config']],
    receiver: 'AudioDecoder'
  },
  {
    name: 'configure',
    signatures: [['config']],
    receiver: 'AudioEncoder'
  },
  {
    name: 'configure',
    signatures: [['config']],
    receiver: 'VideoDecoder'
  },
  {
    name: 'configure',
    signatures: [['config']],
    receiver: 'VideoEncoder'
  },
  {
    name: 'configure',
    signatures: [['descriptor']],
    receiver: 'GPUCanvasContext'
  },
  {
    name: 'AudioEncoder',
    signatures: [['init']]
  },
  {
    name: 'EncodedAudioChunk',
    signatures: [['init']]
  },
  {
    name: 'EncodedVideoChunk',
    signatures: [['init']]
  },
  {
    name: 'ImageDecoder',
    signatures: [['init']]
  },
  {
    name: 'VideoColorSpace',
    signatures: [['?init']]
  },
  {
    name: 'VideoDecoder',
    signatures: [['init']]
  },
  {
    name: 'VideoEncoder',
    signatures: [['init']]
  },
  {
    name: 'VideoFrame',
    signatures: [['source','?init'],['data','init']]
  },
  {
    name: 'changeVersion',
    signatures: [['oldVersion','newVersion','?callback','?errorCallback','?successCallback']]
  },
  {
    name: 'readTransaction',
    signatures: [['callback','?errorCallback','?successCallback']]
  },
  {
    name: 'executeSql',
    signatures: [['sqlStatement','?arguments','?callback','?errorCallback']]
  },
  {
    name: 'openDatabase',
    signatures: [['name','version','displayName','estimatedSize','?creationCallback']]
  },
  {
    name: 'queryCounterEXT',
    signatures: [['query','target']]
  },
  {
    name: 'deleteQueryEXT',
    signatures: [['query']]
  },
  {
    name: 'isQueryEXT',
    signatures: [['query']]
  },
  {
    name: 'beginQueryEXT',
    signatures: [['target','query']]
  },
  {
    name: 'endQueryEXT',
    signatures: [['target']]
  },
  {
    name: 'getQueryEXT',
    signatures: [['target','pname']]
  },
  {
    name: 'getQueryObjectEXT',
    signatures: [['query','pname']]
  },
  {
    name: 'enableiOES',
    signatures: [['target','index']]
  },
  {
    name: 'disableiOES',
    signatures: [['target','index']]
  },
  {
    name: 'blendEquationiOES',
    signatures: [['buf','mode']]
  },
  {
    name: 'blendEquationSeparateiOES',
    signatures: [['buf','modeRGB','modeAlpha']]
  },
  {
    name: 'blendFunciOES',
    signatures: [['buf','src','dst']]
  },
  {
    name: 'blendFuncSeparateiOES',
    signatures: [['buf','srcRGB','dstRGB','srcAlpha','dstAlpha']]
  },
  {
    name: 'colorMaskiOES',
    signatures: [['buf','r','g','b','a']]
  },
  {
    name: 'isEnablediOES',
    signatures: [['target','index']]
  },
  {
    name: 'WebGLContextEvent',
    signatures: [['type','?eventInit']]
  },
  {
    name: 'drawArraysInstancedBaseInstanceWEBGL',
    signatures: [['mode','first','count','instance_count','baseinstance']]
  },
  {
    name: 'drawElementsInstancedBaseVertexBaseInstanceWEBGL',
    signatures: [['mode','count','type','offset','instance_count','basevertex','baseinstance']]
  },
  {
    name: 'multiDrawArraysInstancedBaseInstanceWEBGL',
    signatures: [['mode','firstsList','firstsOffset','countsList','countsOffset','instanceCountsList','instanceCountsOffset','baseInstancesList','baseInstancesOffset','drawcount']]
  },
  {
    name: 'multiDrawElementsInstancedBaseVertexBaseInstanceWEBGL',
    signatures: [['mode','countsList','countsOffset','type','offsetsList','offsetsOffset','instanceCountsList','instanceCountsOffset','baseVerticesList','baseVerticesOffset','baseInstancesList','baseInstancesOffset','drawcount']]
  },
  {
    name: 'drawingBufferStorage',
    signatures: [['sizedformat','width','height']]
  },
  {
    name: 'shareVideoImageWEBGL',
    signatures: [['target','video']]
  },
  {
    name: 'releaseVideoImageWEBGL',
    signatures: [['target']]
  },
  {
    name: 'importVideoFrame',
    signatures: [['videoFrame']]
  },
  {
    name: 'releaseVideoFrame',
    signatures: [['handle']]
  },
  {
    name: 'mapAsync',
    signatures: [['mode','?offset','?size']]
  },
  {
    name: 'getMappedRange',
    signatures: [['?offset','?size']]
  },
  {
    name: 'getPreferredFormat',
    signatures: [['adapter']]
  },
  {
    name: 'beginRenderPass',
    signatures: [['descriptor']]
  },
  {
    name: 'beginComputePass',
    signatures: [['?descriptor']]
  },
  {
    name: 'copyBufferToBuffer',
    signatures: [['src','srcOffset','dst','dstOffset','size']]
  },
  {
    name: 'copyBufferToTexture',
    signatures: [['source','destination','copySize']]
  },
  {
    name: 'copyTextureToBuffer',
    signatures: [['source','destination','copySize']]
  },
  {
    name: 'copyTextureToTexture',
    signatures: [['source','destination','copySize']]
  },
  {
    name: 'pushDebugGroup',
    signatures: [['groupLabel']]
  },
  {
    name: 'insertDebugMarker',
    signatures: [['markerLabel']]
  },
  {
    name: 'resolveQuerySet',
    signatures: [['querySet','firstQuery','queryCount','destination','destinationOffset']]
  },
  {
    name: 'writeTimestamp',
    signatures: [['querySet','queryIndex']]
  },
  {
    name: 'clearBuffer',
    signatures: [['buffer','?offset','?size']]
  },
  {
    name: 'setPipeline',
    signatures: [['pipeline']]
  },
  {
    name: 'dispatchWorkgroups',
    signatures: [['workgroupCountX','?workgroupCountY','?workgroupCountZ']]
  },
  {
    name: 'dispatchWorkgroupsIndirect',
    signatures: [['indirectBuffer','indirectOffset']]
  },
  {
    name: 'dispatch',
    signatures: [['workgroupCountX','?workgroupCountY','?workgroupCountZ']]
  },
  {
    name: 'dispatchIndirect',
    signatures: [['indirectBuffer','indirectOffset']]
  },
  {
    name: 'experimentalImportTexture',
    signatures: [['canvas','usage']]
  },
  {
    name: 'importExternalTexture',
    signatures: [['descriptor']]
  },
  {
    name: 'createBindGroup',
    signatures: [['descriptor']]
  },
  {
    name: 'createBindGroupLayout',
    signatures: [['descriptor']]
  },
  {
    name: 'createPipelineLayout',
    signatures: [['descriptor']]
  },
  {
    name: 'createShaderModule',
    signatures: [['descriptor']]
  },
  {
    name: 'createRenderPipeline',
    signatures: [['descriptor']]
  },
  {
    name: 'createComputePipeline',
    signatures: [['descriptor']]
  },
  {
    name: 'createRenderPipelineAsync',
    signatures: [['descriptor']]
  },
  {
    name: 'createComputePipelineAsync',
    signatures: [['descriptor']]
  },
  {
    name: 'createCommandEncoder',
    signatures: [['?descriptor']]
  },
  {
    name: 'createRenderBundleEncoder',
    signatures: [['descriptor']]
  },
  {
    name: 'createQuerySet',
    signatures: [['descriptor']]
  },
  {
    name: 'pushErrorScope',
    signatures: [['filter']]
  },
  {
    name: 'GPUOutOfMemoryError',
    signatures: [['message']]
  },
  {
    name: 'getBindGroupLayout',
    signatures: [['index']]
  },
  {
    name: 'setBindGroup',
    signatures: [['index','bindGroup','?dynamicOffsets'],['index','bindGroup','dynamicOffsetsData','dynamicOffsetsDataStart','dynamicOffsetsDataLength']]
  },
  {
    name: 'writeBuffer',
    signatures: [['buffer','bufferOffset','data','?dataElementOffset','?dataElementCount'],['buffer','bufferOffset','data','?dataByteOffset','?byteSize']]
  },
  {
    name: 'writeTexture',
    signatures: [['destination','data','dataLayout','size']]
  },
  {
    name: 'copyExternalImageToTexture',
    signatures: [['source','destination','copySize']]
  },
  {
    name: 'setIndexBuffer',
    signatures: [['buffer','format','?offset','?size']]
  },
  {
    name: 'setVertexBuffer',
    signatures: [['slot','buffer','?offset','?size']]
  },
  {
    name: 'draw',
    signatures: [['vertexCount','?instanceCount','?firstVertex','?firstInstance']]
  },
  {
    name: 'drawIndexed',
    signatures: [['indexCount','?instanceCount','?firstIndex','?baseVertex','?firstInstance']]
  },
  {
    name: 'drawIndirect',
    signatures: [['indirectBuffer','indirectOffset']]
  },
  {
    name: 'drawIndexedIndirect',
    signatures: [['indirectBuffer','indirectOffset']]
  },
  {
    name: 'setViewport',
    signatures: [['x','y','width','height','minDepth','maxDepth']]
  },
  {
    name: 'setScissorRect',
    signatures: [['x','y','width','height']]
  },
  {
    name: 'setBlendConstant',
    signatures: [['color']]
  },
  {
    name: 'setStencilReference',
    signatures: [['reference']]
  },
  {
    name: 'executeBundles',
    signatures: [['bundles']]
  },
  {
    name: 'beginOcclusionQuery',
    signatures: [['queryIndex']]
  },
  {
    name: 'createView',
    signatures: [['?descriptor']]
  },
  {
    name: 'GPUUncapturedErrorEvent',
    signatures: [['type','gpuUncapturedErrorEventInitDict']]
  },
  {
    name: 'GPUValidationError',
    signatures: [['message']]
  },
  {
    name: 'requestAdapter',
    signatures: [['?options']]
  },
  {
    name: 'MIDIConnectionEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'MIDIMessageEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'requestMIDIAccess',
    signatures: [['?options']]
  },
  {
    name: 'CloseEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'WebSocketStream',
    signatures: [['url','?options']]
  },
  {
    name: 'WebSocket',
    signatures: [['url','?protocols']]
  },
  {
    name: 'WebTransportError',
    signatures: [['?init']]
  },
  {
    name: 'WebTransport',
    signatures: [['url','?options']]
  },
  {
    name: 'USBAlternateInterface',
    signatures: [['deviceInterface','alternateSetting']]
  },
  {
    name: 'USBConfiguration',
    signatures: [['device','configurationValue']]
  },
  {
    name: 'USBConnectionEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'selectConfiguration',
    signatures: [['configurationValue']]
  },
  {
    name: 'claimInterface',
    signatures: [['interfaceNumber']]
  },
  {
    name: 'releaseInterface',
    signatures: [['interfaceNumber']]
  },
  {
    name: 'selectAlternateInterface',
    signatures: [['interfaceNumber','alternateSetting']]
  },
  {
    name: 'controlTransferIn',
    signatures: [['setup','length']]
  },
  {
    name: 'controlTransferOut',
    signatures: [['setup','?data']]
  },
  {
    name: 'clearHalt',
    signatures: [['direction','endpointNumber']]
  },
  {
    name: 'transferIn',
    signatures: [['endpointNumber','length']]
  },
  {
    name: 'transferOut',
    signatures: [['endpointNumber','data']]
  },
  {
    name: 'isochronousTransferIn',
    signatures: [['endpointNumber','packetLengths']]
  },
  {
    name: 'isochronousTransferOut',
    signatures: [['endpointNumber','data','packetLengths']]
  },
  {
    name: 'USBEndpoint',
    signatures: [['alternate','endpointNumber','direction']]
  },
  {
    name: 'USBInTransferResult',
    signatures: [['status','?data']]
  },
  {
    name: 'USBInterface',
    signatures: [['configuration','interfaceNumber']]
  },
  {
    name: 'USBIsochronousInTransferPacket',
    signatures: [['status','?data']]
  },
  {
    name: 'USBIsochronousInTransferResult',
    signatures: [['packets','?data']]
  },
  {
    name: 'USBIsochronousOutTransferPacket',
    signatures: [['status','?bytesWritten']]
  },
  {
    name: 'USBIsochronousOutTransferResult',
    signatures: [['packets']]
  },
  {
    name: 'USBOutTransferResult',
    signatures: [['status','?bytesWritten']]
  },
  {
    name: 'WindowControlsOverlayGeometryChangeEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'getPose',
    signatures: [['relative_to']]
  },
  {
    name: 'XRInputSourceEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'XRInputSourcesChangeEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'XRRay',
    signatures: [['transform'],['?origin','?direction']]
  },
  {
    name: 'XRReferenceSpaceEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'getOffsetReferenceSpace',
    signatures: [['originOffset']]
  },
  {
    name: 'XRRigidTransform',
    signatures: [['?position','?orientation']]
  },
  {
    name: 'XRSessionEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'supportsSession',
    signatures: [['mode']]
  },
  {
    name: 'isSessionSupported',
    signatures: [['mode']]
  },
  {
    name: 'requestSession',
    signatures: [['mode','?options']]
  },
  {
    name: 'XRWebGLBinding',
    signatures: [['session','context']]
  },
  {
    name: 'getReflectionCubeMap',
    signatures: [['lightProbe']]
  },
  {
    name: 'getCameraImage',
    signatures: [['camera']]
  },
  {
    name: 'getDepthInformation',
    signatures: [['view']]
  },
  {
    name: 'XRWebGLLayer',
    signatures: [['session','context','?layerInit']]
  },
  {
    name: 'getViewport',
    signatures: [['view']]
  }
];
