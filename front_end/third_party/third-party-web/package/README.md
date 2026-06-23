# [Third Party Web](https://www.thirdpartyweb.today/)

## Check out the shiny new web UI https://www.thirdpartyweb.today/

Data on third party entities and their impact on the web.

This document is a summary of which third party scripts are most responsible for excessive JavaScript execution on the web today.

## Table of Contents

1.  [Goals](#goals)
1.  [Methodology](#methodology)
1.  [npm Module](#npm-module)
1.  [Updates](#updates)
1.  [Data](#data)
    1.  [Summary](#summary)
    1.  [How to Interpret](#how-to-interpret)
    1.  [Third Parties by Category](#by-category)
        1.  [Advertising](#ad)
        1.  [Analytics](#analytics)
        1.  [Social](#social)
        1.  [Video](#video)
        1.  [Developer Utilities](#utility)
        1.  [Hosting Platforms](#hosting)
        1.  [Marketing](#marketing)
        1.  [Customer Success](#customer-success)
        1.  [Content & Publishing](#content)
        1.  [CDNs](#cdn)
        1.  [Tag Management](#tag-manager)
        1.  [Consent Management Provider](#consent-provider)
        1.  [Mixed / Other](#other)
    1.  [Third Parties by Total Impact](#by-total-impact)
1.  [Future Work](#future-work)
1.  [FAQs](#faqs)
1.  [Contributing](#contributing)

## Goals

1.  Quantify the impact of third party scripts on the web.
1.  Identify the third party scripts on the web that have the greatest performance cost.
1.  Give developers the information they need to make informed decisions about which third parties to include on their sites.
1.  Incentivize responsible third party script behavior.
1.  Make this information accessible and useful.

## Methodology

[HTTP Archive](https://httparchive.org/) is an initiative that tracks how the web is built. Every month, ~4 million sites are crawled with [Lighthouse](https://github.com/GoogleChrome/lighthouse) on mobile. Lighthouse breaks down the total script execution time of each page and attributes the execution to a URL. Using [BigQuery](https://cloud.google.com/bigquery/), this project aggregates the script execution to the origin-level and assigns each origin to the responsible entity.

## npm Module

The entity classification data is available as an npm module.

```js
const {getEntity} = require('third-party-web')
const entity = getEntity('https://d36mpcpuzc4ztk.cloudfront.net/js/visitor.js')
console.log(entity)
//   {
//     "name": "Freshdesk",
//     "homepage": "https://freshdesk.com/",
//     "category": "customer-success",
//     "domains": ["d36mpcpuzc4ztk.cloudfront.net"]
//   }
```

## Updates

## 2024-07-01 dataset

Some third parties use a dynamic subdomain to serve its main script on websites (e.g .domain.com). Some of these subdomain scripts are saved under observed-domains JSON file as results of the `sql/all-observed-domains-query.sql` query but analyzing http archive database we found a lot that are ignored because of number of occurrences (less than 50 ).

So, we've created a new query to keep observed domains with occurrence below 50 only if its mapped entity (based on entity.js) has a total occurrence (of all its declared domain) greater than 50.

## 2021-01-01 dataset

Due to a change in HTTPArchive measurement which temporarily disabled site-isolation (out-of-process iframes), all of the third-parties whose work previously took place off the main-thread are now counted _on_ the main thread (and thus appear in our stats). This is most evident in the change to Google-owned properties such as YouTube and Doubleclick whose _complete_ cost are now captured.

## 2019-05-13 dataset

A shortcoming of the attribution approach has been fixed. Total usage is now reported based on the number of _pages_ in the dataset that use the third-party, not the number of _scripts_. Correspondingly, all average impact times are now reported _per page_ rather than _per script_. Previously, a third party could appear to have a lower impact or be more popular simply by splitting their work across multiple files.

Third-parties that performed most of their work from a single script should see little to no impact from this change, but some entities have seen significant ranking movement. Hosting providers that host entire pages are, understandably, the most affected.

Some notable changes below:

| Third-Party | Previously (per-script) | Now (per-page) |
| ----------- | ----------------------- | -------------- |
| Beeketing   | 137 ms                  | 465 ms         |
| Sumo        | 263 ms                  | 798 ms         |
| Tumblr      | 324 ms                  | 1499 ms        |
| Yandex APIs | 393 ms                  | 1231 ms        |
| Google Ads  | 402 ms                  | 1285 ms        |
| Wix         | 972 ms                  | 5393 ms        |

## 2019-05-06 dataset

Google Ads clarified that `www.googletagservices.com` serves more ad scripts than generic tag management, and it has been reclassified accordingly. This has dropped the overall Tag Management share considerably back down to its earlier position.

## 2019-03-01 dataset

Almost 2,000 entities tracked now across ~3,000+ domains! Huge props to [@simonhearne](https://twitter.com/simonhearne) for making this massive increase possible. Tag Managers have now been split out into their own category since they represented such a large percentage of the "Mixed / Other" category.

## 2019-02-01 dataset

Huge props to [WordAds](https://wordads.co/) for reducing their impact from ~2.5s to ~200ms on average! A few entities are showing considerably less data this cycle (Media Math, Crazy Egg, DoubleVerify, Bootstrap CDN). Perhaps they've added new CDNs/hostnames that we haven't identified or the basket of sites in HTTPArchive has shifted away from their usage.

## Data

### Summary

Across top ~4 million sites, ~2700 origins account for ~57% of all script execution time with the top 50 entities already accounting for ~47%. Third party script execution is the majority chunk of the web today, and it's important to make informed choices.

### How to Interpret

Each entity has a number of data points available.

1.  **Usage (Total Number of Occurrences)** - how many scripts from their origins were included on pages
1.  **Total Impact (Total Execution Time)** - how many seconds were spent executing their scripts across the web
1.  **Average Impact (Average Execution Time)** - on average, how many milliseconds were spent executing each script
1.  **Category** - what type of script is this

<a name="by-category"></a>

### Third Parties by Category

This section breaks down third parties by category. The third parties in each category are ranked from first to last based on the average impact of their scripts. Perhaps the most important comparisons lie here. You always need to pick an analytics provider, but at least you can pick the most well-behaved analytics provider.

#### Overall Breakdown

Unsurprisingly, ads account for the largest identifiable chunk of third party script execution.

![breakdown by category](./by-category.png)

<a name="ad"></a>

#### Advertising

These scripts are part of advertising networks, either serving or measuring.

| Rank | Name                                                                             | Usage     | Average Impact |
| ---- | -------------------------------------------------------------------------------- | --------- | -------------- |
| 1    | MaxPoint Interactive                                                             | 4,124     | 0 ms           |
| 2    | SPX                                                                              | 14,366    | 1 ms           |
| 3    | TripleLift                                                                       | 10,506    | 2 ms           |
| 4    | Adyoulike                                                                        | 80,147    | 8 ms           |
| 5    | Constant Contact                                                                 | 30,877    | 32 ms          |
| 6    | GumGum                                                                           | 55,537    | 35 ms          |
| 7    | [AppNexus](https://www.appnexus.com/)                                            | 182,686   | 38 ms          |
| 8    | TrustX                                                                           | 12,477    | 52 ms          |
| 9    | Intercept Interactive                                                            | 11,232    | 53 ms          |
| 10   | FreakOut                                                                         | 3,815     | 56 ms          |
| 11   | Simpli.fi                                                                        | 28,215    | 59 ms          |
| 12   | ActiveCampaign                                                                   | 32,910    | 61 ms          |
| 13   | [33 Across](https://33across.com/)                                               | 99,190    | 63 ms          |
| 14   | [Media.net](https://www.media.net/)                                              | 29,559    | 63 ms          |
| 15   | [OpenX](https://www.openx.com/)                                                  | 104,910   | 66 ms          |
| 16   | sovrn                                                                            | 60,361    | 69 ms          |
| 17   | LINE Corporation                                                                 | 66,569    | 70 ms          |
| 18   | [The Trade Desk](https://www.thetradedesk.com/)                                  | 72,308    | 71 ms          |
| 19   | MailMunch                                                                        | 30,432    | 71 ms          |
| 20   | Intent IQ                                                                        | 12,094    | 77 ms          |
| 21   | Affiliate Window                                                                 | 14,546    | 82 ms          |
| 22   | RTB House AdPilot                                                                | 25,479    | 83 ms          |
| 23   | [Scorecard Research](https://www.scorecardresearch.com/)                         | 81,502    | 83 ms          |
| 24   | Index Exchange                                                                   | 26,702    | 85 ms          |
| 25   | SiteScout                                                                        | 6,010     | 85 ms          |
| 26   | Drip                                                                             | 3,834     | 86 ms          |
| 27   | [Yahoo!](https://www.yahoo.com/)                                                 | 34,921    | 88 ms          |
| 28   | [Ozone Project](https://www.ozoneproject.com/)                                   | 11,303    | 90 ms          |
| 29   | StackAdapt                                                                       | 38,499    | 91 ms          |
| 30   | [Basis](https://basis.net/)                                                      | 6,894     | 93 ms          |
| 31   | DTSCOUT                                                                          | 12,411    | 96 ms          |
| 32   | [Bing Ads](https://bingads.microsoft.com)                                        | 350,501   | 100 ms         |
| 33   | Adform                                                                           | 22,762    | 103 ms         |
| 34   | Twitter Online Conversion Tracking                                               | 131,338   | 116 ms         |
| 35   | TVSquared                                                                        | 7,728     | 117 ms         |
| 36   | [F@N Communications](https://www.fancs.com/)                                     | 10,570    | 124 ms         |
| 37   | LinkedIn Ads                                                                     | 384,570   | 133 ms         |
| 38   | Crowd Control                                                                    | 136,398   | 138 ms         |
| 39   | Rakuten Marketing                                                                | 5,917     | 142 ms         |
| 40   | Simplicity Marketing                                                             | 7,598     | 145 ms         |
| 41   | Rocket Fuel                                                                      | 3,819     | 151 ms         |
| 42   | AdsWizz                                                                          | 3,348     | 153 ms         |
| 43   | [Yahoo! JAPAN Ads](https://marketing.yahoo.co.jp/service/yahooads/)              | 83,673    | 161 ms         |
| 44   | Gemius                                                                           | 30,525    | 162 ms         |
| 45   | Impact Radius                                                                    | 9,488     | 167 ms         |
| 46   | BlueCava                                                                         | 8,404     | 171 ms         |
| 47   | JuicyAds                                                                         | 4,192     | 171 ms         |
| 48   | [Criteo](https://www.criteo.com/)                                                | 294,063   | 173 ms         |
| 49   | Smart AdServer                                                                   | 46,847    | 174 ms         |
| 50   | AudienceSearch                                                                   | 96,693    | 186 ms         |
| 51   | [Outbrain](https://www.outbrain.com/)                                            | 21,722    | 186 ms         |
| 52   | i-mobile                                                                         | 33,261    | 198 ms         |
| 53   | Technorati                                                                       | 5,535     | 208 ms         |
| 54   | Geniee                                                                           | 15,678    | 227 ms         |
| 55   | [Quora Ads](https://www.quora.com/business/)                                     | 7,726     | 244 ms         |
| 56   | IPONWEB                                                                          | 50,588    | 254 ms         |
| 57   | AdRiver                                                                          | 14,530    | 272 ms         |
| 58   | Tynt                                                                             | 143,320   | 279 ms         |
| 59   | [LiveRamp Privacy Manager](https://liveramp.com/privacy-legal-compliance/)       | 30,276    | 289 ms         |
| 60   | Teads                                                                            | 8,645     | 291 ms         |
| 61   | Unbounce                                                                         | 10,396    | 295 ms         |
| 62   | Auto Link Maker                                                                  | 4,546     | 303 ms         |
| 63   | Onfocus                                                                          | 82,034    | 307 ms         |
| 64   | [Hybrid](https://hybrid.ai/)                                                     | 4,682     | 313 ms         |
| 65   | [Supership](https://supership.jp/)                                               | 32,253    | 340 ms         |
| 66   | [Adroll](https://www.adroll.com/)                                                | 52,763    | 383 ms         |
| 67   | Salesforce.com                                                                   | 5,138     | 384 ms         |
| 68   | Skimbit                                                                          | 7,189     | 430 ms         |
| 69   | [ID5 Identity Cloud](https://id5.io/)                                            | 210,127   | 489 ms         |
| 70   | [Seedtag](https://www.seedtag.com/)                                              | 25,644    | 500 ms         |
| 71   | LoopMe                                                                           | 5,473     | 506 ms         |
| 72   | Cxense                                                                           | 5,830     | 517 ms         |
| 73   | InMobi                                                                           | 76,721    | 571 ms         |
| 74   | [Attentive](https://attentivemobile.com/)                                        | 13,372    | 587 ms         |
| 75   | VigLink                                                                          | 7,471     | 590 ms         |
| 76   | fluct                                                                            | 18,070    | 607 ms         |
| 77   | [Amazon Ads](https://ad.amazon.com/)                                             | 259,877   | 679 ms         |
| 78   | TrafficStars                                                                     | 16,044    | 749 ms         |
| 79   | [AdScore](https://www.adscore.com/)                                              | 8,346     | 766 ms         |
| 80   | LoyaltyLion                                                                      | 7,043     | 767 ms         |
| 81   | LongTail Ad Solutions                                                            | 9,137     | 871 ms         |
| 82   | Klaviyo                                                                          | 379,241   | 886 ms         |
| 83   | Microad                                                                          | 46,304    | 1064 ms        |
| 84   | [Taboola](https://www.taboola.com/)                                              | 75,793    | 1139 ms        |
| 85   | Conversion Labs                                                                  | 3,483     | 1193 ms        |
| 86   | Connatix                                                                         | 10,404    | 1244 ms        |
| 87   | OptiMonk                                                                         | 21,190    | 1254 ms        |
| 88   | [Integral Ad Science](https://integralads.com/uk/)                               | 16,502    | 1415 ms        |
| 89   | [Rubicon Project](https://rubiconproject.com/)                                   | 265,501   | 1464 ms        |
| 90   | Infolinks                                                                        | 12,046    | 1560 ms        |
| 91   | Privy                                                                            | 28,409    | 1564 ms        |
| 92   | [Pubmatic](https://pubmatic.com/)                                                | 268,195   | 1569 ms        |
| 93   | [DoubleVerify](https://www.doubleverify.com/)                                    | 8,949     | 1595 ms        |
| 94   | [Yandex Ads](https://yandex.com/adv/)                                            | 15,217    | 1719 ms        |
| 95   | [Google/Doubleclick Ads](https://marketingplatform.google.com/about/enterprise/) | 1,961,236 | 1764 ms        |
| 96   | [Ad Lightning](https://www.adlightning.com/)                                     | 4,099     | 1936 ms        |
| 97   | [Web Content Assessor](https://mediatrust.com/)                                  | 3,604     | 2206 ms        |
| 98   | [MGID](https://www.mgid.com/)                                                    | 19,059    | 2518 ms        |
| 99   | Yahoo! Ad Exchange                                                               | 6,818     | 3401 ms        |
| 100  | [Mediavine](https://www.mediavine.com/)                                          | 14,004    | 6337 ms        |

<a name="analytics"></a>

#### Analytics

These scripts measure or track users and their actions. There's a wide range in impact here depending on what's being tracked.

| Rank | Name                                                                          | Usage     | Average Impact |
| ---- | ----------------------------------------------------------------------------- | --------- | -------------- |
| 1    | [Keen](https://keen.io/)                                                      | 1,317     | 38 ms          |
| 2    | [Mouseflow](https://mouseflow.com/)                                           | 14,518    | 52 ms          |
| 3    | [SpeedCurve RUM](https://www.speedcurve.com/features/performance-monitoring/) | 10,371    | 56 ms          |
| 4    | [Fathom Analytics](https://usefathom.com/)                                    | 2,347     | 59 ms          |
| 5    | [Pingdom RUM](https://www.pingdom.com/product/performance-monitoring/)        | 1,791     | 64 ms          |
| 6    | Roxr Software                                                                 | 17,840    | 65 ms          |
| 7    | [WordPress Site Stats](https://wp.com/)                                       | 154,885   | 66 ms          |
| 8    | [Snapchat](https://www.snapchat.com)                                          | 4,220     | 68 ms          |
| 9    | [LiveRamp IdentityLink](https://liveramp.com/discover-identitylink/)          | 1,434     | 69 ms          |
| 10   | [Smartlook](https://www.smartlook.com/)                                       | 26,156    | 78 ms          |
| 11   | Movable Ink                                                                   | 2,618     | 79 ms          |
| 12   | Woopra                                                                        | 1,857     | 82 ms          |
| 13   | [Quantcast](https://www.quantcast.com)                                        | 90,256    | 86 ms          |
| 14   | [AD EBis](https://www.ebis.ne.jp/)                                            | 1,800     | 91 ms          |
| 15   | [Braze](https://www.braze.com)                                                | 15,611    | 94 ms          |
| 16   | Exponea                                                                       | 2,351     | 101 ms         |
| 17   | Ezoic                                                                         | 4,889     | 106 ms         |
| 18   | [XiTi](https://www.atinternet.com/en/)                                        | 21,603    | 107 ms         |
| 19   | [Google Analytics](https://marketingplatform.google.com/about/analytics/)     | 5,063,984 | 108 ms         |
| 20   | [mPulse](https://developer.akamai.com/akamai-mpulse)                          | 61,262    | 108 ms         |
| 21   | Treasure Data                                                                 | 25,194    | 117 ms         |
| 22   | Stamped.io                                                                    | 21,040    | 121 ms         |
| 23   | Polldaddy                                                                     | 2,394     | 123 ms         |
| 24   | [Usabilla](https://usabilla.com)                                              | 2,430     | 127 ms         |
| 25   | [DotMetrics](https://www.dotmetrics.net/)                                     | 2,137     | 133 ms         |
| 26   | Marchex                                                                       | 4,249     | 137 ms         |
| 27   | [Snowplow](https://snowplowanalytics.com/)                                    | 132,597   | 141 ms         |
| 28   | Sailthru                                                                      | 2,397     | 141 ms         |
| 29   | Site24x7 Real User Monitoring                                                 | 1,357     | 147 ms         |
| 30   | Conversant                                                                    | 39,631    | 150 ms         |
| 31   | WebInsight                                                                    | 2,656     | 169 ms         |
| 32   | StatCounter                                                                   | 81,629    | 174 ms         |
| 33   | CleverTap                                                                     | 2,327     | 181 ms         |
| 34   | [Brandmetrics](https://www.brandmetrics.com)                                  | 36,552    | 183 ms         |
| 35   | Smart Insight Tracking                                                        | 3,521     | 192 ms         |
| 36   | OneAll                                                                        | 1,018     | 196 ms         |
| 37   | Parse.ly                                                                      | 7,345     | 202 ms         |
| 38   | [Matomo](https://matomo.org/)                                                 | 28,520    | 220 ms         |
| 39   | Okta                                                                          | 4,962     | 224 ms         |
| 40   | Heap                                                                          | 15,953    | 230 ms         |
| 41   | Chartbeat                                                                     | 9,472     | 246 ms         |
| 42   | CallRail                                                                      | 60,963    | 255 ms         |
| 43   | [Baidu Analytics](https://tongji.baidu.com/web/welcome/login)                 | 41,491    | 260 ms         |
| 44   | Omniconvert                                                                   | 1,003     | 274 ms         |
| 45   | Kampyle                                                                       | 1,108     | 278 ms         |
| 46   | CallTrackingMetrics                                                           | 15,854    | 282 ms         |
| 47   | Trust Pilot                                                                   | 74,130    | 295 ms         |
| 48   | SurveyMonkey                                                                  | 2,333     | 304 ms         |
| 49   | Monetate                                                                      | 2,490     | 307 ms         |
| 50   | [Mixpanel](https://mixpanel.com/)                                             | 38,924    | 319 ms         |
| 51   | Net Reviews                                                                   | 1,984     | 326 ms         |
| 52   | etracker                                                                      | 10,282    | 343 ms         |
| 53   | [Google Optimize](https://marketingplatform.google.com/about/optimize/)       | 48,571    | 360 ms         |
| 54   | [Marketo](https://www.marketo.com)                                            | 3,057     | 361 ms         |
| 55   | [Lucky Orange](https://www.luckyorange.com/)                                  | 50,509    | 380 ms         |
| 56   | [PageSense](https://www.zoho.com/pagesense/)                                  | 16,229    | 382 ms         |
| 57   | [Segment](https://segment.com/)                                               | 44,986    | 383 ms         |
| 58   | [Nielsen NetRatings SiteCensus](http://www.nielsen-online.com/intlpage.html)  | 14,246    | 387 ms         |
| 59   | Trialfire                                                                     | 2,711     | 389 ms         |
| 60   | Nosto                                                                         | 2,024     | 422 ms         |
| 61   | Evergage                                                                      | 5,531     | 427 ms         |
| 62   | Amplitude Mobile Analytics                                                    | 61,105    | 428 ms         |
| 63   | [VWO](https://vwo.com)                                                        | 10,913    | 465 ms         |
| 64   | [BowNow](https://bow-now.jp/)                                                 | 4,828     | 488 ms         |
| 65   | [Pendo](https://www.pendo.io)                                                 | 29,161    | 490 ms         |
| 66   | Reviews.io                                                                    | 8,042     | 503 ms         |
| 67   | [AB Tasty](https://www.abtasty.com/)                                          | 7,116     | 524 ms         |
| 68   | UpSellit                                                                      | 3,219     | 550 ms         |
| 69   | Feefo.com                                                                     | 3,436     | 552 ms         |
| 70   | [Appcues](https://www.appcues.com/)                                           | 4,970     | 571 ms         |
| 71   | Bazaarvoice                                                                   | 8,127     | 577 ms         |
| 72   | Clerk.io ApS                                                                  | 3,521     | 615 ms         |
| 73   | Inspectlet                                                                    | 7,307     | 639 ms         |
| 74   | Qualtrics                                                                     | 14,199    | 648 ms         |
| 75   | Reviews.co.uk                                                                 | 2,606     | 681 ms         |
| 76   | Evidon                                                                        | 1,475     | 715 ms         |
| 77   | [Hotjar](https://www.hotjar.com/)                                             | 504,590   | 732 ms         |
| 78   | [Crazy Egg](https://www.crazyegg.com/)                                        | 66,686    | 831 ms         |
| 79   | [Optimizely](https://www.optimizely.com/)                                     | 25,015    | 898 ms         |
| 80   | FullStory                                                                     | 21,307    | 911 ms         |
| 81   | PowerReviews                                                                  | 2,121     | 953 ms         |
| 82   | Convert Insights                                                              | 8,385     | 1045 ms        |
| 83   | Insider                                                                       | 3,734     | 1062 ms        |
| 84   | Gigya                                                                         | 3,546     | 1184 ms        |
| 85   | ContentSquare                                                                 | 38,146    | 1504 ms        |
| 86   | [Kameleoon](https://www.kameleoon.com/)                                       | 3,585     | 1542 ms        |
| 87   | Dynatrace                                                                     | 2,906     | 1576 ms        |
| 88   | [Quantum Metric](https://www.quantummetric.com/)                              | 2,966     | 2152 ms        |
| 89   | TrackJS                                                                       | 3,225     | 2231 ms        |
| 90   | Decibel Insight                                                               | 1,017     | 2316 ms        |
| 91   | [Yandex Metrica](https://metrica.yandex.com/about?)                           | 1,006,546 | 2423 ms        |

<a name="social"></a>

#### Social

These scripts enable social features.

| Rank | Name                                        | Usage     | Average Impact |
| ---- | ------------------------------------------- | --------- | -------------- |
| 1    | [Shareaholic](https://www.shareaholic.com/) | 1,775     | 92 ms          |
| 2    | [Pinterest](https://pinterest.com/)         | 259,146   | 128 ms         |
| 3    | [AddToAny](https://www.addtoany.com/)       | 150,218   | 141 ms         |
| 4    | [LinkedIn](https://www.linkedin.com/)       | 30,361    | 326 ms         |
| 5    | [ShareThis](https://www.sharethis.com/)     | 144,014   | 360 ms         |
| 6    | [PIXNET](https://www.pixnet.net/)           | 10,383    | 418 ms         |
| 7    | [Facebook](https://www.facebook.com)        | 5,647,056 | 514 ms         |
| 8    | [Twitter](https://twitter.com)              | 477,641   | 534 ms         |
| 9    | [TikTok](https://www.tiktok.com/en/)        | 437,719   | 578 ms         |
| 10   | reddit                                      | 65,646    | 624 ms         |
| 11   | Kakao                                       | 86,604    | 781 ms         |
| 12   | SocialShopWave                              | 1,406     | 978 ms         |
| 13   | [Instagram](https://www.instagram.com)      | 54,666    | 1429 ms        |
| 14   | [Tumblr](https://tumblr.com/)               | 24,030    | 2422 ms        |
| 15   | [Disqus](https://disqus.com/)               | 14,145    | 2785 ms        |
| 16   | [VK](https://vk.com/)                       | 27,267    | 4041 ms        |
| 17   | LiveJournal                                 | 15,989    | 5207 ms        |

<a name="video"></a>

#### Video

These scripts enable video player and streaming functionality.

| Rank | Name                                         | Usage     | Average Impact |
| ---- | -------------------------------------------- | --------- | -------------- |
| 1    | [Brightcove](https://www.brightcove.com/en/) | 26,891    | 1014 ms        |
| 2    | [Vimeo](https://vimeo.com/)                  | 182,269   | 4099 ms        |
| 3    | [Wistia](https://wistia.com/)                | 36,349    | 5003 ms        |
| 4    | [YouTube](https://youtube.com)               | 1,300,771 | 6297 ms        |
| 5    | [Twitch](https://twitch.tv/)                 | 1,648     | 19774 ms       |

<a name="utility"></a>

#### Developer Utilities

These scripts are developer utilities (API clients, site monitoring, fraud detection, etc).

| Rank | Name                                                                      | Usage     | Average Impact |
| ---- | ------------------------------------------------------------------------- | --------- | -------------- |
| 1    | [Statuspage](https://www.statuspage.io)                                   | 2,759     | 26 ms          |
| 2    | [Cloudflare](https://www.cloudflare.com/website-optimization/)            | 3,305,625 | 67 ms          |
| 3    | Webmarked                                                                 | 2,314     | 70 ms          |
| 4    | [Pusher](https://pusher.com/)                                             | 3,517     | 71 ms          |
| 5    | Cludo                                                                     | 2,241     | 97 ms          |
| 6    | Rollbar                                                                   | 6,078     | 113 ms         |
| 7    | MathJax                                                                   | 1,291     | 114 ms         |
| 8    | Macropod BugHerd                                                          | 8,703     | 116 ms         |
| 9    | Raygun                                                                    | 4,363     | 116 ms         |
| 10   | Webkul                                                                    | 1,769     | 121 ms         |
| 11   | [Afterpay](https://www.afterpay.com/)                                     | 14,826    | 151 ms         |
| 12   | PrintFriendly                                                             | 1,076     | 154 ms         |
| 13   | [Ipify](https://www.ipify.org)                                            | 3,964     | 155 ms         |
| 14   | [Doofinder](https://www.doofinder.com/)                                   | 24,553    | 155 ms         |
| 15   | Hexton                                                                    | 54,246    | 163 ms         |
| 16   | Braintree Payments                                                        | 2,689     | 164 ms         |
| 17   | [OneSignal](https://onesignal.com/)                                       | 107,007   | 185 ms         |
| 18   | CyberSource (Visa)                                                        | 3,217     | 188 ms         |
| 19   | [Amazon Pay](https://pay.amazon.com)                                      | 15,402    | 189 ms         |
| 20   | LightWidget                                                               | 10,644    | 192 ms         |
| 21   | [Foxentry](https://foxentry.cz/)                                          | 4,767     | 200 ms         |
| 22   | [mParticle](https://www.mparticle.com/)                                   | 1,591     | 206 ms         |
| 23   | [Sentry](https://sentry.io/)                                              | 432,164   | 215 ms         |
| 24   | Seznam                                                                    | 9,243     | 217 ms         |
| 25   | Riskified                                                                 | 3,664     | 234 ms         |
| 26   | [Netlify](https://www.netlify.com/)                                       | 1,726     | 265 ms         |
| 27   | [G2](https://www.g2.com/)                                                 | 1,268     | 278 ms         |
| 28   | [Auth0](https://auth0.com/)                                               | 1,573     | 282 ms         |
| 29   | Wufoo                                                                     | 4,237     | 300 ms         |
| 30   | [New Relic](https://newrelic.com/)                                        | 290,714   | 329 ms         |
| 31   | [TrustArc](https://www.trustarc.com/)                                     | 11,118    | 337 ms         |
| 32   | Key CDN                                                                   | 21,180    | 350 ms         |
| 33   | [Yandex APIs](https://yandex.ru/)                                         | 79,640    | 354 ms         |
| 34   | Highcharts                                                                | 5,327     | 358 ms         |
| 35   | Swiftype                                                                  | 1,315     | 376 ms         |
| 36   | Bugsnag                                                                   | 43,386    | 377 ms         |
| 37   | [Cookiebot](https://www.cookiebot.com/)                                   | 367,484   | 398 ms         |
| 38   | [Clarity](https://clarity.microsoft.com/)                                 | 1,226,624 | 405 ms         |
| 39   | Trusted Shops                                                             | 33,129    | 430 ms         |
| 40   | [Other Google APIs/SDKs](https://developers.google.com/apis-explorer/#p/) | 5,180,657 | 462 ms         |
| 41   | Cookie Reports                                                            | 1,381     | 483 ms         |
| 42   | GitHub                                                                    | 28,884    | 500 ms         |
| 43   | FoxyCart                                                                  | 1,235     | 542 ms         |
| 44   | GetSiteControl                                                            | 5,242     | 546 ms         |
| 45   | Google reCAPTCHA                                                          | 79,770    | 570 ms         |
| 46   | Cookie-Script.com                                                         | 195,354   | 578 ms         |
| 47   | Bold Commerce                                                             | 12,067    | 591 ms         |
| 48   | Klarna                                                                    | 20,368    | 596 ms         |
| 49   | Secomapp                                                                  | 4,608     | 640 ms         |
| 50   | iovation                                                                  | 3,322     | 679 ms         |
| 51   | [Accessibe Accessibility Overlay](https://accessibe.com/)                 | 3,944     | 680 ms         |
| 52   | Mapbox                                                                    | 32,325    | 784 ms         |
| 53   | [AppDynamics](https://www.appdynamics.com/)                               | 2,330     | 824 ms         |
| 54   | Affirm                                                                    | 13,488    | 854 ms         |
| 55   | ThreatMetrix                                                              | 8,252     | 902 ms         |
| 56   | Klevu Search                                                              | 2,126     | 908 ms         |
| 57   | [Google Maps](https://www.google.com/maps)                                | 2,039,858 | 914 ms         |
| 58   | iubenda                                                                   | 202,893   | 937 ms         |
| 59   | [Vidyard](https://www.vidyard.com/)                                       | 1,884     | 954 ms         |
| 60   | Marker                                                                    | 4,369     | 1051 ms        |
| 61   | [Checkout.com](https://www.checkout.com)                                  | 7,900     | 1079 ms        |
| 62   | [PayPal](https://paypal.com)                                              | 151,706   | 1089 ms        |
| 63   | Rambler                                                                   | 23,636    | 1137 ms        |
| 64   | MaxMind                                                                   | 1,236     | 1211 ms        |
| 65   | Forter                                                                    | 9,959     | 1240 ms        |
| 66   | WisePops                                                                  | 2,457     | 1246 ms        |
| 67   | Fastly                                                                    | 2,030     | 1659 ms        |
| 68   | [GoDaddy](https://www.godaddy.com/)                                       | 239,631   | 1681 ms        |
| 69   | Adyen                                                                     | 5,341     | 1691 ms        |
| 70   | [Stripe](https://stripe.com)                                              | 366,853   | 1782 ms        |
| 71   | [Noibu](https://www.noibu.com)                                            | 1,153     | 1790 ms        |
| 72   | Datacamp                                                                  | 2,443     | 3169 ms        |
| 73   | Signyfyd                                                                  | 4,071     | 3687 ms        |
| 74   | [POWr](https://www.powr.io)                                               | 59,744    | 4720 ms        |
| 75   | Esri ArcGIS                                                               | 6,710     | 7264 ms        |

<a name="hosting"></a>

#### Hosting Platforms

These scripts are from web hosting platforms (WordPress, Wix, Squarespace, etc). Note that in this category, this can sometimes be the entirety of script on the page, and so the "impact" rank might be misleading. In the case of WordPress, this just indicates the libraries hosted and served _by_ WordPress not all sites using self-hosted WordPress.

| Rank | Name                                                                                      | Usage   | Average Impact |
| ---- | ----------------------------------------------------------------------------------------- | ------- | -------------- |
| 1    | Silktide                                                                                  | 1,694   | 88 ms          |
| 2    | Ecwid                                                                                     | 12,401  | 284 ms         |
| 3    | Civic                                                                                     | 14,317  | 508 ms         |
| 4    | [Salesforce Commerce Cloud](https://www.salesforce.com/products/commerce-cloud/overview/) | 7,113   | 528 ms         |
| 5    | Global-e                                                                                  | 3,128   | 544 ms         |
| 6    | [WordPress](https://wp.com/)                                                              | 423,687 | 574 ms         |
| 7    | [Dealer](https://www.dealer.com/)                                                         | 4,584   | 617 ms         |
| 8    | [Blogger](https://www.blogger.com/)                                                       | 315,132 | 784 ms         |
| 9    | Rackspace                                                                                 | 4,025   | 871 ms         |
| 10   | [Shopify](https://www.shopify.com/)                                                       | 904,653 | 1117 ms        |
| 11   | [Tilda](https://tilda.cc/)                                                                | 130,221 | 1242 ms        |
| 12   | Yottaa                                                                                    | 1,248   | 1303 ms        |
| 13   | [Hatena Blog](https://hatenablog.com/)                                                    | 80,661  | 2416 ms        |
| 14   | [WebsiteBuilder.com](https://www.websitebuilder.com)                                      | 6,545   | 3006 ms        |
| 15   | [Squarespace](https://www.squarespace.com/)                                               | 489,740 | 3578 ms        |
| 16   | [Wix](https://www.wix.com/)                                                               | 836,665 | 4196 ms        |
| 17   | [Framer CDN](https://www.framer.com)                                                      | 39,379  | 5788 ms        |
| 18   | [Weebly](https://www.weebly.com/)                                                         | 115,744 | 6947 ms        |

<a name="marketing"></a>

#### Marketing

These scripts are from marketing tools that add popups/newsletters/etc.

| Rank | Name                                        | Usage   | Average Impact |
| ---- | ------------------------------------------- | ------- | -------------- |
| 1    | [SalesLoft](https://salesloft.com/)         | 1,294   | 60 ms          |
| 2    | [Albacross](https://albacross.com/)         | 3,468   | 64 ms          |
| 3    | [Podsights](https://podsights.com/)         | 1,458   | 75 ms          |
| 4    | [SATORI](https://satori.marketing/)         | 1,394   | 81 ms          |
| 5    | [Convertful](https://convertful.com/)       | 1,960   | 101 ms         |
| 6    | DemandBase                                  | 7,540   | 116 ms         |
| 7    | Pardot                                      | 1,074   | 119 ms         |
| 8    | SharpSpring                                 | 3,118   | 244 ms         |
| 9    | [RD Station](https://www.rdstation.com/en/) | 33,836  | 368 ms         |
| 10   | Wishpond Technologies                       | 2,699   | 396 ms         |
| 11   | [Hello Bar](https://www.hellobar.com/)      | 5,651   | 419 ms         |
| 12   | [Listrak](https://www.listrak.com/)         | 1,651   | 454 ms         |
| 13   | Sojern                                      | 8,091   | 466 ms         |
| 14   | [OptinMonster](https://optinmonster.com/)   | 2,680   | 473 ms         |
| 15   | Curalate                                    | 1,051   | 547 ms         |
| 16   | [PureCars](https://www.purecars.com/)       | 1,387   | 548 ms         |
| 17   | [iZooto](https://www.izooto.com)            | 3,023   | 602 ms         |
| 18   | [Mailchimp](https://mailchimp.com/)         | 80,974  | 627 ms         |
| 19   | [Yotpo](https://www.yotpo.com/)             | 48,498  | 668 ms         |
| 20   | [Wunderkind](https://www.wunderkind.co/)    | 7,171   | 1018 ms        |
| 21   | [Judge.me](https://judge.me/)               | 37,537  | 1021 ms        |
| 22   | [Beeketing](https://beeketing.com/)         | 2,278   | 1151 ms        |
| 23   | [KARTE](https://karte.io/)                  | 3,044   | 1172 ms        |
| 24   | [Hubspot](https://hubspot.com/)             | 313,527 | 1226 ms        |
| 25   | [Sumo](https://sumo.com/)                   | 13,967  | 1372 ms        |
| 26   | Bigcommerce                                 | 34,904  | 1801 ms        |
| 27   | Kargo                                       | 3,852   | 4014 ms        |
| 28   | [Drift](https://www.drift.com/)             | 4,339   | 4394 ms        |
| 29   | [Tray Commerce](https://www.tray.com.br/)   | 25,153  | 5107 ms        |

<a name="customer-success"></a>

#### Customer Success

These scripts are from customer support/marketing providers that offer chat and contact solutions. These scripts are generally heavier in weight.

| Rank | Name                                                        | Usage   | Average Impact |
| ---- | ----------------------------------------------------------- | ------- | -------------- |
| 1    | [Crisp](https://crisp.chat/)                                | 1,577   | 33 ms          |
| 2    | Provide Support                                             | 1,679   | 71 ms          |
| 3    | iPerceptions                                                | 7,974   | 143 ms         |
| 4    | SnapEngage                                                  | 1,397   | 154 ms         |
| 5    | LiveTex                                                     | 2,786   | 298 ms         |
| 6    | Pure Chat                                                   | 3,863   | 346 ms         |
| 7    | WebEngage                                                   | 3,096   | 352 ms         |
| 8    | LiveHelpNow                                                 | 1,390   | 353 ms         |
| 9    | [Help Scout](https://www.helpscout.net/)                    | 9,087   | 427 ms         |
| 10   | iAdvize SAS                                                 | 1,619   | 435 ms         |
| 11   | [Tawk.to](https://www.tawk.to/)                             | 176,551 | 440 ms         |
| 12   | [Usersnap](https://usersnap.com)                            | 2,718   | 544 ms         |
| 13   | Comm100                                                     | 1,271   | 548 ms         |
| 14   | [Gladly](https://www.gladly.com/)                           | 1,135   | 617 ms         |
| 15   | [Smartsupp](https://www.smartsupp.com)                      | 35,566  | 647 ms         |
| 16   | [LivePerson](https://www.liveperson.com/)                   | 3,218   | 759 ms         |
| 17   | [Ada](https://www.ada.support/)                             | 1,876   | 890 ms         |
| 18   | [Jivochat](https://www.jivochat.com/)                       | 84,370  | 994 ms         |
| 19   | [LiveChat](https://www.livechat.com/)                       | 62,860  | 1116 ms        |
| 20   | [Intercom](https://www.intercom.com)                        | 58,316  | 1433 ms        |
| 21   | [Olark](https://www.olark.com/)                             | 8,448   | 1470 ms        |
| 22   | [ZenDesk](https://zendesk.com/)                             | 111,484 | 2157 ms        |
| 23   | [Freshchat](https://www.freshworks.com/live-chat-software/) | 11,972  | 3089 ms        |

<a name="content"></a>

#### Content & Publishing

These scripts are from content providers or publishing-specific affiliate tracking.

| Rank | Name                                      | Usage  | Average Impact |
| ---- | ----------------------------------------- | ------ | -------------- |
| 1    | [Spotify](https://www.spotify.com/)       | 17,956 | 7 ms           |
| 2    | Accuweather                               | 1,582  | 195 ms         |
| 3    | Indeed                                    | 4,424  | 204 ms         |
| 4    | Flowplayer                                | 1,395  | 208 ms         |
| 5    | Tencent                                   | 13,523 | 240 ms         |
| 6    | Embedly                                   | 15,905 | 420 ms         |
| 7    | Cloudinary                                | 3,024  | 436 ms         |
| 8    | TripAdvisor                               | 2,672  | 525 ms         |
| 9    | [AMP](https://amp.dev/)                   | 99,603 | 949 ms         |
| 10   | Revcontent                                | 4,259  | 1124 ms        |
| 11   | OpenTable                                 | 10,010 | 1442 ms        |
| 12   | Booking.com                               | 1,446  | 1462 ms        |
| 13   | CPEx                                      | 1,692  | 1577 ms        |
| 14   | [Hotmart](https://www.hotmart.com/)       | 2,825  | 1611 ms        |
| 15   | issuu                                     | 3,609  | 3423 ms        |
| 16   | Kaltura Video Platform                    | 1,270  | 3434 ms        |
| 17   | [SoundCloud](https://www.soundcloud.com/) | 7,742  | 3886 ms        |
| 18   | Dailymotion                               | 3,642  | 6891 ms        |
| 19   | Medium                                    | 12,128 | 7720 ms        |

<a name="cdn"></a>

#### CDNs

These are a mixture of publicly hosted open source libraries (e.g. jQuery) served over different public CDNs and private CDN usage. This category is unique in that the origin may have no responsibility for the performance of what's being served. Note that rank here does not imply one CDN is better than the other. It simply indicates that the scripts being served from that origin are lighter/heavier than the ones served by another.

| Rank | Name                                                         | Usage     | Average Impact |
| ---- | ------------------------------------------------------------ | --------- | -------------- |
| 1    | [Google Fonts](https://fonts.google.com/)                    | 296,727   | 1 ms           |
| 2    | [Bootstrap CDN](https://www.bootstrapcdn.com/)               | 77,296    | 46 ms          |
| 3    | Fort Awesome                                                 | 7,049     | 153 ms         |
| 4    | Microsoft Hosted Libs                                        | 36,189    | 173 ms         |
| 5    | Monotype                                                     | 4,123     | 203 ms         |
| 6    | [Unpkg](https://unpkg.com)                                   | 2,267     | 245 ms         |
| 7    | [JSPM](https://jspm.org/)                                    | 2,765     | 258 ms         |
| 8    | [FontAwesome CDN](https://fontawesome.com/)                  | 443,783   | 272 ms         |
| 9    | [jQuery CDN](https://code.jquery.com/)                       | 1,242,364 | 305 ms         |
| 10   | [Akamai](https://www.akamai.com/)                            | 13,493    | 332 ms         |
| 11   | [Cloudflare CDN](https://cdnjs.com/)                         | 1,256,794 | 376 ms         |
| 12   | [JSDelivr CDN](https://www.jsdelivr.com/)                    | 1,035,485 | 517 ms         |
| 13   | [Adobe TypeKit](https://fonts.adobe.com/)                    | 205,876   | 691 ms         |
| 14   | [ESM>CDN](https://esm.sh)                                    | 1,965     | 755 ms         |
| 15   | Azure Web Services                                           | 56,804    | 772 ms         |
| 16   | [Google CDN](https://developers.google.com/speed/libraries/) | 5,820,680 | 2047 ms        |
| 17   | [CreateJS CDN](https://code.createjs.com/)                   | 5,024     | 2926 ms        |
| 18   | [Yandex CDN](https://yandex.ru/)                             | 58,643    | 3724 ms        |

<a name="tag-manager"></a>

#### Tag Management

These scripts tend to load lots of other scripts and initiate many tasks.

| Rank | Name                                                                          | Usage      | Average Impact |
| ---- | ----------------------------------------------------------------------------- | ---------- | -------------- |
| 1    | TagCommander                                                                  | 2,600      | 220 ms         |
| 2    | [Tealium](https://tealium.com/)                                               | 134,480    | 283 ms         |
| 3    | [Ensighten](https://www.ensighten.com/)                                       | 6,750      | 558 ms         |
| 4    | [Adobe Tag Manager](https://www.adobe.com/experience-platform/)               | 105,342    | 687 ms         |
| 5    | [Google Tag Manager](https://marketingplatform.google.com/about/tag-manager/) | 15,022,156 | 1066 ms        |

<a name="consent-provider"></a>

#### Consent Management Provider

IAB Consent Management Providers are the 'Cookie Consent' popups used by many publishers. They're invoked for every page and sit on the critical path between a page loading and adverts being displayed.

| Rank | Name                                                              | Usage   | Average Impact |
| ---- | ----------------------------------------------------------------- | ------- | -------------- |
| 1    | [Trustcommander](https://www.commandersact.com)                   | 3,165   | 194 ms         |
| 2    | [Optanon](https://www.cookielaw.org/)                             | 272,514 | 564 ms         |
| 3    | [UniConsent CMP](https://www.uniconsent.com)                      | 2,098   | 596 ms         |
| 4    | [Didomi](https://www.didomi.io/)                                  | 134,457 | 687 ms         |
| 5    | [Google FundingChoices](https://fundingchoices.google.com/start/) | 667,196 | 763 ms         |
| 6    | [Usercentrics CMP](https://usercentrics.com)                      | 114,355 | 1050 ms        |
| 7    | [Osano CMP](https://www.osano.com)                                | 34,521  | 1706 ms        |

<a name="other"></a>

#### Mixed / Other

These are miscellaneous scripts delivered via a shared origin with no precise category or attribution. Help us out by identifying more origins!

| Rank | Name                                                                | Usage   | Average Impact |
| ---- | ------------------------------------------------------------------- | ------- | -------------- |
| 1    | ResponsiveVoice                                                     | 12,440  | 113 ms         |
| 2    | [ReadSpeaker](https://www.readspeaker.com)                          | 13,093  | 118 ms         |
| 3    | Loqate                                                              | 1,707   | 161 ms         |
| 4    | [Amazon Web Services](https://aws.amazon.com/s3/)                   | 229,350 | 270 ms         |
| 5    | [Browsealoud](https://www.texthelp.com/en-gb/products/browsealoud/) | 3,169   | 455 ms         |
| 6    | Sirv                                                                | 1,845   | 524 ms         |
| 7    | Heroku                                                              | 17,731  | 775 ms         |
| 8    | Calendly                                                            | 13,872  | 4305 ms        |

<a name="by-total-impact"></a>

### Third Parties by Total Impact

This section highlights the entities responsible for the most script execution across the web. This helps inform which improvements would have the largest total impact.

| Name                                                                             | Popularity | Total Impact | Average Impact |
| -------------------------------------------------------------------------------- | ---------- | ------------ | -------------- |
| [Google Tag Manager](https://marketingplatform.google.com/about/tag-manager/)    | 15,022,156 | 16,019,994 s | 1066 ms        |
| [Google CDN](https://developers.google.com/speed/libraries/)                     | 5,820,680  | 11,917,719 s | 2047 ms        |
| [YouTube](https://youtube.com)                                                   | 1,300,771  | 8,191,419 s  | 6297 ms        |
| [Wix](https://www.wix.com/)                                                      | 836,665    | 3,510,621 s  | 4196 ms        |
| [Google/Doubleclick Ads](https://marketingplatform.google.com/about/enterprise/) | 1,961,236  | 3,459,580 s  | 1764 ms        |
| [Facebook](https://www.facebook.com)                                             | 5,647,056  | 2,901,179 s  | 514 ms         |
| [Yandex Metrica](https://metrica.yandex.com/about?)                              | 1,006,546  | 2,438,694 s  | 2423 ms        |
| [Other Google APIs/SDKs](https://developers.google.com/apis-explorer/#p/)        | 5,180,657  | 2,391,625 s  | 462 ms         |
| [Google Maps](https://www.google.com/maps)                                       | 2,039,858  | 1,865,202 s  | 914 ms         |
| [Squarespace](https://www.squarespace.com/)                                      | 489,740    | 1,752,202 s  | 3578 ms        |
| [Shopify](https://www.shopify.com/)                                              | 904,653    | 1,010,756 s  | 1117 ms        |
| [Weebly](https://www.weebly.com/)                                                | 115,744    | 804,129 s    | 6947 ms        |
| [Vimeo](https://vimeo.com/)                                                      | 182,269    | 747,202 s    | 4099 ms        |
| [Stripe](https://stripe.com)                                                     | 366,853    | 653,598 s    | 1782 ms        |
| [Google Analytics](https://marketingplatform.google.com/about/analytics/)        | 5,063,984  | 545,547 s    | 108 ms         |
| [JSDelivr CDN](https://www.jsdelivr.com/)                                        | 1,035,485  | 535,071 s    | 517 ms         |
| [Google FundingChoices](https://fundingchoices.google.com/start/)                | 667,196    | 509,212 s    | 763 ms         |
| [Clarity](https://clarity.microsoft.com/)                                        | 1,226,624  | 497,230 s    | 405 ms         |
| [Cloudflare CDN](https://cdnjs.com/)                                             | 1,256,794  | 472,372 s    | 376 ms         |
| [Pubmatic](https://pubmatic.com/)                                                | 268,195    | 420,761 s    | 1569 ms        |
| [GoDaddy](https://www.godaddy.com/)                                              | 239,631    | 402,755 s    | 1681 ms        |
| [Rubicon Project](https://rubiconproject.com/)                                   | 265,501    | 388,576 s    | 1464 ms        |
| [Hubspot](https://hubspot.com/)                                                  | 313,527    | 384,474 s    | 1226 ms        |
| [jQuery CDN](https://code.jquery.com/)                                           | 1,242,364  | 379,421 s    | 305 ms         |
| [Hotjar](https://www.hotjar.com/)                                                | 504,590    | 369,578 s    | 732 ms         |
| Klaviyo                                                                          | 379,241    | 335,939 s    | 886 ms         |
| [POWr](https://www.powr.io)                                                      | 59,744     | 282,014 s    | 4720 ms        |
| [Twitter](https://twitter.com)                                                   | 477,641    | 254,976 s    | 534 ms         |
| [TikTok](https://www.tiktok.com/en/)                                             | 437,719    | 253,021 s    | 578 ms         |
| [Blogger](https://www.blogger.com/)                                              | 315,132    | 247,159 s    | 784 ms         |
| [WordPress](https://wp.com/)                                                     | 423,687    | 243,223 s    | 574 ms         |
| [ZenDesk](https://zendesk.com/)                                                  | 111,484    | 240,516 s    | 2157 ms        |
| [Framer CDN](https://www.framer.com)                                             | 39,379     | 227,930 s    | 5788 ms        |
| [Cloudflare](https://www.cloudflare.com/website-optimization/)                   | 3,305,625  | 222,739 s    | 67 ms          |
| [Yandex CDN](https://yandex.ru/)                                                 | 58,643     | 218,390 s    | 3724 ms        |
| [Hatena Blog](https://hatenablog.com/)                                           | 80,661     | 194,880 s    | 2416 ms        |
| iubenda                                                                          | 202,893    | 190,013 s    | 937 ms         |
| [Wistia](https://wistia.com/)                                                    | 36,349     | 181,867 s    | 5003 ms        |
| [Amazon Ads](https://ad.amazon.com/)                                             | 259,877    | 176,345 s    | 679 ms         |
| [PayPal](https://paypal.com)                                                     | 151,706    | 165,154 s    | 1089 ms        |
| [Tilda](https://tilda.cc/)                                                       | 130,221    | 161,732 s    | 1242 ms        |
| [Optanon](https://www.cookielaw.org/)                                            | 272,514    | 153,673 s    | 564 ms         |
| [Cookiebot](https://www.cookiebot.com/)                                          | 367,484    | 146,303 s    | 398 ms         |
| [Adobe TypeKit](https://fonts.adobe.com/)                                        | 205,876    | 142,316 s    | 691 ms         |
| [Tray Commerce](https://www.tray.com.br/)                                        | 25,153     | 128,456 s    | 5107 ms        |
| [FontAwesome CDN](https://fontawesome.com/)                                      | 443,783    | 120,831 s    | 272 ms         |
| [Usercentrics CMP](https://usercentrics.com)                                     | 114,355    | 120,096 s    | 1050 ms        |
| Cookie-Script.com                                                                | 195,354    | 112,895 s    | 578 ms         |
| [VK](https://vk.com/)                                                            | 27,267     | 110,175 s    | 4041 ms        |
| [ID5 Identity Cloud](https://id5.io/)                                            | 210,127    | 102,767 s    | 489 ms         |
| [New Relic](https://newrelic.com/)                                               | 290,714    | 95,651 s     | 329 ms         |
| [AMP](https://amp.dev/)                                                          | 99,603     | 94,517 s     | 949 ms         |
| Medium                                                                           | 12,128     | 93,625 s     | 7720 ms        |
| [Sentry](https://sentry.io/)                                                     | 432,164    | 92,769 s     | 215 ms         |
| [Didomi](https://www.didomi.io/)                                                 | 134,457    | 92,329 s     | 687 ms         |
| [Mediavine](https://www.mediavine.com/)                                          | 14,004     | 88,744 s     | 6337 ms        |
| [Taboola](https://www.taboola.com/)                                              | 75,793     | 86,301 s     | 1139 ms        |
| [Jivochat](https://www.jivochat.com/)                                            | 84,370     | 83,873 s     | 994 ms         |
| [Intercom](https://www.intercom.com)                                             | 58,316     | 83,545 s     | 1433 ms        |
| LiveJournal                                                                      | 15,989     | 83,256 s     | 5207 ms        |
| [Instagram](https://www.instagram.com)                                           | 54,666     | 78,110 s     | 1429 ms        |
| [Tawk.to](https://www.tawk.to/)                                                  | 176,551    | 77,701 s     | 440 ms         |
| [Adobe Tag Manager](https://www.adobe.com/experience-platform/)                  | 105,342    | 72,367 s     | 687 ms         |
| [LiveChat](https://www.livechat.com/)                                            | 62,860     | 70,131 s     | 1116 ms        |
| Kakao                                                                            | 86,604     | 67,659 s     | 781 ms         |
| Bigcommerce                                                                      | 34,904     | 62,849 s     | 1801 ms        |
| [Amazon Web Services](https://aws.amazon.com/s3/)                                | 229,350    | 61,815 s     | 270 ms         |
| Calendly                                                                         | 13,872     | 59,721 s     | 4305 ms        |
| [Osano CMP](https://www.osano.com)                                               | 34,521     | 58,885 s     | 1706 ms        |
| [Tumblr](https://tumblr.com/)                                                    | 24,030     | 58,206 s     | 2422 ms        |
| ContentSquare                                                                    | 38,146     | 57,390 s     | 1504 ms        |
| [Crazy Egg](https://www.crazyegg.com/)                                           | 66,686     | 55,417 s     | 831 ms         |
| [ShareThis](https://www.sharethis.com/)                                          | 144,014    | 51,786 s     | 360 ms         |
| LinkedIn Ads                                                                     | 384,570    | 51,210 s     | 133 ms         |
| [Criteo](https://www.criteo.com/)                                                | 294,063    | 50,801 s     | 173 ms         |
| [Mailchimp](https://mailchimp.com/)                                              | 80,974     | 50,745 s     | 627 ms         |
| Microad                                                                          | 46,304     | 49,253 s     | 1064 ms        |
| Esri ArcGIS                                                                      | 6,710      | 48,743 s     | 7264 ms        |
| [MGID](https://www.mgid.com/)                                                    | 19,059     | 47,996 s     | 2518 ms        |
| Google reCAPTCHA                                                                 | 79,770     | 45,484 s     | 570 ms         |
| Privy                                                                            | 28,409     | 44,444 s     | 1564 ms        |
| Azure Web Services                                                               | 56,804     | 43,828 s     | 772 ms         |
| InMobi                                                                           | 76,721     | 43,809 s     | 571 ms         |
| reddit                                                                           | 65,646     | 40,944 s     | 624 ms         |
| Tynt                                                                             | 143,320    | 39,960 s     | 279 ms         |
| [Disqus](https://disqus.com/)                                                    | 14,145     | 39,399 s     | 2785 ms        |
| [Judge.me](https://judge.me/)                                                    | 37,537     | 38,327 s     | 1021 ms        |
| [Tealium](https://tealium.com/)                                                  | 134,480    | 38,049 s     | 283 ms         |
| [Freshchat](https://www.freshworks.com/live-chat-software/)                      | 11,972     | 36,982 s     | 3089 ms        |
| [Bing Ads](https://bingads.microsoft.com)                                        | 350,501    | 35,127 s     | 100 ms         |
| [Pinterest](https://pinterest.com/)                                              | 259,146    | 33,239 s     | 128 ms         |
| [Twitch](https://twitch.tv/)                                                     | 1,648      | 32,587 s     | 19774 ms       |
| [Yotpo](https://www.yotpo.com/)                                                  | 48,498     | 32,400 s     | 668 ms         |
| [SoundCloud](https://www.soundcloud.com/)                                        | 7,742      | 30,087 s     | 3886 ms        |
| [Yandex APIs](https://yandex.ru/)                                                | 79,640     | 28,215 s     | 354 ms         |
| [Brightcove](https://www.brightcove.com/en/)                                     | 26,891     | 27,268 s     | 1014 ms        |
| Rambler                                                                          | 23,636     | 26,882 s     | 1137 ms        |
| OptiMonk                                                                         | 21,190     | 26,566 s     | 1254 ms        |
| Amplitude Mobile Analytics                                                       | 61,105     | 26,173 s     | 428 ms         |
| [Yandex Ads](https://yandex.com/adv/)                                            | 15,217     | 26,151 s     | 1719 ms        |
| Mapbox                                                                           | 32,325     | 25,329 s     | 784 ms         |
| Onfocus                                                                          | 82,034     | 25,204 s     | 307 ms         |
| Dailymotion                                                                      | 3,642      | 25,096 s     | 6891 ms        |
| [Integral Ad Science](https://integralads.com/uk/)                               | 16,502     | 23,348 s     | 1415 ms        |
| Yahoo! Ad Exchange                                                               | 6,818      | 23,188 s     | 3401 ms        |
| [Smartsupp](https://www.smartsupp.com)                                           | 35,566     | 23,006 s     | 647 ms         |
| [Optimizely](https://www.optimizely.com/)                                        | 25,015     | 22,460 s     | 898 ms         |
| Trust Pilot                                                                      | 74,130     | 21,871 s     | 295 ms         |
| [AddToAny](https://www.addtoany.com/)                                            | 150,218    | 21,165 s     | 141 ms         |
| [Adroll](https://www.adroll.com/)                                                | 52,763     | 20,214 s     | 383 ms         |
| [OneSignal](https://onesignal.com/)                                              | 107,007    | 19,828 s     | 185 ms         |
| [WebsiteBuilder.com](https://www.websitebuilder.com)                             | 6,545      | 19,675 s     | 3006 ms        |
| FullStory                                                                        | 21,307     | 19,404 s     | 911 ms         |
| [Lucky Orange](https://www.luckyorange.com/)                                     | 50,509     | 19,195 s     | 380 ms         |
| [Sumo](https://sumo.com/)                                                        | 13,967     | 19,166 s     | 1372 ms        |
| [Drift](https://www.drift.com/)                                                  | 4,339      | 19,064 s     | 4394 ms        |
| Infolinks                                                                        | 12,046     | 18,797 s     | 1560 ms        |
| Crowd Control                                                                    | 136,398    | 18,796 s     | 138 ms         |
| [Snowplow](https://snowplowanalytics.com/)                                       | 132,597    | 18,648 s     | 141 ms         |
| AudienceSearch                                                                   | 96,693     | 17,953 s     | 186 ms         |
| [Google Optimize](https://marketingplatform.google.com/about/optimize/)          | 48,571     | 17,505 s     | 360 ms         |
| [Segment](https://segment.com/)                                                  | 44,986     | 17,216 s     | 383 ms         |
| Bugsnag                                                                          | 43,386     | 16,345 s     | 377 ms         |
| CallRail                                                                         | 60,963     | 15,572 s     | 255 ms         |
| Kargo                                                                            | 3,852      | 15,460 s     | 4014 ms        |
| Twitter Online Conversion Tracking                                               | 131,338    | 15,188 s     | 116 ms         |
| Signyfyd                                                                         | 4,071      | 15,010 s     | 3687 ms        |
| [CreateJS CDN](https://code.createjs.com/)                                       | 5,024      | 14,701 s     | 2926 ms        |
| GitHub                                                                           | 28,884     | 14,451 s     | 500 ms         |
| OpenTable                                                                        | 10,010     | 14,435 s     | 1442 ms        |
| [Pendo](https://www.pendo.io)                                                    | 29,161     | 14,276 s     | 490 ms         |
| [DoubleVerify](https://www.doubleverify.com/)                                    | 8,949      | 14,274 s     | 1595 ms        |
| Trusted Shops                                                                    | 33,129     | 14,232 s     | 430 ms         |
| StatCounter                                                                      | 81,629     | 14,171 s     | 174 ms         |
| Heroku                                                                           | 17,731     | 13,747 s     | 775 ms         |
| [Yahoo! JAPAN Ads](https://marketing.yahoo.co.jp/service/yahooads/)              | 83,673     | 13,508 s     | 161 ms         |
| Connatix                                                                         | 10,404     | 12,942 s     | 1244 ms        |
| IPONWEB                                                                          | 50,588     | 12,862 s     | 254 ms         |
| [Seedtag](https://www.seedtag.com/)                                              | 25,644     | 12,834 s     | 500 ms         |
| [RD Station](https://www.rdstation.com/en/)                                      | 33,836     | 12,451 s     | 368 ms         |
| [Olark](https://www.olark.com/)                                                  | 8,448      | 12,415 s     | 1470 ms        |
| [Mixpanel](https://mixpanel.com/)                                                | 38,924     | 12,411 s     | 319 ms         |
| Forter                                                                           | 9,959      | 12,354 s     | 1240 ms        |
| issuu                                                                            | 3,609      | 12,354 s     | 3423 ms        |
| Klarna                                                                           | 20,368     | 12,130 s     | 596 ms         |
| TrafficStars                                                                     | 16,044     | 12,014 s     | 749 ms         |
| Affirm                                                                           | 13,488     | 11,524 s     | 854 ms         |
| [Supership](https://supership.jp/)                                               | 32,253     | 10,976 s     | 340 ms         |
| fluct                                                                            | 18,070     | 10,966 s     | 607 ms         |
| [Baidu Analytics](https://tongji.baidu.com/web/welcome/login)                    | 41,491     | 10,798 s     | 260 ms         |
| [WordPress Site Stats](https://wp.com/)                                          | 154,885    | 10,147 s     | 66 ms          |
| [LinkedIn](https://www.linkedin.com/)                                            | 30,361     | 9,887 s      | 326 ms         |
| Qualtrics                                                                        | 14,199     | 9,197 s      | 648 ms         |
| Adyen                                                                            | 5,341      | 9,033 s      | 1691 ms        |
| Hexton                                                                           | 54,246     | 8,836 s      | 163 ms         |
| Convert Insights                                                                 | 8,385      | 8,766 s      | 1045 ms        |
| [LiveRamp Privacy Manager](https://liveramp.com/privacy-legal-compliance/)       | 30,276     | 8,742 s      | 289 ms         |
| [Checkout.com](https://www.checkout.com)                                         | 7,900      | 8,526 s      | 1079 ms        |
| Smart AdServer                                                                   | 46,847     | 8,156 s      | 174 ms         |
| LongTail Ad Solutions                                                            | 9,137      | 7,963 s      | 871 ms         |
| [Web Content Assessor](https://mediatrust.com/)                                  | 3,604      | 7,949 s      | 2206 ms        |
| [Ad Lightning](https://www.adlightning.com/)                                     | 4,099      | 7,934 s      | 1936 ms        |
| [Attentive](https://attentivemobile.com/)                                        | 13,372     | 7,844 s      | 587 ms         |
| [Quantcast](https://www.quantcast.com)                                           | 90,256     | 7,773 s      | 86 ms          |
| Datacamp                                                                         | 2,443      | 7,742 s      | 3169 ms        |
| ThreatMetrix                                                                     | 8,252      | 7,440 s      | 902 ms         |
| Key CDN                                                                          | 21,180     | 7,409 s      | 350 ms         |
| [Wunderkind](https://www.wunderkind.co/)                                         | 7,171      | 7,303 s      | 1018 ms        |
| Civic                                                                            | 14,317     | 7,268 s      | 508 ms         |
| TrackJS                                                                          | 3,225      | 7,196 s      | 2231 ms        |
| Bold Commerce                                                                    | 12,067     | 7,135 s      | 591 ms         |
| [OpenX](https://www.openx.com/)                                                  | 104,910    | 6,884 s      | 66 ms          |
| [AppNexus](https://www.appnexus.com/)                                            | 182,686    | 6,867 s      | 38 ms          |
| [Scorecard Research](https://www.scorecardresearch.com/)                         | 81,502     | 6,789 s      | 83 ms          |
| Embedly                                                                          | 15,905     | 6,674 s      | 420 ms         |
| [Brandmetrics](https://www.brandmetrics.com)                                     | 36,552     | 6,672 s      | 183 ms         |
| [mPulse](https://developer.akamai.com/akamai-mpulse)                             | 61,262     | 6,614 s      | 108 ms         |
| i-mobile                                                                         | 33,261     | 6,593 s      | 198 ms         |
| [AdScore](https://www.adscore.com/)                                              | 8,346      | 6,390 s      | 766 ms         |
| [Quantum Metric](https://www.quantummetric.com/)                                 | 2,966      | 6,382 s      | 2152 ms        |
| [Matomo](https://matomo.org/)                                                    | 28,520     | 6,262 s      | 220 ms         |
| Microsoft Hosted Libs                                                            | 36,189     | 6,244 s      | 173 ms         |
| [33 Across](https://33across.com/)                                               | 99,190     | 6,205 s      | 63 ms          |
| [PageSense](https://www.zoho.com/pagesense/)                                     | 16,229     | 6,203 s      | 382 ms         |
| Conversant                                                                       | 39,631     | 5,932 s      | 150 ms         |
| [Kameleoon](https://www.kameleoon.com/)                                          | 3,585      | 5,529 s      | 1542 ms        |
| [Nielsen NetRatings SiteCensus](http://www.nielsen-online.com/intlpage.html)     | 14,246     | 5,510 s      | 387 ms         |
| LoyaltyLion                                                                      | 7,043      | 5,399 s      | 767 ms         |
| [The Trade Desk](https://www.thetradedesk.com/)                                  | 72,308     | 5,131 s      | 71 ms          |
| [VWO](https://vwo.com)                                                           | 10,913     | 5,071 s      | 465 ms         |
| Gemius                                                                           | 30,525     | 4,946 s      | 162 ms         |
| Revcontent                                                                       | 4,259      | 4,785 s      | 1124 ms        |
| Bazaarvoice                                                                      | 8,127      | 4,690 s      | 577 ms         |
| Inspectlet                                                                       | 7,307      | 4,671 s      | 639 ms         |
| LINE Corporation                                                                 | 66,569     | 4,648 s      | 70 ms          |
| Marker                                                                           | 4,369      | 4,590 s      | 1051 ms        |
| Dynatrace                                                                        | 2,906      | 4,581 s      | 1576 ms        |
| [Hotmart](https://www.hotmart.com/)                                              | 2,825      | 4,552 s      | 1611 ms        |
| Datawrapper                                                                      | 650        | 4,491 s      | 6910 ms        |
| [Akamai](https://www.akamai.com/)                                                | 13,493     | 4,477 s      | 332 ms         |

## Future Work

1.  Introduce URL-level data for more fine-grained analysis, i.e. which libraries from Cloudflare/Google CDNs are most expensive.
1.  Expand the scope, i.e. include more third parties and have greater entity/category coverage.

## FAQs

### I don't see entity X in the list. What's up with that?

This can be for one of several reasons:

1.  The entity does not have references to their origin on at least 50 pages in the dataset.
1.  The entity's origins have not yet been identified. See [How can I contribute?](#contribute)

### What is "Total Occurences"?

Total Occurrences is the number of pages on which the entity is included.

### How is the "Average Impact" determined?

The HTTP Archive dataset includes Lighthouse reports for each URL on mobile. Lighthouse has an audit called "bootup-time" that summarizes the amount of time that each script spent on the main thread. The "Average Impact" for an entity is the total execution time of scripts whose domain matches one of the entity's domains divided by the total number of pages that included the entity.

```
Average Impact = Total Execution Time / Total Occurrences
```

### How does Lighthouse determine the execution time of each script?

Lighthouse's bootup time audit attempts to attribute all toplevel main-thread tasks to a URL. A main thread task is attributed to the first script URL found in the stack. If you're interested in helping us improve this logic, see [Contributing](#contributing) for details.

### The data for entity X seems wrong. How can it be corrected?

Verify that the origins in `data/entities.js` are correct. Most issues will simply be the result of mislabelling of shared origins. If everything checks out, there is likely no further action and the data is valid. If you still believe there's errors, file an issue to discuss futher.

<a name="contribute"></a>

### How can I contribute?

Only about 90% of the third party script execution has been assigned to an entity. We could use your help identifying the rest! See [Contributing](#contributing) for details.

## Contributing

### Thanks

A **huge** thanks to [@simonhearne](https://twitter.com/simonhearne) and [@soulgalore](https://twitter.com/soulislove) for their assistance in classifying additional domains!

### Updating the Entities

The domain->entity mapping can be found in `data/entities.js`. Adding a new entity is as simple as adding a new array item with the following form.

```js
{
    "name": "Facebook",
    "homepage": "https://www.facebook.com",
    "category": "social",
    "domains": [
        "*.facebook.com",
        "*.fbcdn.net"
    ],
    "examples": [
        "www.facebook.com",
        "connect.facebook.net",
        "staticxx.facebook.com",
        "static.xx.fbcdn.net",
        "m.facebook.com"
    ]
}
```

### Updating Attribution Logic

The logic for attribution to individual script URLs can be found in the [Lighthouse repo](https://github.com/GoogleChrome/lighthouse). File an issue over there to discuss further.

### Updating the Data

This is now automated! Run `yarn start:update-ha-data` with a `gcp-credentials.json` file in the root directory of this project (look at `bin/automated-update.js` for the steps involved).

### Updating this README

This README is auto-generated from the templates `lib/` and the computed data. In order to update the charts, you'll need to make sure you have `cairo` installed locally in addition to `yarn install`.

```bash
# Install `cairo` and dependencies for node-canvas
brew install pkg-config cairo pango libpng jpeg giflib
# Build the requirements in this repo
yarn build
# Regenerate the README
yarn start
```

### Updating the website

The web code is located in `www/` directory of this repository. Open a PR to make changes.
