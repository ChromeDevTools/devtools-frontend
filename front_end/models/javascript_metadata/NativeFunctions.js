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
    name: 'toString',
    signatures: [['?radix']],
    receiver: 'BigInt'
  },
  {
    name: 'get',
    signatures: [['key']],
    receiver: 'Map'
  },
  {
    name: 'get',
    signatures: [['key']],
    receiver: 'ReadonlyMap'
  },
  {
    name: 'get',
    signatures: [['key']],
    receiver: 'WeakMap'
  },
  {
    name: 'get',
    signatures: [['target','p','receiver']],
    receiver: 'ProxyHandler'
  },
  {
    name: 'get',
    signatures: [['property']],
    receiver: 'StylePropertyMapReadOnly'
  },
  {
    name: 'get',
    signatures: [['key']],
    receiver: 'Headers'
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
    signatures: [['name']],
    receiver: 'URLSearchParams'
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
    signatures: [['?options']],
    receiver: 'CredentialsContainer'
  },
  {
    name: 'get',
    signatures: [['keyId']],
    receiver: 'MediaKeyStatusMap'
  },
  {
    name: 'get',
    signatures: [['key']],
    receiver: 'IDBIndex'
  },
  {
    name: 'get',
    signatures: [['key']],
    receiver: 'IDBObjectStore'
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
    signatures: [['key','value']],
    receiver: 'Map'
  },
  {
    name: 'set',
    signatures: [['key','value']],
    receiver: 'WeakMap'
  },
  {
    name: 'set',
    signatures: [['target','p','value','receiver']],
    receiver: 'ProxyHandler'
  },
  {
    name: 'set',
    signatures: [['array','?offset']],
    receiver: 'BigInt64Array'
  },
  {
    name: 'set',
    signatures: [['array','?offset']],
    receiver: 'BigUint64Array'
  },
  {
    name: 'set',
    signatures: [['property','...values']],
    receiver: 'StylePropertyMap'
  },
  {
    name: 'set',
    signatures: [['key','value']],
    receiver: 'Headers'
  },
  {
    name: 'set',
    signatures: [['name','value','?filename']],
    receiver: 'FormData'
  },
  {
    name: 'set',
    signatures: [['name','value']],
    receiver: 'URLSearchParams'
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
    name: 'toLocaleString',
    signatures: [['?locales','?options']],
    receiver: 'BigInt'
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
    signatures: [['o']],
    static: true,
    receiver: 'Object'
  },
  {
    name: 'getPrototypeOf',
    signatures: [['target']],
    receiver: 'ProxyHandler'
  },
  {
    name: 'getOwnPropertyDescriptor',
    signatures: [['o','p']],
    static: true,
    receiver: 'Object'
  },
  {
    name: 'getOwnPropertyDescriptor',
    signatures: [['target','p']],
    receiver: 'ProxyHandler'
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
    signatures: [['o','p','attributes']],
    static: true,
    receiver: 'Object'
  },
  {
    name: 'defineProperty',
    signatures: [['target','p','attributes']],
    receiver: 'ProxyHandler'
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
    signatures: [['o']],
    static: true,
    receiver: 'Object'
  },
  {
    name: 'preventExtensions',
    signatures: [['target']],
    receiver: 'ProxyHandler'
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
    signatures: [['o']],
    static: true,
    receiver: 'Object'
  },
  {
    name: 'isExtensible',
    signatures: [['target']],
    receiver: 'ProxyHandler'
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
    name: 'apply',
    signatures: [['target','thisArg','argArray']],
    receiver: 'ProxyHandler'
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
    name: 'indexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'BigInt64Array'
  },
  {
    name: 'indexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'BigUint64Array'
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
    name: 'lastIndexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'BigInt64Array'
  },
  {
    name: 'lastIndexOf',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'BigUint64Array'
  },
  {
    name: 'localeCompare',
    signatures: [['that','?locales','?options']]
  },
  {
    name: 'match',
    signatures: [['regexp'],['matcher']],
    receiver: 'String'
  },
  {
    name: 'match',
    signatures: [['request','?options']],
    receiver: 'BackgroundFetchRegistration'
  },
  {
    name: 'match',
    signatures: [['request','?options']],
    receiver: 'CacheStorage'
  },
  {
    name: 'match',
    signatures: [['request','?options']],
    receiver: 'Cache'
  },
  {
    name: 'replace',
    signatures: [['searchValue','replaceValue'],['searchValue','replacer']],
    receiver: 'String'
  },
  {
    name: 'replace',
    signatures: [['text']],
    receiver: 'CSSStyleSheet'
  },
  {
    name: 'replace',
    signatures: [['token','newToken']],
    receiver: 'DOMTokenList'
  },
  {
    name: 'search',
    signatures: [['regexp'],['searcher']]
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
    signatures: [['begin','?end']],
    receiver: 'SharedArrayBuffer'
  },
  {
    name: 'slice',
    signatures: [['?start','?end']],
    receiver: 'BigInt64Array'
  },
  {
    name: 'slice',
    signatures: [['?start','?end']],
    receiver: 'BigUint64Array'
  },
  {
    name: 'slice',
    signatures: [['?start','?end','?contentType']],
    receiver: 'Blob'
  },
  {
    name: 'split',
    signatures: [['separator','?limit'],['splitter','?limit']]
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
    name: 'sort',
    signatures: [['?compareFn']],
    receiver: 'BigInt64Array'
  },
  {
    name: 'sort',
    signatures: [['?compareFn']],
    receiver: 'BigUint64Array'
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
    signatures: [['value','?start','?end']],
    receiver: 'Array'
  },
  {
    name: 'fill',
    signatures: [['value','?start','?end']],
    receiver: 'BigInt64Array'
  },
  {
    name: 'fill',
    signatures: [['value','?start','?end']],
    receiver: 'BigUint64Array'
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
    signatures: [['predicate','?thisArg']],
    receiver: 'Array'
  },
  {
    name: 'find',
    signatures: [['predicate','?thisArg']],
    receiver: 'ReadonlyArray'
  },
  {
    name: 'find',
    signatures: [['predicate','?thisArg']],
    receiver: 'BigInt64Array'
  },
  {
    name: 'find',
    signatures: [['predicate','?thisArg']],
    receiver: 'BigUint64Array'
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
    signatures: [['arrayLike','?mapfn','?thisArg']],
    static: true,
    receiver: 'Int8Array'
  },
  {
    name: 'from',
    signatures: [['arrayLike','?mapfn','?thisArg']],
    static: true,
    receiver: 'Uint8Array'
  },
  {
    name: 'from',
    signatures: [['arrayLike','?mapfn','?thisArg']],
    static: true,
    receiver: 'Uint8ClampedArray'
  },
  {
    name: 'from',
    signatures: [['arrayLike','?mapfn','?thisArg']],
    static: true,
    receiver: 'Int16Array'
  },
  {
    name: 'from',
    signatures: [['arrayLike','?mapfn','?thisArg']],
    static: true,
    receiver: 'Uint16Array'
  },
  {
    name: 'from',
    signatures: [['arrayLike','?mapfn','?thisArg']],
    static: true,
    receiver: 'Int32Array'
  },
  {
    name: 'from',
    signatures: [['arrayLike','?mapfn','?thisArg']],
    static: true,
    receiver: 'Uint32Array'
  },
  {
    name: 'from',
    signatures: [['arrayLike','?mapfn','?thisArg']],
    static: true,
    receiver: 'Float32Array'
  },
  {
    name: 'from',
    signatures: [['arrayLike','?mapfn','?thisArg']],
    static: true,
    receiver: 'Float64Array'
  },
  {
    name: 'from',
    signatures: [['arrayLike','?mapfn','?thisArg'],['iterable','?mapfn','?thisArg']],
    static: true,
    receiver: 'Array'
  },
  {
    name: 'from',
    signatures: [['arrayLike','?mapfn','?thisArg']],
    static: true,
    receiver: 'BigInt64Array'
  },
  {
    name: 'from',
    signatures: [['arrayLike','?mapfn','?thisArg']],
    static: true,
    receiver: 'BigUint64Array'
  },
  {
    name: 'clz32',
    signatures: [['x']]
  },
  {
    name: 'imul',
    signatures: [['x','y']]
  },
  {
    name: 'sign',
    signatures: [['x']],
    receiver: 'Math'
  },
  {
    name: 'sign',
    signatures: [['algorithm','key','data']],
    receiver: 'SubtleCrypto'
  },
  {
    name: 'log10',
    signatures: [['x']]
  },
  {
    name: 'log2',
    signatures: [['x']]
  },
  {
    name: 'log1p',
    signatures: [['x']]
  },
  {
    name: 'expm1',
    signatures: [['x']]
  },
  {
    name: 'cosh',
    signatures: [['x']]
  },
  {
    name: 'sinh',
    signatures: [['x']]
  },
  {
    name: 'tanh',
    signatures: [['x']]
  },
  {
    name: 'acosh',
    signatures: [['x']]
  },
  {
    name: 'asinh',
    signatures: [['x']]
  },
  {
    name: 'atanh',
    signatures: [['x']]
  },
  {
    name: 'hypot',
    signatures: [['...values']]
  },
  {
    name: 'trunc',
    signatures: [['x']]
  },
  {
    name: 'fround',
    signatures: [['x']]
  },
  {
    name: 'cbrt',
    signatures: [['x']]
  },
  {
    name: 'isInteger',
    signatures: [['number']]
  },
  {
    name: 'isSafeInteger',
    signatures: [['number']]
  },
  {
    name: 'assign',
    signatures: [['target','source'],['target','...sources'],['target','source1','source2','?source3']],
    static: true,
    receiver: 'Object'
  },
  {
    name: 'assign',
    signatures: [['...nodes']],
    receiver: 'HTMLSlotElement'
  },
  {
    name: 'getOwnPropertySymbols',
    signatures: [['o']]
  },
  {
    name: 'is',
    signatures: [['value1','value2']]
  },
  {
    name: 'setPrototypeOf',
    signatures: [['o','proto']],
    static: true,
    receiver: 'Object'
  },
  {
    name: 'setPrototypeOf',
    signatures: [['target','v']],
    receiver: 'ProxyHandler'
  },
  {
    name: 'codePointAt',
    signatures: [['pos']]
  },
  {
    name: 'includes',
    signatures: [['searchString','?position']],
    receiver: 'String'
  },
  {
    name: 'includes',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Array'
  },
  {
    name: 'includes',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'ReadonlyArray'
  },
  {
    name: 'includes',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Int8Array'
  },
  {
    name: 'includes',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Uint8Array'
  },
  {
    name: 'includes',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Uint8ClampedArray'
  },
  {
    name: 'includes',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Int16Array'
  },
  {
    name: 'includes',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Uint16Array'
  },
  {
    name: 'includes',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Int32Array'
  },
  {
    name: 'includes',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Uint32Array'
  },
  {
    name: 'includes',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Float32Array'
  },
  {
    name: 'includes',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'Float64Array'
  },
  {
    name: 'includes',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'BigInt64Array'
  },
  {
    name: 'includes',
    signatures: [['searchElement','?fromIndex']],
    receiver: 'BigUint64Array'
  },
  {
    name: 'endsWith',
    signatures: [['searchString','?endPosition']]
  },
  {
    name: 'normalize',
    signatures: [['?form']],
    receiver: 'String'
  },
  {
    name: 'repeat',
    signatures: [['count']]
  },
  {
    name: 'startsWith',
    signatures: [['searchString','?position']]
  },
  {
    name: 'anchor',
    signatures: [['name']]
  },
  {
    name: 'fontcolor',
    signatures: [['color']]
  },
  {
    name: 'fontsize',
    signatures: [['size']]
  },
  {
    name: 'link',
    signatures: [['url']]
  },
  {
    name: 'sub',
    signatures: [['typedArray','index','value']],
    receiver: 'Atomics'
  },
  {
    name: 'sub',
    signatures: [['...values']],
    receiver: 'CSSNumericValue'
  },
  {
    name: 'fromCodePoint',
    signatures: [['...codePoints']]
  },
  {
    name: 'raw',
    signatures: [['template','...substitutions']]
  },
  {
    name: 'clear',
    signatures: [['mask']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'delete',
    signatures: [['key']],
    receiver: 'Map'
  },
  {
    name: 'delete',
    signatures: [['key']],
    receiver: 'WeakMap'
  },
  {
    name: 'delete',
    signatures: [['value']],
    receiver: 'Set'
  },
  {
    name: 'delete',
    signatures: [['value']],
    receiver: 'WeakSet'
  },
  {
    name: 'delete',
    signatures: [['property']],
    receiver: 'StylePropertyMap'
  },
  {
    name: 'delete',
    signatures: [['key']],
    receiver: 'Headers'
  },
  {
    name: 'delete',
    signatures: [['name']],
    receiver: 'FormData'
  },
  {
    name: 'delete',
    signatures: [['name']],
    receiver: 'URLSearchParams'
  },
  {
    name: 'delete',
    signatures: [['name']],
    receiver: 'StorageBucketManager'
  },
  {
    name: 'delete',
    signatures: [['cacheName']],
    receiver: 'CacheStorage'
  },
  {
    name: 'delete',
    signatures: [['request','?options']],
    receiver: 'Cache'
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
    signatures: [['key']],
    receiver: 'IDBObjectStore'
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
    name: 'has',
    signatures: [['key']],
    receiver: 'Map'
  },
  {
    name: 'has',
    signatures: [['key']],
    receiver: 'ReadonlyMap'
  },
  {
    name: 'has',
    signatures: [['key']],
    receiver: 'WeakMap'
  },
  {
    name: 'has',
    signatures: [['value']],
    receiver: 'Set'
  },
  {
    name: 'has',
    signatures: [['value']],
    receiver: 'ReadonlySet'
  },
  {
    name: 'has',
    signatures: [['value']],
    receiver: 'WeakSet'
  },
  {
    name: 'has',
    signatures: [['target','p']],
    receiver: 'ProxyHandler'
  },
  {
    name: 'has',
    signatures: [['property']],
    receiver: 'StylePropertyMapReadOnly'
  },
  {
    name: 'has',
    signatures: [['key']],
    receiver: 'Headers'
  },
  {
    name: 'has',
    signatures: [['name']],
    receiver: 'FormData'
  },
  {
    name: 'has',
    signatures: [['name']],
    receiver: 'URLSearchParams'
  },
  {
    name: 'has',
    signatures: [['cacheName']],
    receiver: 'CacheStorage'
  },
  {
    name: 'has',
    signatures: [['keyId']],
    receiver: 'MediaKeyStatusMap'
  },
  {
    name: 'has',
    signatures: [['instrumentKey']],
    receiver: 'PaymentInstruments'
  },
  {
    name: 'add',
    signatures: [['value']],
    receiver: 'Set'
  },
  {
    name: 'add',
    signatures: [['value']],
    receiver: 'WeakSet'
  },
  {
    name: 'add',
    signatures: [['typedArray','index','value']],
    receiver: 'Atomics'
  },
  {
    name: 'add',
    signatures: [['node','?before']],
    receiver: 'AccessibleNodeList'
  },
  {
    name: 'add',
    signatures: [['file'],['data','type']],
    receiver: 'DataTransferItemList'
  },
  {
    name: 'add',
    signatures: [['...values']],
    receiver: 'CSSNumericValue'
  },
  {
    name: 'add',
    signatures: [['...tokens']],
    receiver: 'DOMTokenList'
  },
  {
    name: 'add',
    signatures: [['key']],
    receiver: 'CustomStateSet'
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
    signatures: [['request']],
    receiver: 'Cache'
  },
  {
    name: 'add',
    signatures: [['description']],
    receiver: 'ContentIndex'
  },
  {
    name: 'add',
    signatures: [['value','?key']],
    receiver: 'IDBObjectStore'
  },
  {
    name: 'add',
    signatures: [['install_url']],
    receiver: 'SubApps'
  },
  {
    name: 'next',
    signatures: [['...args']],
    receiver: 'Generator'
  },
  {
    name: 'next',
    signatures: [['...args'],['?value']],
    receiver: 'Iterator'
  },
  {
    name: 'next',
    signatures: [['...args']],
    receiver: 'AsyncGenerator'
  },
  {
    name: 'next',
    signatures: [['...args']],
    receiver: 'AsyncIterator'
  },
  {
    name: 'return',
    signatures: [['value']],
    receiver: 'Generator'
  },
  {
    name: 'return',
    signatures: [['?value']],
    receiver: 'Iterator'
  },
  {
    name: 'return',
    signatures: [['value']],
    receiver: 'AsyncGenerator'
  },
  {
    name: 'return',
    signatures: [['?value']],
    receiver: 'AsyncIterator'
  },
  {
    name: 'throw',
    signatures: [['e']],
    receiver: 'Generator'
  },
  {
    name: 'throw',
    signatures: [['?e']],
    receiver: 'Iterator'
  },
  {
    name: 'throw',
    signatures: [['e']],
    receiver: 'AsyncGenerator'
  },
  {
    name: 'throw',
    signatures: [['?e']],
    receiver: 'AsyncIterator'
  },
  {
    name: 'entries',
    signatures: [['o']],
    static: true,
    receiver: 'Object'
  },
  {
    name: 'values',
    signatures: [['o']],
    static: true,
    receiver: 'Object'
  },
  {
    name: 'all',
    signatures: [['values']]
  },
  {
    name: 'race',
    signatures: [['values']]
  },
  {
    name: 'reject',
    signatures: [['?reason']]
  },
  {
    name: 'resolve',
    signatures: [['?value']],
    static: true,
    receiver: 'Promise'
  },
  {
    name: 'resolve',
    signatures: [['possibleChild']],
    receiver: 'FileSystemDirectoryHandle'
  },
  {
    name: 'construct',
    signatures: [['target','argArray','newTarget']]
  },
  {
    name: 'deleteProperty',
    signatures: [['target','p']]
  },
  {
    name: 'ownKeys',
    signatures: [['target']]
  },
  {
    name: 'revocable',
    signatures: [['target','handler']]
  },
  {
    name: 'for',
    signatures: [['key']]
  },
  {
    name: 'keyFor',
    signatures: [['sym']]
  },
  {
    name: 'getOwnPropertyDescriptors',
    signatures: [['o']]
  },
  {
    name: 'and',
    signatures: [['typedArray','index','value']]
  },
  {
    name: 'compareExchange',
    signatures: [['typedArray','index','expectedValue','replacementValue']]
  },
  {
    name: 'exchange',
    signatures: [['typedArray','index','value']]
  },
  {
    name: 'isLockFree',
    signatures: [['size']]
  },
  {
    name: 'load',
    signatures: [['typedArray','index']],
    receiver: 'Atomics'
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
    name: 'or',
    signatures: [['typedArray','index','value']]
  },
  {
    name: 'store',
    signatures: [['typedArray','index','value']],
    receiver: 'Atomics'
  },
  {
    name: 'store',
    signatures: [['credential']],
    receiver: 'CredentialsContainer'
  },
  {
    name: 'wait',
    signatures: [['typedArray','index','value','?timeout']]
  },
  {
    name: 'notify',
    signatures: [['typedArray','index','?count']]
  },
  {
    name: 'xor',
    signatures: [['typedArray','index','value']]
  },
  {
    name: 'padStart',
    signatures: [['maxLength','?fillString']]
  },
  {
    name: 'padEnd',
    signatures: [['maxLength','?fillString']]
  },
  {
    name: 'finally',
    signatures: [['?onfinally']]
  },
  {
    name: 'flatMap',
    signatures: [['callback','?thisArg']]
  },
  {
    name: 'flat',
    signatures: [['?depth']]
  },
  {
    name: 'fromEntries',
    signatures: [['entries']]
  },
  {
    name: 'asIntN',
    signatures: [['bits','int']]
  },
  {
    name: 'asUintN',
    signatures: [['bits','int']]
  },
  {
    name: 'getBigInt64',
    signatures: [['byteOffset','?littleEndian']]
  },
  {
    name: 'getBigUint64',
    signatures: [['byteOffset','?littleEndian']]
  },
  {
    name: 'setBigInt64',
    signatures: [['byteOffset','value','?littleEndian']]
  },
  {
    name: 'setBigUint64',
    signatures: [['byteOffset','value','?littleEndian']]
  },
  {
    name: 'allSettled',
    signatures: [['values']]
  },
  {
    name: 'matchAll',
    signatures: [['regexp']],
    receiver: 'String'
  },
  {
    name: 'matchAll',
    signatures: [['?request','?options']],
    receiver: 'BackgroundFetchRegistration'
  },
  {
    name: 'matchAll',
    signatures: [['?request','?options']],
    receiver: 'Cache'
  },
  {
    name: 'matchAll',
    signatures: [['?options']],
    receiver: 'Clients'
  },
  {
    name: 'any',
    signatures: [['values']]
  },
  {
    name: 'replaceAll',
    signatures: [['searchValue','replaceValue'],['searchValue','replacer']]
  },
  {
    name: 'register',
    signatures: [['target','heldValue','?unregisterToken']],
    receiver: 'FinalizationRegistry'
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
    name: 'register',
    signatures: [['url','?options']],
    receiver: 'ServiceWorkerContainer'
  },
  {
    name: 'unregister',
    signatures: [['unregisterToken']],
    receiver: 'FinalizationRegistry'
  },
  {
    name: 'unregister',
    signatures: [['tag']],
    receiver: 'PeriodicSyncManager'
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
    name: 'assert',
    signatures: [['?condition','...data']]
  },
  {
    name: 'debug',
    signatures: [['...data']]
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
    name: 'info',
    signatures: [['...data']]
  },
  {
    name: 'table',
    signatures: [['?tabularData','?properties']]
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
    name: 'dir',
    signatures: [['?item','?options']]
  },
  {
    name: 'dirxml',
    signatures: [['...data']]
  },
  {
    name: 'count',
    signatures: [['?label']],
    receiver: 'console'
  },
  {
    name: 'count',
    signatures: [['?key']],
    receiver: 'IDBIndex'
  },
  {
    name: 'count',
    signatures: [['?key']],
    receiver: 'IDBObjectStore'
  },
  {
    name: 'countReset',
    signatures: [['?label']]
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
    name: 'time',
    signatures: [['?label']]
  },
  {
    name: 'timeLog',
    signatures: [['?label','...data']]
  },
  {
    name: 'timeEnd',
    signatures: [['?label']]
  },
  {
    name: 'updateTiming',
    signatures: [['?timing']]
  },
  {
    name: 'Animation',
    signatures: [['?effect','?timeline']]
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
    signatures: [['playback_rate']]
  },
  {
    name: 'cancel',
    signatures: [['?reason']],
    receiver: 'ReadableStreamGenericReader'
  },
  {
    name: 'cancel',
    signatures: [['?reason']],
    receiver: 'ReadableStream'
  },
  {
    name: 'cancel',
    signatures: [['?reason']],
    receiver: 'UnderlyingSourceBase'
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
    name: 'setKeyframes',
    signatures: [['keyframes']]
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
    name: 'item',
    signatures: [['index']],
    receiver: 'AccessibleNodeList'
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
    receiver: 'MediaList'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'StyleSheetList'
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
    receiver: 'FileList'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'DOMRectList'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'HTMLSelectElement'
  },
  {
    name: 'item',
    signatures: [['?nameOrIndex']],
    receiver: 'HTMLAllCollection'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'HTMLCollection'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'TouchList'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'MimeTypeArray'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'PluginArray'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'Plugin'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'SpeechGrammarList'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'SpeechRecognitionResultList'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'SpeechRecognitionResult'
  },
  {
    name: 'item',
    signatures: [['index']],
    receiver: 'SQLResultSetRowList'
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
    name: 'remove',
    signatures: [['index']],
    receiver: 'AccessibleNodeList'
  },
  {
    name: 'remove',
    signatures: [['index']],
    receiver: 'DataTransferItemList'
  },
  {
    name: 'remove',
    signatures: [['...tokens']],
    receiver: 'DOMTokenList'
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
    signatures: [['start','end']],
    receiver: 'SourceBuffer'
  },
  {
    name: 'appendChild',
    signatures: [['child']],
    receiver: 'AccessibleNode'
  },
  {
    name: 'appendChild',
    signatures: [['node']],
    receiver: 'Node'
  },
  {
    name: 'removeChild',
    signatures: [['child']]
  },
  {
    name: 'AppHistoryCurrentChangeEvent',
    signatures: [['type','eventInit']]
  },
  {
    name: 'AppHistoryNavigateEvent',
    signatures: [['type','eventInit']]
  },
  {
    name: 'transitionWhile',
    signatures: [['newNavigationAction']]
  },
  {
    name: 'updateCurrent',
    signatures: [['options']]
  },
  {
    name: 'navigate',
    signatures: [['url','?options']],
    receiver: 'AppHistory'
  },
  {
    name: 'navigate',
    signatures: [['url']],
    receiver: 'WindowClient'
  },
  {
    name: 'reload',
    signatures: [['?options']]
  },
  {
    name: 'goTo',
    signatures: [['key','?options']]
  },
  {
    name: 'back',
    signatures: [['?options']],
    receiver: 'AppHistory'
  },
  {
    name: 'forward',
    signatures: [['?options']],
    receiver: 'AppHistory'
  },
  {
    name: 'getAsString',
    signatures: [['callback']]
  },
  {
    name: 'setDragImage',
    signatures: [['image','x','y']]
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
    signatures: [['key','data']],
    receiver: 'LockScreenData'
  },
  {
    name: 'clearData',
    signatures: [['?format']]
  },
  {
    name: 'insertRule',
    signatures: [['rule','index']],
    receiver: 'CSSGroupingRule'
  },
  {
    name: 'insertRule',
    signatures: [['rule','?index']],
    receiver: 'CSSStyleSheet'
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
    name: 'appendRule',
    signatures: [['rule']]
  },
  {
    name: 'findRule',
    signatures: [['select']]
  },
  {
    name: 'getPropertyValue',
    signatures: [['property']]
  },
  {
    name: 'getPropertyPriority',
    signatures: [['property']]
  },
  {
    name: 'setProperty',
    signatures: [['property','value','?priority']]
  },
  {
    name: 'removeProperty',
    signatures: [['property']]
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
    name: 'addRule',
    signatures: [['?selector','?style','?index']]
  },
  {
    name: 'removeRule',
    signatures: [['?index']]
  },
  {
    name: 'supports',
    signatures: [['conditionText'],['property','value']],
    receiver: 'CSS'
  },
  {
    name: 'supports',
    signatures: [['token']],
    receiver: 'DOMTokenList'
  },
  {
    name: 'CSSHSL',
    signatures: [['h','s','l','?alpha']]
  },
  {
    name: 'CSSKeywordValue',
    signatures: [['keyword']]
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
    name: 'vmin',
    signatures: [['value']]
  },
  {
    name: 'vmax',
    signatures: [['value']]
  },
  {
    name: 'qw',
    signatures: [['value']]
  },
  {
    name: 'qh',
    signatures: [['value']]
  },
  {
    name: 'qi',
    signatures: [['value']]
  },
  {
    name: 'qb',
    signatures: [['value']]
  },
  {
    name: 'qmin',
    signatures: [['value']]
  },
  {
    name: 'qmax',
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
    name: 'getAll',
    signatures: [['property']],
    receiver: 'StylePropertyMapReadOnly'
  },
  {
    name: 'getAll',
    signatures: [['name']],
    receiver: 'FormData'
  },
  {
    name: 'getAll',
    signatures: [['name']],
    receiver: 'URLSearchParams'
  },
  {
    name: 'getAll',
    signatures: [['name'],['?options']],
    receiver: 'CookieStore'
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
    name: 'append',
    signatures: [['property','...values']],
    receiver: 'StylePropertyMap'
  },
  {
    name: 'append',
    signatures: [['...nodes']],
    receiver: 'ParentNode'
  },
  {
    name: 'append',
    signatures: [['name','value']],
    receiver: 'Headers'
  },
  {
    name: 'append',
    signatures: [['name','value','?filename']],
    receiver: 'FormData'
  },
  {
    name: 'append',
    signatures: [['name','value']],
    receiver: 'URLSearchParams'
  },
  {
    name: 'append',
    signatures: [['key','value']],
    receiver: 'SharedStorage'
  },
  {
    name: 'FontFaceSetLoadEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'check',
    signatures: [['font','?text']]
  },
  {
    name: 'FontFace',
    signatures: [['family','source','?descriptors']]
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
    name: 'MediaQueryListEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'addListener',
    signatures: [['listener']]
  },
  {
    name: 'removeListener',
    signatures: [['listener']]
  },
  {
    name: 'registerProperty',
    signatures: [['definition']]
  },
  {
    name: 'matchMedium',
    signatures: [['?mediaquery']]
  },
  {
    name: 'prepare',
    signatures: [['?options']]
  },
  {
    name: 'start',
    signatures: [['?options']],
    receiver: 'DocumentTransition'
  },
  {
    name: 'start',
    signatures: [['index']],
    receiver: 'TimeRanges'
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
    signatures: [['?timeslice']],
    receiver: 'MediaRecorder'
  },
  {
    name: 'start',
    signatures: [['remoteParameters','?role']],
    receiver: 'RTCIceTransport'
  },
  {
    name: 'start',
    signatures: [['?when','?grainOffset','?grainDuration']],
    receiver: 'AudioBufferSourceNode'
  },
  {
    name: 'start',
    signatures: [['?when']],
    receiver: 'AudioScheduledSourceNode'
  },
  {
    name: 'abort',
    signatures: [['?reason']],
    receiver: 'AbortController'
  },
  {
    name: 'abort',
    signatures: [['reason']],
    receiver: 'UnderlyingSinkBase'
  },
  {
    name: 'abort',
    signatures: [['?reason']],
    receiver: 'WritableStream'
  },
  {
    name: 'substringData',
    signatures: [['offset','count']]
  },
  {
    name: 'appendData',
    signatures: [['data']]
  },
  {
    name: 'insertData',
    signatures: [['offset','data']]
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
    name: 'replaceData',
    signatures: [['offset','count','data']]
  },
  {
    name: 'before',
    signatures: [['...nodes']]
  },
  {
    name: 'after',
    signatures: [['...nodes']]
  },
  {
    name: 'replaceWith',
    signatures: [['...nodes']]
  },
  {
    name: 'Comment',
    signatures: [['?data']]
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
    name: 'getElementsByTagName',
    signatures: [['localName']]
  },
  {
    name: 'getElementsByTagNameNS',
    signatures: [['namespaceURI','localName']]
  },
  {
    name: 'getElementsByClassName',
    signatures: [['classNames']]
  },
  {
    name: 'createElement',
    signatures: [['localName','?options']]
  },
  {
    name: 'createElementNS',
    signatures: [['namespaceURI','qualifiedName','?options']]
  },
  {
    name: 'createTextNode',
    signatures: [['data']]
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
    name: 'createProcessingInstruction',
    signatures: [['target','data']]
  },
  {
    name: 'importNode',
    signatures: [['node','?deep']]
  },
  {
    name: 'adoptNode',
    signatures: [['node']]
  },
  {
    name: 'createAttribute',
    signatures: [['localName']]
  },
  {
    name: 'createAttributeNS',
    signatures: [['namespaceURI','qualifiedName']]
  },
  {
    name: 'createEvent',
    signatures: [['eventType']]
  },
  {
    name: 'createNodeIterator',
    signatures: [['root','?whatToShow','?filter']]
  },
  {
    name: 'createTreeWalker',
    signatures: [['root','?whatToShow','?filter']]
  },
  {
    name: 'getElementsByName',
    signatures: [['elementName']]
  },
  {
    name: 'open',
    signatures: [['?type','?replace'],['url','name','features']],
    receiver: 'Document'
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
    signatures: [['cacheName']],
    receiver: 'CacheStorage'
  },
  {
    name: 'open',
    signatures: [['?options']],
    receiver: 'EyeDropper'
  },
  {
    name: 'open',
    signatures: [['name','?version']],
    receiver: 'IDBFactory'
  },
  {
    name: 'open',
    signatures: [['name']],
    receiver: 'NativeIOFileManager'
  },
  {
    name: 'close',
    signatures: [['?returnValue']],
    receiver: 'HTMLDialogElement'
  },
  {
    name: 'close',
    signatures: [['?closeInfo']],
    receiver: 'WebSocketStream'
  },
  {
    name: 'close',
    signatures: [['?code','?reason']],
    receiver: 'WebSocket'
  },
  {
    name: 'close',
    signatures: [['?closeInfo']],
    receiver: 'WebTransport'
  },
  {
    name: 'write',
    signatures: [['...text'],['text']],
    receiver: 'Document'
  },
  {
    name: 'write',
    signatures: [['chunk','controller']],
    receiver: 'UnderlyingSinkBase'
  },
  {
    name: 'write',
    signatures: [['data']],
    receiver: 'Clipboard'
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
    name: 'writeln',
    signatures: [['...text'],['text']]
  },
  {
    name: 'execCommand',
    signatures: [['commandId','?showUI','?value']]
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
    name: 'caretRangeFromPoint',
    signatures: [['?x','?y']]
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
    name: 'createDocumentType',
    signatures: [['qualifiedName','publicId','systemId']]
  },
  {
    name: 'createDocument',
    signatures: [['namespaceURI','qualifiedName','?doctype']]
  },
  {
    name: 'createHTMLDocument',
    signatures: [['?title']]
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
    name: 'toggle',
    signatures: [['token','?force']]
  },
  {
    name: 'getAttribute',
    signatures: [['name']]
  },
  {
    name: 'getAttributeNS',
    signatures: [['namespaceURI','localName']]
  },
  {
    name: 'setAttribute',
    signatures: [['name','value']]
  },
  {
    name: 'setAttributeNS',
    signatures: [['namespaceURI','name','value']]
  },
  {
    name: 'removeAttribute',
    signatures: [['name']]
  },
  {
    name: 'removeAttributeNS',
    signatures: [['namespaceURI','localName']]
  },
  {
    name: 'toggleAttribute',
    signatures: [['qualifiedName','?force']]
  },
  {
    name: 'hasAttribute',
    signatures: [['name']]
  },
  {
    name: 'hasAttributeNS',
    signatures: [['namespaceURI','localName']]
  },
  {
    name: 'getAttributeNode',
    signatures: [['name']]
  },
  {
    name: 'getAttributeNodeNS',
    signatures: [['namespaceURI','localName']]
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
    name: 'removeAttributeNode',
    signatures: [['attr']]
  },
  {
    name: 'attachShadow',
    signatures: [['shadowRootInitDict']]
  },
  {
    name: 'closest',
    signatures: [['selectors']]
  },
  {
    name: 'matches',
    signatures: [['selectors']]
  },
  {
    name: 'webkitMatchesSelector',
    signatures: [['selectors']]
  },
  {
    name: 'insertAdjacentElement',
    signatures: [['where','element']]
  },
  {
    name: 'insertAdjacentText',
    signatures: [['where','data']]
  },
  {
    name: 'setPointerCapture',
    signatures: [['pointerId']]
  },
  {
    name: 'releasePointerCapture',
    signatures: [['pointerId']]
  },
  {
    name: 'hasPointerCapture',
    signatures: [['pointerId']]
  },
  {
    name: 'insertAdjacentHTML',
    signatures: [['position','text']]
  },
  {
    name: 'getInnerHTML',
    signatures: [['?options']]
  },
  {
    name: 'requestPointerLock',
    signatures: [['?options']]
  },
  {
    name: 'scrollIntoView',
    signatures: [['?arg']]
  },
  {
    name: 'scroll',
    signatures: [['?options'],['x','y']]
  },
  {
    name: 'scrollTo',
    signatures: [['?options'],['x','y']]
  },
  {
    name: 'scrollBy',
    signatures: [['?options'],['x','y']]
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
    name: 'initCustomEvent',
    signatures: [['type','?bubbles','?cancelable','?detail']]
  },
  {
    name: 'addEventListener',
    signatures: [['type','listener','?options']]
  },
  {
    name: 'removeEventListener',
    signatures: [['type','listener','?options']]
  },
  {
    name: 'dispatchEvent',
    signatures: [['event']]
  },
  {
    name: 'Event',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'initEvent',
    signatures: [['type','?bubbles','?cancelable']]
  },
  {
    name: 'MutationObserver',
    signatures: [['callback']]
  },
  {
    name: 'observe',
    signatures: [['target','?options']],
    receiver: 'MutationObserver'
  },
  {
    name: 'observe',
    signatures: [['target']],
    receiver: 'IntersectionObserver'
  },
  {
    name: 'observe',
    signatures: [['target','?options']],
    receiver: 'ResizeObserver'
  },
  {
    name: 'observe',
    signatures: [['?options']],
    receiver: 'PerformanceObserver'
  },
  {
    name: 'disconnect',
    signatures: [['?output'],['destination','?output','?input']],
    receiver: 'AudioNode'
  },
  {
    name: 'getNamedItem',
    signatures: [['name']]
  },
  {
    name: 'getNamedItemNS',
    signatures: [['namespaceURI','localName']]
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
    name: 'removeNamedItem',
    signatures: [['name']]
  },
  {
    name: 'removeNamedItemNS',
    signatures: [['namespaceURI','localName']]
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
    name: 'getRootNode',
    signatures: [['?options']]
  },
  {
    name: 'cloneNode',
    signatures: [['?deep']]
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
    name: 'compareDocumentPosition',
    signatures: [['other']]
  },
  {
    name: 'lookupPrefix',
    signatures: [['namespaceURI']]
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
    name: 'isDefaultNamespace',
    signatures: [['namespaceURI']]
  },
  {
    name: 'insertBefore',
    signatures: [['node','child']]
  },
  {
    name: 'replaceChild',
    signatures: [['node','child']]
  },
  {
    name: 'getElementById',
    signatures: [['elementId']]
  },
  {
    name: 'prepend',
    signatures: [['...nodes']]
  },
  {
    name: 'replaceChildren',
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
    name: 'setStart',
    signatures: [['node','offset']]
  },
  {
    name: 'setEnd',
    signatures: [['node','offset']]
  },
  {
    name: 'setStartBefore',
    signatures: [['node']]
  },
  {
    name: 'setStartAfter',
    signatures: [['node']]
  },
  {
    name: 'setEndBefore',
    signatures: [['node']]
  },
  {
    name: 'setEndAfter',
    signatures: [['node']]
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
    name: 'selectNode',
    signatures: [['node']]
  },
  {
    name: 'selectNodeContents',
    signatures: [['node']]
  },
  {
    name: 'compareBoundaryPoints',
    signatures: [['how','sourceRange']]
  },
  {
    name: 'insertNode',
    signatures: [['node']]
  },
  {
    name: 'surroundContents',
    signatures: [['newParent']]
  },
  {
    name: 'isPointInRange',
    signatures: [['node','offset']]
  },
  {
    name: 'comparePoint',
    signatures: [['node','offset']]
  },
  {
    name: 'intersectsNode',
    signatures: [['node']]
  },
  {
    name: 'createContextualFragment',
    signatures: [['fragment']]
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
    name: 'splitText',
    signatures: [['offset']]
  },
  {
    name: 'CharacterBoundsUpdateEvent',
    signatures: [['?options']]
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
    signatures: [['?options']]
  },
  {
    name: 'TextFormat',
    signatures: [['?options']]
  },
  {
    name: 'TextUpdateEvent',
    signatures: [['?options']]
  },
  {
    name: 'getRangeAt',
    signatures: [['index']]
  },
  {
    name: 'addRange',
    signatures: [['range']]
  },
  {
    name: 'removeRange',
    signatures: [['range']]
  },
  {
    name: 'setPosition',
    signatures: [['node','?offset']],
    receiver: 'Selection'
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
    name: 'extend',
    signatures: [['node','?offset']]
  },
  {
    name: 'setBaseAndExtent',
    signatures: [['baseNode','baseOffset','extentNode','extentOffset']]
  },
  {
    name: 'selectAllChildren',
    signatures: [['node']]
  },
  {
    name: 'containsNode',
    signatures: [['node','?allowPartialContainment']]
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
    name: 'initCompositionEvent',
    signatures: [['type','?bubbles','?cancelable','?view','?data']]
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
    name: 'getModifierState',
    signatures: [['keyArg']]
  },
  {
    name: 'initKeyboardEvent',
    signatures: [['type','?bubbles','?cancelable','?view','?keyIdentifier','?location','?ctrlKey','?altKey','?shiftKey','?metaKey']]
  },
  {
    name: 'MessageEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'initMessageEvent',
    signatures: [['type','?bubbles','?cancelable','?data','?origin','?lastEventId','?source','?ports']]
  },
  {
    name: 'MouseEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'initMouseEvent',
    signatures: [['type','?bubbles','?cancelable','?view','?detail','?screenX','?screenY','?clientX','?clientY','?ctrlKey','?altKey','?shiftKey','?metaKey','?button','?relatedTarget']]
  },
  {
    name: 'initMutationEvent',
    signatures: [['?type','?bubbles','?cancelable','?relatedNode','?prevValue','?newValue','?attrName','?attrChange']]
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
    name: 'initUIEvent',
    signatures: [['type','?bubbles','?cancelable','?view','?detail']]
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
    name: 'Blob',
    signatures: [['?blobParts','?options']]
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
    name: 'readAsText',
    signatures: [['blob','?label']]
  },
  {
    name: 'readAsDataURL',
    signatures: [['blob']]
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
    name: 'registerAttributionSource',
    signatures: [['params']]
  },
  {
    name: 'go',
    signatures: [['?delta']]
  },
  {
    name: 'pushState',
    signatures: [['data','title','?url']]
  },
  {
    name: 'replaceState',
    signatures: [['data','title','?url']]
  },
  {
    name: 'getHighEntropyValues',
    signatures: [['hints']]
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
    name: 'WindowControlsOverlayGeometryChangeEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'stop',
    signatures: [['?when']],
    receiver: 'AudioScheduledSourceNode'
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
    name: 'alert',
    signatures: [['?message']]
  },
  {
    name: 'confirm',
    signatures: [['?message']]
  },
  {
    name: 'prompt',
    signatures: [['?message','?defaultValue']],
    receiver: 'Window'
  },
  {
    name: 'postMessage',
    signatures: [['message','?options'],['message','targetOrigin','?transfer']],
    receiver: 'Window'
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
    receiver: 'MessagePort'
  },
  {
    name: 'postMessage',
    signatures: [['message','transfer'],['message','?options']],
    receiver: 'DedicatedWorkerGlobalScope'
  },
  {
    name: 'postMessage',
    signatures: [['message','transfer'],['message','?options']],
    receiver: 'Worker'
  },
  {
    name: 'postMessage',
    signatures: [['message']],
    receiver: 'BroadcastChannel'
  },
  {
    name: 'postMessage',
    signatures: [['message','transfer'],['message','?options']],
    receiver: 'Client'
  },
  {
    name: 'postMessage',
    signatures: [['message','transfer'],['message','?options']],
    receiver: 'ServiceWorker'
  },
  {
    name: 'queueMicrotask',
    signatures: [['callback']]
  },
  {
    name: 'requestAnimationFrame',
    signatures: [['callback']]
  },
  {
    name: 'cancelAnimationFrame',
    signatures: [['handle']]
  },
  {
    name: 'requestIdleCallback',
    signatures: [['callback','?options']]
  },
  {
    name: 'cancelIdleCallback',
    signatures: [['handle']]
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
    name: 'moveTo',
    signatures: [['x','y']],
    receiver: 'Window'
  },
  {
    name: 'moveTo',
    signatures: [['x','y']],
    receiver: 'CanvasPath'
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
    name: 'moveBy',
    signatures: [['x','y']]
  },
  {
    name: 'resizeTo',
    signatures: [['x','y']]
  },
  {
    name: 'resizeBy',
    signatures: [['x','y']]
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
    name: 'requestFullscreen',
    signatures: [['?options']]
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
    name: 'toDataURL',
    signatures: [['?type','?quality']]
  },
  {
    name: 'toBlob',
    signatures: [['callback','?type','?quality']]
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
    name: 'define',
    signatures: [['name','constructor','?options']]
  },
  {
    name: 'whenDefined',
    signatures: [['name']]
  },
  {
    name: 'upgrade',
    signatures: [['root']]
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
    name: 'setCustomValidity',
    signatures: [['error']]
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
    receiver: 'HTMLAllCollection'
  },
  {
    name: 'namedItem',
    signatures: [['name']],
    receiver: 'HTMLCollection'
  },
  {
    name: 'namedItem',
    signatures: [['?name']],
    receiver: 'RTCStatsResponse'
  },
  {
    name: 'namedItem',
    signatures: [['name']],
    receiver: 'MimeTypeArray'
  },
  {
    name: 'namedItem',
    signatures: [['name']],
    receiver: 'PluginArray'
  },
  {
    name: 'namedItem',
    signatures: [['name']],
    receiver: 'Plugin'
  },
  {
    name: 'submit',
    signatures: [['buffers']],
    receiver: 'GPUQueue'
  },
  {
    name: 'requestSubmit',
    signatures: [['?submitter']]
  },
  {
    name: 'stepUp',
    signatures: [['?n']]
  },
  {
    name: 'stepDown',
    signatures: [['?n']]
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
    name: 'Option',
    signatures: [['?data','?value','?defaultSelected','?selected']]
  },
  {
    name: 'SubmitEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'show',
    signatures: [['?detailsPromise']],
    receiver: 'PaymentRequest'
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
    name: 'Image',
    signatures: [['?width','?height']]
  },
  {
    name: 'assignedNodes',
    signatures: [['?options']]
  },
  {
    name: 'assignedElements',
    signatures: [['?options']]
  },
  {
    name: 'insertRow',
    signatures: [['?index']]
  },
  {
    name: 'deleteRow',
    signatures: [['index']]
  },
  {
    name: 'insertCell',
    signatures: [['?index']]
  },
  {
    name: 'deleteCell',
    signatures: [['index']]
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
    name: 'end',
    signatures: [['index']]
  },
  {
    name: 'getTrackById',
    signatures: [['id']],
    receiver: 'AudioTrackList'
  },
  {
    name: 'getTrackById',
    signatures: [['id']],
    receiver: 'TextTrackList'
  },
  {
    name: 'getTrackById',
    signatures: [['id']],
    receiver: 'VideoTrackList'
  },
  {
    name: 'getTrackById',
    signatures: [['trackId']],
    receiver: 'MediaStream'
  },
  {
    name: 'getCueById',
    signatures: [['id']]
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
    name: 'send',
    signatures: [['command']],
    receiver: 'InspectorOverlayHost'
  },
  {
    name: 'send',
    signatures: [['?body']],
    receiver: 'XMLHttpRequest'
  },
  {
    name: 'send',
    signatures: [['data']],
    receiver: 'RTCDataChannel'
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
    name: 'send',
    signatures: [['data']],
    receiver: 'WebSocket'
  },
  {
    name: 'IntersectionObserver',
    signatures: [['callback','?options']]
  },
  {
    name: 'unobserve',
    signatures: [['target']]
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
    name: 'enqueue',
    signatures: [['chunk']],
    receiver: 'ReadableByteStreamController'
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
    name: 'ReadableStreamBYOBReader',
    signatures: [['stream']]
  },
  {
    name: 'read',
    signatures: [['view']],
    receiver: 'ReadableStreamBYOBReader'
  },
  {
    name: 'read',
    signatures: [['?options']],
    receiver: 'Clipboard'
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
    name: 'TransformStream',
    signatures: [['?transformer','?writableStrategy','?readableStrategy']]
  },
  {
    name: 'WritableStream',
    signatures: [['?underlyingSink','?strategy']]
  },
  {
    name: 'newValueSpecifiedUnits',
    signatures: [['unitType','valueInSpecifiedUnits']]
  },
  {
    name: 'convertToSpecifiedUnits',
    signatures: [['unitType']]
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
    name: 'isPointInFill',
    signatures: [['point']]
  },
  {
    name: 'isPointInStroke',
    signatures: [['point']],
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
    name: 'getPointAtLength',
    signatures: [['distance']]
  },
  {
    name: 'initialize',
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
    signatures: [['item','index']],
    receiver: 'SVGStringList'
  },
  {
    name: 'insertItemBefore',
    signatures: [['newItem','index']],
    receiver: 'SVGTransformList'
  },
  {
    name: 'replaceItem',
    signatures: [['newItem','index']]
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
    name: 'appendItem',
    signatures: [['newItem']]
  },
  {
    name: 'setOrientToAngle',
    signatures: [['angle']]
  },
  {
    name: 'multiply',
    signatures: [['secondMatrix']]
  },
  {
    name: 'translate',
    signatures: [['x','y']]
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
    name: 'scaleNonUniform',
    signatures: [['scaleFactorX','scaleFactorY']]
  },
  {
    name: 'rotate',
    signatures: [['angle']]
  },
  {
    name: 'rotateFromVector',
    signatures: [['x','y']]
  },
  {
    name: 'skewX',
    signatures: [['angle']]
  },
  {
    name: 'skewY',
    signatures: [['angle']]
  },
  {
    name: 'matrixTransform',
    signatures: [['matrix']]
  },
  {
    name: 'getIntersectionList',
    signatures: [['rect','referenceElement']]
  },
  {
    name: 'getEnclosureList',
    signatures: [['rect','referenceElement']]
  },
  {
    name: 'checkIntersection',
    signatures: [['element','rect']]
  },
  {
    name: 'checkEnclosure',
    signatures: [['element','rect']]
  },
  {
    name: 'createSVGTransformFromMatrix',
    signatures: [['matrix']]
  },
  {
    name: 'suspendRedraw',
    signatures: [['maxWaitMilliseconds']]
  },
  {
    name: 'unsuspendRedraw',
    signatures: [['suspendHandleId']]
  },
  {
    name: 'setCurrentTime',
    signatures: [['seconds']]
  },
  {
    name: 'getSubStringLength',
    signatures: [['charnum','nchars']]
  },
  {
    name: 'getStartPositionOfChar',
    signatures: [['charnum']]
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
    name: 'getCharNumAtPosition',
    signatures: [['point']]
  },
  {
    name: 'selectSubString',
    signatures: [['charnum','nchars']]
  },
  {
    name: 'setMatrix',
    signatures: [['matrix']]
  },
  {
    name: 'setTranslate',
    signatures: [['tx','ty']]
  },
  {
    name: 'setScale',
    signatures: [['sx','sy']]
  },
  {
    name: 'setRotate',
    signatures: [['angle','cx','cy']]
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
    name: 'PerformanceMark',
    signatures: [['markName','?markOptions']]
  },
  {
    name: 'getEntriesByType',
    signatures: [['entryType']]
  },
  {
    name: 'getEntriesByName',
    signatures: [['name','?entryType']]
  },
  {
    name: 'PerformanceObserver',
    signatures: [['callback']]
  },
  {
    name: 'setResourceTimingBufferSize',
    signatures: [['maxSize']]
  },
  {
    name: 'mark',
    signatures: [['markName','?markOptions']]
  },
  {
    name: 'clearMarks',
    signatures: [['?markName']]
  },
  {
    name: 'measure',
    signatures: [['measureName','?startOrMeasureOptions','?endMark']]
  },
  {
    name: 'clearMeasures',
    signatures: [['?measureName']]
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
    name: 'importScripts',
    signatures: [['...urls']]
  },
  {
    name: 'Worker',
    signatures: [['scriptURL','?options']]
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
    name: 'createExpression',
    signatures: [['expression','?resolver']]
  },
  {
    name: 'createNSResolver',
    signatures: [['nodeResolver']]
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
    name: 'evaluate',
    signatures: [['contextNode','?type','?inResult']],
    receiver: 'XPathExpression'
  },
  {
    name: 'parseFromString',
    signatures: [['str','type','?options']]
  },
  {
    name: 'serializeToString',
    signatures: [['root']]
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
    name: 'transformToFragment',
    signatures: [['source','output']]
  },
  {
    name: 'transformToDocument',
    signatures: [['source']]
  },
  {
    name: 'setParameter',
    signatures: [['namespaceURI','localName','value']]
  },
  {
    name: 'getParameter',
    signatures: [['namespaceURI','localName']],
    receiver: 'XSLTProcessor'
  },
  {
    name: 'getParameter',
    signatures: [['pname']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'removeParameter',
    signatures: [['namespaceURI','localName']]
  },
  {
    name: 'setRequestHeader',
    signatures: [['name','value']]
  },
  {
    name: 'setTrustToken',
    signatures: [['trustToken']]
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
    name: 'joinAdInterestGroup',
    signatures: [['group','durationSeconds']]
  },
  {
    name: 'leaveAdInterestGroup',
    signatures: [['group']]
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
    name: 'sendBeacon',
    signatures: [['url','?data']]
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
    name: 'connect',
    signatures: [['destination','?output','?input']],
    receiver: 'AudioNode'
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
    name: 'addAll',
    signatures: [['requests']]
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
    name: 'addColorStop',
    signatures: [['offset','color']]
  },
  {
    name: 'lineTo',
    signatures: [['x','y']]
  },
  {
    name: 'quadraticCurveTo',
    signatures: [['cpx','cpy','x','y']]
  },
  {
    name: 'bezierCurveTo',
    signatures: [['cp1x','cp1y','cp2x','cp2y','x','y']]
  },
  {
    name: 'arcTo',
    signatures: [['x1','y1','x2','y2','radius']]
  },
  {
    name: 'rect',
    signatures: [['x','y','width','height']]
  },
  {
    name: 'roundRect',
    signatures: [['x','y','w','h','radii']]
  },
  {
    name: 'arc',
    signatures: [['x','y','radius','startAngle','endAngle','?anticlockwise']]
  },
  {
    name: 'ellipse',
    signatures: [['x','y','radiusX','radiusY','rotation','startAngle','endAngle','?anticlockwise']]
  },
  {
    name: 'setTransform',
    signatures: [['?transform']],
    receiver: 'CanvasPattern'
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
    name: 'transform',
    signatures: [['a','b','c','d','e','f']]
  },
  {
    name: 'createLinearGradient',
    signatures: [['x0','y0','x1','y1']]
  },
  {
    name: 'createRadialGradient',
    signatures: [['x0','y0','r0','x1','y1','r1']]
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
    name: 'createPattern',
    signatures: [['image','repetitionType']]
  },
  {
    name: 'clearRect',
    signatures: [['x','y','width','height']]
  },
  {
    name: 'fillRect',
    signatures: [['x','y','width','height']]
  },
  {
    name: 'strokeRect',
    signatures: [['x','y','width','height']]
  },
  {
    name: 'stroke',
    signatures: [['?path']]
  },
  {
    name: 'drawFocusIfNeeded',
    signatures: [['element'],['path','element']]
  },
  {
    name: 'scrollPathIntoView',
    signatures: [['?path']]
  },
  {
    name: 'clip',
    signatures: [['?winding'],['path','?winding']]
  },
  {
    name: 'isPointInPath',
    signatures: [['x','y','?winding'],['path','x','y','?winding']]
  },
  {
    name: 'fillText',
    signatures: [['text','x','y','?maxWidth']]
  },
  {
    name: 'strokeText',
    signatures: [['text','x','y','?maxWidth']]
  },
  {
    name: 'measureText',
    signatures: [['text']]
  },
  {
    name: 'fillFormattedText',
    signatures: [['formattedText','x','y','wrapWidth']]
  },
  {
    name: 'drawImage',
    signatures: [['image','x','y','?width','?height'],['image','sx','sy','sw','sh','dx','dy','dw','dh']]
  },
  {
    name: 'createImageData',
    signatures: [['imagedata'],['sw','sh','?imageDataSettings']]
  },
  {
    name: 'getImageData',
    signatures: [['sx','sy','sw','sh','?imageDataSettings']]
  },
  {
    name: 'putImageData',
    signatures: [['imagedata','dx','dy','?dirtyX','?dirtyY','?dirtyWidth','?dirtyHeight']]
  },
  {
    name: 'setLineDash',
    signatures: [['dash']]
  },
  {
    name: 'Path2D',
    signatures: [['?path']]
  },
  {
    name: 'addPath',
    signatures: [['path','?transform']]
  },
  {
    name: 'getContext',
    signatures: [['contextId','?attributes']],
    receiver: 'HTMLCanvasElement'
  },
  {
    name: 'getContext',
    signatures: [['contextType','?attributes']],
    receiver: 'OffscreenCanvas'
  },
  {
    name: 'transferFromImageBitmap',
    signatures: [['bitmap']]
  },
  {
    name: 'createImageBitmap',
    signatures: [['imageBitmap','?options'],['imageBitmap','sx','sy','sw','sh','?options']]
  },
  {
    name: 'ClipboardItem',
    signatures: [['items','?options']]
  },
  {
    name: 'getType',
    signatures: [['type']]
  },
  {
    name: 'writeText',
    signatures: [['data']]
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
    name: 'ComputePressureObserver',
    signatures: [['callback','?options']]
  },
  {
    name: 'ContentIndexEvent',
    signatures: [['type','init']]
  },
  {
    name: 'subscribe',
    signatures: [['subscriptions']]
  },
  {
    name: 'unsubscribe',
    signatures: [['subscriptions']],
    receiver: 'CookieStoreManager'
  },
  {
    name: 'FederatedCredential',
    signatures: [['data']]
  },
  {
    name: 'PasswordCredential',
    signatures: [['data'],['form']]
  },
  {
    name: 'getRandomValues',
    signatures: [['array']]
  },
  {
    name: 'encrypt',
    signatures: [['algorithm','key','data']]
  },
  {
    name: 'decrypt',
    signatures: [['algorithm','key','data']]
  },
  {
    name: 'verify',
    signatures: [['algorithm','key','signature','data']]
  },
  {
    name: 'digest',
    signatures: [['algorithm','data']]
  },
  {
    name: 'generateKey',
    signatures: [['algorithm','extractable','keyUsages']]
  },
  {
    name: 'deriveKey',
    signatures: [['algorithm','baseKey','derivedKeyType','extractable','keyUsages']]
  },
  {
    name: 'deriveBits',
    signatures: [['algorithm','baseKey','length']]
  },
  {
    name: 'importKey',
    signatures: [['format','keyData','algorithm','extractable','keyUsages']]
  },
  {
    name: 'exportKey',
    signatures: [['format','key']]
  },
  {
    name: 'wrapKey',
    signatures: [['format','key','wrappingKey','wrapAlgorithm']]
  },
  {
    name: 'unwrapKey',
    signatures: [['format','wrappedKey','unwrappingKey','unwrapAlgorithm','unwrappedKeyAlgorithm','extractable','keyUsages']]
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
    name: 'openTCPSocket',
    signatures: [['?options']]
  },
  {
    name: 'openUDPSocket',
    signatures: [['?options']]
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
    name: 'setMediaKeys',
    signatures: [['mediaKeys']]
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
    name: 'generateRequest',
    signatures: [['initDataType','initData']]
  },
  {
    name: 'update',
    signatures: [['response']],
    receiver: 'MediaKeySession'
  },
  {
    name: 'getStatusForPolicy',
    signatures: [['policy']]
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
    name: 'requestMediaKeySystemAccess',
    signatures: [['keySystem','supportedConfigurations']]
  },
  {
    name: 'EventSource',
    signatures: [['url','?eventSourceInitDict']]
  },
  {
    name: 'getFileHandle',
    signatures: [['name','?options']]
  },
  {
    name: 'getDirectoryHandle',
    signatures: [['name','?options']]
  },
  {
    name: 'removeEntry',
    signatures: [['name','?options']]
  },
  {
    name: 'createWritable',
    signatures: [['?options']]
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
    name: 'rename',
    signatures: [['new_entry_name']],
    receiver: 'FileSystemFileHandle'
  },
  {
    name: 'rename',
    signatures: [['new_entry_name']],
    receiver: 'FileSystemHandle'
  },
  {
    name: 'rename',
    signatures: [['old_name','new_name']],
    receiver: 'NativeIOFileManager'
  },
  {
    name: 'move',
    signatures: [['destination_directory','?new_entry_name']]
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
    name: 'isSameEntry',
    signatures: [['other']]
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
    name: 'readEntries',
    signatures: [['successCallback','?errorCallback']],
    receiver: 'DirectoryReader'
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
    name: 'getParent',
    signatures: [['?successCallback','?errorCallback']],
    receiver: 'Entry'
  },
  {
    name: 'file',
    signatures: [['successCallback','?errorCallback']],
    receiver: 'FileEntry'
  },
  {
    name: 'createWriter',
    signatures: [['successCallback','?errorCallback']],
    receiver: 'FileEntry'
  },
  {
    name: 'query',
    signatures: [['?options']],
    receiver: 'FontManager'
  },
  {
    name: 'query',
    signatures: [['permission']],
    receiver: 'Permissions'
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
    name: 'getCurrentPosition',
    signatures: [['successCallback','?errorCallback','?options']]
  },
  {
    name: 'watchPosition',
    signatures: [['successCallback','?errorCallback','?options']]
  },
  {
    name: 'clearWatch',
    signatures: [['watchID']]
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
    name: 'createObjectStore',
    signatures: [['name','?options']]
  },
  {
    name: 'deleteObjectStore',
    signatures: [['name']]
  },
  {
    name: 'deleteDatabase',
    signatures: [['name']]
  },
  {
    name: 'cmp',
    signatures: [['first','second']]
  },
  {
    name: 'getKey',
    signatures: [['key']],
    receiver: 'IDBIndex'
  },
  {
    name: 'getKey',
    signatures: [['key']],
    receiver: 'IDBObjectStore'
  },
  {
    name: 'getKey',
    signatures: [['name']],
    receiver: 'PushSubscription'
  },
  {
    name: 'getAllKeys',
    signatures: [['?query','?count']]
  },
  {
    name: 'openCursor',
    signatures: [['?range','?direction']]
  },
  {
    name: 'openKeyCursor',
    signatures: [['?range','?direction']]
  },
  {
    name: 'index',
    signatures: [['name']]
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
    name: 'objectStore',
    signatures: [['name']]
  },
  {
    name: 'IDBVersionChangeEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'lock',
    signatures: [['?keyCodes']],
    receiver: 'Keyboard'
  },
  {
    name: 'lock',
    signatures: [['orientation']],
    receiver: 'ScreenOrientation'
  },
  {
    name: 'setConsumer',
    signatures: [['consumer']]
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
    name: 'captureStream',
    signatures: [['?frameRate']],
    receiver: 'HTMLCanvasElement'
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
    name: 'setActionHandler',
    signatures: [['action','handler']]
  },
  {
    name: 'setPositionState',
    signatures: [['?state']]
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
    name: 'addSourceBuffer',
    signatures: [['type'],['config']]
  },
  {
    name: 'removeSourceBuffer',
    signatures: [['buffer']]
  },
  {
    name: 'endOfStream',
    signatures: [['?error']]
  },
  {
    name: 'setLiveSeekableRange',
    signatures: [['start','end']]
  },
  {
    name: 'appendBuffer',
    signatures: [['data']]
  },
  {
    name: 'appendEncodedChunks',
    signatures: [['chunks']]
  },
  {
    name: 'changeType',
    signatures: [['type'],['config']]
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
    name: 'CaptureHandleChangeEvent',
    signatures: [['type','eventInitDict']]
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
    name: 'getDisplayMedia',
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
    name: 'applyConstraints',
    signatures: [['?constraints']]
  },
  {
    name: 'MediaStream',
    signatures: [['?stream'],['tracks']]
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
    name: 'webkitGetUserMedia',
    signatures: [['constraints','successCallback','errorCallback']]
  },
  {
    name: 'OverconstrainedError',
    signatures: [['constraint','message']]
  },
  {
    name: 'openSync',
    signatures: [['name']]
  },
  {
    name: 'deleteSync',
    signatures: [['name']],
    receiver: 'NativeIOFileManager'
  },
  {
    name: 'deleteSync',
    signatures: [['sync']],
    receiver: 'WebGL2RenderingContextBase'
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
    name: 'registerProtocolHandler',
    signatures: [['scheme','url']]
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
    name: 'showNotification',
    signatures: [['title','?options']]
  },
  {
    name: 'getNotifications',
    signatures: [['?filter']]
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
    name: 'complete',
    signatures: [['merchantSessionPromise']],
    receiver: 'MerchantValidationEvent'
  },
  {
    name: 'complete',
    signatures: [['?paymentResult']],
    receiver: 'PaymentResponse'
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
    name: 'updateWith',
    signatures: [['detailsPromise']]
  },
  {
    name: 'PaymentRequest',
    signatures: [['methodData','?details','?options']]
  },
  {
    name: 'retry',
    signatures: [['?errorFields']]
  },
  {
    name: 'RTCDataChannelEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'insertDTMF',
    signatures: [['tones','?duration','?interToneGap']]
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
    name: 'createOffer',
    signatures: [['?options'],['successCallback','failureCallback','?rtcOfferOptions']]
  },
  {
    name: 'createAnswer',
    signatures: [['?options'],['successCallback','failureCallback','?mediaConstraints']]
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
    name: 'addIceCandidate',
    signatures: [['?candidate','?successCallback','?failureCallback']]
  },
  {
    name: 'setConfiguration',
    signatures: [['configuration']]
  },
  {
    name: 'getStats',
    signatures: [['?callbackOrSelector','?legacySelector']]
  },
  {
    name: 'addTransceiver',
    signatures: [['trackOrKind','?init']]
  },
  {
    name: 'createDataChannel',
    signatures: [['label','?dataChannelDict']]
  },
  {
    name: 'setCodecPreferences',
    signatures: [['codecs']]
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
    name: 'revoke',
    signatures: [['permission']]
  },
  {
    name: 'requestAll',
    signatures: [['permissions']]
  },
  {
    name: 'requestPictureInPicture',
    signatures: [['?options']],
    receiver: 'HTMLElement'
  },
  {
    name: 'PictureInPictureEvent',
    signatures: [['type','eventInitDict']]
  },
  {
    name: 'refresh',
    signatures: [['?reload']]
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
    name: 'watchAvailability',
    signatures: [['callback']]
  },
  {
    name: 'cancelWatchAvailability',
    signatures: [['?id']]
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
    name: 'enable',
    signatures: [['cap']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'disable',
    signatures: [['cap']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'setHeaderValue',
    signatures: [['value']]
  },
  {
    name: 'getRegistration',
    signatures: [['?documentURL']]
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
    name: 'runURLSelectionOperation',
    signatures: [['name','urls','?options']]
  },
  {
    name: 'runOperation',
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
    name: 'speak',
    signatures: [['utterance']]
  },
  {
    name: 'StorageEvent',
    signatures: [['type','?eventInitDict']]
  },
  {
    name: 'initStorageEvent',
    signatures: [['type','?bubbles','?cancelable','?key','?oldValue','?newValue','?url','?storageArea']]
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
    name: 'URLPattern',
    signatures: [['?input','?baseURL']]
  },
  {
    name: 'vibrate',
    signatures: [['pattern']]
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
    name: 'getFloatFrequencyData',
    signatures: [['array']]
  },
  {
    name: 'getByteFrequencyData',
    signatures: [['array']]
  },
  {
    name: 'getFloatTimeDomainData',
    signatures: [['array']]
  },
  {
    name: 'getByteTimeDomainData',
    signatures: [['array']]
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
    name: 'getChannelData',
    signatures: [['channelIndex']]
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
    name: 'AudioContext',
    signatures: [['?contextOptions']]
  },
  {
    name: 'suspend',
    signatures: [['suspendTime']],
    receiver: 'OfflineAudioContext'
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
    name: 'setValueAtTime',
    signatures: [['value','time']]
  },
  {
    name: 'linearRampToValueAtTime',
    signatures: [['value','time']]
  },
  {
    name: 'exponentialRampToValueAtTime',
    signatures: [['value','time']]
  },
  {
    name: 'setTargetAtTime',
    signatures: [['target','time','timeConstant']]
  },
  {
    name: 'setValueCurveAtTime',
    signatures: [['values','time','duration']]
  },
  {
    name: 'cancelScheduledValues',
    signatures: [['startTime']]
  },
  {
    name: 'cancelAndHoldAtTime',
    signatures: [['startTime']]
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
    name: 'createBuffer',
    signatures: [['numberOfChannels','numberOfFrames','sampleRate']],
    receiver: 'BaseAudioContext'
  },
  {
    name: 'createBuffer',
    signatures: [['descriptor']],
    receiver: 'GPUDevice'
  },
  {
    name: 'decodeAudioData',
    signatures: [['audioData','?successCallback','?errorCallback']]
  },
  {
    name: 'createDelay',
    signatures: [['?maxDelayTime']]
  },
  {
    name: 'createIIRFilter',
    signatures: [['feedForward','feedBack']]
  },
  {
    name: 'createScriptProcessor',
    signatures: [['?bufferSize','?numberOfInputChannels','?numberOfOutputChannels']]
  },
  {
    name: 'createPeriodicWave',
    signatures: [['real','imag','?constraints']]
  },
  {
    name: 'createChannelSplitter',
    signatures: [['?numberOfOutputs']]
  },
  {
    name: 'createChannelMerger',
    signatures: [['?numberOfInputs']]
  },
  {
    name: 'BiquadFilterNode',
    signatures: [['context','?options']]
  },
  {
    name: 'getFrequencyResponse',
    signatures: [['frequencyHz','magResponse','phaseResponse']]
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
    name: 'setPeriodicWave',
    signatures: [['periodicWave']]
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
    name: 'deleteVertexArrayOES',
    signatures: [['?arrayObject']]
  },
  {
    name: 'isVertexArrayOES',
    signatures: [['?arrayObject']]
  },
  {
    name: 'bindVertexArrayOES',
    signatures: [['?arrayObject']]
  },
  {
    name: 'framebufferTextureMultiviewOVR',
    signatures: [['target','attachment','texture','level','baseViewIndex','numViews']]
  },
  {
    name: 'WebGLContextEvent',
    signatures: [['type','?eventInit']]
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
    name: 'multiDrawArraysWEBGL',
    signatures: [['mode','firstsList','firstsOffset','countsList','countsOffset','drawcount']]
  },
  {
    name: 'multiDrawElementsWEBGL',
    signatures: [['mode','countsList','countsOffset','type','offsetsList','offsetsOffset','drawcount']]
  },
  {
    name: 'multiDrawArraysInstancedWEBGL',
    signatures: [['mode','firstsList','firstsOffset','countsList','countsOffset','instanceCountsList','instanceCountsOffset','drawcount']]
  },
  {
    name: 'multiDrawElementsInstancedWEBGL',
    signatures: [['mode','countsList','countsOffset','type','offsetsList','offsetsOffset','instanceCountsList','instanceCountsOffset','drawcount']]
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
    signatures: [['target','offset','data']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'bufferSubData',
    signatures: [['target','dstByteOffset','srcData','srcOffset','?length']],
    receiver: 'WebGL2RenderingContextBase'
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
    signatures: [['target','level','xoffset','yoffset','width','height','format','data']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'compressedTexSubImage2D',
    signatures: [['target','level','xoffset','yoffset','width','height','format','imageSize','offset'],['target','level','xoffset','yoffset','width','height','format','data','srcOffset','?srcLengthOverride']],
    receiver: 'WebGL2RenderingContextBase'
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
    signatures: [['name']]
  },
  {
    name: 'getFramebufferAttachmentParameter',
    signatures: [['target','attachment','pname']]
  },
  {
    name: 'getProgramParameter',
    signatures: [['program','pname']]
  },
  {
    name: 'getProgramInfoLog',
    signatures: [['program']]
  },
  {
    name: 'getRenderbufferParameter',
    signatures: [['target','pname']]
  },
  {
    name: 'getShaderParameter',
    signatures: [['shader','pname']]
  },
  {
    name: 'getShaderInfoLog',
    signatures: [['shader']]
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
    signatures: [['shader','string']]
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
    signatures: [['target','level','xoffset','yoffset','format','type','pixels'],['target','level','xoffset','yoffset','format','type','image'],['target','level','xoffset','yoffset','format','type','canvas'],['target','level','xoffset','yoffset','format','type','offscreenCanvas'],['target','level','xoffset','yoffset','format','type','video'],['target','level','xoffset','yoffset','format','type','bitmap'],['target','level','xoffset','yoffset','format','type','frame'],['target','level','xoffset','yoffset','width','height','format','type','pixels']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'texSubImage2D',
    signatures: [['target','level','xoffset','yoffset','width','height','format','type','offset'],['target','level','xoffset','yoffset','width','height','format','type','data'],['target','level','xoffset','yoffset','width','height','format','type','image'],['target','level','xoffset','yoffset','width','height','format','type','canvas'],['target','level','xoffset','yoffset','width','height','format','type','offscreenCanvas'],['target','level','xoffset','yoffset','width','height','format','type','video'],['target','level','xoffset','yoffset','width','height','format','type','frame'],['target','level','xoffset','yoffset','width','height','format','type','bitmap'],['target','level','xoffset','yoffset','width','height','format','type','srcData','srcOffset']],
    receiver: 'WebGL2RenderingContextBase'
  },
  {
    name: 'uniform1f',
    signatures: [['location','x']]
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
    name: 'uniform1i',
    signatures: [['location','x']]
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
    name: 'uniform2f',
    signatures: [['location','x','y']]
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
    name: 'uniform2i',
    signatures: [['location','x','y']]
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
    name: 'uniform3f',
    signatures: [['location','x','y','z']]
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
    name: 'uniform3i',
    signatures: [['location','x','y','z']]
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
    name: 'uniform4f',
    signatures: [['location','x','y','z','w']]
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
    name: 'uniform4i',
    signatures: [['location','x','y','z','w']]
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
    signatures: [['location','transpose','array']],
    receiver: 'WebGLRenderingContextBase'
  },
  {
    name: 'uniformMatrix4fv',
    signatures: [['location','transpose','array','srcOffset','?srcLength']],
    receiver: 'WebGL2RenderingContextBase'
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
    signatures: [['indx','x']]
  },
  {
    name: 'vertexAttrib1fv',
    signatures: [['indx','values']]
  },
  {
    name: 'vertexAttrib2f',
    signatures: [['indx','x','y']]
  },
  {
    name: 'vertexAttrib2fv',
    signatures: [['indx','values']]
  },
  {
    name: 'vertexAttrib3f',
    signatures: [['indx','x','y','z']]
  },
  {
    name: 'vertexAttrib3fv',
    signatures: [['indx','values']]
  },
  {
    name: 'vertexAttrib4f',
    signatures: [['indx','x','y','z','w']]
  },
  {
    name: 'vertexAttrib4fv',
    signatures: [['indx','values']]
  },
  {
    name: 'vertexAttribPointer',
    signatures: [['indx','size','type','normalized','stride','offset']]
  },
  {
    name: 'viewport',
    signatures: [['x','y','width','height']]
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
    name: 'copyBufferSubData',
    signatures: [['readTarget','writeTarget','readOffset','writeOffset','size']]
  },
  {
    name: 'getBufferSubData',
    signatures: [['target','srcByteOffset','dstData','?dstOffset','?length']]
  },
  {
    name: 'blitFramebuffer',
    signatures: [['srcX0','srcY0','srcX1','srcY1','dstX0','dstY0','dstX1','dstY1','mask','filter']]
  },
  {
    name: 'framebufferTextureLayer',
    signatures: [['target','attachment','texture','level','layer']]
  },
  {
    name: 'getInternalformatParameter',
    signatures: [['target','internalformat','pname']]
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
    name: 'readBuffer',
    signatures: [['mode']]
  },
  {
    name: 'renderbufferStorageMultisample',
    signatures: [['target','samples','internalformat','width','height']]
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
    name: 'texImage3D',
    signatures: [['target','level','internalformat','width','height','depth','border','format','type','offset'],['target','level','internalformat','width','height','depth','border','format','type','data'],['target','level','internalformat','width','height','depth','border','format','type','image'],['target','level','internalformat','width','height','depth','border','format','type','canvas'],['target','level','internalformat','width','height','depth','border','format','type','offscreenCanvas'],['target','level','internalformat','width','height','depth','border','format','type','video'],['target','level','internalformat','width','height','depth','border','format','type','frame'],['target','level','internalformat','width','height','depth','border','format','type','bitmap'],['target','level','internalformat','width','height','depth','border','format','type','pixels','?srcOffset']]
  },
  {
    name: 'texSubImage3D',
    signatures: [['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','offset'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','data'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','image'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','canvas'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','offscreenCanvas'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','video'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','frame'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','bitmap'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','type','pixels','?srcOffset']]
  },
  {
    name: 'copyTexSubImage3D',
    signatures: [['target','level','xoffset','yoffset','zoffset','x','y','width','height']]
  },
  {
    name: 'compressedTexImage3D',
    signatures: [['target','level','internalformat','width','height','depth','border','imageSize','offset'],['target','level','internalformat','width','height','depth','border','data','?srcOffset','?srcLengthOverride']]
  },
  {
    name: 'compressedTexSubImage3D',
    signatures: [['target','level','xoffset','yoffset','zoffset','width','height','depth','format','imageSize','offset'],['target','level','xoffset','yoffset','zoffset','width','height','depth','format','data','?srcOffset','?srcLengthOverride']]
  },
  {
    name: 'getFragDataLocation',
    signatures: [['program','name']]
  },
  {
    name: 'uniform1ui',
    signatures: [['location','v0']]
  },
  {
    name: 'uniform2ui',
    signatures: [['location','v0','v1']]
  },
  {
    name: 'uniform3ui',
    signatures: [['location','v0','v1','v2']]
  },
  {
    name: 'uniform4ui',
    signatures: [['location','v0','v1','v2','v3']]
  },
  {
    name: 'uniform1uiv',
    signatures: [['location','v','?srcOffset','?srcLength']]
  },
  {
    name: 'uniform2uiv',
    signatures: [['location','v','?srcOffset','?srcLength']]
  },
  {
    name: 'uniform3uiv',
    signatures: [['location','v','?srcOffset','?srcLength']]
  },
  {
    name: 'uniform4uiv',
    signatures: [['location','v','?srcOffset','?srcLength']]
  },
  {
    name: 'uniformMatrix2x3fv',
    signatures: [['location','transpose','value','?srcOffset','?srcLength']]
  },
  {
    name: 'uniformMatrix3x2fv',
    signatures: [['location','transpose','value','?srcOffset','?srcLength']]
  },
  {
    name: 'uniformMatrix2x4fv',
    signatures: [['location','transpose','value','?srcOffset','?srcLength']]
  },
  {
    name: 'uniformMatrix4x2fv',
    signatures: [['location','transpose','value','?srcOffset','?srcLength']]
  },
  {
    name: 'uniformMatrix3x4fv',
    signatures: [['location','transpose','value','?srcOffset','?srcLength']]
  },
  {
    name: 'uniformMatrix4x3fv',
    signatures: [['location','transpose','value','?srcOffset','?srcLength']]
  },
  {
    name: 'vertexAttribI4i',
    signatures: [['index','x','y','z','w']]
  },
  {
    name: 'vertexAttribI4iv',
    signatures: [['index','v']]
  },
  {
    name: 'vertexAttribI4ui',
    signatures: [['index','x','y','z','w']]
  },
  {
    name: 'vertexAttribI4uiv',
    signatures: [['index','v']]
  },
  {
    name: 'vertexAttribIPointer',
    signatures: [['index','size','type','stride','offset']]
  },
  {
    name: 'vertexAttribDivisor',
    signatures: [['index','divisor']]
  },
  {
    name: 'drawArraysInstanced',
    signatures: [['mode','first','count','instanceCount']]
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
    name: 'drawBuffers',
    signatures: [['buffers']]
  },
  {
    name: 'clearBufferiv',
    signatures: [['buffer','drawbuffer','value','?srcOffset']]
  },
  {
    name: 'clearBufferuiv',
    signatures: [['buffer','drawbuffer','value','?srcOffset']]
  },
  {
    name: 'clearBufferfv',
    signatures: [['buffer','drawbuffer','value','?srcOffset']]
  },
  {
    name: 'clearBufferfi',
    signatures: [['buffer','drawbuffer','depth','stencil']]
  },
  {
    name: 'deleteQuery',
    signatures: [['query']]
  },
  {
    name: 'isQuery',
    signatures: [['query']]
  },
  {
    name: 'beginQuery',
    signatures: [['target','query']]
  },
  {
    name: 'endQuery',
    signatures: [['target']]
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
    name: 'createSampler',
    signatures: [['?descriptor']],
    receiver: 'GPUDevice'
  },
  {
    name: 'deleteSampler',
    signatures: [['sampler']]
  },
  {
    name: 'isSampler',
    signatures: [['sampler']]
  },
  {
    name: 'bindSampler',
    signatures: [['unit','sampler']]
  },
  {
    name: 'samplerParameteri',
    signatures: [['sampler','pname','param']]
  },
  {
    name: 'samplerParameterf',
    signatures: [['sampler','pname','param']]
  },
  {
    name: 'getSamplerParameter',
    signatures: [['sampler','pname']]
  },
  {
    name: 'fenceSync',
    signatures: [['condition','flags']]
  },
  {
    name: 'isSync',
    signatures: [['sync']]
  },
  {
    name: 'clientWaitSync',
    signatures: [['sync','flags','timeout']]
  },
  {
    name: 'waitSync',
    signatures: [['sync','flags','timeout']]
  },
  {
    name: 'getSyncParameter',
    signatures: [['sync','pname']]
  },
  {
    name: 'deleteTransformFeedback',
    signatures: [['feedback']]
  },
  {
    name: 'isTransformFeedback',
    signatures: [['feedback']]
  },
  {
    name: 'bindTransformFeedback',
    signatures: [['target','feedback']]
  },
  {
    name: 'beginTransformFeedback',
    signatures: [['primitiveMode']]
  },
  {
    name: 'transformFeedbackVaryings',
    signatures: [['program','varyings','bufferMode']]
  },
  {
    name: 'getTransformFeedbackVarying',
    signatures: [['program','index']]
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
    name: 'getIndexedParameter',
    signatures: [['target','index']]
  },
  {
    name: 'getUniformIndices',
    signatures: [['program','uniformNames']]
  },
  {
    name: 'getActiveUniforms',
    signatures: [['program','uniformIndices','pname']]
  },
  {
    name: 'getUniformBlockIndex',
    signatures: [['program','uniformBlockName']]
  },
  {
    name: 'getActiveUniformBlockParameter',
    signatures: [['program','uniformBlockIndex','pname']]
  },
  {
    name: 'getActiveUniformBlockName',
    signatures: [['program','uniformBlockIndex']]
  },
  {
    name: 'uniformBlockBinding',
    signatures: [['program','uniformBlockIndex','uniformBlockBinding']]
  },
  {
    name: 'deleteVertexArray',
    signatures: [['vertexArray']]
  },
  {
    name: 'isVertexArray',
    signatures: [['vertexArray']]
  },
  {
    name: 'bindVertexArray',
    signatures: [['vertexArray']]
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
    name: 'dispatch',
    signatures: [['x','?y','?z']]
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
    name: 'copyImageBitmapToTexture',
    signatures: [['source','destination','copySize']]
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
    name: 'provide',
    signatures: [['?id_token']]
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
    name: 'canShare',
    signatures: [['?data']]
  },
  {
    name: 'share',
    signatures: [['?data']]
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
