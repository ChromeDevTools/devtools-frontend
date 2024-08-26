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
| 1    | [Truffle Bid](https://truffle.bid/)                                              | 17,556    | 0 ms           |
| 2    | [Bidswitch](https://www.bidswitch.com/)                                          | 39,349    | 0 ms           |
| 3    | Unruly Media                                                                     | 6,983     | 0 ms           |
| 4    | Nativo                                                                           | 28,406    | 0 ms           |
| 5    | AcuityAds                                                                        | 9,415     | 0 ms           |
| 6    | AdGear                                                                           | 48,485    | 1 ms           |
| 7    | Tribal Fusion                                                                    | 121,668   | 1 ms           |
| 8    | MaxPoint Interactive                                                             | 12,319    | 1 ms           |
| 9    | Beeswax                                                                          | 10,108    | 1 ms           |
| 10   | Crimtan                                                                          | 57,806    | 1 ms           |
| 11   | TripleLift                                                                       | 3,251     | 1 ms           |
| 12   | adKernel                                                                         | 12,242    | 1 ms           |
| 13   | [iPROM](https://iprom.eu/)                                                       | 55,739    | 2 ms           |
| 14   | Bidtellect                                                                       | 10,797    | 2 ms           |
| 15   | InMobi                                                                           | 66,361    | 2 ms           |
| 16   | [OpenX](https://www.openx.com/)                                                  | 11,228    | 12 ms          |
| 17   | [33 Across](https://33across.com/)                                               | 143,025   | 17 ms          |
| 18   | Adform                                                                           | 86,041    | 21 ms          |
| 19   | [AppNexus](https://www.appnexus.com/)                                            | 177,948   | 22 ms          |
| 20   | GumGum                                                                           | 123,913   | 25 ms          |
| 21   | LoopMe                                                                           | 42,797    | 33 ms          |
| 22   | Constant Contact                                                                 | 17,757    | 34 ms          |
| 23   | Adyoulike                                                                        | 4,229     | 40 ms          |
| 24   | Sonobi                                                                           | 54,964    | 50 ms          |
| 25   | sovrn                                                                            | 19,694    | 59 ms          |
| 26   | OneTag                                                                           | 29,755    | 60 ms          |
| 27   | RTB House AdPilot                                                                | 5,708     | 61 ms          |
| 28   | Simpli.fi                                                                        | 10,407    | 63 ms          |
| 29   | MailMunch                                                                        | 17,494    | 66 ms          |
| 30   | [The Trade Desk](https://www.thetradedesk.com/)                                  | 15,933    | 69 ms          |
| 31   | BlueCava                                                                         | 5,973     | 77 ms          |
| 32   | Twitter Online Conversion Tracking                                               | 68,128    | 79 ms          |
| 33   | DTSCOUT                                                                          | 5,825     | 81 ms          |
| 34   | ActiveCampaign                                                                   | 14,775    | 83 ms          |
| 35   | StackAdapt                                                                       | 13,484    | 84 ms          |
| 36   | [Scorecard Research](https://www.scorecardresearch.com/)                         | 46,696    | 87 ms          |
| 37   | Branch Metrics                                                                   | 13,768    | 90 ms          |
| 38   | Affiliate Window                                                                 | 4,621     | 93 ms          |
| 39   | [Quora Ads](https://www.quora.com/business/)                                     | 9,098     | 103 ms         |
| 40   | LinkedIn Ads                                                                     | 187,285   | 104 ms         |
| 41   | [Criteo](https://www.criteo.com/)                                                | 165,842   | 118 ms         |
| 42   | Index Exchange                                                                   | 33,560    | 118 ms         |
| 43   | Impact Radius                                                                    | 4,158     | 127 ms         |
| 44   | Rakuten Marketing                                                                | 3,189     | 127 ms         |
| 45   | Microad                                                                          | 12,512    | 129 ms         |
| 46   | LINE Corporation                                                                 | 24,991    | 138 ms         |
| 47   | Crowd Control                                                                    | 70,113    | 138 ms         |
| 48   | [Bing Ads](https://bingads.microsoft.com)                                        | 45,421    | 146 ms         |
| 49   | Gemius                                                                           | 15,825    | 149 ms         |
| 50   | AudienceSearch                                                                   | 51,541    | 156 ms         |
| 51   | Intercept Interactive                                                            | 18,824    | 160 ms         |
| 52   | ucfunnel ucX                                                                     | 8,896     | 163 ms         |
| 53   | IPONWEB                                                                          | 19,682    | 164 ms         |
| 54   | Simplicity Marketing                                                             | 2,983     | 166 ms         |
| 55   | AdRiver                                                                          | 4,609     | 170 ms         |
| 56   | STINGRAY                                                                         | 7,281     | 171 ms         |
| 57   | Salesforce.com                                                                   | 4,381     | 185 ms         |
| 58   | [Yahoo!](https://www.yahoo.com/)                                                 | 8,039     | 190 ms         |
| 59   | Technorati                                                                       | 22,378    | 193 ms         |
| 60   | i-mobile                                                                         | 11,882    | 195 ms         |
| 61   | Unbounce                                                                         | 9,100     | 199 ms         |
| 62   | Tynt                                                                             | 162,031   | 207 ms         |
| 63   | [Outbrain](https://www.outbrain.com/)                                            | 11,439    | 210 ms         |
| 64   | Smart AdServer                                                                   | 109,986   | 213 ms         |
| 65   | [ID5 Identity Cloud](https://id5.io/)                                            | 65,666    | 241 ms         |
| 66   | [Media.net](https://www.media.net/)                                              | 93,229    | 244 ms         |
| 67   | TrafficStars                                                                     | 7,539     | 275 ms         |
| 68   | [Amazon Ads](https://ad.amazon.com/)                                             | 178,313   | 288 ms         |
| 69   | [Adroll](https://www.adroll.com/)                                                | 31,186    | 321 ms         |
| 70   | Skimbit                                                                          | 81,338    | 326 ms         |
| 71   | Teads                                                                            | 6,909     | 331 ms         |
| 72   | [LiveRamp Privacy Manager](https://liveramp.com/privacy-legal-compliance/)       | 18,855    | 339 ms         |
| 73   | fluct                                                                            | 22,281    | 341 ms         |
| 74   | [Supership](https://supership.jp/)                                               | 18,113    | 379 ms         |
| 75   | [Yandex Ads](https://yandex.com/adv/)                                            | 8,817     | 460 ms         |
| 76   | [Attentive](https://attentivemobile.com/)                                        | 9,166     | 514 ms         |
| 77   | Cxense                                                                           | 3,731     | 533 ms         |
| 78   | [Yahoo! JAPAN Ads](https://marketing.yahoo.co.jp/service/yahooads/)              | 53,919    | 564 ms         |
| 79   | OptiMonk                                                                         | 10,492    | 607 ms         |
| 80   | VigLink                                                                          | 6,674     | 621 ms         |
| 81   | Klaviyo                                                                          | 142,926   | 628 ms         |
| 82   | Privy                                                                            | 19,432    | 633 ms         |
| 83   | [WordAds](https://wordads.co/)                                                   | 102,326   | 654 ms         |
| 84   | Geniee                                                                           | 14,510    | 681 ms         |
| 85   | [Taboola](https://www.taboola.com/)                                              | 50,480    | 714 ms         |
| 86   | [AdScore](https://www.adscore.com/)                                              | 4,378     | 771 ms         |
| 87   | LongTail Ad Solutions                                                            | 6,143     | 776 ms         |
| 88   | LoyaltyLion                                                                      | 4,213     | 815 ms         |
| 89   | [Integral Ad Science](https://integralads.com/uk/)                               | 15,169    | 827 ms         |
| 90   | [Rubicon Project](https://rubiconproject.com/)                                   | 220,488   | 994 ms         |
| 91   | [Moat](https://moat.com/)                                                        | 3,861     | 1039 ms        |
| 92   | [DoubleVerify](https://www.doubleverify.com/)                                    | 4,740     | 1171 ms        |
| 93   | [Seedtag](https://www.seedtag.com/)                                              | 2,513     | 1505 ms        |
| 94   | [Sizmek](https://www.sizmek.com/)                                                | 5,738     | 1579 ms        |
| 95   | [Pubmatic](https://pubmatic.com/)                                                | 221,339   | 1673 ms        |
| 96   | Infolinks                                                                        | 5,954     | 1749 ms        |
| 97   | [MGID](https://www.mgid.com/)                                                    | 9,908     | 1916 ms        |
| 98   | [Google/Doubleclick Ads](https://marketingplatform.google.com/about/enterprise/) | 1,172,494 | 2968 ms        |
| 99   | Yahoo! Ad Exchange                                                               | 4,858     | 2974 ms        |
| 100  | [Mediavine](https://www.mediavine.com/)                                          | 9,730     | 4101 ms        |

<a name="analytics"></a>

#### Analytics

These scripts measure or track users and their actions. There's a wide range in impact here depending on what's being tracked.

| Rank | Name                                                                          | Usage     | Average Impact |
| ---- | ----------------------------------------------------------------------------- | --------- | -------------- |
| 1    | [Mouseflow](https://mouseflow.com/)                                           | 4,985     | 48 ms          |
| 2    | [SpeedCurve RUM](https://www.speedcurve.com/features/performance-monitoring/) | 2,169     | 53 ms          |
| 3    | [WordPress Site Stats](https://wp.com/)                                       | 64,925    | 56 ms          |
| 4    | Roxr Software                                                                 | 11,383    | 63 ms          |
| 5    | [Pingdom RUM](https://www.pingdom.com/product/performance-monitoring/)        | 1,008     | 65 ms          |
| 6    | Movable Ink                                                                   | 3,989     | 80 ms          |
| 7    | Sailthru                                                                      | 1,394     | 84 ms          |
| 8    | [LiveRamp IdentityLink](https://liveramp.com/discover-identitylink/)          | 1,878     | 88 ms          |
| 9    | Woopra                                                                        | 1,274     | 89 ms          |
| 10   | Treasure Data                                                                 | 13,593    | 95 ms          |
| 11   | [mPulse](https://developer.akamai.com/akamai-mpulse)                          | 32,660    | 98 ms          |
| 12   | [Smartlook](https://www.smartlook.com/)                                       | 17,274    | 101 ms         |
| 13   | [XiTi](https://www.atinternet.com/en/)                                        | 4,514     | 103 ms         |
| 14   | StatCounter                                                                   | 51,587    | 104 ms         |
| 15   | [Fastly Insights](https://insights.fastlylabs.com)                            | 1,631     | 108 ms         |
| 16   | Exponea                                                                       | 1,330     | 111 ms         |
| 17   | Conversant                                                                    | 46,153    | 112 ms         |
| 18   | [Google Analytics](https://marketingplatform.google.com/about/analytics/)     | 4,492,386 | 113 ms         |
| 19   | [Brandmetrics](https://www.brandmetrics.com)                                  | 14,878    | 115 ms         |
| 20   | Okta                                                                          | 3,161     | 118 ms         |
| 21   | CleverTap                                                                     | 1,211     | 127 ms         |
| 22   | Polldaddy                                                                     | 2,255     | 128 ms         |
| 23   | Stamped.io                                                                    | 12,632    | 134 ms         |
| 24   | [Snowplow](https://snowplowanalytics.com/)                                    | 59,526    | 139 ms         |
| 25   | [Google Optimize](https://marketingplatform.google.com/about/optimize/)       | 41,792    | 154 ms         |
| 26   | Marchex                                                                       | 8,398     | 160 ms         |
| 27   | [Usabilla](https://usabilla.com)                                              | 1,272     | 161 ms         |
| 28   | [Braze](https://www.braze.com)                                                | 1,801     | 161 ms         |
| 29   | [Mixpanel](https://mixpanel.com/)                                             | 20,441    | 163 ms         |
| 30   | [Quantcast](https://www.quantcast.com)                                        | 68,514    | 164 ms         |
| 31   | Reviews.co.uk                                                                 | 1,896     | 169 ms         |
| 32   | Qualtrics                                                                     | 5,917     | 172 ms         |
| 33   | Smart Insight Tracking                                                        | 1,731     | 193 ms         |
| 34   | [Matomo](https://matomo.org/)                                                 | 12,297    | 195 ms         |
| 35   | Amplitude Mobile Analytics                                                    | 36,223    | 195 ms         |
| 36   | Chartbeat                                                                     | 6,715     | 205 ms         |
| 37   | Parse.ly                                                                      | 6,157     | 223 ms         |
| 38   | [Baidu Analytics](https://tongji.baidu.com/web/welcome/login)                 | 33,318    | 227 ms         |
| 39   | Trust Pilot                                                                   | 44,933    | 240 ms         |
| 40   | CallRail                                                                      | 28,866    | 247 ms         |
| 41   | UpSellit                                                                      | 1,994     | 249 ms         |
| 42   | etracker                                                                      | 5,608     | 270 ms         |
| 43   | [Marketo](https://www.marketo.com)                                            | 1,126     | 283 ms         |
| 44   | [PageSense](https://www.zoho.com/pagesense/)                                  | 5,617     | 297 ms         |
| 45   | [Nielsen NetRatings SiteCensus](http://www.nielsen-online.com/intlpage.html)  | 17,440    | 345 ms         |
| 46   | Survicate                                                                     | 3,308     | 353 ms         |
| 47   | [Pendo](https://www.pendo.io)                                                 | 13,333    | 357 ms         |
| 48   | [Segment](https://segment.com/)                                               | 27,196    | 370 ms         |
| 49   | Reviews.io                                                                    | 4,148     | 375 ms         |
| 50   | Heap                                                                          | 13,234    | 377 ms         |
| 51   | Evergage                                                                      | 2,658     | 387 ms         |
| 52   | [Snapchat](https://www.snapchat.com)                                          | 49,940    | 393 ms         |
| 53   | Bazaarvoice                                                                   | 3,262     | 432 ms         |
| 54   | Net Reviews                                                                   | 2,784     | 445 ms         |
| 55   | [Crazy Egg](https://www.crazyegg.com/)                                        | 20,553    | 485 ms         |
| 56   | [AB Tasty](https://www.abtasty.com/)                                          | 3,343     | 492 ms         |
| 57   | [BowNow](https://bow-now.jp/)                                                 | 2,295     | 495 ms         |
| 58   | Evidon                                                                        | 2,382     | 496 ms         |
| 59   | Convert Insights                                                              | 4,173     | 522 ms         |
| 60   | Nosto                                                                         | 1,173     | 607 ms         |
| 61   | Feefo.com                                                                     | 2,034     | 619 ms         |
| 62   | [VWO](https://vwo.com)                                                        | 8,018     | 639 ms         |
| 63   | [Hotjar](https://www.hotjar.com/)                                             | 331,044   | 661 ms         |
| 64   | TrackJS                                                                       | 2,353     | 718 ms         |
| 65   | FullStory                                                                     | 13,438    | 724 ms         |
| 66   | Clerk.io ApS                                                                  | 1,910     | 776 ms         |
| 67   | PowerReviews                                                                  | 1,524     | 804 ms         |
| 68   | [Lucky Orange](https://www.luckyorange.com/)                                  | 14,012    | 831 ms         |
| 69   | [Optimizely](https://www.optimizely.com/)                                     | 15,596    | 857 ms         |
| 70   | ContentSquare                                                                 | 3,541     | 912 ms         |
| 71   | Revolver Maps                                                                 | 2,172     | 972 ms         |
| 72   | Dynatrace                                                                     | 3,420     | 1121 ms        |
| 73   | Gigya                                                                         | 2,032     | 1243 ms        |
| 74   | [Quantum Metric](https://www.quantummetric.com/)                              | 1,170     | 1266 ms        |
| 75   | Inspectlet                                                                    | 5,338     | 1469 ms        |
| 76   | [Yandex Metrica](https://metrica.yandex.com/about?)                           | 596,366   | 1899 ms        |

<a name="social"></a>

#### Social

These scripts enable social features.

| Rank | Name                                        | Usage     | Average Impact |
| ---- | ------------------------------------------- | --------- | -------------- |
| 1    | [Shareaholic](https://www.shareaholic.com/) | 1,294     | 86 ms          |
| 2    | [Pinterest](https://pinterest.com/)         | 131,399   | 144 ms         |
| 3    | [AddToAny](https://www.addtoany.com/)       | 66,597    | 146 ms         |
| 4    | reddit                                      | 16,277    | 238 ms         |
| 5    | [LinkedIn](https://www.linkedin.com/)       | 17,125    | 306 ms         |
| 6    | [ShareThis](https://www.sharethis.com/)     | 88,925    | 338 ms         |
| 7    | AddShoppers                                 | 1,915     | 340 ms         |
| 8    | [Facebook](https://www.facebook.com)        | 3,181,086 | 388 ms         |
| 9    | [TikTok](https://www.tiktok.com/en/)        | 215,993   | 457 ms         |
| 10   | Kakao                                       | 63,733    | 642 ms         |
| 11   | [PIXNET](https://www.pixnet.net/)           | 15,360    | 709 ms         |
| 12   | [Instagram](https://www.instagram.com)      | 10,222    | 1260 ms        |
| 13   | SocialShopWave                              | 4,310     | 1501 ms        |
| 14   | [Twitter](https://twitter.com)              | 331,511   | 2185 ms        |
| 15   | [VK](https://vk.com/)                       | 24,107    | 2366 ms        |
| 16   | [Disqus](https://disqus.com/)               | 1,135     | 2724 ms        |
| 17   | [Tumblr](https://tumblr.com/)               | 17,786    | 2804 ms        |
| 18   | LiveJournal                                 | 9,526     | 5835 ms        |

<a name="video"></a>

#### Video

These scripts enable video player and streaming functionality.

| Rank | Name                                         | Usage   | Average Impact |
| ---- | -------------------------------------------- | ------- | -------------- |
| 1    | [Brightcove](https://www.brightcove.com/en/) | 13,124  | 1092 ms        |
| 2    | [Vimeo](https://vimeo.com/)                  | 141,109 | 2848 ms        |
| 3    | [Wistia](https://wistia.com/)                | 26,714  | 3186 ms        |
| 4    | [Twitch](https://twitch.tv/)                 | 1,450   | 4518 ms        |
| 5    | [YouTube](https://youtube.com)               | 962,443 | 4991 ms        |

<a name="utility"></a>

#### Developer Utilities

These scripts are developer utilities (API clients, site monitoring, fraud detection, etc).

| Rank | Name                                                                      | Usage     | Average Impact |
| ---- | ------------------------------------------------------------------------- | --------- | -------------- |
| 1    | [Checkout.com](https://www.checkout.com)                                  | 1,117     | 61 ms          |
| 2    | Siteimprove                                                               | 9,172     | 76 ms          |
| 3    | Raygun                                                                    | 2,110     | 89 ms          |
| 4    | Rollbar                                                                   | 1,442     | 93 ms          |
| 5    | [Pusher](https://pusher.com/)                                             | 1,456     | 94 ms          |
| 6    | iovation                                                                  | 2,098     | 108 ms         |
| 7    | CyberSource (Visa)                                                        | 2,061     | 118 ms         |
| 8    | [Afterpay](https://www.afterpay.com/)                                     | 7,898     | 124 ms         |
| 9    | [Cloudflare](https://www.cloudflare.com/website-optimization/)            | 348,270   | 125 ms         |
| 10   | [Ipify](https://www.ipify.org)                                            | 2,159     | 132 ms         |
| 11   | Braintree Payments                                                        | 1,010     | 136 ms         |
| 12   | Macropod BugHerd                                                          | 2,677     | 138 ms         |
| 13   | Wufoo                                                                     | 1,556     | 148 ms         |
| 14   | Seznam                                                                    | 9,260     | 158 ms         |
| 15   | Bitly                                                                     | 2,973     | 158 ms         |
| 16   | [Amazon Pay](https://pay.amazon.com)                                      | 6,678     | 161 ms         |
| 17   | Key CDN                                                                   | 5,597     | 186 ms         |
| 18   | [Netlify](https://www.netlify.com/)                                       | 1,323     | 194 ms         |
| 19   | Highcharts                                                                | 3,106     | 214 ms         |
| 20   | Riskified                                                                 | 1,848     | 218 ms         |
| 21   | LightWidget                                                               | 11,137    | 226 ms         |
| 22   | Cookie-Script.com                                                         | 41,414    | 227 ms         |
| 23   | [OneSignal](https://onesignal.com/)                                       | 66,991    | 254 ms         |
| 24   | [New Relic](https://newrelic.com/)                                        | 234,387   | 261 ms         |
| 25   | [Foxentry](https://foxentry.cz/)                                          | 1,927     | 270 ms         |
| 26   | [TrustArc](https://www.trustarc.com/)                                     | 7,377     | 294 ms         |
| 27   | Google reCAPTCHA                                                          | 27,115    | 304 ms         |
| 28   | [Cookiebot](https://www.cookiebot.com/)                                   | 171,303   | 308 ms         |
| 29   | [Accessibe Accessibility Overlay](https://accessibe.com/)                 | 48,040    | 313 ms         |
| 30   | Swiftype                                                                  | 1,096     | 350 ms         |
| 31   | Hexton                                                                    | 32,051    | 352 ms         |
| 32   | iubenda                                                                   | 93,812    | 356 ms         |
| 33   | [Clarity](https://clarity.microsoft.com/)                                 | 338,320   | 359 ms         |
| 34   | Trusted Shops                                                             | 17,034    | 369 ms         |
| 35   | [Other Google APIs/SDKs](https://developers.google.com/apis-explorer/#p/) | 2,358,410 | 378 ms         |
| 36   | Bugsnag                                                                   | 13,395    | 397 ms         |
| 37   | GitHub                                                                    | 6,970     | 434 ms         |
| 38   | Bold Commerce                                                             | 11,923    | 435 ms         |
| 39   | Klevu Search                                                              | 1,415     | 437 ms         |
| 40   | GetSiteControl                                                            | 3,062     | 476 ms         |
| 41   | Affirm                                                                    | 6,594     | 500 ms         |
| 42   | [Sentry](https://sentry.io/)                                              | 89,800    | 577 ms         |
| 43   | ThreatMetrix                                                              | 2,935     | 606 ms         |
| 44   | [Yandex APIs](https://yandex.ru/)                                         | 44,655    | 621 ms         |
| 45   | [Google Maps](https://www.google.com/maps)                                | 1,214,682 | 633 ms         |
| 46   | Mapbox                                                                    | 19,297    | 663 ms         |
| 47   | [PayPal](https://paypal.com)                                              | 56,797    | 879 ms         |
| 48   | [AppDynamics](https://www.appdynamics.com/)                               | 3,419     | 907 ms         |
| 49   | [GoDaddy](https://www.godaddy.com/)                                       | 122,066   | 938 ms         |
| 50   | Forter                                                                    | 4,345     | 943 ms         |
| 51   | [Vidyard](https://www.vidyard.com/)                                       | 1,061     | 978 ms         |
| 52   | Secomapp                                                                  | 2,220     | 1102 ms        |
| 53   | [Stripe](https://stripe.com)                                              | 127,044   | 1133 ms        |
| 54   | [Luigis Box](https://www.luigisbox.com/)                                  | 2,210     | 1217 ms        |
| 55   | Marker                                                                    | 1,508     | 1238 ms        |
| 56   | WisePops                                                                  | 2,044     | 1241 ms        |
| 57   | Signyfyd                                                                  | 2,567     | 1495 ms        |
| 58   | Fastly                                                                    | 9,099     | 1679 ms        |
| 59   | Adyen                                                                     | 2,322     | 2052 ms        |
| 60   | Rambler                                                                   | 16,907    | 4045 ms        |
| 61   | [POWr](https://www.powr.io)                                               | 39,624    | 4749 ms        |
| 62   | Esri ArcGIS                                                               | 3,412     | 5570 ms        |

<a name="hosting"></a>

#### Hosting Platforms

These scripts are from web hosting platforms (WordPress, Wix, Squarespace, etc). Note that in this category, this can sometimes be the entirety of script on the page, and so the "impact" rank might be misleading. In the case of WordPress, this just indicates the libraries hosted and served _by_ WordPress not all sites using self-hosted WordPress.

| Rank | Name                                                                                      | Usage   | Average Impact |
| ---- | ----------------------------------------------------------------------------------------- | ------- | -------------- |
| 1    | [Blogger](https://www.blogger.com/)                                                       | 153,857 | 151 ms         |
| 2    | [Dealer](https://www.dealer.com/)                                                         | 2,332   | 335 ms         |
| 3    | Civic                                                                                     | 6,533   | 351 ms         |
| 4    | [Salesforce Commerce Cloud](https://www.salesforce.com/products/commerce-cloud/overview/) | 4,001   | 372 ms         |
| 5    | Typepad                                                                                   | 1,099   | 412 ms         |
| 6    | [WordPress](https://wp.com/)                                                              | 311,129 | 645 ms         |
| 7    | [Shopify](https://www.shopify.com/)                                                       | 308,407 | 759 ms         |
| 8    | Global-e                                                                                  | 1,201   | 772 ms         |
| 9    | Ecwid                                                                                     | 5,521   | 873 ms         |
| 10   | Rackspace                                                                                 | 1,880   | 1264 ms        |
| 11   | [Tilda](https://tilda.cc/)                                                                | 69,936  | 1316 ms        |
| 12   | [Hatena Blog](https://hatenablog.com/)                                                    | 43,307  | 1999 ms        |
| 13   | [Webflow](https://webflow.com/)                                                           | 36,763  | 3603 ms        |
| 14   | [Squarespace](https://www.squarespace.com/)                                               | 236,228 | 3642 ms        |
| 15   | [WebsiteBuilder.com](https://www.websitebuilder.com)                                      | 4,817   | 4384 ms        |
| 16   | [Wix](https://www.wix.com/)                                                               | 447,776 | 4780 ms        |
| 17   | [Weebly](https://www.weebly.com/)                                                         | 66,212  | 5814 ms        |

<a name="marketing"></a>

#### Marketing

These scripts are from marketing tools that add popups/newsletters/etc.

| Rank | Name                                        | Usage   | Average Impact |
| ---- | ------------------------------------------- | ------- | -------------- |
| 1    | [Albacross](https://albacross.com/)         | 1,344   | 65 ms          |
| 2    | Madison Logic                               | 1,670   | 74 ms          |
| 3    | DemandBase                                  | 2,209   | 126 ms         |
| 4    | [Convertful](https://convertful.com/)       | 1,556   | 159 ms         |
| 5    | [RD Station](https://www.rdstation.com/en/) | 21,042  | 306 ms         |
| 6    | [Listrak](https://www.listrak.com/)         | 1,204   | 381 ms         |
| 7    | [OptinMonster](https://optinmonster.com/)   | 2,592   | 410 ms         |
| 8    | [Mailchimp](https://mailchimp.com/)         | 47,204  | 465 ms         |
| 9    | Sojern                                      | 4,030   | 482 ms         |
| 10   | Wishpond Technologies                       | 1,698   | 516 ms         |
| 11   | [Hubspot](https://hubspot.com/)             | 147,791 | 523 ms         |
| 12   | [iZooto](https://www.izooto.com)            | 2,302   | 628 ms         |
| 13   | [Yotpo](https://www.yotpo.com/)             | 27,061  | 630 ms         |
| 14   | Kargo                                       | 1,602   | 672 ms         |
| 15   | [PureCars](https://www.purecars.com/)       | 1,813   | 735 ms         |
| 16   | [KARTE](https://karte.io/)                  | 1,755   | 898 ms         |
| 17   | [Judge.me](https://judge.me/)               | 28,108  | 975 ms         |
| 18   | [Beeketing](https://beeketing.com/)         | 2,144   | 1007 ms        |
| 19   | [Wunderkind](https://www.wunderkind.co/)    | 1,249   | 1336 ms        |
| 20   | [Sumo](https://sumo.com/)                   | 11,786  | 1433 ms        |
| 21   | Bigcommerce                                 | 19,744  | 2258 ms        |
| 22   | [Drift](https://www.drift.com/)             | 5,811   | 4284 ms        |
| 23   | [Tray Commerce](https://www.tray.com.br/)   | 13,869  | 4626 ms        |

<a name="customer-success"></a>

#### Customer Success

These scripts are from customer support/marketing providers that offer chat and contact solutions. These scripts are generally heavier in weight.

| Rank | Name                                                        | Usage   | Average Impact |
| ---- | ----------------------------------------------------------- | ------- | -------------- |
| 1    | SnapEngage                                                  | 1,000   | 111 ms         |
| 2    | iPerceptions                                                | 5,939   | 133 ms         |
| 3    | [Help Scout](https://www.helpscout.net/)                    | 4,484   | 139 ms         |
| 4    | Foursixty                                                   | 1,325   | 202 ms         |
| 5    | LiveTex                                                     | 1,836   | 202 ms         |
| 6    | WebEngage                                                   | 2,150   | 240 ms         |
| 7    | Pure Chat                                                   | 3,261   | 330 ms         |
| 8    | [Tawk.to](https://www.tawk.to/)                             | 110,838 | 369 ms         |
| 9    | [Smartsupp](https://www.smartsupp.com)                      | 21,642  | 402 ms         |
| 10   | Comm100                                                     | 1,031   | 448 ms         |
| 11   | [Jivochat](https://www.jivochat.com/)                       | 55,524  | 637 ms         |
| 12   | [LivePerson](https://www.liveperson.com/)                   | 2,795   | 688 ms         |
| 13   | [Intercom](https://www.intercom.com)                        | 32,751  | 1100 ms        |
| 14   | [Tidio Live Chat](https://www.tidiochat.com/en/)            | 25,353  | 1183 ms        |
| 15   | [Olark](https://www.olark.com/)                             | 6,739   | 1320 ms        |
| 16   | [ZenDesk](https://zendesk.com/)                             | 76,280  | 1442 ms        |
| 17   | [LiveChat](https://www.livechat.com/)                       | 39,613  | 1580 ms        |
| 18   | Dynamic Yield                                               | 1,860   | 1943 ms        |
| 19   | [Freshchat](https://www.freshworks.com/live-chat-software/) | 6,686   | 3069 ms        |

<a name="content"></a>

#### Content & Publishing

These scripts are from content providers or publishing-specific affiliate tracking.

| Rank | Name                                      | Usage  | Average Impact |
| ---- | ----------------------------------------- | ------ | -------------- |
| 1    | [Spotify](https://www.spotify.com/)       | 11,016 | 1 ms           |
| 2    | OpenTable                                 | 4,206  | 78 ms          |
| 3    | TripAdvisor                               | 2,018  | 88 ms          |
| 4    | Accuweather                               | 1,554  | 169 ms         |
| 5    | SnapWidget                                | 13,527 | 179 ms         |
| 6    | Tencent                                   | 7,169  | 249 ms         |
| 7    | Booking.com                               | 1,656  | 417 ms         |
| 8    | Cloudinary                                | 2,554  | 494 ms         |
| 9    | CPEx                                      | 1,137  | 504 ms         |
| 10   | Revcontent                                | 1,225  | 864 ms         |
| 11   | [Hotmart](https://www.hotmart.com/)       | 4,014  | 926 ms         |
| 12   | [AMP](https://amp.dev/)                   | 88,558 | 1054 ms        |
| 13   | Embedly                                   | 10,428 | 1401 ms        |
| 14   | issuu                                     | 2,692  | 1957 ms        |
| 15   | [SoundCloud](https://www.soundcloud.com/) | 6,033  | 2479 ms        |
| 16   | Dailymotion                               | 5,423  | 8720 ms        |
| 17   | Medium                                    | 19,673 | 12053 ms       |

<a name="cdn"></a>

#### CDNs

These are a mixture of publicly hosted open source libraries (e.g. jQuery) served over different public CDNs and private CDN usage. This category is unique in that the origin may have no responsibility for the performance of what's being served. Note that rank here does not imply one CDN is better than the other. It simply indicates that the scripts being served from that origin are lighter/heavier than the ones served by another.

| Rank | Name                                                         | Usage     | Average Impact |
| ---- | ------------------------------------------------------------ | --------- | -------------- |
| 1    | [Google Fonts](https://fonts.google.com/)                    | 220,602   | 0 ms           |
| 2    | [Bootstrap CDN](https://www.bootstrapcdn.com/)               | 31,394    | 55 ms          |
| 3    | [FontAwesome CDN](https://fontawesome.com/)                  | 310,436   | 219 ms         |
| 4    | Monotype                                                     | 3,294     | 222 ms         |
| 5    | Microsoft Hosted Libs                                        | 19,679    | 225 ms         |
| 6    | [Akamai](https://www.akamai.com/)                            | 9,228     | 297 ms         |
| 7    | [Adobe TypeKit](https://fonts.adobe.com/)                    | 102,866   | 340 ms         |
| 8    | Fort Awesome                                                 | 3,769     | 348 ms         |
| 9    | [jQuery CDN](https://code.jquery.com/)                       | 713,886   | 382 ms         |
| 10   | [Cloudflare CDN](https://cdnjs.com/)                         | 618,006   | 514 ms         |
| 11   | [JSDelivr CDN](https://www.jsdelivr.com/)                    | 348,981   | 635 ms         |
| 12   | Azure Web Services                                           | 43,334    | 677 ms         |
| 13   | [Unpkg](https://unpkg.com)                                   | 138,968   | 976 ms         |
| 14   | [Google CDN](https://developers.google.com/speed/libraries/) | 3,340,383 | 1058 ms        |
| 15   | [Yandex CDN](https://yandex.ru/)                             | 172,717   | 1715 ms        |
| 16   | [CreateJS CDN](https://code.createjs.com/)                   | 4,377     | 2936 ms        |

<a name="tag-manager"></a>

#### Tag Management

These scripts tend to load lots of other scripts and initiate many tasks.

| Rank | Name                                                                          | Usage     | Average Impact |
| ---- | ----------------------------------------------------------------------------- | --------- | -------------- |
| 1    | [Adobe Tag Manager](https://www.adobe.com/experience-platform/)               | 183,984   | 185 ms         |
| 2    | [Yahoo! Tag Manager](https://marketing.yahoo.co.jp/service/tagmanager/)       | 9,086     | 225 ms         |
| 3    | TagCommander                                                                  | 1,455     | 286 ms         |
| 4    | [Ensighten](https://www.ensighten.com/)                                       | 3,033     | 545 ms         |
| 5    | [Tealium](https://tealium.com/)                                               | 27,489    | 556 ms         |
| 6    | [Google Tag Manager](https://marketingplatform.google.com/about/tag-manager/) | 7,862,343 | 708 ms         |

<a name="consent-provider"></a>

#### Consent Management Provider

IAB Consent Management Providers are the 'Cookie Consent' popups used by many publishers. They're invoked for every page and sit on the critical path between a page loading and adverts being displayed.

| Rank | Name                                            | Usage   | Average Impact |
| ---- | ----------------------------------------------- | ------- | -------------- |
| 1    | [Trustcommander](https://www.commandersact.com) | 1,701   | 176 ms         |
| 2    | [Optanon](https://www.cookielaw.org/)           | 114,644 | 441 ms         |
| 3    | [Usercentrics CMP](https://usercentrics.com)    | 47,735  | 1018 ms        |

<a name="other"></a>

#### Mixed / Other

These are miscellaneous scripts delivered via a shared origin with no precise category or attribution. Help us out by identifying more origins!

| Rank | Name                                                                | Usage   | Average Impact |
| ---- | ------------------------------------------------------------------- | ------- | -------------- |
| 1    | Browser-Update.org                                                  | 12,856  | 39 ms          |
| 2    | [ReadSpeaker](https://www.readspeaker.com)                          | 5,346   | 106 ms         |
| 3    | ResponsiveVoice                                                     | 6,401   | 121 ms         |
| 4    | Polyfill service                                                    | 1,293   | 209 ms         |
| 5    | [Browsealoud](https://www.texthelp.com/en-gb/products/browsealoud/) | 1,874   | 304 ms         |
| 6    | [Amazon Web Services](https://aws.amazon.com/s3/)                   | 104,820 | 375 ms         |
| 7    | Heroku                                                              | 14,127  | 1074 ms        |
| 8    | Calendly                                                            | 4,007   | 1563 ms        |
| 9    | uLogin                                                              | 1,427   | 2923 ms        |

<a name="by-total-impact"></a>

### Third Parties by Total Impact

This section highlights the entities responsible for the most script execution across the web. This helps inform which improvements would have the largest total impact.

| Name                                                                             | Popularity | Total Impact | Average Impact |
| -------------------------------------------------------------------------------- | ---------- | ------------ | -------------- |
| [Google Tag Manager](https://marketingplatform.google.com/about/tag-manager/)    | 7,862,343  | 5,570,434 s  | 708 ms         |
| [YouTube](https://youtube.com)                                                   | 962,443    | 4,803,260 s  | 4991 ms        |
| [Google CDN](https://developers.google.com/speed/libraries/)                     | 3,340,383  | 3,534,531 s  | 1058 ms        |
| [Google/Doubleclick Ads](https://marketingplatform.google.com/about/enterprise/) | 1,172,494  | 3,480,534 s  | 2968 ms        |
| [Wix](https://www.wix.com/)                                                      | 447,776    | 2,140,310 s  | 4780 ms        |
| [Facebook](https://www.facebook.com)                                             | 3,181,086  | 1,232,848 s  | 388 ms         |
| [Yandex Metrica](https://metrica.yandex.com/about?)                              | 596,366    | 1,132,490 s  | 1899 ms        |
| [Other Google APIs/SDKs](https://developers.google.com/apis-explorer/#p/)        | 2,358,410  | 891,484 s    | 378 ms         |
| [Squarespace](https://www.squarespace.com/)                                      | 236,228    | 860,388 s    | 3642 ms        |
| [Google Maps](https://www.google.com/maps)                                       | 1,214,682  | 768,992 s    | 633 ms         |
| [Twitter](https://twitter.com)                                                   | 331,511    | 724,490 s    | 2185 ms        |
| [Google Analytics](https://marketingplatform.google.com/about/analytics/)        | 4,492,386  | 507,048 s    | 113 ms         |
| [Vimeo](https://vimeo.com/)                                                      | 141,109    | 401,820 s    | 2848 ms        |
| [Weebly](https://www.weebly.com/)                                                | 66,212     | 384,979 s    | 5814 ms        |
| [Pubmatic](https://pubmatic.com/)                                                | 221,339    | 370,370 s    | 1673 ms        |
| [Cloudflare CDN](https://cdnjs.com/)                                             | 618,006    | 317,591 s    | 514 ms         |
| [Yandex CDN](https://yandex.ru/)                                                 | 172,717    | 296,239 s    | 1715 ms        |
| [jQuery CDN](https://code.jquery.com/)                                           | 713,886    | 272,882 s    | 382 ms         |
| Medium                                                                           | 19,673     | 237,122 s    | 12053 ms       |
| [Shopify](https://www.shopify.com/)                                              | 308,407    | 234,053 s    | 759 ms         |
| [JSDelivr CDN](https://www.jsdelivr.com/)                                        | 348,981    | 221,626 s    | 635 ms         |
| [Rubicon Project](https://rubiconproject.com/)                                   | 220,488    | 219,220 s    | 994 ms         |
| [Hotjar](https://www.hotjar.com/)                                                | 331,044    | 218,861 s    | 661 ms         |
| [WordPress](https://wp.com/)                                                     | 311,129    | 200,823 s    | 645 ms         |
| [POWr](https://www.powr.io)                                                      | 39,624     | 188,155 s    | 4749 ms        |
| [Stripe](https://stripe.com)                                                     | 127,044    | 143,964 s    | 1133 ms        |
| [Unpkg](https://unpkg.com)                                                       | 138,968    | 135,670 s    | 976 ms         |
| [Webflow](https://webflow.com/)                                                  | 36,763     | 132,439 s    | 3603 ms        |
| [Clarity](https://clarity.microsoft.com/)                                        | 338,320    | 121,291 s    | 359 ms         |
| [GoDaddy](https://www.godaddy.com/)                                              | 122,066    | 114,510 s    | 938 ms         |
| [ZenDesk](https://zendesk.com/)                                                  | 76,280     | 110,014 s    | 1442 ms        |
| [TikTok](https://www.tiktok.com/en/)                                             | 215,993    | 98,799 s     | 457 ms         |
| [AMP](https://amp.dev/)                                                          | 88,558     | 93,307 s     | 1054 ms        |
| [Tilda](https://tilda.cc/)                                                       | 69,936     | 92,012 s     | 1316 ms        |
| Klaviyo                                                                          | 142,926    | 89,711 s     | 628 ms         |
| [Hatena Blog](https://hatenablog.com/)                                           | 43,307     | 86,574 s     | 1999 ms        |
| [Wistia](https://wistia.com/)                                                    | 26,714     | 85,121 s     | 3186 ms        |
| [Hubspot](https://hubspot.com/)                                                  | 147,791    | 77,360 s     | 523 ms         |
| Rambler                                                                          | 16,907     | 68,383 s     | 4045 ms        |
| [FontAwesome CDN](https://fontawesome.com/)                                      | 310,436    | 67,992 s     | 219 ms         |
| [WordAds](https://wordads.co/)                                                   | 102,326    | 66,936 s     | 654 ms         |
| [Tray Commerce](https://www.tray.com.br/)                                        | 13,869     | 64,152 s     | 4626 ms        |
| [LiveChat](https://www.livechat.com/)                                            | 39,613     | 62,598 s     | 1580 ms        |
| [New Relic](https://newrelic.com/)                                               | 234,387    | 61,136 s     | 261 ms         |
| [VK](https://vk.com/)                                                            | 24,107     | 57,032 s     | 2366 ms        |
| LiveJournal                                                                      | 9,526      | 55,586 s     | 5835 ms        |
| [Cookiebot](https://www.cookiebot.com/)                                          | 171,303    | 52,714 s     | 308 ms         |
| [Sentry](https://sentry.io/)                                                     | 89,800     | 51,840 s     | 577 ms         |
| [Amazon Ads](https://ad.amazon.com/)                                             | 178,313    | 51,283 s     | 288 ms         |
| [Optanon](https://www.cookielaw.org/)                                            | 114,644    | 50,519 s     | 441 ms         |
| [PayPal](https://paypal.com)                                                     | 56,797     | 49,905 s     | 879 ms         |
| [Tumblr](https://tumblr.com/)                                                    | 17,786     | 49,877 s     | 2804 ms        |
| [Usercentrics CMP](https://usercentrics.com)                                     | 47,735     | 48,617 s     | 1018 ms        |
| Dailymotion                                                                      | 5,423      | 47,289 s     | 8720 ms        |
| Bigcommerce                                                                      | 19,744     | 44,589 s     | 2258 ms        |
| [Cloudflare](https://www.cloudflare.com/website-optimization/)                   | 348,270    | 43,646 s     | 125 ms         |
| [Tawk.to](https://www.tawk.to/)                                                  | 110,838    | 40,919 s     | 369 ms         |
| Kakao                                                                            | 63,733     | 40,901 s     | 642 ms         |
| [Mediavine](https://www.mediavine.com/)                                          | 9,730      | 39,901 s     | 4101 ms        |
| [Amazon Web Services](https://aws.amazon.com/s3/)                                | 104,820    | 39,268 s     | 375 ms         |
| [Intercom](https://www.intercom.com)                                             | 32,751     | 36,035 s     | 1100 ms        |
| [Taboola](https://www.taboola.com/)                                              | 50,480     | 36,029 s     | 714 ms         |
| [Jivochat](https://www.jivochat.com/)                                            | 55,524     | 35,373 s     | 637 ms         |
| [Adobe TypeKit](https://fonts.adobe.com/)                                        | 102,866    | 34,926 s     | 340 ms         |
| [Adobe Tag Manager](https://www.adobe.com/experience-platform/)                  | 183,984    | 33,980 s     | 185 ms         |
| Tynt                                                                             | 162,031    | 33,579 s     | 207 ms         |
| iubenda                                                                          | 93,812     | 33,363 s     | 356 ms         |
| [Yahoo! JAPAN Ads](https://marketing.yahoo.co.jp/service/yahooads/)              | 53,919     | 30,387 s     | 564 ms         |
| [ShareThis](https://www.sharethis.com/)                                          | 88,925     | 30,084 s     | 338 ms         |
| [Tidio Live Chat](https://www.tidiochat.com/en/)                                 | 25,353     | 30,004 s     | 1183 ms        |
| Azure Web Services                                                               | 43,334     | 29,328 s     | 677 ms         |
| [Yandex APIs](https://yandex.ru/)                                                | 44,655     | 27,736 s     | 621 ms         |
| [Judge.me](https://judge.me/)                                                    | 28,108     | 27,415 s     | 975 ms         |
| Skimbit                                                                          | 81,338     | 26,509 s     | 326 ms         |
| [Drift](https://www.drift.com/)                                                  | 5,811      | 24,893 s     | 4284 ms        |
| Smart AdServer                                                                   | 109,986    | 23,453 s     | 213 ms         |
| [Blogger](https://www.blogger.com/)                                              | 153,857    | 23,258 s     | 151 ms         |
| [Media.net](https://www.media.net/)                                              | 93,229     | 22,748 s     | 244 ms         |
| [Mailchimp](https://mailchimp.com/)                                              | 47,204     | 21,956 s     | 465 ms         |
| [WebsiteBuilder.com](https://www.websitebuilder.com)                             | 4,817      | 21,119 s     | 4384 ms        |
| [Freshchat](https://www.freshworks.com/live-chat-software/)                      | 6,686      | 20,523 s     | 3069 ms        |
| [Snapchat](https://www.snapchat.com)                                             | 49,940     | 19,609 s     | 393 ms         |
| [Criteo](https://www.criteo.com/)                                                | 165,842    | 19,584 s     | 118 ms         |
| LinkedIn Ads                                                                     | 187,285    | 19,550 s     | 104 ms         |
| Esri ArcGIS                                                                      | 3,412      | 19,004 s     | 5570 ms        |
| [MGID](https://www.mgid.com/)                                                    | 9,908      | 18,983 s     | 1916 ms        |
| [Pinterest](https://pinterest.com/)                                              | 131,399    | 18,944 s     | 144 ms         |
| [Yotpo](https://www.yotpo.com/)                                                  | 27,061     | 17,045 s     | 630 ms         |
| [OneSignal](https://onesignal.com/)                                              | 66,991     | 16,995 s     | 254 ms         |
| [Sumo](https://sumo.com/)                                                        | 11,786     | 16,885 s     | 1433 ms        |
| [ID5 Identity Cloud](https://id5.io/)                                            | 65,666     | 15,838 s     | 241 ms         |
| [Tealium](https://tealium.com/)                                                  | 27,489     | 15,289 s     | 556 ms         |
| Fastly                                                                           | 9,099      | 15,278 s     | 1679 ms        |
| Heroku                                                                           | 14,127     | 15,176 s     | 1074 ms        |
| [Accessibe Accessibility Overlay](https://accessibe.com/)                        | 48,040     | 15,015 s     | 313 ms         |
| [SoundCloud](https://www.soundcloud.com/)                                        | 6,033      | 14,955 s     | 2479 ms        |
| Embedly                                                                          | 10,428     | 14,605 s     | 1401 ms        |
| Yahoo! Ad Exchange                                                               | 4,858      | 14,446 s     | 2974 ms        |
| [Brightcove](https://www.brightcove.com/en/)                                     | 13,124     | 14,337 s     | 1092 ms        |
| [Optimizely](https://www.optimizely.com/)                                        | 15,596     | 13,368 s     | 857 ms         |
| [Instagram](https://www.instagram.com)                                           | 10,222     | 12,875 s     | 1260 ms        |
| [CreateJS CDN](https://code.createjs.com/)                                       | 4,377      | 12,852 s     | 2936 ms        |
| Mapbox                                                                           | 19,297     | 12,804 s     | 663 ms         |
| [Integral Ad Science](https://integralads.com/uk/)                               | 15,169     | 12,543 s     | 827 ms         |
| Privy                                                                            | 19,432     | 12,293 s     | 633 ms         |
| [Lucky Orange](https://www.luckyorange.com/)                                     | 14,012     | 11,647 s     | 831 ms         |
| Hexton                                                                           | 32,051     | 11,298 s     | 352 ms         |
| [Quantcast](https://www.quantcast.com)                                           | 68,514     | 11,252 s     | 164 ms         |
| [PIXNET](https://www.pixnet.net/)                                                | 15,360     | 10,897 s     | 709 ms         |
| Trust Pilot                                                                      | 44,933     | 10,774 s     | 240 ms         |
| Infolinks                                                                        | 5,954      | 10,412 s     | 1749 ms        |
| [Segment](https://segment.com/)                                                  | 27,196     | 10,055 s     | 370 ms         |
| [Adroll](https://www.adroll.com/)                                                | 31,186     | 9,998 s      | 321 ms         |
| [Crazy Egg](https://www.crazyegg.com/)                                           | 20,553     | 9,970 s      | 485 ms         |
| Geniee                                                                           | 14,510     | 9,883 s      | 681 ms         |
| FullStory                                                                        | 13,438     | 9,730 s      | 724 ms         |
| [AddToAny](https://www.addtoany.com/)                                            | 66,597     | 9,718 s      | 146 ms         |
| Crowd Control                                                                    | 70,113     | 9,656 s      | 138 ms         |
| Cookie-Script.com                                                                | 41,414     | 9,397 s      | 227 ms         |
| [Sizmek](https://www.sizmek.com/)                                                | 5,738      | 9,060 s      | 1579 ms        |
| [Olark](https://www.olark.com/)                                                  | 6,739      | 8,896 s      | 1320 ms        |
| [Smartsupp](https://www.smartsupp.com)                                           | 21,642     | 8,700 s      | 402 ms         |
| [Snowplow](https://snowplowanalytics.com/)                                       | 59,526     | 8,251 s      | 139 ms         |
| Google reCAPTCHA                                                                 | 27,115     | 8,234 s      | 304 ms         |
| AudienceSearch                                                                   | 51,541     | 8,028 s      | 156 ms         |
| Inspectlet                                                                       | 5,338      | 7,841 s      | 1469 ms        |
| fluct                                                                            | 22,281     | 7,606 s      | 341 ms         |
| [Baidu Analytics](https://tongji.baidu.com/web/welcome/login)                    | 33,318     | 7,572 s      | 227 ms         |
| CallRail                                                                         | 28,866     | 7,122 s      | 247 ms         |
| Amplitude Mobile Analytics                                                       | 36,223     | 7,074 s      | 195 ms         |
| [Supership](https://supership.jp/)                                               | 18,113     | 6,861 s      | 379 ms         |
| [Bing Ads](https://bingads.microsoft.com)                                        | 45,421     | 6,651 s      | 146 ms         |
| [Twitch](https://twitch.tv/)                                                     | 1,450      | 6,551 s      | 4518 ms        |
| SocialShopWave                                                                   | 4,310      | 6,469 s      | 1501 ms        |
| [Google Optimize](https://marketingplatform.google.com/about/optimize/)          | 41,792     | 6,445 s      | 154 ms         |
| [RD Station](https://www.rdstation.com/en/)                                      | 21,042     | 6,440 s      | 306 ms         |
| [LiveRamp Privacy Manager](https://liveramp.com/privacy-legal-compliance/)       | 18,855     | 6,397 s      | 339 ms         |
| OptiMonk                                                                         | 10,492     | 6,365 s      | 607 ms         |
| Trusted Shops                                                                    | 17,034     | 6,281 s      | 369 ms         |
| Calendly                                                                         | 4,007      | 6,261 s      | 1563 ms        |
| [Nielsen NetRatings SiteCensus](http://www.nielsen-online.com/intlpage.html)     | 17,440     | 6,016 s      | 345 ms         |
| [DoubleVerify](https://www.doubleverify.com/)                                    | 4,740      | 5,550 s      | 1171 ms        |
| StatCounter                                                                      | 51,587     | 5,371 s      | 104 ms         |
| Twitter Online Conversion Tracking                                               | 68,128     | 5,356 s      | 79 ms          |
| Bugsnag                                                                          | 13,395     | 5,319 s      | 397 ms         |
| issuu                                                                            | 2,692      | 5,268 s      | 1957 ms        |
| [LinkedIn](https://www.linkedin.com/)                                            | 17,125     | 5,244 s      | 306 ms         |
| Bold Commerce                                                                    | 11,923     | 5,184 s      | 435 ms         |
| Conversant                                                                       | 46,153     | 5,168 s      | 112 ms         |
| [VWO](https://vwo.com)                                                           | 8,018      | 5,119 s      | 639 ms         |
| Heap                                                                             | 13,234     | 4,991 s      | 377 ms         |
| Ecwid                                                                            | 5,521      | 4,818 s      | 873 ms         |
| LongTail Ad Solutions                                                            | 6,143      | 4,766 s      | 776 ms         |
| Adyen                                                                            | 2,322      | 4,765 s      | 2052 ms        |
| [Pendo](https://www.pendo.io)                                                    | 13,333     | 4,757 s      | 357 ms         |
| [Attentive](https://attentivemobile.com/)                                        | 9,166      | 4,708 s      | 514 ms         |
| Microsoft Hosted Libs                                                            | 19,679     | 4,421 s      | 225 ms         |
| Technorati                                                                       | 22,378     | 4,311 s      | 193 ms         |
| uLogin                                                                           | 1,427      | 4,171 s      | 2923 ms        |
| VigLink                                                                          | 6,674      | 4,146 s      | 621 ms         |
| Forter                                                                           | 4,345      | 4,097 s      | 943 ms         |
| [Scorecard Research](https://www.scorecardresearch.com/)                         | 46,696     | 4,065 s      | 87 ms          |
| [Yandex Ads](https://yandex.com/adv/)                                            | 8,817      | 4,055 s      | 460 ms         |
| [Moat](https://moat.com/)                                                        | 3,861      | 4,011 s      | 1039 ms        |
| Index Exchange                                                                   | 33,560     | 3,974 s      | 118 ms         |
| reddit                                                                           | 16,277     | 3,875 s      | 238 ms         |
| Signyfyd                                                                         | 2,567      | 3,839 s      | 1495 ms        |
| [AppNexus](https://www.appnexus.com/)                                            | 177,948    | 3,835 s      | 22 ms          |
| Dynatrace                                                                        | 3,420      | 3,835 s      | 1121 ms        |
| [Seedtag](https://www.seedtag.com/)                                              | 2,513      | 3,783 s      | 1505 ms        |
| [Hotmart](https://www.hotmart.com/)                                              | 4,014      | 3,718 s      | 926 ms         |
| [WordPress Site Stats](https://wp.com/)                                          | 64,925     | 3,615 s      | 56 ms          |
| Dynamic Yield                                                                    | 1,860      | 3,614 s      | 1943 ms        |
| LINE Corporation                                                                 | 24,991     | 3,437 s      | 138 ms         |
| LoyaltyLion                                                                      | 4,213      | 3,434 s      | 815 ms         |
| [AdScore](https://www.adscore.com/)                                              | 4,378      | 3,374 s      | 771 ms         |
| [Mixpanel](https://mixpanel.com/)                                                | 20,441     | 3,329 s      | 163 ms         |
| Affirm                                                                           | 6,594      | 3,294 s      | 500 ms         |
| IPONWEB                                                                          | 19,682     | 3,236 s      | 164 ms         |
| ContentSquare                                                                    | 3,541      | 3,229 s      | 912 ms         |
| [mPulse](https://developer.akamai.com/akamai-mpulse)                             | 32,660     | 3,196 s      | 98 ms          |
| GumGum                                                                           | 123,913    | 3,128 s      | 25 ms          |
| [AppDynamics](https://www.appdynamics.com/)                                      | 3,419      | 3,100 s      | 907 ms         |
| [Disqus](https://disqus.com/)                                                    | 1,135      | 3,092 s      | 2724 ms        |
| GitHub                                                                           | 6,970      | 3,026 s      | 434 ms         |
| Intercept Interactive                                                            | 18,824     | 3,004 s      | 160 ms         |
| [Akamai](https://www.akamai.com/)                                                | 9,228      | 2,740 s      | 297 ms         |
| Sonobi                                                                           | 54,964     | 2,739 s      | 50 ms          |
| [Luigis Box](https://www.luigisbox.com/)                                         | 2,210      | 2,690 s      | 1217 ms        |
| [fam](http://admin.fam-ad.com/report/)                                           | 747        | 2,660 s      | 3561 ms        |
| WisePops                                                                         | 2,044      | 2,536 s      | 1241 ms        |
| Gigya                                                                            | 2,032      | 2,525 s      | 1243 ms        |
| LightWidget                                                                      | 11,137     | 2,513 s      | 226 ms         |
| Secomapp                                                                         | 2,220      | 2,446 s      | 1102 ms        |
| [33 Across](https://33across.com/)                                               | 143,025    | 2,443 s      | 17 ms          |
| SnapWidget                                                                       | 13,527     | 2,415 s      | 179 ms         |
| [Outbrain](https://www.outbrain.com/)                                            | 11,439     | 2,405 s      | 210 ms         |
| [Matomo](https://matomo.org/)                                                    | 12,297     | 2,396 s      | 195 ms         |
| Rackspace                                                                        | 1,880      | 2,377 s      | 1264 ms        |
| Gemius                                                                           | 15,825     | 2,360 s      | 149 ms         |

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
