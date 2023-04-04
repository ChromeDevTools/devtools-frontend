'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = _interopDefault(require('fs'));
var util = _interopDefault(require('util'));
var pluginutils = require('@rollup/pluginutils');
var sourceMapResolve = require('source-map-resolve');

const promisifiedResolveSourceMap = util.promisify(sourceMapResolve.resolveSourceMap);
const promisifiedResolveSources = util.promisify(sourceMapResolve.resolveSources);
function sourcemaps({ include, exclude, readFile = fs.readFile, } = {}) {
    const filter = pluginutils.createFilter(include, exclude);
    const promisifiedReadFile = util.promisify(readFile);
    return {
        name: 'sourcemaps',
        async load(id) {
            if (!filter(id)) {
                return null;
            }
            let code;
            try {
                code = (await promisifiedReadFile(id)).toString();
            }
            catch (_a) {
                // Failed reading file, let the next plugin deal with it
                return null;
            }
            let map;
            try {
                const result = await promisifiedResolveSourceMap(code, id, readFile);
                // The code contained no sourceMappingURL,
                if (result === null) {
                    return code;
                }
                map = result.map;
            }
            catch (_b) {
                // Failed resolving source map, just return the source
                return code;
            }
            // Resolve sources if they're not included
            if (map.sourcesContent === undefined) {
                try {
                    const { sourcesContent } = await promisifiedResolveSources(map, id, readFile);
                    if (sourcesContent.every(util.isString)) {
                        map.sourcesContent = sourcesContent;
                    }
                }
                catch (_c) {
                    // Ignore
                }
            }
            return { code, map };
        },
    };
}

module.exports = sourcemaps;
//# sourceMappingURL=index.cjs.map
