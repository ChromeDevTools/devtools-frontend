"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _iterateJsdoc = _interopRequireDefault(require("../iterateJsdoc.cjs"));
var _jsdoccomment = require("@es-joy/jsdoccomment");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
var _default = exports.default = (0, _iterateJsdoc.default)(({
  settings,
  utils
}) => {
  if (settings.mode !== 'typescript') {
    return;
  }

  /**
   * @param {import('@es-joy/jsdoccomment').JsdocTagWithInline} tag
   */
  const checkType = tag => {
    const potentialType = tag.type;
    let parsedType;
    try {
      parsedType = (0, _jsdoccomment.parse)(/** @type {string} */potentialType, 'typescript');
    } catch {
      return;
    }
    (0, _jsdoccomment.traverse)(parsedType, nde => {
      switch (nde.type) {
        case 'JsdocTypeObject':
          {
            if (!nde.elements.length) {
              utils.reportJSDoc('No empty object type.', tag);
            }
          }
      }
    });
  };
  const tags = utils.filterTags(({
    tag
  }) => {
    return Boolean(tag !== 'import' && utils.tagMightHaveTypePosition(tag));
  });
  for (const tag of tags) {
    if (tag.type) {
      checkType(tag);
    }
  }
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Warns against use of the empty object type',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/ts-no-empty-object-type.md#repos-sticky-header'
    },
    schema: [],
    type: 'suggestion'
  }
});
module.exports = exports.default;
//# sourceMappingURL=tsNoEmptyObjectType.cjs.map