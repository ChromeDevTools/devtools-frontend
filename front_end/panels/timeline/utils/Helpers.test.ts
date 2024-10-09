// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';

import * as Helpers from './Helpers.js';

describeWithEnvironment('Helpers', () => {
  it('createUrlLabels', function() {
    function fn(urls: string[], expected: string[]) {
      assert.deepEqual(Helpers.createUrlLabels(urls.map(url => new URL(url))), expected);
    }

    fn([], []);

    // Initial url is elided.
    fn(['https://www.example.com'], ['/']);
    fn(['https://www.example.com?k=1234567890&k2=1234567890&k3=0123'], ['/?k=1234567…&k2=1234567…&k3=0123']);
    fn(['https://www.example.com/blah?test=me'], ['/blah?test=me']);

    // Subsequent urls are elided if the same protocol+domain.
    fn(['https://www.example.com', 'https://www.example.com/blah?test=me'], ['/', '/blah?test=me']);

    // Subsequent urls are not elided if the protocol or the domain changes.
    fn(['https://www.example.com', 'https://www.google.com'], ['/', 'www.google.com']);
    fn(['https://www.example.com', 'https://www.google.com/search'], ['/', 'www.google.com/search']);
    fn(['https://www.example.com', 'https://www.google.com/search', 'https://www.google.com/search2'],
       ['/', 'www.google.com/search', '/search2']);

    // If only https protocol is present, elide protocol. Otherwise always show the full URL (but still elide the search params).
    fn(['https://www.example.com', 'http://www.example.com'], ['https://www.example.com', 'http://www.example.com']);
    fn(['http://www.example.com', 'https://www.example.com'], ['http://www.example.com', 'https://www.example.com']);
    fn(['http://www.example.com?k=1234567890', 'https://www.example.com?k=1234567890'],
       ['http://www.example.com/?k=1234567…', 'https://www.example.com/?k=1234567…']);
    fn(['https://www.example.com', 'https://www.example2.com'], ['/', 'www.example2.com']);
  });
});
