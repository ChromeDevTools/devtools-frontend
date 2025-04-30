//@ts-check
const fs = require('graceful-fs');
const path = require('path');

const SOURCEMAP_URL_REGEX = /^\/\/#\s*sourceMappingURL=/;
const CHARSET_REGEX = /^;charset=([^;]+);/;

/**
 * @param {*} logger
 * @param {karmaSourcemapLoader.Config} config
 * @returns {karmaSourcemapLoader.Preprocessor}
 */
function createSourceMapLocatorPreprocessor(logger, config) {
  const options = (config && config.sourceMapLoader) || {};
  const remapPrefixes = options.remapPrefixes;
  const remapSource = options.remapSource;
  const useSourceRoot = options.useSourceRoot;
  const onlyWithURL = options.onlyWithURL;
  const strict = options.strict;
  const needsUpdate = remapPrefixes || remapSource || useSourceRoot;
  const log = logger.create('preprocessor.sourcemap');

  /**
   * @param {string[]} sources
   */
  function remapSources(sources) {
    const all = sources.length;
    let remapped = 0;
    /** @type {Record<string, boolean>} */
    const remappedPrefixes = {};
    let remappedSource = false;

    /**
     * Replaces source path prefixes using a key:value map
     * @param {string} source
     * @returns {string | undefined}
     */
    function handlePrefixes(source) {
      if (!remapPrefixes) {
        return undefined;
      }

      let sourcePrefix, targetPrefix, target;
      for (sourcePrefix in remapPrefixes) {
        targetPrefix = remapPrefixes[sourcePrefix];
        if (source.startsWith(sourcePrefix)) {
          target = targetPrefix + source.substring(sourcePrefix.length);
          ++remapped;
          // Log only one remapping as an example for each prefix to prevent
          // flood of messages on the console
          if (!remappedPrefixes[sourcePrefix]) {
            remappedPrefixes[sourcePrefix] = true;
            log.debug(' ', source, '>>', target);
          }
          return target;
        }
      }
    }

    // Replaces source paths using a custom function
    /**
     * @param {string} source
     * @returns {string | undefined}
     */
    function handleMapper(source) {
      if (!remapSource) {
        return undefined;
      }

      const target = remapSource(source);
      // Remapping is considered happenned only if the handler returns
      // a non-empty path different from the existing one
      if (target && target !== source) {
        ++remapped;
        // Log only one remapping as an example to prevent flooding the console
        if (!remappedSource) {
          remappedSource = true;
          log.debug(' ', source, '>>', target);
        }
        return target;
      }
    }

    const result = sources.map((rawSource) => {
      const source = rawSource.replace(/\\/g, '/');

      const sourceWithRemappedPrefixes = handlePrefixes(source);
      if (sourceWithRemappedPrefixes) {
        // One remapping is enough; if a prefix was replaced, do not let
        // the handler below check the source path any more
        return sourceWithRemappedPrefixes;
      }

      return handleMapper(source) || source;
    });

    if (remapped) {
      log.debug('  ...');
      log.debug(' ', remapped, 'sources from', all, 'were remapped');
    }

    return result;
  }

  return function karmaSourcemapLoaderPreprocessor(content, file, done) {
    /**
     * Parses a string with source map as JSON and handles errors
     * @param {string} data
     * @returns {karmaSourcemapLoader.SourceMap | false | undefined}
     */
    function parseMap(data) {
      try {
        return JSON.parse(data);
      } catch (err) {
        if (strict) {
          done(new Error('malformed source map for' + file.originalPath + '\nError: ' + err));
          // Returning `false` will make the caller abort immediately
          return false;
        }
        log.warn('malformed source map for', file.originalPath);
        log.warn('Error:', err);
      }
    }

    /**
     * Sets the sourceRoot property to a fixed or computed value
     * @param {karmaSourcemapLoader.SourceMap} sourceMap
     */
    function setSourceRoot(sourceMap) {
      const sourceRoot = typeof useSourceRoot === 'function' ? useSourceRoot(file) : useSourceRoot;
      if (sourceRoot) {
        sourceMap.sourceRoot = sourceRoot;
      }
    }

    /**
     * Performs configured updates of the source map content
     * @param {karmaSourcemapLoader.SourceMap} sourceMap
     */
    function updateSourceMap(sourceMap) {
      if (remapPrefixes || remapSource) {
        sourceMap.sources = remapSources(sourceMap.sources);
      }
      if (useSourceRoot) {
        setSourceRoot(sourceMap);
      }
    }

    /**
     * @param {string} data
     * @returns {void}
     */
    function sourceMapData(data) {
      const sourceMap = parseMap(data);
      if (sourceMap) {
        // Perform the remapping only if there is a configuration for it
        if (needsUpdate) {
          updateSourceMap(sourceMap);
        }
        file.sourceMap = sourceMap;
      } else if (sourceMap === false) {
        return;
      }
      done(content);
    }

    /**
     * @param {string} inlineData
     */
    function inlineMap(inlineData) {
      let charset = 'utf-8';

      if (CHARSET_REGEX.test(inlineData)) {
        const matches = inlineData.match(CHARSET_REGEX);

        if (matches && matches.length === 2) {
          charset = matches[1];
          inlineData = inlineData.slice(matches[0].length - 1);
        }
      }

      if (/^;base64,/.test(inlineData)) {
        // base64-encoded JSON string
        log.debug('base64-encoded source map for', file.originalPath);
        const buffer = Buffer.from(inlineData.slice(';base64,'.length), 'base64');
        //@ts-ignore Assume the parsed charset is supported by Buffer.
        sourceMapData(buffer.toString(charset));
      } else if (inlineData.startsWith(',')) {
        // straight-up URL-encoded JSON string
        log.debug('raw inline source map for', file.originalPath);
        sourceMapData(decodeURIComponent(inlineData.slice(1)));
      } else {
        if (strict) {
          done(new Error('invalid source map in ' + file.originalPath));
        } else {
          log.warn('invalid source map in', file.originalPath);
          done(content);
        }
      }
    }

    /**
     * @param {string} mapPath
     * @param {boolean} optional
     */
    function fileMap(mapPath, optional) {
      fs.readFile(mapPath, function (err, data) {
        // File does not exist
        if (err && err.code === 'ENOENT') {
          if (!optional) {
            if (strict) {
              done(new Error('missing external source map for ' + file.originalPath));
              return;
            } else {
              log.warn('missing external source map for', file.originalPath);
            }
          }
          done(content);
          return;
        }

        // Error while reading the file
        if (err) {
          if (strict) {
            done(
              new Error('reading external source map failed for ' + file.originalPath + '\n' + err)
            );
          } else {
            log.warn('reading external source map failed for', file.originalPath);
            log.warn(err);
            done(content);
          }
          return;
        }

        log.debug('external source map exists for', file.originalPath);
        sourceMapData(data.toString());
      });
    }

    // Remap source paths in a directly served source map
    function convertMap() {
      let sourceMap;
      // Perform the remapping only if there is a configuration for it
      if (needsUpdate) {
        log.debug('processing source map', file.originalPath);
        sourceMap = parseMap(content);
        if (sourceMap) {
          updateSourceMap(sourceMap);
          content = JSON.stringify(sourceMap);
        } else if (sourceMap === false) {
          return;
        }
      }
      done(content);
    }

    if (file.path.endsWith('.map')) {
      return convertMap();
    }

    const lines = content.split(/\n/);
    let lastLine = lines.pop();
    while (typeof lastLine === 'string' && /^\s*$/.test(lastLine)) {
      lastLine = lines.pop();
    }

    const mapUrl =
      lastLine && SOURCEMAP_URL_REGEX.test(lastLine) && lastLine.replace(SOURCEMAP_URL_REGEX, '');

    if (!mapUrl) {
      if (onlyWithURL) {
        done(content);
      } else {
        fileMap(file.path + '.map', true);
      }
    } else if (/^data:application\/json/.test(mapUrl)) {
      inlineMap(mapUrl.slice('data:application/json'.length));
    } else {
      fileMap(path.resolve(path.dirname(file.path), mapUrl), false);
    }
  };
}

createSourceMapLocatorPreprocessor.$inject = ['logger', 'config'];

// PUBLISH DI MODULE
module.exports = {
  'preprocessor:sourcemap': ['factory', createSourceMapLocatorPreprocessor],
};
