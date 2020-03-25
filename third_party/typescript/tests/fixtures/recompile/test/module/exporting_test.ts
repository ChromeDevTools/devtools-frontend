import {assert} from 'chai';

import * as Module from '../../front_end/module/module.js';

describe('test suite', () => {
  it('compiles', () => {
    assert.equal(Module.Exporting.foo, 42);
  });
});
