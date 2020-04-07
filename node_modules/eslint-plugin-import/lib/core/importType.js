'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.isAbsolute = isAbsolute;
exports.isBuiltIn = isBuiltIn;
exports.isExternalModule = isExternalModule;
exports.isExternalModuleMain = isExternalModuleMain;
exports.isScoped = isScoped;
exports.isScopedMain = isScopedMain;
exports.isScopedModule = isScopedModule;
exports.default = resolveImportType;

var _core = require('resolve/lib/core');

var _core2 = _interopRequireDefault(_core);

var _resolve = require('eslint-module-utils/resolve');

var _resolve2 = _interopRequireDefault(_resolve);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function baseModule(name) {
  if (isScoped(name)) {
    var _name$split = name.split('/'),
        _name$split2 = _slicedToArray(_name$split, 2);

    const scope = _name$split2[0],
          pkg = _name$split2[1];

    return `${scope}/${pkg}`;
  }

  var _name$split3 = name.split('/'),
      _name$split4 = _slicedToArray(_name$split3, 1);

  const pkg = _name$split4[0];

  return pkg;
}

function isAbsolute(name) {
  return name.indexOf('/') === 0;
}

// path is defined only when a resolver resolves to a non-standard path
function isBuiltIn(name, settings, path) {
  if (path || !name) return false;
  const base = baseModule(name);
  const extras = settings && settings['import/core-modules'] || [];
  return _core2.default[base] || extras.indexOf(base) > -1;
}

function isExternalPath(path, name, settings) {
  const folders = settings && settings['import/external-module-folders'] || ['node_modules'];
  return !path || folders.some(folder => isSubpath(folder, path));
}

function isSubpath(subpath, path) {
  const normPath = path.replace(/\\/g, '/');
  const normSubpath = subpath.replace(/\\/g, '/').replace(/\/$/, '');
  if (normSubpath.length === 0) {
    return false;
  }
  const left = normPath.indexOf(normSubpath);
  const right = left + normSubpath.length;
  return left !== -1 && (left === 0 || normSubpath[0] !== '/' && normPath[left - 1] === '/') && (right >= normPath.length || normPath[right] === '/');
}

const externalModuleRegExp = /^\w/;
function isExternalModule(name, settings, path) {
  return externalModuleRegExp.test(name) && isExternalPath(path, name, settings);
}

const externalModuleMainRegExp = /^[\w]((?!\/).)*$/;
function isExternalModuleMain(name, settings, path) {
  return externalModuleMainRegExp.test(name) && isExternalPath(path, name, settings);
}

const scopedRegExp = /^@[^/]*\/?[^/]+/;
function isScoped(name) {
  return name && scopedRegExp.test(name);
}

const scopedMainRegExp = /^@[^/]+\/?[^/]+$/;
function isScopedMain(name) {
  return name && scopedMainRegExp.test(name);
}

function isInternalModule(name, settings, path) {
  const internalScope = settings && settings['import/internal-regex'];
  const matchesScopedOrExternalRegExp = scopedRegExp.test(name) || externalModuleRegExp.test(name);
  return matchesScopedOrExternalRegExp && (internalScope && new RegExp(internalScope).test(name) || !isExternalPath(path, name, settings));
}

function isRelativeToParent(name) {
  return (/^\.\.$|^\.\.[\\/]/.test(name)
  );
}

const indexFiles = ['.', './', './index', './index.js'];
function isIndex(name) {
  return indexFiles.indexOf(name) !== -1;
}

function isRelativeToSibling(name) {
  return (/^\.[\\/]/.test(name)
  );
}

function typeTest(name, settings, path) {
  if (isAbsolute(name, settings, path)) {
    return 'absolute';
  }
  if (isBuiltIn(name, settings, path)) {
    return 'builtin';
  }
  if (isInternalModule(name, settings, path)) {
    return 'internal';
  }
  if (isExternalModule(name, settings, path)) {
    return 'external';
  }
  if (isScoped(name, settings, path)) {
    return 'external';
  }
  if (isRelativeToParent(name, settings, path)) {
    return 'parent';
  }
  if (isIndex(name, settings, path)) {
    return 'index';
  }
  if (isRelativeToSibling(name, settings, path)) {
    return 'sibling';
  }
  return 'unknown';
}

function isScopedModule(name) {
  return name.indexOf('@') === 0;
}

function resolveImportType(name, context) {
  return typeTest(name, context.settings, (0, _resolve2.default)(name, context));
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb3JlL2ltcG9ydFR5cGUuanMiXSwibmFtZXMiOlsiaXNBYnNvbHV0ZSIsImlzQnVpbHRJbiIsImlzRXh0ZXJuYWxNb2R1bGUiLCJpc0V4dGVybmFsTW9kdWxlTWFpbiIsImlzU2NvcGVkIiwiaXNTY29wZWRNYWluIiwiaXNTY29wZWRNb2R1bGUiLCJyZXNvbHZlSW1wb3J0VHlwZSIsImJhc2VNb2R1bGUiLCJuYW1lIiwic3BsaXQiLCJzY29wZSIsInBrZyIsImluZGV4T2YiLCJzZXR0aW5ncyIsInBhdGgiLCJiYXNlIiwiZXh0cmFzIiwiY29yZU1vZHVsZXMiLCJpc0V4dGVybmFsUGF0aCIsImZvbGRlcnMiLCJzb21lIiwiZm9sZGVyIiwiaXNTdWJwYXRoIiwic3VicGF0aCIsIm5vcm1QYXRoIiwicmVwbGFjZSIsIm5vcm1TdWJwYXRoIiwibGVuZ3RoIiwibGVmdCIsInJpZ2h0IiwiZXh0ZXJuYWxNb2R1bGVSZWdFeHAiLCJ0ZXN0IiwiZXh0ZXJuYWxNb2R1bGVNYWluUmVnRXhwIiwic2NvcGVkUmVnRXhwIiwic2NvcGVkTWFpblJlZ0V4cCIsImlzSW50ZXJuYWxNb2R1bGUiLCJpbnRlcm5hbFNjb3BlIiwibWF0Y2hlc1Njb3BlZE9yRXh0ZXJuYWxSZWdFeHAiLCJSZWdFeHAiLCJpc1JlbGF0aXZlVG9QYXJlbnQiLCJpbmRleEZpbGVzIiwiaXNJbmRleCIsImlzUmVsYXRpdmVUb1NpYmxpbmciLCJ0eXBlVGVzdCIsImNvbnRleHQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O1FBYWdCQSxVLEdBQUFBLFU7UUFLQUMsUyxHQUFBQSxTO1FBMEJBQyxnQixHQUFBQSxnQjtRQUtBQyxvQixHQUFBQSxvQjtRQUtBQyxRLEdBQUFBLFE7UUFLQUMsWSxHQUFBQSxZO1FBbUNBQyxjLEdBQUFBLGM7a0JBSVFDLGlCOztBQWxHeEI7Ozs7QUFFQTs7Ozs7O0FBRUEsU0FBU0MsVUFBVCxDQUFvQkMsSUFBcEIsRUFBMEI7QUFDeEIsTUFBSUwsU0FBU0ssSUFB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bnRlbnQiOlsiaW1wb3J0IGNvcmVNb2R1bGVzIGZyb20gJ3Jlc29sdmUvbGliL2NvcmUnXG5cbmltcG9ydCByZXNvbHZlIGZyb20gJ2VzbGludC1tb2R1bGUtdXRpbHMvcmVzb2x2ZSdcblxuZnVuY3Rpb24gYmFzZU1vZHVsZShuYW1lKSB7XG4gIGlmIChpc1Njb3BlZChuYW1lKSkge1xuICAgIGNvbnN0IFtzY29wZSwgcGtnXSA9IG5hbWUuc3BsaXQoJy8nKVxuICAgIHJldHVybiBgJHtzY29wZX0vJHtwa2d9YFxuICB9XG4gIGNvbnN0IFtwa2ddID0gbmFtZS5zcGxpdCgnLycpXG4gIHJldHVybiBwa2dcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQWJzb2x1dGUobmFtZSkge1xuICByZXR1cm4gbmFtZS5pbmRleE9mKCcvJykgPT09IDBcbn1cblxuLy8gcGF0aCBpcyBkZWZpbmVkIG9ubHkgd2hlbiBhIHJlc29sdmVyIHJlc29sdmVzIHRvIGEgbm9uLXN0YW5kYXJkIHBhdGhcbmV4cG9ydCBmdW5jdGlvbiBpc0J1aWx0SW4obmFtZSwgc2V0dGluZ3MsIHBhdGgpIHtcbiAgaWYgKHBhdGggfHwgIW5hbWUpIHJldHVybiBmYWxzZVxuICBjb25zdCBiYXNlID0gYmFzZU1vZHVsZShuYW1lKVxuICBjb25zdCBleHRyYXMgPSAoc2V0dGluZ3MgJiYgc2V0dGluZ3NbJ2ltcG9ydC9jb3JlLW1vZHVsZXMnXSkgfHwgW11cbiAgcmV0dXJuIGNvcmVNb2R1bGVzW2Jhc2VdIHx8IGV4dHJhcy5pbmRleE9mKGJhc2UpID4gLTFcbn1cblxuZnVuY3Rpb24gaXNFeHRlcm5hbFBhdGgocGF0aCwgbmFtZSwgc2V0dGluZ3MpIHtcbiAgY29uc3QgZm9sZGVycyA9IChzZXR0aW5ncyAmJiBzZXR0aW5nc1snaW1wb3J0L2V4dGVybmFsLW1vZHVsZS1mb2xkZXJzJ10pIHx8IFsnbm9kZV9tb2R1bGVzJ11cbiAgcmV0dXJuICFwYXRoIHx8IGZvbGRlcnMuc29tZShmb2xkZXIgPT4gaXNTdWJwYXRoKGZvbGRlciwgcGF0aCkpXG59XG5cbmZ1bmN0aW9uIGlzU3VicGF0aChzdWJwYXRoLCBwYXRoKSB7XG4gIGNvbnN0IG5vcm1QYXRoID0gcGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJylcbiAgY29uc3Qgbm9ybVN1YnBhdGggPSBzdWJwYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKS5yZXBsYWNlKC9cXC8kLywgJycpXG4gIGlmIChub3JtU3VicGF0aC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuICBjb25zdCBsZWZ0ID0gbm9ybVBhdGguaW5kZXhPZihub3JtU3VicGF0aClcbiAgY29uc3QgcmlnaHQgPSBsZWZ0ICsgbm9ybVN1YnBhdGgubGVuZ3RoXG4gIHJldHVybiBsZWZ0ICE9PSAtMSAmJlxuICAgICAgICAobGVmdCA9PT0gMCB8fCBub3JtU3VicGF0aFswXSAhPT0gJy8nICYmIG5vcm1QYXRoW2xlZnQgLSAxXSA9PT0gJy8nKSAmJlxuICAgICAgICAocmlnaHQgPj0gbm9ybVBhdGgubGVuZ3RoIHx8IG5vcm1QYXRoW3JpZ2h0XSA9PT0gJy8nKVxufVxuXG5jb25zdCBleHRlcm5hbE1vZHVsZVJlZ0V4cCA9IC9eXFx3L1xuZXhwb3J0IGZ1bmN0aW9uIGlzRXh0ZXJuYWxNb2R1bGUobmFtZSwgc2V0dGluZ3MsIHBhdGgpIHtcbiAgcmV0dXJuIGV4dGVybmFsTW9kdWxlUmVnRXhwLnRlc3QobmFtZSkgJiYgaXNFeHRlcm5hbFBhdGgocGF0aCwgbmFtZSwgc2V0dGluZ3MpXG59XG5cbmNvbnN0IGV4dGVybmFsTW9kdWxlTWFpblJlZ0V4cCA9IC9eW1xcd10oKD8hXFwvKS4pKiQvXG5leHBvcnQgZnVuY3Rpb24gaXNFeHRlcm5hbE1vZHVsZU1haW4obmFtZSwgc2V0dGluZ3MsIHBhdGgpIHtcbiAgcmV0dXJuIGV4dGVybmFsTW9kdWxlTWFpblJlZ0V4cC50ZXN0KG5hbWUpICYmIGlzRXh0ZXJuYWxQYXRoKHBhdGgsIG5hbWUsIHNldHRpbmdzKVxufVxuXG5jb25zdCBzY29wZWRSZWdFeHAgPSAvXkBbXi9dKlxcLz9bXi9dKy9cbmV4cG9ydCBmdW5jdGlvbiBpc1Njb3BlZChuYW1lKSB7XG4gIHJldHVybiBuYW1lICYmIHNjb3BlZFJlZ0V4cC50ZXN0KG5hbWUpXG59XG5cbmNvbnN0IHNjb3BlZE1haW5SZWdFeHAgPSAvXkBbXi9dK1xcLz9bXi9dKyQvXG5leHBvcnQgZnVuY3Rpb24gaXNTY29wZWRNYWluKG5hbWUpIHtcbiAgcmV0dXJuIG5hbWUgJiYgc2NvcGVkTWFpblJlZ0V4cC50ZXN0KG5hbWUpXG59XG5cbmZ1bmN0aW9uIGlzSW50ZXJuYWxNb2R1bGUobmFtZSwgc2V0dGluZ3MsIHBhdGgpIHtcbiAgY29uc3QgaW50ZXJuYWxTY29wZSA9IChzZXR0aW5ncyAmJiBzZXR0aW5nc1snaW1wb3J0L2ludGVybmFsLXJlZ2V4J10pXG4gIGNvbnN0IG1hdGNoZXNTY29wZWRPckV4dGVybmFsUmVnRXhwID0gc2NvcGVkUmVnRXhwLnRlc3QobmFtZSkgfHwgZXh0ZXJuYWxNb2R1bGVSZWdFeHAudGVzdChuYW1lKVxuICByZXR1cm4gKG1hdGNoZXNTY29wZWRPckV4dGVybmFsUmVnRXhwICYmIChpbnRlcm5hbFNjb3BlICYmIG5ldyBSZWdFeHAoaW50ZXJuYWxTY29wZSkudGVzdChuYW1lKSB8fCAhaXNFeHRlcm5hbFBhdGgocGF0aCwgbmFtZSwgc2V0dGluZ3MpKSlcbn1cblxuZnVuY3Rpb24gaXNSZWxhdGl2ZVRvUGFyZW50KG5hbWUpIHtcbiAgcmV0dXJuL15cXC5cXC4kfF5cXC5cXC5bXFxcXC9dLy50ZXN0KG5hbWUpXG59XG5cbmNvbnN0IGluZGV4RmlsZXMgPSBbJy4nLCAnLi8nLCAnLi9pbmRleCcsICcuL2luZGV4LmpzJ11cbmZ1bmN0aW9uIGlzSW5kZXgobmFtZSkge1xuICByZXR1cm4gaW5kZXhGaWxlcy5pbmRleE9mKG5hbWUpICE9PSAtMVxufVxuXG5mdW5jdGlvbiBpc1JlbGF0aXZlVG9TaWJsaW5nKG5hbWUpIHtcbiAgcmV0dXJuIC9eXFwuW1xcXFwvXS8udGVzdChuYW1lKVxufVxuXG5mdW5jdGlvbiB0eXBlVGVzdChuYW1lLCBzZXR0aW5ncywgcGF0aCkge1xuICBpZiAoaXNBYnNvbHV0ZShuYW1lLCBzZXR0aW5ncywgcGF0aCkpIHsgcmV0dXJuICdhYnNvbHV0ZScgfVxuICBpZiAoaXNCdWlsdEluKG5hbWUsIHNldHRpbmdzLCBwYXRoKSkgeyByZXR1cm4gJ2J1aWx0aW4nIH1cbiAgaWYgKGlzSW50ZXJuYWxNb2R1bGUobmFtZSwgc2V0dGluZ3MsIHBhdGgpKSB7IHJldHVybiAnaW50ZXJuYWwnIH1cbiAgaWYgKGlzRXh0ZXJuYWxNb2R1bGUobmFtZSwgc2V0dGluZ3MsIHBhdGgpKSB7IHJldHVybiAnZXh0ZXJuYWwnIH1cbiAgaWYgKGlzU2NvcGVkKG5hbWUsIHNldHRpbmdzLCBwYXRoKSkgeyByZXR1cm4gJ2V4dGVybmFsJyB9XG4gIGlmIChpc1JlbGF0aXZlVG9QYXJlbnQobmFtZSwgc2V0dGluZ3MsIHBhdGgpKSB7IHJldHVybiAncGFyZW50JyB9XG4gIGlmIChpc0luZGV4KG5hbWUsIHNldHRpbmdzLCBwYXRoKSkgeyByZXR1cm4gJ2luZGV4JyB9XG4gIGlmIChpc1JlbGF0aXZlVG9TaWJsaW5nKG5hbWUsIHNldHRpbmdzLCBwYXRoKSkgeyByZXR1cm4gJ3NpYmxpbmcnIH1cbiAgcmV0dXJuICd1bmtub3duJ1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNTY29wZWRNb2R1bGUobmFtZSkge1xuICByZXR1cm4gbmFtZS5pbmRleE9mKCdAJykgPT09IDBcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVzb2x2ZUltcG9ydFR5cGUobmFtZSwgY29udGV4dCkge1xuICByZXR1cm4gdHlwZVRlc3QobmFtZSwgY29udGV4dC5zZXR0aW5ncywgcmVzb2x2ZShuYW1lLCBjb250ZXh0KSlcbn1cbiJdfQ==