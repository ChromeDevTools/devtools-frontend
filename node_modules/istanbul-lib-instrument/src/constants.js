const { createHash } = require('crypto');
const { major } = require('semver');
const { name, version } = require('../package.json');

const SHA = 'sha1';
module.exports = {
    SHA,
    MAGIC_KEY: '_coverageSchema',
    MAGIC_VALUE: createHash(SHA)
        .update(name + '@' + major(version))
        .digest('hex')
};
