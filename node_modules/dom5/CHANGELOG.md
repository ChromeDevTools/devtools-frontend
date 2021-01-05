# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

<!-- ## Unreleased -->
<!-- Add new, unreleased changes here. -->

## [v3.0.1] (2018-06-28)
- Fix NPM audit warnings.

## [v3.0.0](https://github.com/Polymer/dom5/tree/v3.0.0) (2018-02-12)
- [BREAKING] Updated to parse5 v4. See:
  - http://inikulin.github.io/parse5/#4-0-0 and
    http://inikulin.github.io/parse5/#3-0-0
  - Most users will not be affected by these changes.
- [BREAKING] Minimum supported version of node updated to v6 or above.
- [Upcoming breaking change] We've redesigned our DOM walking API around
  iteration rather than callbacks. Import `'dom5/lib/index-next.js'` to receive
  the new API. This will be the API exposed in the next major version.
  Specifically, the `nodeWalk`, `nodeWalkAll`, `nodeWalkPrior`,
  `nodeWalkAllPrior`, and `nodeWalkAncestors` APIs are replaced by `depthFirst`,
  `prior`, and `ancestors` APIs, which simply iterators now. In addition
  `queryAll` will return an iterator rather than an array.
- Moved development-only dependencies in package.json to devDependencies.
<!-- Add new, unreleased changes here. -->

## [v2.3.0](https://github.com/Polymer/dom5/tree/v2.3.0) (2017-05-03)
- **Added** `insertAfter()` function

## [v2.2.0](https://github.com/Polymer/dom5/tree/v2.2.0) (2017-04-14)
- **Added** `removeFakeRootElements` and `removeNodeSaveChildren` functions.

## [v2.1.0](https://github.com/Polymer/dom5/tree/v2.1.0) (2017-01-13)
- **Added** Option to node traversal methods to traverse templates

## [v2.0.1](https://github.com/Polymer/dom5/tree/v2.0.1) (2016-11-01)
- TypeScript type definition fixes

## [v2.0.0](https://github.com/Polymer/dom5/tree/v2.0.0) (2016-09-23)
- Upgraded to `parse5@^v2.2.1`.
- (*breaking*) Because parse5 2.x correctly handles `<template>` elements,
  the nodeWalk* and query* functions will no longer return results from within
  `<template>`s. Code that relied on this must explicitly walk into template
  content documents.
- (*breaking*) Removed `parse()`, `parseFragment()` and `serialize()`. Use
  `parse5.parse()`, etc., instead.
- Nodes can be appended to parents with a `null` `childNodes` array.
- DocumentFragments that are appended have their `childNodes` array cleared,
  rather than getting a new empty `childNodes` instance.
