'use strict';var _path = require('path');var _path2 = _interopRequireDefault(_path);

var _resolve = require('eslint-module-utils/resolve');var _resolve2 = _interopRequireDefault(_resolve);
var _importType = require('../core/importType');
var _moduleVisitor = require('eslint-module-utils/moduleVisitor');var _moduleVisitor2 = _interopRequireDefault(_moduleVisitor);
var _docsUrl = require('../docsUrl');var _docsUrl2 = _interopRequireDefault(_docsUrl);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { 'default': obj };}

var enumValues = { 'enum': ['always', 'ignorePackages', 'never'] };
var patternProperties = {
  type: 'object',
  patternProperties: { '.*': enumValues } };

var properties = {
  type: 'object',
  properties: {
    'pattern': patternProperties,
    'ignorePackages': { type: 'boolean' } } };



function buildProperties(context) {

  var result = {
    defaultConfig: 'never',
    pattern: {},
    ignorePackages: false };


  context.options.forEach(function (obj) {

    // If this is a string, set defaultConfig to its value
    if (typeof obj === 'string') {
      result.defaultConfig = obj;
      return;
    }

    // If this is not the new structure, transfer all props to result.pattern
    if (obj.pattern === undefined && obj.ignorePackages === undefined) {
      Object.assign(result.pattern, obj);
      return;
    }

    // If pattern is provided, transfer all props
    if (obj.pattern !== undefined) {
      Object.assign(result.pattern, obj.pattern);
    }

    // If ignorePackages is provided, transfer it to result
    if (obj.ignorePackages !== undefined) {
      result.ignorePackages = obj.ignorePackages;
    }
  });

  if (result.defaultConfig === 'ignorePackages') {
    result.defaultConfig = 'always';
    result.ignorePackages = true;
  }

  return result;
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      url: (0, _docsUrl2['default'])('extensions') },


    schema: {
      anyOf: [
      {
        type: 'array',
        items: [enumValues],
        additionalItems: false },

      {
        type: 'array',
        items: [
        enumValues,
        properties],

        additionalItems: false },

      {
        type: 'array',
        items: [properties],
        additionalItems: false },

      {
        type: 'array',
        items: [patternProperties],
        additionalItems: false },

      {
        type: 'array',
        items: [
        enumValues,
        patternProperties],

        additionalItems: false }] } },





  create: function () {function create(context) {

      var props = buildProperties(context);

      function getModifier(extension) {
        return props.pattern[extension] || props.defaultConfig;
      }

      function isUseOfExtensionRequired(extension, isPackage) {
        return getModifier(extension) === 'always' && (!props.ignorePackages || !isPackage);
      }

      function isUseOfExtensionForbidden(extension) {
        return getModifier(extension) === 'never';
      }

      function isResolvableWithoutExtension(file) {
        var extension = _path2['default'].extname(file);
        var fileWithoutExtension = file.slice(0, -extension.length);
        var resolvedFileWithoutExtension = (0, _resolve2['default'])(fileWithoutExtension, context);

        return resolvedFileWithoutExtension === (0, _resolve2['default'])(file, context);
      }

      function isExternalRootModule(file) {
        var slashCount = file.split('/').length - 1;

        if (slashCount === 0) return true;
        if ((0, _importType.isScopedModule)(file) && slashCount <= 1) return true;
        return false;
      }

      function checkFileExtension(source) {
        // bail if the declaration doesn't have a source, e.g. "export { foo };", or if it's only partially typed like in an editor
        if (!source || !source.value) return;

        var importPathWithQueryString = source.value;

        // don't enforce anything on builtins
        if ((0, _importType.isBuiltIn)(importPathWithQueryString, context.settings)) return;

        var importPath = importPathWithQueryString.replace(/\?(.*)$/, '');

        // don't enforce in root external packages as they may have names with `.js`.
        // Like `import Decimal from decimal.js`)
        if (isExternalRootModule(importPath)) return;

        var resolvedPath = (0, _resolve2['default'])(importPath, context);

        // get extension from resolved path, if possible.
        // for unresolved, use source value.
        var extension = _path2['default'].extname(resolvedPath || importPath).substring(1);

        // determine if this is a module
        var isPackage = (0, _importType.isExternalModule)(
        importPath,
        context.settings,
        (0, _resolve2['default'])(importPath, context),
        context) ||
        (0, _importType.isScoped)(importPath);

        if (!extension || !importPath.endsWith('.' + String(extension))) {
          var extensionRequired = isUseOfExtensionRequired(extension, isPackage);
          var extensionForbidden = isUseOfExtensionForbidden(extension);
          if (extensionRequired && !extensionForbidden) {
            context.report({
              node: source,
              message: 'Missing file extension ' + (
              extension ? '"' + String(extension) + '" ' : '') + 'for "' + String(importPathWithQueryString) + '"' });

          }
        } else if (extension) {
          if (isUseOfExtensionForbidden(extension) && isResolvableWithoutExtension(importPath)) {
            context.report({
              node: source,
              message: 'Unexpected use of file extension "' + String(extension) + '" for "' + String(importPathWithQueryString) + '"' });

          }
        }
      }

      return (0, _moduleVisitor2['default'])(checkFileExtension, { commonjs: true });
    }return create;}() };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ydWxlcy9leHRlbnNpb25zLmpzIl0sIm5hbWVzIjpbImVudW1WYWx1ZXMiLCJwYXR0ZXJuUHJvcGVydGllcyIsInR5cGUiLCJwcm9wZXJ0aWVzIiwiYnVpbGRQcm9wZXJ0aWVzIiwiY29udGV4dCIsInJlc3VsdCIsImRlZmF1bHRDb25maWciLCJwYXR0ZXJuIiwiaWdub3JlUGFja2FnZXMiLCJvcHRpb25zIiwiZm9yRWFjaCIsIm9iaiIsInVuZGVmaW5lZCIsIk9iamVjdCIsImFzc2lnbiIsIm1vZHVsZSIsImV4cG9ydHMiLCJtZXRhIiwiZG9jcyIsInVybCIsInNjaGVtYSIsImFueU9mIiwiaXRlbXMiLCJhZGRpdGlvbmFsSXRlbXMiLCJjcmVhdGUiLCJwcm9wcyIsImdldE1vZGlmaWVyIiwiZXh0ZW5zaW9uIiwiaXNVc2VPZkV4dGVuc2lvblJlcXVpcmVkIiwiaXNQYWNrYWdlIiwiaXNVc2VPZkV4dGVuc2lvbkZvcmJpZGRlbiIsImlzUmVzb2x2YWJsZVdpdGhvdXRFeHRlbnNpb24iLCJmaWxlIiwicGF0aCIsImV4dG5hbWUiLCJmaWxlV2l0aG91dEV4dGVuc2lvbiIsInNsaWNlIiwibGVuZ3RoIiwicmVzb2x2ZWRGaWxlV2l0aG91dEV4dGVuc2lvbiIsImlzRXh0ZXJuYWxSb290TW9kdWxlIiwic2xhc2hDb3VudCIsInNwbGl0IiwiY2hlY2tGaWxlRXh0ZW5zaW9uIiwic291cmNlIiwidmFsdWUiLCJpbXBvcnRQYXRoV2l0aFF1ZXJ5U3RyaW5nIiwic2V0dGluZ3MiLCJpbXBvcnRQYXRoIiwicmVwbGFjZSIsInJlc29sdmVkUGF0aCIsInN1YnN0cmluZyIsImVuZHNXaXRoIiwiZXh0ZW5zaW9uUmVxdWlyZWQiLCJleHRlbnNpb25Gb3JiaWRkZW4iLCJyZXBvcnQiLCJub2RlIiwibWVzc2FnZSIsImNvbW1vbmpzIl0sIm1hcHBpbmdzIjoiYUFBQSw0Qjs7QUFFQSxzRDtBQUNBO0FBQ0Esa0U7QUFDQSxxQzs7QUFFQSxJQUFNQSxhQUFh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b20gJ3BhdGgnO1xuXG5pbXBvcnQgcmVzb2x2ZSBmcm9tICdlc2xpbnQtbW9kdWxlLXV0aWxzL3Jlc29sdmUnO1xuaW1wb3J0IHsgaXNCdWlsdEluLCBpc0V4dGVybmFsTW9kdWxlLCBpc1Njb3BlZCwgaXNTY29wZWRNb2R1bGUgfSBmcm9tICcuLi9jb3JlL2ltcG9ydFR5cGUnO1xuaW1wb3J0IG1vZHVsZVZpc2l0b3IgZnJvbSAnZXNsaW50LW1vZHVsZS11dGlscy9tb2R1bGVWaXNpdG9yJztcbmltcG9ydCBkb2NzVXJsIGZyb20gJy4uL2RvY3NVcmwnO1xuXG5jb25zdCBlbnVtVmFsdWVzID0geyBlbnVtOiBbICdhbHdheXMnLCAnaWdub3JlUGFja2FnZXMnLCAnbmV2ZXInIF0gfTtcbmNvbnN0IHBhdHRlcm5Qcm9wZXJ0aWVzID0ge1xuICB0eXBlOiAnb2JqZWN0JyxcbiAgcGF0dGVyblByb3BlcnRpZXM6IHsgJy4qJzogZW51bVZhbHVlcyB9LFxufTtcbmNvbnN0IHByb3BlcnRpZXMgPSB7XG4gIHR5cGU6ICdvYmplY3QnLFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgJ3BhdHRlcm4nOiBwYXR0ZXJuUHJvcGVydGllcyxcbiAgICAnaWdub3JlUGFja2FnZXMnOiB7IHR5cGU6ICdib29sZWFuJyB9LFxuICB9LFxufTtcblxuZnVuY3Rpb24gYnVpbGRQcm9wZXJ0aWVzKGNvbnRleHQpIHtcblxuICBjb25zdCByZXN1bHQgPSB7XG4gICAgZGVmYXVsdENvbmZpZzogJ25ldmVyJyxcbiAgICBwYXR0ZXJuOiB7fSxcbiAgICBpZ25vcmVQYWNrYWdlczogZmFsc2UsXG4gIH07XG5cbiAgY29udGV4dC5vcHRpb25zLmZvckVhY2gob2JqID0+IHtcblxuICAgIC8vIElmIHRoaXMgaXMgYSBzdHJpbmcsIHNldCBkZWZhdWx0Q29uZmlnIHRvIGl0cyB2YWx1ZVxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAnc3RyaW5nJykge1xuICAgICAgcmVzdWx0LmRlZmF1bHRDb25maWcgPSBvYmo7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgdGhpcyBpcyBub3QgdGhlIG5ldyBzdHJ1Y3R1cmUsIHRyYW5zZmVyIGFsbCBwcm9wcyB0byByZXN1bHQucGF0dGVyblxuICAgIGlmIChvYmoucGF0dGVybiA9PT0gdW5kZWZpbmVkICYmIG9iai5pZ25vcmVQYWNrYWdlcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBPYmplY3QuYXNzaWduKHJlc3VsdC5wYXR0ZXJuLCBvYmopO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIHBhdHRlcm4gaXMgcHJvdmlkZWQsIHRyYW5zZmVyIGFsbCBwcm9wc1xuICAgIGlmIChvYmoucGF0dGVybiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBPYmplY3QuYXNzaWduKHJlc3VsdC5wYXR0ZXJuLCBvYmoucGF0dGVybik7XG4gICAgfVxuXG4gICAgLy8gSWYgaWdub3JlUGFja2FnZXMgaXMgcHJvdmlkZWQsIHRyYW5zZmVyIGl0IHRvIHJlc3VsdFxuICAgIGlmIChvYmouaWdub3JlUGFja2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmVzdWx0Lmlnbm9yZVBhY2thZ2VzID0gb2JqLmlnbm9yZVBhY2thZ2VzO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKHJlc3VsdC5kZWZhdWx0Q29uZmlnID09PSAnaWdub3JlUGFja2FnZXMnKSB7XG4gICAgcmVzdWx0LmRlZmF1bHRDb25maWcgPSAnYWx3YXlzJztcbiAgICByZXN1bHQuaWdub3JlUGFja2FnZXMgPSB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIG1ldGE6IHtcbiAgICB0eXBlOiAnc3VnZ2VzdGlvbicsXG4gICAgZG9jczoge1xuICAgICAgdXJsOiBkb2NzVXJsKCdleHRlbnNpb25zJyksXG4gICAgfSxcblxuICAgIHNjaGVtYToge1xuICAgICAgYW55T2Y6IFtcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgaXRlbXM6IFtlbnVtVmFsdWVzXSxcbiAgICAgICAgICBhZGRpdGlvbmFsSXRlbXM6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICBpdGVtczogW1xuICAgICAgICAgICAgZW51bVZhbHVlcyxcbiAgICAgICAgICAgIHByb3BlcnRpZXMsXG4gICAgICAgICAgXSxcbiAgICAgICAgICBhZGRpdGlvbmFsSXRlbXM6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICBpdGVtczogW3Byb3BlcnRpZXNdLFxuICAgICAgICAgIGFkZGl0aW9uYWxJdGVtczogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgIGl0ZW1zOiBbcGF0dGVyblByb3BlcnRpZXNdLFxuICAgICAgICAgIGFkZGl0aW9uYWxJdGVtczogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgIGl0ZW1zOiBbXG4gICAgICAgICAgICBlbnVtVmFsdWVzLFxuICAgICAgICAgICAgcGF0dGVyblByb3BlcnRpZXMsXG4gICAgICAgICAgXSxcbiAgICAgICAgICBhZGRpdGlvbmFsSXRlbXM6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICB9LFxuXG4gIGNyZWF0ZShjb250ZXh0KSB7XG5cbiAgICBjb25zdCBwcm9wcyA9IGJ1aWxkUHJvcGVydGllcyhjb250ZXh0KTtcblxuICAgIGZ1bmN0aW9uIGdldE1vZGlmaWVyKGV4dGVuc2lvbikge1xuICAgICAgcmV0dXJuIHByb3BzLnBhdHRlcm5bZXh0ZW5zaW9uXSB8fCBwcm9wcy5kZWZhdWx0Q29uZmlnO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVXNlT2ZFeHRlbnNpb25SZXF1aXJlZChleHRlbnNpb24sIGlzUGFja2FnZSkge1xuICAgICAgcmV0dXJuIGdldE1vZGlmaWVyKGV4dGVuc2lvbikgPT09ICdhbHdheXMnICYmICghcHJvcHMuaWdub3JlUGFja2FnZXMgfHwgIWlzUGFja2FnZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNVc2VPZkV4dGVuc2lvbkZvcmJpZGRlbihleHRlbnNpb24pIHtcbiAgICAgIHJldHVybiBnZXRNb2RpZmllcihleHRlbnNpb24pID09PSAnbmV2ZXInO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzUmVzb2x2YWJsZVdpdGhvdXRFeHRlbnNpb24oZmlsZSkge1xuICAgICAgY29uc3QgZXh0ZW5zaW9uID0gcGF0aC5leHRuYW1lKGZpbGUpO1xuICAgICAgY29uc3QgZmlsZVdpdGhvdXRFeHRlbnNpb24gPSBmaWxlLnNsaWNlKDAsIC1leHRlbnNpb24ubGVuZ3RoKTtcbiAgICAgIGNvbnN0IHJlc29sdmVkRmlsZVdpdGhvdXRFeHRlbnNpb24gPSByZXNvbHZlKGZpbGVXaXRob3V0RXh0ZW5zaW9uLCBjb250ZXh0KTtcblxuICAgICAgcmV0dXJuIHJlc29sdmVkRmlsZVdpdGhvdXRFeHRlbnNpb24gPT09IHJlc29sdmUoZmlsZSwgY29udGV4dCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNFeHRlcm5hbFJvb3RNb2R1bGUoZmlsZSkge1xuICAgICAgY29uc3Qgc2xhc2hDb3VudCA9IGZpbGUuc3BsaXQoJy8nKS5sZW5ndGggLSAxO1xuXG4gICAgICBpZiAoc2xhc2hDb3VudCA9PT0gMCkgIHJldHVybiB0cnVlO1xuICAgICAgaWYgKGlzU2NvcGVkTW9kdWxlKGZpbGUpICYmIHNsYXNoQ291bnQgPD0gMSkgcmV0dXJuIHRydWU7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2tGaWxlRXh0ZW5zaW9uKHNvdXJjZSkge1xuICAgICAgLy8gYmFpbCBpZiB0aGUgZGVjbGFyYXRpb24gZG9lc24ndCBoYXZlIGEgc291cmNlLCBlLmcuIFwiZXhwb3J0IHsgZm9vIH07XCIsIG9yIGlmIGl0J3Mgb25seSBwYXJ0aWFsbHkgdHlwZWQgbGlrZSBpbiBhbiBlZGl0b3JcbiAgICAgIGlmICghc291cmNlIHx8ICFzb3VyY2UudmFsdWUpIHJldHVybjtcbiAgICAgIFxuICAgICAgY29uc3QgaW1wb3J0UGF0aFdpdGhRdWVyeVN0cmluZyA9IHNvdXJjZS52YWx1ZTtcblxuICAgICAgLy8gZG9uJ3QgZW5mb3JjZSBhbnl0aGluZyBvbiBidWlsdGluc1xuICAgICAgaWYgKGlzQnVpbHRJbihpbXBvcnRQYXRoV2l0aFF1ZXJ5U3RyaW5nLCBjb250ZXh0LnNldHRpbmdzKSkgcmV0dXJuO1xuXG4gICAgICBjb25zdCBpbXBvcnRQYXRoID0gaW1wb3J0UGF0aFdpdGhRdWVyeVN0cmluZy5yZXBsYWNlKC9cXD8oLiopJC8sICcnKTtcblxuICAgICAgLy8gZG9uJ3QgZW5mb3JjZSBpbiByb290IGV4dGVybmFsIHBhY2thZ2VzIGFzIHRoZXkgbWF5IGhhdmUgbmFtZXMgd2l0aCBgLmpzYC5cbiAgICAgIC8vIExpa2UgYGltcG9ydCBEZWNpbWFsIGZyb20gZGVjaW1hbC5qc2ApXG4gICAgICBpZiAoaXNFeHRlcm5hbFJvb3RNb2R1bGUoaW1wb3J0UGF0aCkpIHJldHVybjtcblxuICAgICAgY29uc3QgcmVzb2x2ZWRQYXRoID0gcmVzb2x2ZShpbXBvcnRQYXRoLCBjb250ZXh0KTtcblxuICAgICAgLy8gZ2V0IGV4dGVuc2lvbiBmcm9tIHJlc29sdmVkIHBhdGgsIGlmIHBvc3NpYmxlLlxuICAgICAgLy8gZm9yIHVucmVzb2x2ZWQsIHVzZSBzb3VyY2UgdmFsdWUuXG4gICAgICBjb25zdCBleHRlbnNpb24gPSBwYXRoLmV4dG5hbWUocmVzb2x2ZWRQYXRoIHx8IGltcG9ydFBhdGgpLnN1YnN0cmluZygxKTtcblxuICAgICAgLy8gZGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBtb2R1bGVcbiAgICAgIGNvbnN0IGlzUGFja2FnZSA9IGlzRXh0ZXJuYWxNb2R1bGUoXG4gICAgICAgIGltcG9ydFBhdGgsXG4gICAgICAgIGNvbnRleHQuc2V0dGluZ3MsXG4gICAgICAgIHJlc29sdmUoaW1wb3J0UGF0aCwgY29udGV4dCksXG4gICAgICAgIGNvbnRleHRcbiAgICAgICkgfHwgaXNTY29wZWQoaW1wb3J0UGF0aCk7XG5cbiAgICAgIGlmICghZXh0ZW5zaW9uIHx8ICFpbXBvcnRQYXRoLmVuZHNXaXRoKGAuJHtleHRlbnNpb259YCkpIHtcbiAgICAgICAgY29uc3QgZXh0ZW5zaW9uUmVxdWlyZWQgPSBpc1VzZU9mRXh0ZW5zaW9uUmVxdWlyZWQoZXh0ZW5zaW9uLCBpc1BhY2thZ2UpO1xuICAgICAgICBjb25zdCBleHRlbnNpb25Gb3JiaWRkZW4gPSBpc1VzZU9mRXh0ZW5zaW9uRm9yYmlkZGVuKGV4dGVuc2lvbik7XG4gICAgICAgIGlmIChleHRlbnNpb25SZXF1aXJlZCAmJiAhZXh0ZW5zaW9uRm9yYmlkZGVuKSB7XG4gICAgICAgICAgY29udGV4dC5yZXBvcnQoe1xuICAgICAgICAgICAgbm9kZTogc291cmNlLFxuICAgICAgICAgICAgbWVzc2FnZTpcbiAgICAgICAgICAgICAgYE1pc3NpbmcgZmlsZSBleHRlbnNpb24gJHtleHRlbnNpb24gPyBgXCIke2V4dGVuc2lvbn1cIiBgIDogJyd9Zm9yIFwiJHtpbXBvcnRQYXRoV2l0aFF1ZXJ5U3RyaW5nfVwiYCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChleHRlbnNpb24pIHtcbiAgICAgICAgaWYgKGlzVXNlT2ZFeHRlbnNpb25Gb3JiaWRkZW4oZXh0ZW5zaW9uKSAmJiBpc1Jlc29sdmFibGVXaXRob3V0RXh0ZW5zaW9uKGltcG9ydFBhdGgpKSB7XG4gICAgICAgICAgY29udGV4dC5yZXBvcnQoe1xuICAgICAgICAgICAgbm9kZTogc291cmNlLFxuICAgICAgICAgICAgbWVzc2FnZTogYFVuZXhwZWN0ZWQgdXNlIG9mIGZpbGUgZXh0ZW5zaW9uIFwiJHtleHRlbnNpb259XCIgZm9yIFwiJHtpbXBvcnRQYXRoV2l0aFF1ZXJ5U3RyaW5nfVwiYCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBtb2R1bGVWaXNpdG9yKGNoZWNrRmlsZUV4dGVuc2lvbiwgeyBjb21tb25qczogdHJ1ZSB9KTtcbiAgfSxcbn07XG4iXX0=