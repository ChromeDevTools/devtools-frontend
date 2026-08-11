# caniuse-api

<a href="https://github.com/MoOx/react-from-svg?sponsor=1">
  <img width="140" align="right" alt="Sponsoring button" src="https://github.com/moox/.github/raw/main/FUNDING.svg">
</a>

[![npm package version](https://img.shields.io/github/package-json/v/MoOx/caniuse-api) ![npm downloads](https://img.shields.io/npm/dm/caniuse-api)](https://www.npmjs.com/package/caniuse-api)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/MoOx/caniuse-api/test.yml)](https://github.com/MoOx/caniuse-api/actions)
[![License](https://img.shields.io/github/license/MoOx/caniuse-api)](https://github.com/MoOx/caniuse-api)  
![My website moox.io](https://img.shields.io/badge/%F0%9F%8C%90-https%3A%2F%2Fmoox.io-gray?style=social)
[![GitHub followers](https://img.shields.io/github/followers/MoOx?style=social&label=GitHub)](https://github.com/MoOx)
[![LinkedIn Follow](https://img.shields.io/badge/%F0%9F%91%94-LinkedIn-gray?style=social&link=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fmaxthirouin%2F)](https://www.linkedin.com/in/maxthirouin/)
[![BlueSky Follow](https://img.shields.io/badge/BlueSky-%20?style=social&logo=bluesky)](https://bsky.app/profile/moox.io)
[![X Follow](https://img.shields.io/twitter/follow/MoOx?style=social&label=)](https://x.com/MoOx)

> Request [caniuse](https://caniuse.com) data to check browsers compatibilities

## Installation

```console
npm install caniuse-api
```

## Usage

```js
const caniuse = require('caniuse-api')

caniuse.getSupport('border-radius')
caniuse.isSupported('border-radius', 'ie 8, ie 9')
caniuse.setBrowserScope('> 5%, last 1 version')
caniuse.getSupport('border-radius')
// ...
```

## API

#### `caniuse.getSupport(feature)`

_ask since which browsers versions a feature is available_

* `y`: Since which browser version the feature is available
* `n`: Up to which browser version the feature is unavailable
* `a`: Up to which browser version the feature is partially supported
* `x`: Up to which browser version the feature is prefixed

```js
caniuse.getSupport('border-radius', true)
/*
{ and_chr: { y: 67 },
  and_ff: { y: 60 },
  and_qq: { y: 1.2 },
  and_uc: { y: 11.8 },
  android: { y: 2.1, x: 2.1 },
  baidu: { y: 7.12 },
  chrome: { y: 4, x: 4 },
  edge: { y: 12 },
  firefox: { a: 2, x: 3.6, y: 3 },
  ie: { n: 8, y: 9 },
  ie_mob: { y: 10 },
  ios_saf: { y: 3.2, x: 3.2 },
  op_mini: {},
  op_mob: { n: 10, y: 11 },
  opera: { n: 10, y: 10.5 },
  safari: { y: 3.1, x: 4 },
  samsung: { y: 4 } }
*/
```

#### `caniuse.isSupported(feature, browsers)`

_ask if a feature is supported by some browsers_

```js
caniuse.isSupported('border-radius', 'ie 8, ie 9') // false
caniuse.isSupported('border-radius', 'ie 9') // true
```

#### `caniuse.find(query)`

_search for a caniuse feature name_

Ex:

```js
caniuse.find('radius') // ['border-radius']
caniuse.find('nothingness') // []
caniuse.find('css3')
/*
[ 'css3-attr',
  'css3-boxsizing',
  'css3-colors',
  'css3-cursors-grab',
  'css3-cursors-newer',
  'css3-cursors',
  'css3-tabsize' ]
*/
```

#### `caniuse.getLatestStableBrowsers()`

_get the current version for each browser_

```js
caniuse.getLatestStableBrowsers()
/*
[ 'and_chr 67',
  'and_ff 60',
  'and_qq 1.2',
  'and_uc 11.8',
  'android 67',
  'baidu 7.12',
  'bb 10',
  'chrome 67',
  'edge 17',
  'firefox 61',
  'ie 11',
  'ie_mob 11',
  'ios_saf 11.3-11.4',
  'op_mini all',
  'op_mob 46',
  'opera 53',
  'safari 11.1',
  'samsung 7.2' ]
*/
```

#### `caniuse.getBrowserScope()`

_returns a list of browsers currently used for the scope of operations_

```js
caniuse.getBrowserScope()
/*
[ 'and_chr',
  'and_ff',
  'and_qq',
  'and_uc',
  'android',
  'baidu',
  'chrome',
  'edge',
  'firefox',
  'ie',
  'ie_mob',
  'ios_saf',
  'op_mini',
  'op_mob',
  'opera',
  'safari',
  'samsung' ]
*/
```

#### `caniuse.setBrowserScope(browserscope)`

_if you do not like the default browser scope, you can set it globally by using this method_

* browserscope should be a 'autoprefixer' formatted string

```js
caniuse.setBrowserScope('> 5%, last 2 versions, Firefox ESR, Opera 12.1')
```

---

## [Changelog](CHANGELOG.md)

## [License](LICENSE)
