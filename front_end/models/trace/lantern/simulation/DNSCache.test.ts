// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Lantern from '../lantern.js';

const {DNSCache} = Lantern.Simulation;

const MULTIPLIER = DNSCache.rttMultiplier;

describe('DNSCache', () => {
  let dns: Lantern.Simulation.DNSCache;
  let request: Lantern.Types.NetworkRequest;

  beforeEach(() => {
    dns = new DNSCache({rtt: 100});
    request = {
      parsedURL: {
        host: 'example.com',
        scheme: 'https',
        securityOrigin: '',
      },
    } as Lantern.Types.NetworkRequest;
  });

  describe('.getTimeUntilResolution', () => {
    it('should return the RTT multiplied', () => {
      const resolutionTime = dns.getTimeUntilResolution(request);
      assert.strictEqual(resolutionTime, 100 * MULTIPLIER);
    });

    it('should return time with requestedAt', () => {
      const resolutionTime = dns.getTimeUntilResolution(request, {requestedAt: 1500});
      assert.strictEqual(resolutionTime, 100 * MULTIPLIER);
    });

    it('should not cache by default', () => {
      dns.getTimeUntilResolution(request, {requestedAt: 0});
      const resolutionTime = dns.getTimeUntilResolution(request, {requestedAt: 1000});
      assert.strictEqual(resolutionTime, 100 * MULTIPLIER);
    });

    it('should cache when told', () => {
      dns.getTimeUntilResolution(request, {requestedAt: 0, shouldUpdateCache: true});
      const resolutionTime = dns.getTimeUntilResolution(request, {requestedAt: 1000});
      assert.strictEqual(resolutionTime, 0);
    });

    it('should cache by domain', () => {
      dns.getTimeUntilResolution(request, {requestedAt: 0, shouldUpdateCache: true});
      const otherRequest = {parsedURL: {host: 'other-example.com'}} as Lantern.Types.NetworkRequest;
      const resolutionTime = dns.getTimeUntilResolution(otherRequest, {requestedAt: 1000});
      assert.strictEqual(resolutionTime, 100 * MULTIPLIER);
    });

    it('should not update cache with later times', () => {
      dns.getTimeUntilResolution(request, {requestedAt: 1000, shouldUpdateCache: true});
      dns.getTimeUntilResolution(request, {requestedAt: 1500, shouldUpdateCache: true});
      dns.getTimeUntilResolution(request, {requestedAt: 500, shouldUpdateCache: true});
      dns.getTimeUntilResolution(request, {requestedAt: 5000, shouldUpdateCache: true});

      assert.strictEqual(dns.getTimeUntilResolution(request, {requestedAt: 0}), 100 * MULTIPLIER);
      assert.strictEqual(dns.getTimeUntilResolution(request, {requestedAt: 550}), 100 * MULTIPLIER - 50);
      assert.strictEqual(dns.getTimeUntilResolution(request, {requestedAt: 1000}), 0);
      assert.strictEqual(dns.getTimeUntilResolution(request, {requestedAt: 2000}), 0);
    });
  });

  describe('.setResolvedAt', () => {
    it('should set the DNS resolution time for a request', () => {
      dns.setResolvedAt(request.parsedURL.host, 123);
      const resolutionTime = dns.getTimeUntilResolution(request);
      assert.strictEqual(resolutionTime, 123);
    });
  });
});
