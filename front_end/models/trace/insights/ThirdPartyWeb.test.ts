// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

export async function processTrace(testContext: Mocha.Suite|Mocha.Context|null, traceFile: string) {
  const {parsedTrace, insights} = await TraceLoader.traceEngine(testContext, traceFile);
  if (!insights) {
    throw new Error('No insights');
  }

  return {data: parsedTrace, insights};
}

describeWithEnvironment('ThirdPartyWeb', function() {
  it('categorizes third party web requests (simple)', async () => {
    const {data, insights} = await processTrace(this, 'load-simple.json.gz');
    assert.strictEqual(insights.size, 2);
    const insight =
        getInsightOrError('ThirdPartyWeb', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));

    const entityByRequestResult = [...insight.entityByRequest.entries()].map(([request, entity]) => {
      return [request.args.data.url, entity.name];
    });
    assert.deepEqual(entityByRequestResult, [
      ['http://localhost:8080/', 'localhost'],
      ['https://fonts.googleapis.com/css2?family=Orelega+One&display=swap', 'Google Fonts'],
      ['http://localhost:8080/styles.css', 'localhost'],
      ['http://localhost:8080/blocking.js', 'localhost'],
      ['http://localhost:8080/module.js', 'localhost'],
      ['https://fonts.gstatic.com/s/orelegaone/v1/3qTpojOggD2XtAdFb-QXZFt93kY.woff2', 'Google Fonts'],
    ]);

    const requestsByEntityResult = [...insight.requestsByEntity.entries()].map(([entity, requests]) => {
      return [entity.name, requests.map(r => r.args.data.url)];
    });
    assert.deepEqual(
        requestsByEntityResult,
        [
          [
            'localhost',
            [
              'http://localhost:8080/',
              'http://localhost:8080/styles.css',
              'http://localhost:8080/blocking.js',
              'http://localhost:8080/module.js',
            ],
          ],
          [
            'Google Fonts',
            [
              'https://fonts.googleapis.com/css2?family=Orelega+One&display=swap',
              'https://fonts.gstatic.com/s/orelegaone/v1/3qTpojOggD2XtAdFb-QXZFt93kY.woff2',
            ],
          ],
        ],
    );

    const summaryResult = [...insight.summaryByEntity.entries()].map(([entity, summary]) => {
      return [entity.name, summary];
    });
    assert.deepEqual(summaryResult, [
      ['localhost', {transferSize: 751, mainThreadTime: 26381}],
      ['Google Fonts', {transferSize: 0, mainThreadTime: 0}],
    ]);
  });

  it('categorizes third party web requests (complex)', async () => {
    const {data, insights} = await processTrace(this, 'lantern/paul/trace.json.gz');
    assert.strictEqual(insights.size, 1);
    const insight =
        getInsightOrError('ThirdPartyWeb', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));

    const entityNames = [...insight.entityByRequest.values()].map(entity => entity.name);
    assert.deepEqual([...new Set(entityNames)], [
      'paulirish.com',
      'Google Tag Manager',
      'Google Fonts',
      'Google Analytics',
      'Disqus',
      'Firebase',
    ]);

    const requestsByEntityResult = [...insight.requestsByEntity.entries()].map(([entity, requests]) => {
      return [entity.name, requests.map(r => r.args.data.url)];
    });
    assert.deepEqual(
        requestsByEntityResult,
        [
          [
            'paulirish.com',
            [
              'https://www.paulirish.com/',
              'https://www.paulirish.com/assets/wikipedia-flamechart.jpg',
              'https://www.paulirish.com/avatar150.jpg',
              'https://www.paulirish.com/javascripts/modernizr-2.0.js',
              'https://www.paulirish.com/javascripts/ender.js',
              'https://www.paulirish.com/javascripts/octopress.js',
              'https://www.paulirish.com/javascripts/firebase-performance-standalone.js',
              'https://www.paulirish.com/images/noise.png?1418840251',
              'https://www.paulirish.com/images/code_bg.png?1418840251',
              'https://www.paulirish.com/favicon.ico',
            ],
          ],
          [
            'Google Tag Manager',
            [
              'https://www.googletagmanager.com/gtag/js?id=G-PGXNGYWP8E',
            ],
          ],
          [
            'Google Fonts',
            [
              'https://fonts.googleapis.com/css?family=PT+Serif:regular,italic,bold|PT+Sans:regular,italic,bold|Droid+Sans:400,700|Lato:700,900',
              'https://fonts.gstatic.com/s/droidsans/v18/SlGVmQWMvZQIdix7AFxXkHNSbRYXags.woff2',
              'https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh6UVSwiPGQ3q5d0.woff2',
              'https://fonts.gstatic.com/s/ptsans/v17/jizaRExUiTo99u79D0KExcOPIDU.woff2',
              'https://fonts.gstatic.com/s/ptsans/v17/jizfRExUiTo99u79B_mh0O6tLR8a8zI.woff2',
              'https://fonts.gstatic.com/s/droidsans/v18/SlGWmQWMvZQIdix7AFxXmMh3eDs1ZyHKpWg.woff2',
              'https://fonts.gstatic.com/s/ptserif/v18/EJRVQgYoZZY2vCFuvAFWzr-_dSb_.woff2',
            ],
          ],
          [
            'Google Analytics',
            [
              'https://www.google-analytics.com/analytics.js',
              'https://www.google-analytics.com/g/collect?v=2&tid=G-PGXNGYWP8E&gtm=45je4580v880158425za200&_p=1715625261583&gcd=13l3l3l3l1&npa=0&dma=0&cid=414801335.1715625262&ul=en-us&sr=412x823&uaa=&uab=64&uafvl=Not%252FA)Brand%3B8.0.0.0%7CChromium%3B126.0.6475.0%7CGoogle%2520Chrome%3B126.0.6475.0&uamb=1&uam=moto%20g%20power%20(2022)&uap=Android&uapv=11.0&uaw=0&are=1&frm=0&pscdl=noapi&_s=1&sid=1715625261&sct=1&seg=0&dl=https%3A%2F%2Fwww.paulirish.com%2F&dt=Paul%20Irish&en=page_view&_fv=1&_nsi=1&_ss=1&_ee=1&tfd=353',
              'https://www.google-analytics.com/j/collect?v=1&_v=j101&a=272264939&t=pageview&_s=1&dl=https%3A%2F%2Fwww.paulirish.com%2F&ul=en-us&de=UTF-8&dt=Paul%20Irish&sd=30-bit&sr=412x823&vp=412x823&je=0&_u=IADAAEABAAAAACAAI~&jid=1388679807&gjid=654531532&cid=414801335.1715625262&tid=UA-692547-2&_gid=1964734610.1715625262&_r=1&_slc=1&z=1746264594',
            ],
          ],
          [
            'Disqus',
            [
              'https://paulirish.disqus.com/count.js',
            ],
          ],
          [
            'Firebase',
            [
              'https://firebaseinstallations.googleapis.com/v1/projects/paulirishcom/installations',
              'https://firebaseremoteconfig.googleapis.com/v1/projects/paulirishcom/namespaces/fireperf:fetch?key=AIzaSyCGxLbbFQxH4BV1fY0RODlxTos9nJa2l_g',
            ],
          ],
        ],
    );

    const summaryResult = [...insight.summaryByEntity.entries()].map(([entity, summary]) => {
      return [entity.name, summary];
    });
    assert.deepEqual(summaryResult, [
      ['paulirish.com', {transferSize: 157130, mainThreadTime: 6626}],
      ['Google Tag Manager', {transferSize: 95375, mainThreadTime: 83}],
      ['Google Fonts', {transferSize: 80003, mainThreadTime: 0}],
      ['Google Analytics', {transferSize: 20865, mainThreadTime: 97}],
      ['Disqus', {transferSize: 1551, mainThreadTime: 23}],
      ['Firebase', {transferSize: 2847, mainThreadTime: 0}],
    ]);
  });
});
