/**
 * @fileoverview the `rules` config for `eslint.config.js`
 * @deprecated use 'flat/rules' instead
 * @author 唯然<weiran.zsd@outlook.com>
 */

'use strict';

const plugin = require('../lib/index.js');

module.exports = plugin.configs['flat/rules'];
