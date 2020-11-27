karma-sinon
===========

Sinon for karma

Installation
------------

Install the module via npm

```sh
$ npm install karma-sinon sinon --save-dev
```

Add `sinon` to the `frameworks` key in your Karma configuration:

```js
module.exports = function(config) {
  'use strict';
  config.set({
    #...
    frameworks: ['jasmine', 'sinon'],
    #...
  });
}
```

**Example**
```javascript
describe("sinon example test", function () {
    var time2013_10_01;

    time2013_10_01 = (new Date(2013, 10-1, 1)).getTime();

    before(function() {
        // sinon was defined in global scope
        this.fakeTimer = new sinon.useFakeTimers(time2013_10_01);
    });

    it("some test", function() {
        //test
    });

    after(function() {
        this.fakeTimer.restore();
    });

});
```
