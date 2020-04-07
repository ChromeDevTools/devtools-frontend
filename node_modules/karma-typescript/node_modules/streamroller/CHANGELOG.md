# Streamroller Changelog

## 2.2.3

- [Fix for unhandled promise rejection during cleanup](https://github.com/log4js-node/streamroller/pull/56)

## 2.2.2

- [Fix for overwriting current file when using date rotation](https://github.com/log4js-node/streamroller/pull/54)

## 2.2.1

- Fix for num to keep not working when date pattern is all digits (forgot to do a PR for this one)

## 2.2.0

- [Fallback to copy and truncate when file is busy](https://github.com/log4js-node/streamroller/pull/53)

## 2.1.0

- [Improve Windows support (closing streams)](https://github.com/log4js-node/streamroller/pull/52)

## 2.0.0

- [Remove support for node v6](https://github.com/log4js-node/streamroller/pull/44)
- [Replace lodash with native alternatives](https://github.com/log4js-node/streamroller/pull/45) - thanks [@devoto13](https://github.com/devoto13)
- [Simplify filename formatting and parsing](https://github.com/log4js-node/streamroller/pull/46)
- [Removed async lib from main code](https://github.com/log4js-node/streamroller/pull/47)
- [Fix timezone issues in tests](https://github.com/log4js-node/streamroller/pull/48) - thanks [@devoto13](https://github.com/devoto13)
- [Fix for flag values that need existing file size](https://github.com/log4js-node/streamroller/pull/49)
- [Refactor for better readability](https://github.com/log4js-node/streamroller/pull/50)
- [Removed async lib from test code](https://github.com/log4js-node/streamroller/pull/51)

## 1.0.6

- [Fix for overwriting old backup files](https://github.com/log4js-node/streamroller/pull/43)
- Updated lodash to 4.17.14

## 1.0.5

- [Updated dependencies](https://github.com/log4js-node/streamroller/pull/38)
- [Fix for initial file date when appending to existing file](https://github.com/log4js-node/streamroller/pull/40)

## 1.0.4

- [Fix for initial size when appending to existing file](https://github.com/log4js-node/streamroller/pull/35)

## 1.0.3

- [Fix for crash when pattern is all digits](https://github.com/log4js-node/streamroller/pull/33)

## 1.0.2

- is exactly the same as 1.0.1, due to me being an idiot and not pulling before I pushed

## Previous versions

Previous release details are available by browsing the milestones in github.
