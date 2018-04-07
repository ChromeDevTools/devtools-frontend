// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const fs = require('fs');

/*
How to use:
1) Get dump of data as CSV format and name it 3pas.csv same directory as this script.
2) Header fields in the CSV will be used as keys when destructing into JSON objects [ie: top row data should not have spaces or special chars]
3) The two important column names are: 'name_legal_product' and 'domain'.
4) There may not be a header named 'prefix'.
5) 'name_legal_product' Will have it's data cleaned up a bit, so be prepared for it to change.
6) This script tries to de-duplicate any data, so be prepared for many entries to go away if it finds a shorter one.
7) This script will output a javascript file in the product_registry's data format.
*/

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
const hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase        */
const b64pad = '='; /* base-64 pad character. "=" for strict RFC compliance   */
const chrsz = 8;    /* bits per input character. 8 - ASCII; 16 - Unicode      */

const typeClassifications = new Map([
  ['cdn_provider', 0], ['cdn_commercial_owner', 2], ['cdn_creative_agency', 2], ['ad_blocking', 0], ['ad_exchange', 0],
  ['ad_server_ad_network', 0], ['ad_server_advertiser', 0], ['demand_side_platform', 0], ['vast_provider', 0],
  ['data_management_platform', 1], ['research_analytics', 1], ['research_verification', 1],
  ['research_brand_lift', 1]
]);

var data = fs.readFileSync('3pas.csv', 'utf8');
var headerLine = data.split('\n', 1)[0];
data = data.substr(headerLine.length);

var columnNames = Array.from(csvUnmarshaller(headerLine)).map(v => v[0]);
var lineObjs = [];

var blacklistData = fs.readFileSync('3pas-blacklist.csv', 'utf8');
var blacklistHeaderLine = blacklistData.split('\n', 1)[0];
blacklistData = blacklistData.substr(blacklistHeaderLine.length);
var blacklistColumnNames = Array.from(csvUnmarshaller(blacklistHeaderLine)).map(v => v[0]);
var blacklistDomainColumnIndex = blacklistColumnNames.findIndex(name => name === 'domain');
console.assert(blacklistDomainColumnIndex !== undefined, '"domain" column not found in blacklist file.');

var marshaller = csvUnmarshaller(blacklistData, 2);
var blacklistDomains = new Set();
var colIndex = 0;
for (var [colData, isEnding] of marshaller) {
  // extracts just the 'domain' column from blacklist file
  if (colIndex === blacklistDomainColumnIndex)
    blacklistDomains.add(colData);
  colIndex++;
  if (isEnding)
    colIndex = 0;
}

var marshaller = csvUnmarshaller(data, 2);
var lineObj = {};
var colIndex = 0;
for (var [colData, isEnding] of marshaller) {
  if (!(columnNames[colIndex] in lineObj))
    lineObj[columnNames[colIndex]] = colData;
  colIndex++;
  if (isEnding) {
    lineObj = {};
    lineObjs.push(lineObj);
    colIndex = 0;
  }
}

// Removes blacklist items.
lineObjs = lineObjs.filter(lineObj => !blacklistDomains.has(lineObj.domain));

var map = new Map();
for (var lineObj of lineObjs) {
  if (lineObj.domain === null || lineObj.domain === undefined ||
      (lineObj.status_allowed !== 'allowed' && lineObj.status_allowed !== 'disallowed'))
    continue;
  lineObj.domain =
      lineObj.domain.trim().toLowerCase().replace(/[^a-z0-9_\-*.]/g, '').replace(/^www\.(?=[^.]+\.[^.]+$)/, '');

  lineObj.name_legal_product = lineObj.name_legal_product.trim()
                                   .replace(/\s\s/g, ' ')
                                   .replace(/[\x00-\x1F]/g, '')
                                   .replace(/&quot;/g, '"')
                                   // The following two lines are to keep input data from currupting output data.
                                   .replace(/","/g, '')
                                   .replace(/},{/g, '')
                                   .replace(/“|”/g, '"')
                                   .replace(/,$/g, '')
                                   .replace(/&amp;/g, '&')
                                   // This is how csv escapes double quotes.
                                   .replace(/""/g, '"');
  if (!map.has(lineObj.domain))
    map.set(lineObj.domain, lineObj);
}

lineObjs = Array.from(map.values());

var map = new Map();
for (var lineObj of lineObjs) {
  if (!lineObj)
    continue;
  var domain = lineObj.domain.trim();
  if (!domain.length)
    continue;
  var prefixSuffix = domain.split('*');
  if (prefixSuffix.length > 2)
    throw 'We do not support multiple * in domains';
  var prefix = '';
  var suffixDomain = '';
  if (prefixSuffix.length === 1) {
    suffixDomain = prefixSuffix[0];
  } else {
    prefix = prefixSuffix[0];
    if (prefix === '')
      prefix = '*';
    suffixDomain = prefixSuffix[1];
  }

  var domainParts = suffixDomain.split('.');
  if (domainParts.length < 2)
    throw 'Invalid domain';
  var baseDomain = domainParts[domainParts.length - 2] + '.' + domainParts[domainParts.length - 1];
  while (domainParts[0] === '')
    domainParts.shift();
  lineObj.domain = domainParts.join('.');
  lineObj.prefix = prefix;

  var mapOfSubdomains = map.get(baseDomain);
  if (!mapOfSubdomains) {
    mapOfSubdomains = new Map();
    map.set(baseDomain, mapOfSubdomains);
  }

  var prefixMap = mapOfSubdomains.get(lineObj.domain);
  if (!prefixMap) {
    prefixMap = new Map();
    mapOfSubdomains.set(lineObj.domain, prefixMap);
  }
  if (prefixMap.has(prefix))
    console.log('Problem with: ', domain, lineObj.domain);
  prefixMap.set(prefix, lineObj);
}

var outputProducts = [];
var outputObj = new Map();
for (var [baseDomain, subdomains] of map) {
  for (var prefixes of subdomains.values()) {
    SKIP_ENTRY: for (var lineObj of prefixes.values()) {
      var prefix = lineObj.prefix;
      var wildLineObj = prefixes.get('*');
      if (wildLineObj && prefix !== '*') {
        if (wildLineObj.name_legal_product === lineObj.name_legal_product) {
          // Skip entry, since wild card is there and already in table.
          continue SKIP_ENTRY;
        }
      }
      var fullSubdomain = lineObj.domain;
      var domainParts = lineObj.domain.split('.');
      // Ignore fist one since we are on it now.
      var previousDomainPart = domainParts.shift();
      var ignoreEntry = false;

      while (domainParts.length > 1) {
        var subdomain = domainParts.join('.');
        var subdomainPrefixes = subdomains.get(subdomain);
        if (subdomainPrefixes) {
          for (var innerLineObj of subdomainPrefixes.values()) {
            if (innerLineObj.prefix === '' || innerLineObj.name_legal_product !== lineObj.name_legal_product)
              continue;
            if (innerLineObj.prefix === '*')
              continue SKIP_ENTRY;
            // Per chat with 3pas team. We need to check prefix on subdomain not top level domain.
            // ie: f*.foo.bar -> [b.f00.foo.bar, true], [f00.foo.bar, true], [f00.b.foo.bar, false]
            if (previousDomainPart.substr(0, innerLineObj.prefix.length) === innerLineObj.prefix)
              continue SKIP_ENTRY;
          }
        }
        previousDomainPart = domainParts.shift();
      }
      var outputPart = outputObj.get(fullSubdomain);
      if (!outputPart) {
        outputPart = {hash: hex_sha1(fullSubdomain).substr(0, 16), prefixes: {}};
        outputObj.set(fullSubdomain, outputPart);
      }
      outputPart.prefixes[lineObj.prefix] = registerOutputProduct(lineObj.name_legal_product, lineObj.type_vendor);
    }
  }
}

console.log(
    '// Copyright 2017 The Chromium Authors. All rights reserved.\n' +
    '// Use of this source code is governed by a BSD-style license that can be\n' +
    '// found in the LICENSE file.\n' +
    '// clang-format off\n' +
    '/* eslint-disable */\n' +
    'ProductRegistryImpl.register([');
var data = JSON.stringify(outputProducts).replace(/","/g, '",\n  "');
console.log('  ' + data.substring(1, data.length - 1));
console.log('],');
console.log('[');
var outputObjArray = Array.from(outputObj.values());
for (var i = 0; i < outputObjArray.length; i++) {
  var obj = outputObjArray[i];
  var lineEnding = (i === outputObjArray.length - 1) ? '' : ',';
  var comments = [];
  for (var prefix in obj.prefixes)
    comments.push('[' + outputProducts[obj.prefixes[prefix].product] + ']');
  console.log('  ' + JSON.stringify(obj) + lineEnding + ' // ' + comments.join(' '));
}
console.log(']);');


// items.forEach(lineObj => console.log(lineObj.name_legal_product.padStart(50), lineObj.domain.padStart(30)));
// console.log("With *: ", items.filter(v => v.domain.indexOf('*') !== -1).length);
// console.log("Total: ", items.length);



// Linear but meh.
function registerOutputProduct(name, type) {
  var index = outputProducts.indexOf(name);
  var typeIndex = registerOutputType(type);
  var outObj = {product: index};
  if (index === -1) {
    outputProducts.push(name);
    outObj.product = outputProducts.length - 1;
  }
  if (typeIndex !== -1)
    outObj.type = typeIndex;
  return outObj;
}

function registerOutputType(type) {
  var index = typeClassifications.get(type);
  if (index === undefined)
    return -1;
  return index;
}

function* csvUnmarshaller(data, lineOffset) {
  var origLen = data.length;
  var colLength = 0;
  var lineNo = lineOffset || 1;
  while (data.length) {
    var colData;
    var match;
    if (data[0] === '"') {
      match = data.match(/^"((?:[^"]|"")*)"(,|\n|$)/m);
      if (!match)
        throw 'Bad data at line ' + lineNo + ' col: ' + colLength + ' ' + data.substr(0, 15);
    } else if (data[0] === '\'') {
      match = data.match(/^'((?:[^']|'')*)'(,|\n|$)/m);
      if (!match)
        throw 'Bad data at line ' + lineNo + ' col: ' + colLength + ' ' + data.substr(0, 15);
    } else {
      match = data.match(/^([^,\r\n]*)(?:,|\r?(\n)|\r?$)/);
      if (!match)
        throw 'Bad data at line ' + lineNo + ' col: ' + colLength + ' ' + data.substr(0, 15);
      match[1] = match[1] === 'NULL' ? null : match[1];
    }
    colLength += match[0].length;
    if (match[2] === '\n') {
      lineNo++;
      colLength = 0;
    }
    yield [match[1], match[2] === '\n'];
    data = data.substr(match[0].length);
  }
}


// All sha1 helpers from here down.


/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_sha1(s) {
  return binb2hex(core_sha1(str2binb(s), s.length * chrsz));
}
function b64_sha1(s) {
  return binb2b64(core_sha1(str2binb(s), s.length * chrsz));
}
function str_sha1(s) {
  return binb2str(core_sha1(str2binb(s), s.length * chrsz));
}
function hex_hmac_sha1(key, data) {
  return binb2hex(core_hmac_sha1(key, data));
}
function b64_hmac_sha1(key, data) {
  return binb2b64(core_hmac_sha1(key, data));
}
function str_hmac_sha1(key, data) {
  return binb2str(core_hmac_sha1(key, data));
}

/*
 * Perform a simple self-test to see if the VM is working
 */
function sha1_vm_test() {
  return hex_sha1('abc') == 'a9993e364706816aba3e25717850c26c9cd0d89d';
}

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function core_sha1(x, len) {
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - len % 32);
  x[((len + 64 >> 9) << 4) + 15] = len;

  var w = Array(80);
  var a = 1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d = 271733878;
  var e = -1009589776;

  for (var i = 0; i < x.length; i += 16) {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;
    var olde = e;

    for (var j = 0; j < 80; j++) {
      if (j < 16)
        w[j] = x[i + j];
      else
        w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
      var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)), safe_add(safe_add(e, w[j]), sha1_kt(j)));
      e = d;
      d = c;
      c = rol(b, 30);
      b = a;
      a = t;
    }

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
    e = safe_add(e, olde);
  }
  return Array(a, b, c, d, e);
}

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
function sha1_ft(t, b, c, d) {
  if (t < 20)
    return (b & c) | ((~b) & d);
  if (t < 40)
    return b ^ c ^ d;
  if (t < 60)
    return (b & c) | (b & d) | (c & d);
  return b ^ c ^ d;
}

/*
 * Determine the appropriate additive constant for the current iteration
 */
function sha1_kt(t) {
  return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 : (t < 60) ? -1894007588 : -899497514;
}

/*
 * Calculate the HMAC-SHA1 of a key and some data
 */
function core_hmac_sha1(key, data) {
  var bkey = str2binb(key);
  if (bkey.length > 16)
    bkey = core_sha1(bkey, key.length * chrsz);

  var ipad = Array(16), opad = Array(16);
  for (var i = 0; i < 16; i++) {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = core_sha1(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
  return core_sha1(opad.concat(hash), 512 + 160);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y) {
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function rol(num, cnt) {
  return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * Convert an 8-bit or 16-bit string to an array of big-endian words
 * In 8-bit function, characters >255 have their hi-byte silently ignored.
 */
function str2binb(str) {
  var bin = Array();
  var mask = (1 << chrsz) - 1;
  for (var i = 0; i < str.length * chrsz; i += chrsz)
    bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (32 - chrsz - i % 32);
  return bin;
}

/*
 * Convert an array of big-endian words to a string
 */
function binb2str(bin) {
  var str = '';
  var mask = (1 << chrsz) - 1;
  for (var i = 0; i < bin.length * 32; i += chrsz)
    str += String.fromCharCode((bin[i >> 5] >>> (32 - chrsz - i % 32)) & mask);
  return str;
}

/*
 * Convert an array of big-endian words to a hex string.
 */
function binb2hex(binarray) {
  var hex_tab = hexcase ? '0123456789ABCDEF' : '0123456789abcdef';
  var str = '';
  for (var i = 0; i < binarray.length * 4; i++) {
    str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) +
        hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF);
  }
  return str;
}

/*
 * Convert an array of big-endian words to a base-64 string
 */
function binb2b64(binarray) {
  var tab = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var str = '';
  for (var i = 0; i < binarray.length * 4; i += 3) {
    var triplet = (((binarray[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16) |
        (((binarray[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8) |
        ((binarray[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF);
    for (var j = 0; j < 4; j++) {
      if (i * 8 + j * 6 > binarray.length * 32)
        str += b64pad;
      else
        str += tab.charAt((triplet >> 6 * (3 - j)) & 0x3F);
    }
  }
  return str;
}
