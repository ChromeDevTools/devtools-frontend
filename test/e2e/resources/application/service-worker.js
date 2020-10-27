// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
const CACHE_NAME = 'cache-v1';

const urlsToCache = [
  '/test/e2e/resources/application/main.css',
];


self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
    return cache.addAll(urlsToCache);
  }));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then(function(response) {
    if (response) {
      return response;
    }
    return fetch(event.request);
  }));
});
