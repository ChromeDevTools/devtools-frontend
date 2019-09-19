const path = require("path");
const convertSourceMap = require("convert-source-map");
const istanbul = require("istanbul-lib-instrument");

const createPreprocessor = (logger, config) => {

    const log = logger.create("preprocessor.karma-coverage-istanbul-instrumenter");
    const instrumenter = istanbul.createInstrumenter(config.coverageIstanbulInstrumenter);

    return (content, file, done) => {

        log.debug("Processing \"%s\".", file.originalPath);

        let sourceMap = convertSourceMap.fromSource(content);
        if(!sourceMap) {
            sourceMap = convertSourceMap.fromMapFileSource(content, path.dirname(file.originalPath));
        }

        instrumenter.instrument(content, file.originalPath, (error, instrumentedSource) => {
            if(error) {
                log.error("%s\nin %s", error.message, file.originalPath);
                done(error.message);
            }
            else {
                done(instrumentedSource);
            }
        }, sourceMap ? sourceMap.sourcemap : undefined);
    };
};

createPreprocessor.$inject = [
    "logger",
    "config"
];

module.exports = createPreprocessor;
