// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describeWithEnvironment('ThirdParties', function() {
  describe('Entities', function() {
    it('gets correct entitiesByRequest', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
      const reqs = parsedTrace.NetworkRequests.byTime;

      const got = Trace.Extras.ThirdParties.getEntitiesByRequest(reqs);
      const gotEntityByRequest = [...got.entityByRequest.entries()].map(([req, entity]) => {
        return [req.args.data.url, entity.name];
      });

      assert.deepEqual(gotEntityByRequest, [
        ['http://localhost:8080/', 'localhost'],
        ['https://fonts.googleapis.com/css2?family=Orelega+One&display=swap', 'Google Fonts'],
        ['http://localhost:8080/styles.css', 'localhost'],
        ['http://localhost:8080/blocking.js', 'localhost'],
        ['http://localhost:8080/module.js', 'localhost'],
        ['https://fonts.gstatic.com/s/orelegaone/v1/3qTpojOggD2XtAdFb-QXZFt93kY.woff2', 'Google Fonts'],
      ]);
    });
  });
  describe('byTraceBounds', function() {
    it('full trace bounds', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
      const reqs = parsedTrace.NetworkRequests.byTime;

      const {entityByRequest} = Trace.Extras.ThirdParties.getSummariesAndEntitiesForTraceBounds(
          parsedTrace, parsedTrace.Meta.traceBounds, reqs);

      const gotEntityByRequest = [...entityByRequest.entries()].map(([req, entity]) => {
        return [req.args.data.url, entity.name];
      });

      assert.deepEqual(gotEntityByRequest, [
        ['http://localhost:8080/', 'localhost'],
        ['https://fonts.googleapis.com/css2?family=Orelega+One&display=swap', 'Google Fonts'],
        ['http://localhost:8080/styles.css', 'localhost'],
        ['http://localhost:8080/blocking.js', 'localhost'],
        ['http://localhost:8080/module.js', 'localhost'],
        ['https://fonts.gstatic.com/s/orelegaone/v1/3qTpojOggD2XtAdFb-QXZFt93kY.woff2', 'Google Fonts'],
      ]);
    });
    it('partial trace bounds', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
      const reqs = parsedTrace.NetworkRequests.byTime;

      // Font requests of load-simple.json.gz begin & end before/after this bounds.
      const min = Trace.Types.Timing.MicroSeconds(1634222300000);
      const max = Trace.Types.Timing.MicroSeconds(1634222320000);
      const middle = {min, max, range: Trace.Types.Timing.MicroSeconds(max - min)};

      const {entityByRequest} =
          Trace.Extras.ThirdParties.getSummariesAndEntitiesForTraceBounds(parsedTrace, middle, reqs);
      const gotEntityByRequest = [...entityByRequest.entries()].map(([req, entity]) => {
        return [req.args.data.url, entity.name];
      });

      // Only these localhost requests overlap traceBounds.
      assert.deepEqual(gotEntityByRequest, [
        ['http://localhost:8080/', 'localhost'],
        ['http://localhost:8080/styles.css', 'localhost'],
        ['http://localhost:8080/blocking.js', 'localhost'],
        ['http://localhost:8080/module.js', 'localhost'],
      ]);
    });
    it('no requests within trace bounds', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
      const reqs = parsedTrace.NetworkRequests.byTime;

      const min = Trace.Types.Timing.MicroSeconds(1634230000000);
      const max = Trace.Types.Timing.MicroSeconds(1634231000000);
      const middle = {min, max, range: Trace.Types.Timing.MicroSeconds(max - min)};

      const {entityByRequest} =
          Trace.Extras.ThirdParties.getSummariesAndEntitiesForTraceBounds(parsedTrace, middle, reqs);
      const gotEntityByRequest = [...entityByRequest.entries()].map(([req, entity]) => {
        return [req.args.data.url, entity.name];
      });
      assert.deepEqual(gotEntityByRequest, []);
    });
  });
});
