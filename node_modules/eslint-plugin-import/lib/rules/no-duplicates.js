'use strict';var _slicedToArray = function () {function sliceIterator(arr, i) {var _arr = [];var _n = true;var _d = false;var _e = undefined;try {for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {_arr.push(_s.value);if (i && _arr.length === i) break;}} catch (err) {_d = true;_e = err;} finally {try {if (!_n && _i["return"]) _i["return"]();} finally {if (_d) throw _e;}}return _arr;}return function (arr, i) {if (Array.isArray(arr)) {return arr;} else if (Symbol.iterator in Object(arr)) {return sliceIterator(arr, i);} else {throw new TypeError("Invalid attempt to destructure non-iterable instance");}};}();var _resolve = require('eslint-module-utils/resolve');var _resolve2 = _interopRequireDefault(_resolve);
var _docsUrl = require('../docsUrl');var _docsUrl2 = _interopRequireDefault(_docsUrl);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { 'default': obj };}function _toConsumableArray(arr) {if (Array.isArray(arr)) {for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {arr2[i] = arr[i];}return arr2;} else {return Array.from(arr);}}function _toArray(arr) {return Array.isArray(arr) ? arr : Array.from(arr);}

function checkImports(imported, context) {var _iteratorNormalCompletion = true;var _didIteratorError = false;var _iteratorError = undefined;try {
    for (var _iterator = imported.entries()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {var _ref = _step.value;var _ref2 = _slicedToArray(_ref, 2);var _module = _ref2[0];var nodes = _ref2[1];
      if (nodes.length > 1) {
        var message = '\'' + String(_module) + '\' imported multiple times.';var _nodes = _toArray(
        nodes),first = _nodes[0],rest = _nodes.slice(1);
        var sourceCode = context.getSourceCode();
        var fix = getFix(first, rest, sourceCode);

        context.report({
          node: first.source,
          message: message,
          fix: fix // Attach the autofix (if any) to the first import.
        });var _iteratorNormalCompletion2 = true;var _didIteratorError2 = false;var _iteratorError2 = undefined;try {

          for (var _iterator2 = rest[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {var node = _step2.value;
            context.report({
              node: node.source,
              message: message });

          }} catch (err) {_didIteratorError2 = true;_iteratorError2 = err;} finally {try {if (!_iteratorNormalCompletion2 && _iterator2['return']) {_iterator2['return']();}} finally {if (_didIteratorError2) {throw _iteratorError2;}}}
      }
    }} catch (err) {_didIteratorError = true;_iteratorError = err;} finally {try {if (!_iteratorNormalCompletion && _iterator['return']) {_iterator['return']();}} finally {if (_didIteratorError) {throw _iteratorError;}}}
}

function getFix(first, rest, sourceCode) {
  // Sorry ESLint <= 3 users, no autofix for you. Autofixing duplicate imports
  // requires multiple `fixer.whatever()` calls in the `fix`: We both need to
  // update the first one, and remove the rest. Support for multiple
  // `fixer.whatever()` in a single `fix` was added in ESLint 4.1.
  // `sourceCode.getCommentsBefore` was added in 4.0, so that's an easy thing to
  // check for.
  if (typeof sourceCode.getCommentsBefore !== 'function') {
    return undefined;
  }

  // Adjusting the first import might make it multiline, which could break
  // `eslint-disable-next-line` comments and similar, so bail if the first
  // import has comments. Also, if the first import is `import * as ns from
  // './foo'` there's nothing we can do.
  if (hasProblematicComments(first, sourceCode) || hasNamespace(first)) {
    return undefined;
  }

  var defaultImportNames = new Set(
  [first].concat(_toConsumableArray(rest)).map(getDefaultImportName).filter(Boolean));


  // Bail if there are multiple different default import names – it's up to the
  // user to choose which one to keep.
  if (defaultImportNames.size > 1) {
    return undefined;
  }

  // Leave it to the user to handle comments. Also skip `import * as ns from
  // './foo'` imports, since they cannot be merged into another import.
  var restWithoutComments = rest.filter(function (node) {return !(
    hasProblematicComments(node, sourceCode) ||
    hasNamespace(node));});


  var specifiers = restWithoutComments.
  map(function (node) {
    var tokens = sourceCode.getTokens(node);
    var openBrace = tokens.find(function (token) {return isPunctuator(token, '{');});
    var closeBrace = tokens.find(function (token) {return isPunctuator(token, '}');});

    if (openBrace == null || closeBrace == null) {
      return undefined;
    }

    return {
      importNode: node,
      text: sourceCode.text.slice(openBrace.range[1], closeBrace.range[0]),
      hasTrailingComma: isPunctuator(sourceCode.getTokenBefore(closeBrace), ','),
      isEmpty: !hasSpecifiers(node) };

  }).
  filter(Boolean);

  var unnecessaryImports = restWithoutComments.filter(function (node) {return (
      !hasSpecifiers(node) &&
      !hasNamespace(node) &&
      !specifiers.some(function (specifier) {return specifier.importNode === node;}));});


  var shouldAddDefault = getDefaultImportName(first) == null && defaultImportNames.size === 1;
  var shouldAddSpecifiers = specifiers.length > 0;
  var shouldRemoveUnnecessary = unnecessaryImports.length > 0;

  if (!(shouldAddDefault || shouldAddSpecifiers || shouldRemoveUnnecessary)) {
    return undefined;
  }

  return function (fixer) {
    var tokens = sourceCode.getTokens(first);
    var openBrace = tokens.find(function (token) {return isPunctuator(token, '{');});
    var closeBrace = tokens.find(function (token) {return isPunctuator(token, '}');});
    var firstToken = sourceCode.getFirstToken(first);var _defaultImportNames = _slicedToArray(
    defaultImportNames, 1),defaultImportName = _defaultImportNames[0];

    var firstHasTrailingComma =
    closeBrace != null &&
    isPunctuator(sourceCode.getTokenBefore(closeBrace), ',');
    var firstIsEmpty = !hasSpecifiers(first);var _specifiers$reduce =

    specifiers.reduce(
    function (_ref3, specifier) {var _ref4 = _slicedToArray(_ref3, 2),result = _ref4[0],needsComma = _ref4[1];
      return [
      needsComma && !specifier.isEmpty ? String(
      result) + ',' + String(specifier.text) : '' + String(
      result) + String(specifier.text),
      specifier.isEmpty ? needsComma : true];

    },
    ['', !firstHasTrailingComma && !firstIsEmpty]),_specifiers$reduce2 = _slicedToArray(_specifiers$reduce, 1),specifiersText = _specifiers$reduce2[0];


    var fixes = [];

    if (shouldAddDefault && openBrace == null && shouldAddSpecifiers) {
      // `import './foo'` → `import def, {...} from './foo'`
      fixes.push(
      fixer.insertTextAfter(firstToken, ' ' + String(defaultImportName) + ', {' + String(specifiersText) + '} from'));

    } else if (shouldAddDefault && openBrace == null && !shouldAddSpecifiers) {
      // `import './foo'` → `import def from './foo'`
      fixes.push(fixer.insertTextAfter(firstToken, ' ' + String(defaultImportName) + ' from'));
    } else if (shouldAddDefault && openBrace != null && closeBrace != null) {
      // `import {...} from './foo'` → `import def, {...} from './foo'`
      fixes.push(fixer.insertTextAfter(firstToken, ' ' + String(defaultImportName) + ','));
      if (shouldAddSpecifiers) {
        // `import def, {...} from './foo'` → `import def, {..., ...} from './foo'`
        fixes.push(fixer.insertTextBefore(closeBrace, specifiersText));
      }
    } else if (!shouldAddDefault && openBrace == null && shouldAddSpecifiers) {
      if (first.specifiers.length === 0) {
        // `import './foo'` → `import {...} from './foo'`
        fixes.push(fixer.insertTextAfter(firstToken, ' {' + String(specifiersText) + '} from'));
      } else {
        // `import def from './foo'` → `import def, {...} from './foo'`
        fixes.push(fixer.insertTextAfter(first.specifiers[0], ', {' + String(specifiersText) + '}'));
      }
    } else if (!shouldAddDefault && openBrace != null && closeBrace != null) {
      // `import {...} './foo'` → `import {..., ...} from './foo'`
      fixes.push(fixer.insertTextBefore(closeBrace, specifiersText));
    }

    // Remove imports whose specifiers have been moved into the first import.
    var _iteratorNormalCompletion3 = true;var _didIteratorError3 = false;var _iteratorError3 = undefined;try {for (var _iterator3 = specifiers[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {var specifier = _step3.value;
        var importNode = specifier.importNode;
        fixes.push(fixer.remove(importNode));

        var charAfterImportRange = [importNode.range[1], importNode.range[1] + 1];
        var charAfterImport = sourceCode.text.substring(charAfterImportRange[0], charAfterImportRange[1]);
        if (charAfterImport === '\n') {
          fixes.push(fixer.removeRange(charAfterImportRange));
        }
      }

      // Remove imports whose default import has been moved to the first import,
      // and side-effect-only imports that are unnecessary due to the first
      // import.
    } catch (err) {_didIteratorError3 = true;_iteratorError3 = err;} finally {try {if (!_iteratorNormalCompletion3 && _iterator3['return']) {_iterator3['return']();}} finally {if (_didIteratorError3) {throw _iteratorError3;}}}var _iteratorNormalCompletion4 = true;var _didIteratorError4 = false;var _iteratorError4 = undefined;try {for (var _iterator4 = unnecessaryImports[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {var node = _step4.value;
        fixes.push(fixer.remove(node));

        var charAfterImportRange = [node.range[1], node.range[1] + 1];
        var charAfterImport = sourceCode.text.substring(charAfterImportRange[0], charAfterImportRange[1]);
        if (charAfterImport === '\n') {
          fixes.push(fixer.removeRange(charAfterImportRange));
        }
      }} catch (err) {_didIteratorError4 = true;_iteratorError4 = err;} finally {try {if (!_iteratorNormalCompletion4 && _iterator4['return']) {_iterator4['return']();}} finally {if (_didIteratorError4) {throw _iteratorError4;}}}

    return fixes;
  };
}

function isPunctuator(node, value) {
  return node.type === 'Punctuator' && node.value === value;
}

// Get the name of the default import of `node`, if any.
function getDefaultImportName(node) {
  var defaultSpecifier = node.specifiers.
  find(function (specifier) {return specifier.type === 'ImportDefaultSpecifier';});
  return defaultSpecifier != null ? defaultSpecifier.local.name : undefined;
}

// Checks whether `node` has a namespace import.
function hasNamespace(node) {
  var specifiers = node.specifiers.
  filter(function (specifier) {return specifier.type === 'ImportNamespaceSpecifier';});
  return specifiers.length > 0;
}

// Checks whether `node` has any non-default specifiers.
function hasSpecifiers(node) {
  var specifiers = node.specifiers.
  filter(function (specifier) {return specifier.type === 'ImportSpecifier';});
  return specifiers.length > 0;
}

// It's not obvious what the user wants to do with comments associated with
// duplicate imports, so skip imports with comments when autofixing.
function hasProblematicComments(node, sourceCode) {
  return (
    hasCommentBefore(node, sourceCode) ||
    hasCommentAfter(node, sourceCode) ||
    hasCommentInsideNonSpecifiers(node, sourceCode));

}

// Checks whether `node` has a comment (that ends) on the previous line or on
// the same line as `node` (starts).
function hasCommentBefore(node, sourceCode) {
  return sourceCode.getCommentsBefore(node).
  some(function (comment) {return comment.loc.end.line >= node.loc.start.line - 1;});
}

// Checks whether `node` has a comment (that starts) on the same line as `node`
// (ends).
function hasCommentAfter(node, sourceCode) {
  return sourceCode.getCommentsAfter(node).
  some(function (comment) {return comment.loc.start.line === node.loc.end.line;});
}

// Checks whether `node` has any comments _inside,_ except inside the `{...}`
// part (if any).
function hasCommentInsideNonSpecifiers(node, sourceCode) {
  var tokens = sourceCode.getTokens(node);
  var openBraceIndex = tokens.findIndex(function (token) {return isPunctuator(token, '{');});
  var closeBraceIndex = tokens.findIndex(function (token) {return isPunctuator(token, '}');});
  // Slice away the first token, since we're no looking for comments _before_
  // `node` (only inside). If there's a `{...}` part, look for comments before
  // the `{`, but not before the `}` (hence the `+1`s).
  var someTokens = openBraceIndex >= 0 && closeBraceIndex >= 0 ?
  tokens.slice(1, openBraceIndex + 1).concat(tokens.slice(closeBraceIndex + 1)) :
  tokens.slice(1);
  return someTokens.some(function (token) {return sourceCode.getCommentsBefore(token).length > 0;});
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      url: (0, _docsUrl2['default'])('no-duplicates') },

    fixable: 'code',
    schema: [
    {
      type: 'object',
      properties: {
        considerQueryString: {
          type: 'boolean' } },


      additionalProperties: false }] },




  create: function () {function create(context) {
      // Prepare the resolver from options.
      var considerQueryStringOption = context.options[0] &&
      context.options[0]['considerQueryString'];
      var defaultResolver = function () {function defaultResolver(sourcePath) {return (0, _resolve2['default'])(sourcePath, context) || sourcePath;}return defaultResolver;}();
      var resolver = considerQueryStringOption ? function (sourcePath) {
        var parts = sourcePath.match(/^([^?]*)\?(.*)$/);
        if (!parts) {
          return defaultResolver(sourcePath);
        }
        return defaultResolver(parts[1]) + '?' + parts[2];
      } : defaultResolver;

      var imported = new Map();
      var nsImported = new Map();
      var defaultTypesImported = new Map();
      var namedTypesImported = new Map();

      function getImportMap(n) {
        if (n.importKind === 'type') {
          return n.specifiers.length > 0 && n.specifiers[0].type === 'ImportDefaultSpecifier' ? defaultTypesImported : namedTypesImported;
        }

        return hasNamespace(n) ? nsImported : imported;
      }

      return {
        ImportDeclaration: function () {function ImportDeclaration(n) {
            // resolved path will cover aliased duplicates
            var resolvedPath = resolver(n.source.value);
            var importMap = getImportMap(n);

            if (importMap.has(resolvedPath)) {
              importMap.get(resolvedPath).push(n);
            } else {
              importMap.set(resolvedPath, [n]);
            }
          }return ImportDeclaration;}(),

        'Program:exit': function () {function ProgramExit() {
            checkImports(imported, context);
            checkImports(nsImported, context);
            checkImports(defaultTypesImported, context);
            checkImports(namedTypesImported, context);
          }return ProgramExit;}() };

    }return create;}() };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ydWxlcy9uby1kdXBsaWNhdGVzLmpzIl0sIm5hbWVzIjpbImNoZWNrSW1wb3J0cyIsImltcG9ydGVkIiwiY29udGV4dCIsImVudHJpZXMiLCJtb2R1bGUiLCJub2RlcyIsImxlbmd0aCIsIm1lc3NhZ2UiLCJmaXJzdCIsInJlc3QiLCJzb3VyY2VDb2RlIiwiZ2V0U291cmNlQ29kZSIsImZpeCIsImdldEZpeCIsInJlcG9ydCIsIm5vZGUiLCJzb3VyY2UiLCJnZXRDb21tZW50c0JlZm9yZSIsInVuZGVmaW5lZCIsImhhc1Byb2JsZW1hdGljQ29tbWVudHMiLCJoYXNOYW1lc3BhY2UiLCJkZWZhdWx0SW1wb3J0TmFtZXMiLCJTZXQiLCJtYXAiLCJnZXREZWZhdWx0SW1wb3J0TmFtZSIsImZpbHRlciIsIkJvb2xlYW4iLCJzaXplIiwicmVzdFdpdGhvdXRDb21tZW50cyIsInNwZWNpZmllcnMiLCJ0b2tlbnMiLCJnZXRUb2tlbnMiLCJvcGVuQnJhY2UiLCJmaW5kIiwiaXNQdW5jdHVhdG9yIiwidG9rZW4iLCJjbG9zZUJyYWNlIiwiaW1wb3J0Tm9kZSIsInRleHQiLCJzbGljZSIsInJhbmdlIiwiaGFzVHJhaWxpbmdDb21tYSIsImdldFRva2VuQmVmb3JlIiwiaXNFbXB0eSIsImhhc1NwZWNpZmllcnMiLCJ1bm5lY2Vzc2FyeUltcG9ydHMiLCJzb21lIiwic3BlY2lmaWVyIiwic2hvdWxkQWRkRGVmYXVsdCIsInNob3VsZEFkZFNwZWNpZmllcnMiLCJzaG91bGRSZW1vdmVVbm5lY2Vzc2FyeSIsImZpcnN0VG9rZW4iLCJnZXRGaXJzdFRva2VuIiwiZGVmYXVsdEltcG9ydE5hbWUiLCJmaXJzdEhhc1RyYWlsaW5nQ29tbWEiLCJmaXJzdElzRW1wdHkiLCJyZWR1Y2UiLCJyZXN1bHQiLCJuZWVkc0NvbW1hIiwic3BlY2lmaWVyc1RleHQiLCJmaXhlcyIsInB1c2giLCJmaXhlciIsImluc2VydFRleHRBZnRlciIsImluc2VydFRleHRCZWZvcmUiLCJyZW1vdmUiLCJjaGFyQWZ0ZXJJbXBvcnRSYW5nZSIsImNoYXJBZnRlckltcG9ydCIsInN1YnN0cmluZyIsInJlbW92ZVJhbmdlIiwidmFsdWUiLCJ0eXBlIiwiZGVmYXVsdFNwZWNpZmllciIsImxvY2FsIiwibmFtZSIsImhhc0NvbW1lbnRCZWZvcmUiLCJoYXNDb21tZW50QWZ0ZXIiLCJoYXNDb21tZW50SW5zaWRlTm9uU3BlY2lmaWVycyIsImNvbW1lbnQiLCJsb2MiLCJlbmQiLCJsaW5lIiwic3RhcnQiLCJnZXRDb21tZW50c0FmdGVyIiwib3BlbkJyYWNlSW5kZXgiLCJmaW5kSW5kZXgiLCJjbG9zZUJyYWNlSW5kZXgiLCJzb21lVG9rZW5zIiwiY29uY2F0IiwiZXhwb3J0cyIsIm1ldGEiLCJkb2NzIiwidXJsIiwiZml4YWJsZSIsInNjaGVtYSIsInByb3BlcnRpZXMiLCJjb25zaWRlclF1ZXJ5U3RyaW5nIiwiYWRkaXRpb25hbFByb3BlcnRpZXMiLCJjcmVhdGUiLCJjb25zaWRlclF1ZXJ5U3RyaW5nT3B0aW9uIiwib3B0aW9ucyIsImRlZmF1bHRSZXNvbHZlciIsInNvdXJjZVBhdGgiLCJyZXNvbHZlciIsInBhcnRzIiwibWF0Y2giLCJNYXAiLCJuc0ltcG9ydGVkIiwiZGVmYXVsdFR5cGVzSW1wb3J0ZWQiLCJuYW1lZFR5cGVzSW1wb3J0ZWQiLCJnZXRJbXBvcnRNYXAiLCJuIiwiaW1wb3J0S2luZCIsIkltcG9ydERlY2xhcmF0aW9uIiwicmVzb2x2ZWRQYXRoIiwiaW1wb3J0TWFwIiwiaGFzIiwiZ2V0Iiwic2V0Il0sIm1hcHBpbmdzIjoicW9CQUFBLHNEO0FBQ0EscUM7O0FBRUEsU0FBU0EsWUFBVCxDQUFzQkMsUUFBdEIsRUFBZ0NDLE9BQWhDLEVBQXlDO0FBQ3ZDLHlCQUE4QkQsU0FBU0UsT0FBVCxFQUE5Qiw4SEFBa0QsZ0VBQXRDQyxPQUFzQyxnQkFBOUJDLEtBQThCO0FBQ2hELFVBQUlBLE1BQU1DLE1BQU4sR0FBZSxDQUFuQixFQUFzQjtBQUNwQixZQUFNQyx3QkFBY0gsT0FB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LHlCQUFhQyxRQUFiLEVBQXVCQyxPQUF2QjtBQUNBRix5QkFBYTJHLFVBQWIsRUFBeUJ6RyxPQUF6QjtBQUNBRix5QkFBYTRHLG9CQUFiLEVBQW1DMUcsT0FBbkM7QUFDQUYseUJBQWE2RyxrQkFBYixFQUFpQzNHLE9BQWpDO0FBQ0QsV0FMRCxzQkFiSyxFQUFQOztBQW9CRCxLQWxFYyxtQkFBakIiLCJmaWxlIjoibm8tZHVwbGljYXRlcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCByZXNvbHZlIGZyb20gJ2VzbGludC1tb2R1bGUtdXRpbHMvcmVzb2x2ZSc7XG5pbXBvcnQgZG9jc1VybCBmcm9tICcuLi9kb2NzVXJsJztcblxuZnVuY3Rpb24gY2hlY2tJbXBvcnRzKGltcG9ydGVkLCBjb250ZXh0KSB7XG4gIGZvciAoY29uc3QgW21vZHVsZSwgbm9kZXNdIG9mIGltcG9ydGVkLmVudHJpZXMoKSkge1xuICAgIGlmIChub2Rlcy5sZW5ndGggPiAxKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gYCcke21vZHVsZX0nIGltcG9ydGVkIG11bHRpcGxlIHRpbWVzLmA7XG4gICAgICBjb25zdCBbZmlyc3QsIC4uLnJlc3RdID0gbm9kZXM7XG4gICAgICBjb25zdCBzb3VyY2VDb2RlID0gY29udGV4dC5nZXRTb3VyY2VDb2RlKCk7XG4gICAgICBjb25zdCBmaXggPSBnZXRGaXgoZmlyc3QsIHJlc3QsIHNvdXJjZUNvZGUpO1xuXG4gICAgICBjb250ZXh0LnJlcG9ydCh7XG4gICAgICAgIG5vZGU6IGZpcnN0LnNvdXJjZSxcbiAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgZml4LCAvLyBBdHRhY2ggdGhlIGF1dG9maXggKGlmIGFueSkgdG8gdGhlIGZpcnN0IGltcG9ydC5cbiAgICAgIH0pO1xuXG4gICAgICBmb3IgKGNvbnN0IG5vZGUgb2YgcmVzdCkge1xuICAgICAgICBjb250ZXh0LnJlcG9ydCh7XG4gICAgICAgICAgbm9kZTogbm9kZS5zb3VyY2UsXG4gICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGdldEZpeChmaXJzdCwgcmVzdCwgc291cmNlQ29kZSkge1xuICAvLyBTb3JyeSBFU0xpbnQgPD0gMyB1c2Vycywgbm8gYXV0b2ZpeCBmb3IgeW91LiBBdXRvZml4aW5nIGR1cGxpY2F0ZSBpbXBvcnRzXG4gIC8vIHJlcXVpcmVzIG11bHRpcGxlIGBmaXhlci53aGF0ZXZlcigpYCBjYWxscyBpbiB0aGUgYGZpeGA6IFdlIGJvdGggbmVlZCB0b1xuICAvLyB1cGRhdGUgdGhlIGZpcnN0IG9uZSwgYW5kIHJlbW92ZSB0aGUgcmVzdC4gU3VwcG9ydCBmb3IgbXVsdGlwbGVcbiAgLy8gYGZpeGVyLndoYXRldmVyKClgIGluIGEgc2luZ2xlIGBmaXhgIHdhcyBhZGRlZCBpbiBFU0xpbnQgNC4xLlxuICAvLyBgc291cmNlQ29kZS5nZXRDb21tZW50c0JlZm9yZWAgd2FzIGFkZGVkIGluIDQuMCwgc28gdGhhdCdzIGFuIGVhc3kgdGhpbmcgdG9cbiAgLy8gY2hlY2sgZm9yLlxuICBpZiAodHlwZW9mIHNvdXJjZUNvZGUuZ2V0Q29tbWVudHNCZWZvcmUgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gQWRqdXN0aW5nIHRoZSBmaXJzdCBpbXBvcnQgbWlnaHQgbWFrZSBpdCBtdWx0aWxpbmUsIHdoaWNoIGNvdWxkIGJyZWFrXG4gIC8vIGBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVgIGNvbW1lbnRzIGFuZCBzaW1pbGFyLCBzbyBiYWlsIGlmIHRoZSBmaXJzdFxuICAvLyBpbXBvcnQgaGFzIGNvbW1lbnRzLiBBbHNvLCBpZiB0aGUgZmlyc3QgaW1wb3J0IGlzIGBpbXBvcnQgKiBhcyBucyBmcm9tXG4gIC8vICcuL2ZvbydgIHRoZXJlJ3Mgbm90aGluZyB3ZSBjYW4gZG8uXG4gIGlmIChoYXNQcm9ibGVtYXRpY0NvbW1lbnRzKGZpcnN0LCBzb3VyY2VDb2RlKSB8fCBoYXNOYW1lc3BhY2UoZmlyc3QpKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGNvbnN0IGRlZmF1bHRJbXBvcnROYW1lcyA9IG5ldyBTZXQoXG4gICAgW2ZpcnN0LCAuLi5yZXN0XS5tYXAoZ2V0RGVmYXVsdEltcG9ydE5hbWUpLmZpbHRlcihCb29sZWFuKVxuICApO1xuXG4gIC8vIEJhaWwgaWYgdGhlcmUgYXJlIG11bHRpcGxlIGRpZmZlcmVudCBkZWZhdWx0IGltcG9ydCBuYW1lcyDigJMgaXQncyB1cCB0byB0aGVcbiAgLy8gdXNlciB0byBjaG9vc2Ugd2hpY2ggb25lIHRvIGtlZXAuXG4gIGlmIChkZWZhdWx0SW1wb3J0TmFtZXMuc2l6ZSA+IDEpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gTGVhdmUgaXQgdG8gdGhlIHVzZXIgdG8gaGFuZGxlIGNvbW1lbnRzLiBBbHNvIHNraXAgYGltcG9ydCAqIGFzIG5zIGZyb21cbiAgLy8gJy4vZm9vJ2AgaW1wb3J0cywgc2luY2UgdGhleSBjYW5ub3QgYmUgbWVyZ2VkIGludG8gYW5vdGhlciBpbXBvcnQuXG4gIGNvbnN0IHJlc3RXaXRob3V0Q29tbWVudHMgPSByZXN0LmZpbHRlcihub2RlID0+ICEoXG4gICAgaGFzUHJvYmxlbWF0aWNDb21tZW50cyhub2RlLCBzb3VyY2VDb2RlKSB8fFxuICAgIGhhc05hbWVzcGFjZShub2RlKVxuICApKTtcblxuICBjb25zdCBzcGVjaWZpZXJzID0gcmVzdFdpdGhvdXRDb21tZW50c1xuICAgIC5tYXAobm9kZSA9PiB7XG4gICAgICBjb25zdCB0b2tlbnMgPSBzb3VyY2VDb2RlLmdldFRva2Vucyhub2RlKTtcbiAgICAgIGNvbnN0IG9wZW5CcmFjZSA9IHRva2Vucy5maW5kKHRva2VuID0+IGlzUHVuY3R1YXRvcih0b2tlbiwgJ3snKSk7XG4gICAgICBjb25zdCBjbG9zZUJyYWNlID0gdG9rZW5zLmZpbmQodG9rZW4gPT4gaXNQdW5jdHVhdG9yKHRva2VuLCAnfScpKTtcblxuICAgICAgaWYgKG9wZW5CcmFjZSA9PSBudWxsIHx8IGNsb3NlQnJhY2UgPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBpbXBvcnROb2RlOiBub2RlLFxuICAgICAgICB0ZXh0OiBzb3VyY2VDb2RlLnRleHQuc2xpY2Uob3BlbkJyYWNlLnJhbmdlWzFdLCBjbG9zZUJyYWNlLnJhbmdlWzBdKSxcbiAgICAgICAgaGFzVHJhaWxpbmdDb21tYTogaXNQdW5jdHVhdG9yKHNvdXJjZUNvZGUuZ2V0VG9rZW5CZWZvcmUoY2xvc2VCcmFjZSksICcsJyksXG4gICAgICAgIGlzRW1wdHk6ICFoYXNTcGVjaWZpZXJzKG5vZGUpLFxuICAgICAgfTtcbiAgICB9KVxuICAgIC5maWx0ZXIoQm9vbGVhbik7XG5cbiAgY29uc3QgdW5uZWNlc3NhcnlJbXBvcnRzID0gcmVzdFdpdGhvdXRDb21tZW50cy5maWx0ZXIobm9kZSA9PlxuICAgICFoYXNTcGVjaWZpZXJzKG5vZGUpICYmXG4gICAgIWhhc05hbWVzcGFjZShub2RlKSAmJlxuICAgICFzcGVjaWZpZXJzLnNvbWUoc3BlY2lmaWVyID0+IHNwZWNpZmllci5pbXBvcnROb2RlID09PSBub2RlKVxuICApO1xuXG4gIGNvbnN0IHNob3VsZEFkZERlZmF1bHQgPSBnZXREZWZhdWx0SW1wb3J0TmFtZShmaXJzdCkgPT0gbnVsbCAmJiBkZWZhdWx0SW1wb3J0TmFtZXMuc2l6ZSA9PT0gMTtcbiAgY29uc3Qgc2hvdWxkQWRkU3BlY2lmaWVycyA9IHNwZWNpZmllcnMubGVuZ3RoID4gMDtcbiAgY29uc3Qgc2hvdWxkUmVtb3ZlVW5uZWNlc3NhcnkgPSB1bm5lY2Vzc2FyeUltcG9ydHMubGVuZ3RoID4gMDtcblxuICBpZiAoIShzaG91bGRBZGREZWZhdWx0IHx8IHNob3VsZEFkZFNwZWNpZmllcnMgfHwgc2hvdWxkUmVtb3ZlVW5uZWNlc3NhcnkpKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHJldHVybiBmaXhlciA9PiB7XG4gICAgY29uc3QgdG9rZW5zID0gc291cmNlQ29kZS5nZXRUb2tlbnMoZmlyc3QpO1xuICAgIGNvbnN0IG9wZW5CcmFjZSA9IHRva2Vucy5maW5kKHRva2VuID0+IGlzUHVuY3R1YXRvcih0b2tlbiwgJ3snKSk7XG4gICAgY29uc3QgY2xvc2VCcmFjZSA9IHRva2Vucy5maW5kKHRva2VuID0+IGlzUHVuY3R1YXRvcih0b2tlbiwgJ30nKSk7XG4gICAgY29uc3QgZmlyc3RUb2tlbiA9IHNvdXJjZUNvZGUuZ2V0Rmlyc3RUb2tlbihmaXJzdCk7XG4gICAgY29uc3QgW2RlZmF1bHRJbXBvcnROYW1lXSA9IGRlZmF1bHRJbXBvcnROYW1lcztcblxuICAgIGNvbnN0IGZpcnN0SGFzVHJhaWxpbmdDb21tYSA9XG4gICAgICBjbG9zZUJyYWNlICE9IG51bGwgJiZcbiAgICAgIGlzUHVuY3R1YXRvcihzb3VyY2VDb2RlLmdldFRva2VuQmVmb3JlKGNsb3NlQnJhY2UpLCAnLCcpO1xuICAgIGNvbnN0IGZpcnN0SXNFbXB0eSA9ICFoYXNTcGVjaWZpZXJzKGZpcnN0KTtcblxuICAgIGNvbnN0IFtzcGVjaWZpZXJzVGV4dF0gPSBzcGVjaWZpZXJzLnJlZHVjZShcbiAgICAgIChbcmVzdWx0LCBuZWVkc0NvbW1hXSwgc3BlY2lmaWVyKSA9PiB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgbmVlZHNDb21tYSAmJiAhc3BlY2lmaWVyLmlzRW1wdHlcbiAgICAgICAgICAgID8gYCR7cmVzdWx0fSwke3NwZWNpZmllci50ZXh0fWBcbiAgICAgICAgICAgIDogYCR7cmVzdWx0fSR7c3BlY2lmaWVyLnRleHR9YCxcbiAgICAgICAgICBzcGVjaWZpZXIuaXNFbXB0eSA/IG5lZWRzQ29tbWEgOiB0cnVlLFxuICAgICAgICBdO1xuICAgICAgfSxcbiAgICAgIFsnJywgIWZpcnN0SGFzVHJhaWxpbmdDb21tYSAmJiAhZmlyc3RJc0VtcHR5XVxuICAgICk7XG5cbiAgICBjb25zdCBmaXhlcyA9IFtdO1xuXG4gICAgaWYgKHNob3VsZEFkZERlZmF1bHQgJiYgb3BlbkJyYWNlID09IG51bGwgJiYgc2hvdWxkQWRkU3BlY2lmaWVycykge1xuICAgICAgLy8gYGltcG9ydCAnLi9mb28nYCDihpIgYGltcG9ydCBkZWYsIHsuLi59IGZyb20gJy4vZm9vJ2BcbiAgICAgIGZpeGVzLnB1c2goXG4gICAgICAgIGZpeGVyLmluc2VydFRleHRBZnRlcihmaXJzdFRva2VuLCBgICR7ZGVmYXVsdEltcG9ydE5hbWV9LCB7JHtzcGVjaWZpZXJzVGV4dH19IGZyb21gKVxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKHNob3VsZEFkZERlZmF1bHQgJiYgb3BlbkJyYWNlID09IG51bGwgJiYgIXNob3VsZEFkZFNwZWNpZmllcnMpIHtcbiAgICAgIC8vIGBpbXBvcnQgJy4vZm9vJ2Ag4oaSIGBpbXBvcnQgZGVmIGZyb20gJy4vZm9vJ2BcbiAgICAgIGZpeGVzLnB1c2goZml4ZXIuaW5zZXJ0VGV4dEFmdGVyKGZpcnN0VG9rZW4sIGAgJHtkZWZhdWx0SW1wb3J0TmFtZX0gZnJvbWApKTtcbiAgICB9IGVsc2UgaWYgKHNob3VsZEFkZERlZmF1bHQgJiYgb3BlbkJyYWNlICE9IG51bGwgJiYgY2xvc2VCcmFjZSAhPSBudWxsKSB7XG4gICAgICAvLyBgaW1wb3J0IHsuLi59IGZyb20gJy4vZm9vJ2Ag4oaSIGBpbXBvcnQgZGVmLCB7Li4ufSBmcm9tICcuL2ZvbydgXG4gICAgICBmaXhlcy5wdXNoKGZpeGVyLmluc2VydFRleHRBZnRlcihmaXJzdFRva2VuLCBgICR7ZGVmYXVsdEltcG9ydE5hbWV9LGApKTtcbiAgICAgIGlmIChzaG91bGRBZGRTcGVjaWZpZXJzKSB7XG4gICAgICAgIC8vIGBpbXBvcnQgZGVmLCB7Li4ufSBmcm9tICcuL2ZvbydgIOKGkiBgaW1wb3J0IGRlZiwgey4uLiwgLi4ufSBmcm9tICcuL2ZvbydgXG4gICAgICAgIGZpeGVzLnB1c2goZml4ZXIuaW5zZXJ0VGV4dEJlZm9yZShjbG9zZUJyYWNlLCBzcGVjaWZpZXJzVGV4dCkpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoIXNob3VsZEFkZERlZmF1bHQgJiYgb3BlbkJyYWNlID09IG51bGwgJiYgc2hvdWxkQWRkU3BlY2lmaWVycykge1xuICAgICAgaWYgKGZpcnN0LnNwZWNpZmllcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIC8vIGBpbXBvcnQgJy4vZm9vJ2Ag4oaSIGBpbXBvcnQgey4uLn0gZnJvbSAnLi9mb28nYFxuICAgICAgICBmaXhlcy5wdXNoKGZpeGVyLmluc2VydFRleHRBZnRlcihmaXJzdFRva2VuLCBgIHske3NwZWNpZmllcnNUZXh0fX0gZnJvbWApKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGBpbXBvcnQgZGVmIGZyb20gJy4vZm9vJ2Ag4oaSIGBpbXBvcnQgZGVmLCB7Li4ufSBmcm9tICcuL2ZvbydgXG4gICAgICAgIGZpeGVzLnB1c2goZml4ZXIuaW5zZXJ0VGV4dEFmdGVyKGZpcnN0LnNwZWNpZmllcnNbMF0sIGAsIHske3NwZWNpZmllcnNUZXh0fX1gKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghc2hvdWxkQWRkRGVmYXVsdCAmJiBvcGVuQnJhY2UgIT0gbnVsbCAmJiBjbG9zZUJyYWNlICE9IG51bGwpIHtcbiAgICAgIC8vIGBpbXBvcnQgey4uLn0gJy4vZm9vJ2Ag4oaSIGBpbXBvcnQgey4uLiwgLi4ufSBmcm9tICcuL2ZvbydgXG4gICAgICBmaXhlcy5wdXNoKGZpeGVyLmluc2VydFRleHRCZWZvcmUoY2xvc2VCcmFjZSwgc3BlY2lmaWVyc1RleHQpKTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgaW1wb3J0cyB3aG9zZSBzcGVjaWZpZXJzIGhhdmUgYmVlbiBtb3ZlZCBpbnRvIHRoZSBmaXJzdCBpbXBvcnQuXG4gICAgZm9yIChjb25zdCBzcGVjaWZpZXIgb2Ygc3BlY2lmaWVycykge1xuICAgICAgY29uc3QgaW1wb3J0Tm9kZSA9IHNwZWNpZmllci5pbXBvcnROb2RlO1xuICAgICAgZml4ZXMucHVzaChmaXhlci5yZW1vdmUoaW1wb3J0Tm9kZSkpO1xuXG4gICAgICBjb25zdCBjaGFyQWZ0ZXJJbXBvcnRSYW5nZSA9IFtpbXBvcnROb2RlLnJhbmdlWzFdLCBpbXBvcnROb2RlLnJhbmdlWzFdICsgMV07XG4gICAgICBjb25zdCBjaGFyQWZ0ZXJJbXBvcnQgPSBzb3VyY2VDb2RlLnRleHQuc3Vic3RyaW5nKGNoYXJBZnRlckltcG9ydFJhbmdlWzBdLCBjaGFyQWZ0ZXJJbXBvcnRSYW5nZVsxXSk7XG4gICAgICBpZiAoY2hhckFmdGVySW1wb3J0ID09PSAnXFxuJykge1xuICAgICAgICBmaXhlcy5wdXNoKGZpeGVyLnJlbW92ZVJhbmdlKGNoYXJBZnRlckltcG9ydFJhbmdlKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIGltcG9ydHMgd2hvc2UgZGVmYXVsdCBpbXBvcnQgaGFzIGJlZW4gbW92ZWQgdG8gdGhlIGZpcnN0IGltcG9ydCxcbiAgICAvLyBhbmQgc2lkZS1lZmZlY3Qtb25seSBpbXBvcnRzIHRoYXQgYXJlIHVubmVjZXNzYXJ5IGR1ZSB0byB0aGUgZmlyc3RcbiAgICAvLyBpbXBvcnQuXG4gICAgZm9yIChjb25zdCBub2RlIG9mIHVubmVjZXNzYXJ5SW1wb3J0cykge1xuICAgICAgZml4ZXMucHVzaChmaXhlci5yZW1vdmUobm9kZSkpO1xuXG4gICAgICBjb25zdCBjaGFyQWZ0ZXJJbXBvcnRSYW5nZSA9IFtub2RlLnJhbmdlWzFdLCBub2RlLnJhbmdlWzFdICsgMV07XG4gICAgICBjb25zdCBjaGFyQWZ0ZXJJbXBvcnQgPSBzb3VyY2VDb2RlLnRleHQuc3Vic3RyaW5nKGNoYXJBZnRlckltcG9ydFJhbmdlWzBdLCBjaGFyQWZ0ZXJJbXBvcnRSYW5nZVsxXSk7XG4gICAgICBpZiAoY2hhckFmdGVySW1wb3J0ID09PSAnXFxuJykge1xuICAgICAgICBmaXhlcy5wdXNoKGZpeGVyLnJlbW92ZVJhbmdlKGNoYXJBZnRlckltcG9ydFJhbmdlKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZpeGVzO1xuICB9O1xufVxuXG5mdW5jdGlvbiBpc1B1bmN0dWF0b3Iobm9kZSwgdmFsdWUpIHtcbiAgcmV0dXJuIG5vZGUudHlwZSA9PT0gJ1B1bmN0dWF0b3InICYmIG5vZGUudmFsdWUgPT09IHZhbHVlO1xufVxuXG4vLyBHZXQgdGhlIG5hbWUgb2YgdGhlIGRlZmF1bHQgaW1wb3J0IG9mIGBub2RlYCwgaWYgYW55LlxuZnVuY3Rpb24gZ2V0RGVmYXVsdEltcG9ydE5hbWUobm9kZSkge1xuICBjb25zdCBkZWZhdWx0U3BlY2lmaWVyID0gbm9kZS5zcGVjaWZpZXJzXG4gICAgLmZpbmQoc3BlY2lmaWVyID0+IHNwZWNpZmllci50eXBlID09PSAnSW1wb3J0RGVmYXVsdFNwZWNpZmllcicpO1xuICByZXR1cm4gZGVmYXVsdFNwZWNpZmllciAhPSBudWxsID8gZGVmYXVsdFNwZWNpZmllci5sb2NhbC5uYW1lIDogdW5kZWZpbmVkO1xufVxuXG4vLyBDaGVja3Mgd2hldGhlciBgbm9kZWAgaGFzIGEgbmFtZXNwYWNlIGltcG9ydC5cbmZ1bmN0aW9uIGhhc05hbWVzcGFjZShub2RlKSB7XG4gIGNvbnN0IHNwZWNpZmllcnMgPSBub2RlLnNwZWNpZmllcnNcbiAgICAuZmlsdGVyKHNwZWNpZmllciA9PiBzcGVjaWZpZXIudHlwZSA9PT0gJ0ltcG9ydE5hbWVzcGFjZVNwZWNpZmllcicpO1xuICByZXR1cm4gc3BlY2lmaWVycy5sZW5ndGggPiAwO1xufVxuXG4vLyBDaGVja3Mgd2hldGhlciBgbm9kZWAgaGFzIGFueSBub24tZGVmYXVsdCBzcGVjaWZpZXJzLlxuZnVuY3Rpb24gaGFzU3BlY2lmaWVycyhub2RlKSB7XG4gIGNvbnN0IHNwZWNpZmllcnMgPSBub2RlLnNwZWNpZmllcnNcbiAgICAuZmlsdGVyKHNwZWNpZmllciA9PiBzcGVjaWZpZXIudHlwZSA9PT0gJ0ltcG9ydFNwZWNpZmllcicpO1xuICByZXR1cm4gc3BlY2lmaWVycy5sZW5ndGggPiAwO1xufVxuXG4vLyBJdCdzIG5vdCBvYnZpb3VzIHdoYXQgdGhlIHVzZXIgd2FudHMgdG8gZG8gd2l0aCBjb21tZW50cyBhc3NvY2lhdGVkIHdpdGhcbi8vIGR1cGxpY2F0ZSBpbXBvcnRzLCBzbyBza2lwIGltcG9ydHMgd2l0aCBjb21tZW50cyB3aGVuIGF1dG9maXhpbmcuXG5mdW5jdGlvbiBoYXNQcm9ibGVtYXRpY0NvbW1lbnRzKG5vZGUsIHNvdXJjZUNvZGUpIHtcbiAgcmV0dXJuIChcbiAgICBoYXNDb21tZW50QmVmb3JlKG5vZGUsIHNvdXJjZUNvZGUpIHx8XG4gICAgaGFzQ29tbWVudEFmdGVyKG5vZGUsIHNvdXJjZUNvZGUpIHx8XG4gICAgaGFzQ29tbWVudEluc2lkZU5vblNwZWNpZmllcnMobm9kZSwgc291cmNlQ29kZSlcbiAgKTtcbn1cblxuLy8gQ2hlY2tzIHdoZXRoZXIgYG5vZGVgIGhhcyBhIGNvbW1lbnQgKHRoYXQgZW5kcykgb24gdGhlIHByZXZpb3VzIGxpbmUgb3Igb25cbi8vIHRoZSBzYW1lIGxpbmUgYXMgYG5vZGVgIChzdGFydHMpLlxuZnVuY3Rpb24gaGFzQ29tbWVudEJlZm9yZShub2RlLCBzb3VyY2VDb2RlKSB7XG4gIHJldHVybiBzb3VyY2VDb2RlLmdldENvbW1lbnRzQmVmb3JlKG5vZGUpXG4gICAgLnNvbWUoY29tbWVudCA9PiBjb21tZW50LmxvYy5lbmQubGluZSA+PSBub2RlLmxvYy5zdGFydC5saW5lIC0gMSk7XG59XG5cbi8vIENoZWNrcyB3aGV0aGVyIGBub2RlYCBoYXMgYSBjb21tZW50ICh0aGF0IHN0YXJ0cykgb24gdGhlIHNhbWUgbGluZSBhcyBgbm9kZWBcbi8vIChlbmRzKS5cbmZ1bmN0aW9uIGhhc0NvbW1lbnRBZnRlcihub2RlLCBzb3VyY2VDb2RlKSB7XG4gIHJldHVybiBzb3VyY2VDb2RlLmdldENvbW1lbnRzQWZ0ZXIobm9kZSlcbiAgICAuc29tZShjb21tZW50ID0+IGNvbW1lbnQubG9jLnN0YXJ0LmxpbmUgPT09IG5vZGUubG9jLmVuZC5saW5lKTtcbn1cblxuLy8gQ2hlY2tzIHdoZXRoZXIgYG5vZGVgIGhhcyBhbnkgY29tbWVudHMgX2luc2lkZSxfIGV4Y2VwdCBpbnNpZGUgdGhlIGB7Li4ufWBcbi8vIHBhcnQgKGlmIGFueSkuXG5mdW5jdGlvbiBoYXNDb21tZW50SW5zaWRlTm9uU3BlY2lmaWVycyhub2RlLCBzb3VyY2VDb2RlKSB7XG4gIGNvbnN0IHRva2VucyA9IHNvdXJjZUNvZGUuZ2V0VG9rZW5zKG5vZGUpO1xuICBjb25zdCBvcGVuQnJhY2VJbmRleCA9IHRva2Vucy5maW5kSW5kZXgodG9rZW4gPT4gaXNQdW5jdHVhdG9yKHRva2VuLCAneycpKTtcbiAgY29uc3QgY2xvc2VCcmFjZUluZGV4ID0gdG9rZW5zLmZpbmRJbmRleCh0b2tlbiA9PiBpc1B1bmN0dWF0b3IodG9rZW4sICd9JykpO1xuICAvLyBTbGljZSBhd2F5IHRoZSBmaXJzdCB0b2tlbiwgc2luY2Ugd2UncmUgbm8gbG9va2luZyBmb3IgY29tbWVudHMgX2JlZm9yZV9cbiAgLy8gYG5vZGVgIChvbmx5IGluc2lkZSkuIElmIHRoZXJlJ3MgYSBgey4uLn1gIHBhcnQsIGxvb2sgZm9yIGNvbW1lbnRzIGJlZm9yZVxuICAvLyB0aGUgYHtgLCBidXQgbm90IGJlZm9yZSB0aGUgYH1gIChoZW5jZSB0aGUgYCsxYHMpLlxuICBjb25zdCBzb21lVG9rZW5zID0gb3BlbkJyYWNlSW5kZXggPj0gMCAmJiBjbG9zZUJyYWNlSW5kZXggPj0gMFxuICAgID8gdG9rZW5zLnNsaWNlKDEsIG9wZW5CcmFjZUluZGV4ICsgMSkuY29uY2F0KHRva2Vucy5zbGljZShjbG9zZUJyYWNlSW5kZXggKyAxKSlcbiAgICA6IHRva2Vucy5zbGljZSgxKTtcbiAgcmV0dXJuIHNvbWVUb2tlbnMuc29tZSh0b2tlbiA9PiBzb3VyY2VDb2RlLmdldENvbW1lbnRzQmVmb3JlKHRva2VuKS5sZW5ndGggPiAwKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIG1ldGE6IHtcbiAgICB0eXBlOiAncHJvYmxlbScsXG4gICAgZG9jczoge1xuICAgICAgdXJsOiBkb2NzVXJsKCduby1kdXBsaWNhdGVzJyksXG4gICAgfSxcbiAgICBmaXhhYmxlOiAnY29kZScsXG4gICAgc2NoZW1hOiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgY29uc2lkZXJRdWVyeVN0cmluZzoge1xuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGFkZGl0aW9uYWxQcm9wZXJ0aWVzOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcblxuICBjcmVhdGUoY29udGV4dCkge1xuICAgIC8vIFByZXBhcmUgdGhlIHJlc29sdmVyIGZyb20gb3B0aW9ucy5cbiAgICBjb25zdCBjb25zaWRlclF1ZXJ5U3RyaW5nT3B0aW9uID0gY29udGV4dC5vcHRpb25zWzBdICYmXG4gICAgICBjb250ZXh0Lm9wdGlvbnNbMF1bJ2NvbnNpZGVyUXVlcnlTdHJpbmcnXTtcbiAgICBjb25zdCBkZWZhdWx0UmVzb2x2ZXIgPSBzb3VyY2VQYXRoID0+IHJlc29sdmUoc291cmNlUGF0aCwgY29udGV4dCkgfHwgc291cmNlUGF0aDtcbiAgICBjb25zdCByZXNvbHZlciA9IGNvbnNpZGVyUXVlcnlTdHJpbmdPcHRpb24gPyAoc291cmNlUGF0aCA9PiB7XG4gICAgICBjb25zdCBwYXJ0cyA9IHNvdXJjZVBhdGgubWF0Y2goL14oW14/XSopXFw/KC4qKSQvKTtcbiAgICAgIGlmICghcGFydHMpIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRSZXNvbHZlcihzb3VyY2VQYXRoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBkZWZhdWx0UmVzb2x2ZXIocGFydHNbMV0pICsgJz8nICsgcGFydHNbMl07XG4gICAgfSkgOiBkZWZhdWx0UmVzb2x2ZXI7XG5cbiAgICBjb25zdCBpbXBvcnRlZCA9IG5ldyBNYXAoKTtcbiAgICBjb25zdCBuc0ltcG9ydGVkID0gbmV3IE1hcCgpO1xuICAgIGNvbnN0IGRlZmF1bHRUeXBlc0ltcG9ydGVkID0gbmV3IE1hcCgpO1xuICAgIGNvbnN0IG5hbWVkVHlwZXNJbXBvcnRlZCA9IG5ldyBNYXAoKTtcblxuICAgIGZ1bmN0aW9uIGdldEltcG9ydE1hcChuKSB7XG4gICAgICBpZiAobi5pbXBvcnRLaW5kID09PSAndHlwZScpIHtcbiAgICAgICAgcmV0dXJuIG4uc3BlY2lmaWVycy5sZW5ndGggPiAwICYmIG4uc3BlY2lmaWVyc1swXS50eXBlID09PSAnSW1wb3J0RGVmYXVsdFNwZWNpZmllcicgPyBkZWZhdWx0VHlwZXNJbXBvcnRlZCA6IG5hbWVkVHlwZXNJbXBvcnRlZDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGhhc05hbWVzcGFjZShuKSA/IG5zSW1wb3J0ZWQgOiBpbXBvcnRlZDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgSW1wb3J0RGVjbGFyYXRpb24obikge1xuICAgICAgICAvLyByZXNvbHZlZCBwYXRoIHdpbGwgY292ZXIgYWxpYXNlZCBkdXBsaWNhdGVzXG4gICAgICAgIGNvbnN0IHJlc29sdmVkUGF0aCA9IHJlc29sdmVyKG4uc291cmNlLnZhbHVlKTtcbiAgICAgICAgY29uc3QgaW1wb3J0TWFwID0gZ2V0SW1wb3J0TWFwKG4pO1xuXG4gICAgICAgIGlmIChpbXBvcnRNYXAuaGFzKHJlc29sdmVkUGF0aCkpIHtcbiAgICAgICAgICBpbXBvcnRNYXAuZ2V0KHJlc29sdmVkUGF0aCkucHVzaChuKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpbXBvcnRNYXAuc2V0KHJlc29sdmVkUGF0aCwgW25dKTtcbiAgICAgICAgfVxuICAgICAgfSxcblxuICAgICAgJ1Byb2dyYW06ZXhpdCc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2hlY2tJbXBvcnRzKGltcG9ydGVkLCBjb250ZXh0KTtcbiAgICAgICAgY2hlY2tJbXBvcnRzKG5zSW1wb3J0ZWQsIGNvbnRleHQpO1xuICAgICAgICBjaGVja0ltcG9ydHMoZGVmYXVsdFR5cGVzSW1wb3J0ZWQsIGNvbnRleHQpO1xuICAgICAgICBjaGVja0ltcG9ydHMobmFtZWRUeXBlc0ltcG9ydGVkLCBjb250ZXh0KTtcbiAgICAgIH0sXG4gICAgfTtcbiAgfSxcbn07XG4iXX0=