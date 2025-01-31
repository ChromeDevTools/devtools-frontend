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
| 1    | [Bidswitch](https://www.bidswitch.com/)                                          | 68,217    | 0 ms           |
| 2    | Beeswax                                                                          | 12,735    | 0 ms           |
| 3    | AdGear                                                                           | 42,920    | 0 ms           |
| 4    | Tribal Fusion                                                                    | 158,016   | 1 ms           |
| 5    | Nativo                                                                           | 35,852    | 1 ms           |
| 6    | Crimtan                                                                          | 74,818    | 1 ms           |
| 7    | MaxPoint Interactive                                                             | 23,834    | 1 ms           |
| 8    | [iPROM](https://iprom.eu/)                                                       | 72,099    | 2 ms           |
| 9    | TripleLift                                                                       | 4,812     | 2 ms           |
| 10   | adKernel                                                                         | 9,621     | 2 ms           |
| 11   | Adyoulike                                                                        | 53,190    | 3 ms           |
| 12   | Adform                                                                           | 140,125   | 13 ms          |
| 13   | GumGum                                                                           | 167,535   | 21 ms          |
| 14   | [AppNexus](https://www.appnexus.com/)                                            | 234,133   | 25 ms          |
| 15   | Index Exchange                                                                   | 32,324    | 28 ms          |
| 16   | Constant Contact                                                                 | 17,528    | 35 ms          |
| 17   | [33 Across](https://33across.com/)                                               | 192,648   | 52 ms          |
| 18   | Branch Metrics                                                                   | 8,288     | 53 ms          |
| 19   | Sonobi                                                                           | 81,682    | 57 ms          |
| 20   | Simpli.fi                                                                        | 16,378    | 59 ms          |
| 21   | MailMunch                                                                        | 19,969    | 71 ms          |
| 22   | SiteScout                                                                        | 3,401     | 75 ms          |
| 23   | DTSCOUT                                                                          | 8,311     | 78 ms          |
| 24   | [Scorecard Research](https://www.scorecardresearch.com/)                         | 54,577    | 81 ms          |
| 25   | [OpenX](https://www.openx.com/)                                                  | 76,561    | 82 ms          |
| 26   | [Basis](https://basis.net/)                                                      | 2,623     | 82 ms          |
| 27   | Twitter Online Conversion Tracking                                               | 73,452    | 84 ms          |
| 28   | ActiveCampaign                                                                   | 19,100    | 84 ms          |
| 29   | [The Trade Desk](https://www.thetradedesk.com/)                                  | 25,346    | 87 ms          |
| 30   | sovrn                                                                            | 27,306    | 87 ms          |
| 31   | StackAdapt                                                                       | 14,912    | 90 ms          |
| 32   | BlueCava                                                                         | 5,165     | 90 ms          |
| 33   | Affiliate Window                                                                 | 5,414     | 104 ms         |
| 34   | [Yahoo!](https://www.yahoo.com/)                                                 | 24,800    | 106 ms         |
| 35   | Intercept Interactive                                                            | 21,012    | 109 ms         |
| 36   | Rocket Fuel                                                                      | 3,247     | 110 ms         |
| 37   | LinkedIn Ads                                                                     | 199,088   | 115 ms         |
| 38   | [Criteo](https://www.criteo.com/)                                                | 213,880   | 120 ms         |
| 39   | [Bing Ads](https://bingads.microsoft.com)                                        | 117,720   | 121 ms         |
| 40   | [Quora Ads](https://www.quora.com/business/)                                     | 10,614    | 126 ms         |
| 41   | RTB House AdPilot                                                                | 13,287    | 126 ms         |
| 42   | STINGRAY                                                                         | 9,742     | 130 ms         |
| 43   | TVSquared                                                                        | 4,082     | 134 ms         |
| 44   | Rakuten Marketing                                                                | 3,399     | 136 ms         |
| 45   | Impact Radius                                                                    | 4,274     | 143 ms         |
| 46   | LINE Corporation                                                                 | 26,881    | 144 ms         |
| 47   | Crowd Control                                                                    | 101,196   | 161 ms         |
| 48   | [Yahoo! JAPAN Ads](https://marketing.yahoo.co.jp/service/yahooads/)              | 37,464    | 166 ms         |
| 49   | LoopMe                                                                           | 11,752    | 180 ms         |
| 50   | ucfunnel ucX                                                                     | 7,945     | 185 ms         |
| 51   | Gemius                                                                           | 15,596    | 190 ms         |
| 52   | AudienceSearch                                                                   | 46,726    | 195 ms         |
| 53   | InMobi                                                                           | 126,087   | 195 ms         |
| 54   | Tynt                                                                             | 212,415   | 196 ms         |
| 55   | Simplicity Marketing                                                             | 2,927     | 198 ms         |
| 56   | Technorati                                                                       | 27,186    | 198 ms         |
| 57   | Smart AdServer                                                                   | 107,812   | 207 ms         |
| 58   | [ID5 Identity Cloud](https://id5.io/)                                            | 119,336   | 219 ms         |
| 59   | i-mobile                                                                         | 16,595    | 223 ms         |
| 60   | IPONWEB                                                                          | 39,154    | 228 ms         |
| 61   | [Outbrain](https://www.outbrain.com/)                                            | 13,287    | 254 ms         |
| 62   | [Media.net](https://www.media.net/)                                              | 97,679    | 256 ms         |
| 63   | Auto Link Maker                                                                  | 2,479     | 265 ms         |
| 64   | AdRiver                                                                          | 4,740     | 290 ms         |
| 65   | [LiveRamp Privacy Manager](https://liveramp.com/privacy-legal-compliance/)       | 22,295    | 294 ms         |
| 66   | Teads                                                                            | 7,565     | 303 ms         |
| 67   | Salesforce.com                                                                   | 4,970     | 325 ms         |
| 68   | Unbounce                                                                         | 8,808     | 330 ms         |
| 69   | Skimbit                                                                          | 86,270    | 382 ms         |
| 70   | [Adroll](https://www.adroll.com/)                                                | 30,782    | 386 ms         |
| 71   | fluct                                                                            | 12,890    | 397 ms         |
| 72   | [Amazon Ads](https://ad.amazon.com/)                                             | 240,331   | 411 ms         |
| 73   | TrafficStars                                                                     | 7,430     | 462 ms         |
| 74   | Onfocus                                                                          | 8,836     | 480 ms         |
| 75   | VigLink                                                                          | 6,219     | 590 ms         |
| 76   | Cxense                                                                           | 3,708     | 598 ms         |
| 77   | [Supership](https://supership.jp/)                                               | 17,934    | 603 ms         |
| 78   | [Yandex Ads](https://yandex.com/adv/)                                            | 8,488     | 609 ms         |
| 79   | [Attentive](https://attentivemobile.com/)                                        | 9,099     | 610 ms         |
| 80   | Microad                                                                          | 23,909    | 612 ms         |
| 81   | [AdScore](https://www.adscore.com/)                                              | 4,394     | 640 ms         |
| 82   | [Taboola](https://www.taboola.com/)                                              | 49,191    | 663 ms         |
| 83   | Klaviyo                                                                          | 161,289   | 701 ms         |
| 84   | LoyaltyLion                                                                      | 4,114     | 722 ms         |
| 85   | [WordAds](https://wordads.co/)                                                   | 100,449   | 740 ms         |
| 86   | Privy                                                                            | 18,961    | 791 ms         |
| 87   | LongTail Ad Solutions                                                            | 5,572     | 813 ms         |
| 88   | OptiMonk                                                                         | 10,615    | 972 ms         |
| 89   | Geniee                                                                           | 16,354    | 1037 ms        |
| 90   | [Rubicon Project](https://rubiconproject.com/)                                   | 270,271   | 1062 ms        |
| 91   | Infolinks                                                                        | 5,950     | 1344 ms        |
| 92   | [Pubmatic](https://pubmatic.com/)                                                | 279,418   | 1495 ms        |
| 93   | [Sizmek](https://www.sizmek.com/)                                                | 4,307     | 1551 ms        |
| 94   | [Ad Lightning](https://www.adlightning.com/)                                     | 3,795     | 1813 ms        |
| 95   | [MGID](https://www.mgid.com/)                                                    | 10,437    | 2115 ms        |
| 96   | [DoubleVerify](https://www.doubleverify.com/)                                    | 19,453    | 2410 ms        |
| 97   | Yahoo! Ad Exchange                                                               | 4,994     | 2547 ms        |
| 98   | [Google/Doubleclick Ads](https://marketingplatform.google.com/about/enterprise/) | 1,232,210 | 2617 ms        |
| 99   | [Integral Ad Science](https://integralads.com/uk/)                               | 21,660    | 4088 ms        |
| 100  | [Mediavine](https://www.mediavine.com/)                                          | 12,963    | 4552 ms        |

<a name="analytics"></a>

#### Analytics

These scripts measure or track users and their actions. There's a wide range in impact here depending on what's being tracked.

| Rank | Name                                                                          | Usage     | Average Impact |
| ---- | ----------------------------------------------------------------------------- | --------- | -------------- |
| 1    | [Mouseflow](https://mouseflow.com/)                                           | 6,786     | 49 ms          |
| 2    | [Pingdom RUM](https://www.pingdom.com/product/performance-monitoring/)        | 1,825     | 58 ms          |
| 3    | [SpeedCurve RUM](https://www.speedcurve.com/features/performance-monitoring/) | 5,358     | 60 ms          |
| 4    | Roxr Software                                                                 | 12,877    | 66 ms          |
| 5    | [WordPress Site Stats](https://wp.com/)                                       | 128,931   | 66 ms          |
| 6    | [Smartlook](https://www.smartlook.com/)                                       | 16,221    | 85 ms          |
| 7    | Woopra                                                                        | 1,366     | 88 ms          |
| 8    | Movable Ink                                                                   | 4,949     | 89 ms          |
| 9    | [Snapchat](https://www.snapchat.com)                                          | 1,978     | 90 ms          |
| 10   | [LiveRamp IdentityLink](https://liveramp.com/discover-identitylink/)          | 1,461     | 97 ms          |
| 11   | Treasure Data                                                                 | 14,403    | 98 ms          |
| 12   | [mPulse](https://developer.akamai.com/akamai-mpulse)                          | 30,624    | 101 ms         |
| 13   | StatCounter                                                                   | 50,769    | 107 ms         |
| 14   | [XiTi](https://www.atinternet.com/en/)                                        | 8,483     | 108 ms         |
| 15   | Polldaddy                                                                     | 2,715     | 108 ms         |
| 16   | [Google Analytics](https://marketingplatform.google.com/about/analytics/)     | 4,231,882 | 117 ms         |
| 17   | Exponea                                                                       | 1,303     | 119 ms         |
| 18   | Conversant                                                                    | 54,802    | 119 ms         |
| 19   | [Brandmetrics](https://www.brandmetrics.com)                                  | 30,850    | 120 ms         |
| 20   | [Snowplow](https://snowplowanalytics.com/)                                    | 58,566    | 121 ms         |
| 21   | [Fastly Insights](https://insights.fastlylabs.com)                            | 4,449     | 122 ms         |
| 22   | Site24x7 Real User Monitoring                                                 | 1,007     | 123 ms         |
| 23   | CleverTap                                                                     | 1,321     | 124 ms         |
| 24   | [Fathom Analytics](https://usefathom.com/)                                    | 1,141     | 127 ms         |
| 25   | Stamped.io                                                                    | 12,460    | 134 ms         |
| 26   | [Quantcast](https://www.quantcast.com)                                        | 77,646    | 160 ms         |
| 27   | [Mixpanel](https://mixpanel.com/)                                             | 18,817    | 173 ms         |
| 28   | [Usabilla](https://usabilla.com)                                              | 1,354     | 177 ms         |
| 29   | Marchex                                                                       | 7,390     | 186 ms         |
| 30   | Amplitude Mobile Analytics                                                    | 46,524    | 187 ms         |
| 31   | [Braze](https://www.braze.com)                                                | 2,014     | 198 ms         |
| 32   | Smart Insight Tracking                                                        | 1,779     | 203 ms         |
| 33   | Chartbeat                                                                     | 6,246     | 203 ms         |
| 34   | Parse.ly                                                                      | 5,204     | 216 ms         |
| 35   | [Matomo](https://matomo.org/)                                                 | 14,345    | 217 ms         |
| 36   | Reviews.co.uk                                                                 | 1,883     | 226 ms         |
| 37   | [Clearbit](https://clearbit.com/)                                             | 4,171     | 232 ms         |
| 38   | [Baidu Analytics](https://tongji.baidu.com/web/welcome/login)                 | 32,612    | 237 ms         |
| 39   | [Google Optimize](https://marketingplatform.google.com/about/optimize/)       | 38,797    | 240 ms         |
| 40   | [Radar](https://www.cedexis.com/radar/)                                       | 1,133     | 257 ms         |
| 41   | CallTrackingMetrics                                                           | 7,503     | 264 ms         |
| 42   | Trust Pilot                                                                   | 54,942    | 269 ms         |
| 43   | CallRail                                                                      | 29,537    | 274 ms         |
| 44   | UpSellit                                                                      | 1,013     | 286 ms         |
| 45   | Survicate                                                                     | 3,008     | 310 ms         |
| 46   | [PageSense](https://www.zoho.com/pagesense/)                                  | 6,219     | 321 ms         |
| 47   | [Nielsen NetRatings SiteCensus](http://www.nielsen-online.com/intlpage.html)  | 19,525    | 350 ms         |
| 48   | etracker                                                                      | 5,626     | 369 ms         |
| 49   | Reviews.io                                                                    | 4,516     | 380 ms         |
| 50   | [Marketo](https://www.marketo.com)                                            | 1,798     | 403 ms         |
| 51   | [Pendo](https://www.pendo.io)                                                 | 12,203    | 404 ms         |
| 52   | [Segment](https://segment.com/)                                               | 27,036    | 409 ms         |
| 53   | Okta                                                                          | 3,542     | 414 ms         |
| 54   | Heap                                                                          | 12,078    | 430 ms         |
| 55   | Evergage                                                                      | 2,491     | 440 ms         |
| 56   | Net Reviews                                                                   | 2,442     | 468 ms         |
| 57   | TruConversion                                                                 | 1,008     | 484 ms         |
| 58   | Bazaarvoice                                                                   | 3,375     | 493 ms         |
| 59   | Evidon                                                                        | 2,482     | 508 ms         |
| 60   | [AB Tasty](https://www.abtasty.com/)                                          | 3,363     | 512 ms         |
| 61   | [BowNow](https://bow-now.jp/)                                                 | 2,410     | 539 ms         |
| 62   | Convert Insights                                                              | 4,385     | 587 ms         |
| 63   | Nosto                                                                         | 1,189     | 592 ms         |
| 64   | Clerk.io ApS                                                                  | 1,915     | 625 ms         |
| 65   | [Crazy Egg](https://www.crazyegg.com/)                                        | 43,822    | 630 ms         |
| 66   | Feefo.com                                                                     | 2,025     | 673 ms         |
| 67   | Qualtrics                                                                     | 7,134     | 688 ms         |
| 68   | [Hotjar](https://www.hotjar.com/)                                             | 333,356   | 724 ms         |
| 69   | [Appcues](https://www.appcues.com/)                                           | 2,831     | 761 ms         |
| 70   | [Lucky Orange](https://www.luckyorange.com/)                                  | 16,442    | 777 ms         |
| 71   | [Optimizely](https://www.optimizely.com/)                                     | 15,998    | 788 ms         |
| 72   | FullStory                                                                     | 14,687    | 788 ms         |
| 73   | [VWO](https://vwo.com)                                                        | 7,903     | 821 ms         |
| 74   | PowerReviews                                                                  | 1,324     | 913 ms         |
| 75   | Revolver Maps                                                                 | 2,305     | 925 ms         |
| 76   | TrackJS                                                                       | 2,268     | 931 ms         |
| 77   | [Kameleoon](https://www.kameleoon.com/)                                       | 2,337     | 949 ms         |
| 78   | Insider                                                                       | 1,861     | 1190 ms        |
| 79   | ContentSquare                                                                 | 2,948     | 1230 ms        |
| 80   | Dynatrace                                                                     | 3,221     | 1275 ms        |
| 81   | Gigya                                                                         | 1,995     | 1350 ms        |
| 82   | Inspectlet                                                                    | 5,346     | 1426 ms        |
| 83   | [Quantum Metric](https://www.quantummetric.com/)                              | 1,140     | 1491 ms        |
| 84   | [Yandex Metrica](https://metrica.yandex.com/about?)                           | 602,136   | 2389 ms        |

<a name="social"></a>

#### Social

These scripts enable social features.

| Rank | Name                                        | Usage     | Average Impact |
| ---- | ------------------------------------------- | --------- | -------------- |
| 1    | [Shareaholic](https://www.shareaholic.com/) | 1,429     | 86 ms          |
| 2    | [Pinterest](https://pinterest.com/)         | 131,448   | 134 ms         |
| 3    | [AddToAny](https://www.addtoany.com/)       | 66,065    | 161 ms         |
| 4    | reddit                                      | 18,483    | 223 ms         |
| 5    | [ShareThis](https://www.sharethis.com/)     | 88,829    | 347 ms         |
| 6    | [Facebook](https://www.facebook.com)        | 3,157,799 | 347 ms         |
| 7    | [LinkedIn](https://www.linkedin.com/)       | 16,507    | 350 ms         |
| 8    | [TikTok](https://www.tiktok.com/en/)        | 256,224   | 434 ms         |
| 9    | Kakao                                       | 62,730    | 611 ms         |
| 10   | SocialShopWave                              | 3,720     | 1334 ms        |
| 11   | [PIXNET](https://www.pixnet.net/)           | 13,718    | 1352 ms        |
| 12   | [Instagram](https://www.instagram.com)      | 20,376    | 1570 ms        |
| 13   | [Disqus](https://disqus.com/)               | 1,775     | 2083 ms        |
| 14   | [Twitter](https://twitter.com)              | 319,957   | 2514 ms        |
| 15   | [Tumblr](https://tumblr.com/)               | 18,114    | 2516 ms        |
| 16   | [VK](https://vk.com/)                       | 22,377    | 4082 ms        |
| 17   | LiveJournal                                 | 9,109     | 6975 ms        |

<a name="video"></a>

#### Video

These scripts enable video player and streaming functionality.

| Rank | Name                                         | Usage   | Average Impact |
| ---- | -------------------------------------------- | ------- | -------------- |
| 1    | [Brightcove](https://www.brightcove.com/en/) | 13,745  | 1099 ms        |
| 2    | [Vimeo](https://vimeo.com/)                  | 120,397 | 2192 ms        |
| 3    | [Wistia](https://wistia.com/)                | 27,059  | 4277 ms        |
| 4    | [YouTube](https://youtube.com)               | 977,311 | 6423 ms        |
| 5    | [Twitch](https://twitch.tv/)                 | 1,255   | 14703 ms       |

<a name="utility"></a>

#### Developer Utilities

These scripts are developer utilities (API clients, site monitoring, fraud detection, etc).

| Rank | Name                                                                      | Usage     | Average Impact |
| ---- | ------------------------------------------------------------------------- | --------- | -------------- |
| 1    | [Statuspage](https://www.statuspage.io)                                   | 1,212     | 36 ms          |
| 2    | Webmarked                                                                 | 1,077     | 67 ms          |
| 3    | Rollbar                                                                   | 2,349     | 81 ms          |
| 4    | [Pusher](https://pusher.com/)                                             | 1,698     | 90 ms          |
| 5    | Raygun                                                                    | 2,539     | 97 ms          |
| 6    | iovation                                                                  | 2,159     | 125 ms         |
| 7    | [Cloudflare](https://www.cloudflare.com/website-optimization/)            | 467,719   | 126 ms         |
| 8    | CyberSource (Visa)                                                        | 2,682     | 126 ms         |
| 9    | Klarna                                                                    | 10,759    | 128 ms         |
| 10   | [Ipify](https://www.ipify.org)                                            | 2,753     | 133 ms         |
| 11   | [Checkout.com](https://www.checkout.com)                                  | 1,367     | 135 ms         |
| 12   | [Doofinder](https://www.doofinder.com/)                                   | 12,550    | 140 ms         |
| 13   | Macropod BugHerd                                                          | 3,523     | 145 ms         |
| 14   | Braintree Payments                                                        | 1,141     | 150 ms         |
| 15   | [Afterpay](https://www.afterpay.com/)                                     | 8,269     | 154 ms         |
| 16   | [Amazon Pay](https://pay.amazon.com)                                      | 6,833     | 181 ms         |
| 17   | Seznam                                                                    | 6,863     | 193 ms         |
| 18   | LightWidget                                                               | 9,383     | 195 ms         |
| 19   | [Netlify](https://www.netlify.com/)                                       | 1,323     | 226 ms         |
| 20   | Riskified                                                                 | 1,643     | 228 ms         |
| 21   | Highcharts                                                                | 3,181     | 235 ms         |
| 22   | Wufoo                                                                     | 1,507     | 253 ms         |
| 23   | Cookie-Script.com                                                         | 58,095    | 259 ms         |
| 24   | [OneSignal](https://onesignal.com/)                                       | 68,282    | 260 ms         |
| 25   | [New Relic](https://newrelic.com/)                                        | 227,672   | 284 ms         |
| 26   | [Foxentry](https://foxentry.cz/)                                          | 2,313     | 328 ms         |
| 27   | Google reCAPTCHA                                                          | 25,662    | 339 ms         |
| 28   | [Cookiebot](https://www.cookiebot.com/)                                   | 187,732   | 346 ms         |
| 29   | [mParticle](https://www.mparticle.com/)                                   | 1,029     | 392 ms         |
| 30   | [TrustArc](https://www.trustarc.com/)                                     | 5,941     | 409 ms         |
| 31   | Bugsnag                                                                   | 15,069    | 411 ms         |
| 32   | Trusted Shops                                                             | 17,267    | 427 ms         |
| 33   | Hexton                                                                    | 24,738    | 437 ms         |
| 34   | [Other Google APIs/SDKs](https://developers.google.com/apis-explorer/#p/) | 2,638,940 | 439 ms         |
| 35   | [Clarity](https://clarity.microsoft.com/)                                 | 456,309   | 458 ms         |
| 36   | Key CDN                                                                   | 10,025    | 480 ms         |
| 37   | GitHub                                                                    | 14,675    | 486 ms         |
| 38   | Bold Commerce                                                             | 9,886     | 513 ms         |
| 39   | ThreatMetrix                                                              | 3,530     | 539 ms         |
| 40   | GetSiteControl                                                            | 3,146     | 553 ms         |
| 41   | [Sentry](https://sentry.io/)                                              | 85,598    | 560 ms         |
| 42   | Affirm                                                                    | 6,665     | 600 ms         |
| 43   | Mapbox                                                                    | 19,555    | 707 ms         |
| 44   | iubenda                                                                   | 97,074    | 720 ms         |
| 45   | [Google Maps](https://www.google.com/maps)                                | 1,195,850 | 756 ms         |
| 46   | Klevu Search                                                              | 1,463     | 769 ms         |
| 47   | [Yandex APIs](https://yandex.ru/)                                         | 51,601    | 790 ms         |
| 48   | [GoDaddy](https://www.godaddy.com/)                                       | 110,342   | 858 ms         |
| 49   | [AppDynamics](https://www.appdynamics.com/)                               | 2,920     | 859 ms         |
| 50   | Forter                                                                    | 6,930     | 949 ms         |
| 51   | Secomapp                                                                  | 2,137     | 1007 ms        |
| 52   | [PayPal](https://paypal.com)                                              | 62,800    | 1026 ms        |
| 53   | [Vidyard](https://www.vidyard.com/)                                       | 1,097     | 1063 ms        |
| 54   | [Stripe](https://stripe.com)                                              | 136,440   | 1219 ms        |
| 55   | [Luigis Box](https://www.luigisbox.com/)                                  | 2,356     | 1263 ms        |
| 56   | WisePops                                                                  | 1,950     | 1349 ms        |
| 57   | Marker                                                                    | 1,722     | 1354 ms        |
| 58   | Signyfyd                                                                  | 2,608     | 1822 ms        |
| 59   | Fastly                                                                    | 9,582     | 2229 ms        |
| 60   | Adyen                                                                     | 2,363     | 2681 ms        |
| 61   | Datacamp                                                                  | 1,181     | 2797 ms        |
| 62   | Rambler                                                                   | 15,831    | 3444 ms        |
| 63   | [POWr](https://www.powr.io)                                               | 39,716    | 4823 ms        |
| 64   | Esri ArcGIS                                                               | 3,432     | 6401 ms        |

<a name="hosting"></a>

#### Hosting Platforms

These scripts are from web hosting platforms (WordPress, Wix, Squarespace, etc). Note that in this category, this can sometimes be the entirety of script on the page, and so the "impact" rank might be misleading. In the case of WordPress, this just indicates the libraries hosted and served _by_ WordPress not all sites using self-hosted WordPress.

| Rank | Name                                                                                      | Usage   | Average Impact |
| ---- | ----------------------------------------------------------------------------------------- | ------- | -------------- |
| 1    | [Blogger](https://www.blogger.com/)                                                       | 213,326 | 274 ms         |
| 2    | [Dealer](https://www.dealer.com/)                                                         | 2,620   | 333 ms         |
| 3    | Civic                                                                                     | 7,253   | 388 ms         |
| 4    | [Salesforce Commerce Cloud](https://www.salesforce.com/products/commerce-cloud/overview/) | 4,127   | 496 ms         |
| 5    | Global-e                                                                                  | 1,314   | 537 ms         |
| 6    | [WordPress](https://wp.com/)                                                              | 308,694 | 716 ms         |
| 7    | [Shopify](https://www.shopify.com/)                                                       | 338,668 | 849 ms         |
| 8    | Ecwid                                                                                     | 4,362   | 861 ms         |
| 9    | [Tilda](https://tilda.cc/)                                                                | 70,321  | 1347 ms        |
| 10   | Rackspace                                                                                 | 2,624   | 1362 ms        |
| 11   | [Hatena Blog](https://hatenablog.com/)                                                    | 43,183  | 2462 ms        |
| 12   | [WebsiteBuilder.com](https://www.websitebuilder.com)                                      | 4,688   | 4174 ms        |
| 13   | [Squarespace](https://www.squarespace.com/)                                               | 243,154 | 4551 ms        |
| 14   | [Wix](https://www.wix.com/)                                                               | 458,273 | 4609 ms        |
| 15   | [Weebly](https://www.weebly.com/)                                                         | 67,864  | 6086 ms        |

<a name="marketing"></a>

#### Marketing

These scripts are from marketing tools that add popups/newsletters/etc.

| Rank | Name                                        | Usage   | Average Impact |
| ---- | ------------------------------------------- | ------- | -------------- |
| 1    | Kargo                                       | 1,135   | 43 ms          |
| 2    | [Podsights](https://podsights.com/)         | 1,140   | 63 ms          |
| 3    | [Albacross](https://albacross.com/)         | 1,503   | 67 ms          |
| 4    | [Convertful](https://convertful.com/)       | 1,534   | 140 ms         |
| 5    | DemandBase                                  | 2,552   | 154 ms         |
| 6    | SharpSpring                                 | 2,080   | 304 ms         |
| 7    | [Hello Bar](https://www.hellobar.com/)      | 4,502   | 341 ms         |
| 8    | [RD Station](https://www.rdstation.com/en/) | 21,846  | 352 ms         |
| 9    | [Listrak](https://www.listrak.com/)         | 1,045   | 439 ms         |
| 10   | [OptinMonster](https://optinmonster.com/)   | 2,346   | 442 ms         |
| 11   | Wishpond Technologies                       | 1,691   | 456 ms         |
| 12   | Sojern                                      | 4,422   | 472 ms         |
| 13   | [Mailchimp](https://mailchimp.com/)         | 45,506  | 474 ms         |
| 14   | [iZooto](https://www.izooto.com)            | 2,022   | 550 ms         |
| 15   | [Hubspot](https://hubspot.com/)             | 154,415 | 597 ms         |
| 16   | [Yotpo](https://www.yotpo.com/)             | 26,094  | 648 ms         |
| 17   | [PureCars](https://www.purecars.com/)       | 1,292   | 750 ms         |
| 18   | [KARTE](https://karte.io/)                  | 1,729   | 990 ms         |
| 19   | [Beeketing](https://beeketing.com/)         | 1,971   | 1097 ms        |
| 20   | [Judge.me](https://judge.me/)               | 27,483  | 1160 ms        |
| 21   | [Sumo](https://sumo.com/)                   | 10,901  | 1513 ms        |
| 22   | [Wunderkind](https://www.wunderkind.co/)    | 1,278   | 1578 ms        |
| 23   | Bigcommerce                                 | 19,595  | 2335 ms        |
| 24   | [Tray Commerce](https://www.tray.com.br/)   | 14,071  | 4858 ms        |
| 25   | [Drift](https://www.drift.com/)             | 5,515   | 5472 ms        |

<a name="customer-success"></a>

#### Customer Success

These scripts are from customer support/marketing providers that offer chat and contact solutions. These scripts are generally heavier in weight.

| Rank | Name                                                        | Usage   | Average Impact |
| ---- | ----------------------------------------------------------- | ------- | -------------- |
| 1    | [Crisp](https://crisp.chat/)                                | 1,052   | 32 ms          |
| 2    | iPerceptions                                                | 4,662   | 134 ms         |
| 3    | SnapEngage                                                  | 1,038   | 142 ms         |
| 4    | LiveTex                                                     | 1,911   | 250 ms         |
| 5    | WebEngage                                                   | 2,283   | 346 ms         |
| 6    | Pure Chat                                                   | 3,105   | 364 ms         |
| 7    | [Tawk.to](https://www.tawk.to/)                             | 111,088 | 388 ms         |
| 8    | [Help Scout](https://www.helpscout.net/)                    | 4,906   | 446 ms         |
| 9    | Comm100                                                     | 1,045   | 449 ms         |
| 10   | [Smartsupp](https://www.smartsupp.com)                      | 21,505  | 465 ms         |
| 11   | [Jivochat](https://www.jivochat.com/)                       | 57,540  | 637 ms         |
| 12   | [LivePerson](https://www.liveperson.com/)                   | 2,544   | 759 ms         |
| 13   | [Tidio Live Chat](https://www.tidiochat.com/en/)            | 24,598  | 1081 ms        |
| 14   | [LiveChat](https://www.livechat.com/)                       | 39,034  | 1260 ms        |
| 15   | [Intercom](https://www.intercom.com)                        | 35,197  | 1267 ms        |
| 16   | [ZenDesk](https://zendesk.com/)                             | 72,537  | 1471 ms        |
| 17   | [Olark](https://www.olark.com/)                             | 6,534   | 1506 ms        |
| 18   | Dynamic Yield                                               | 1,843   | 1943 ms        |
| 19   | [Freshchat](https://www.freshworks.com/live-chat-software/) | 7,081   | 3298 ms        |

<a name="content"></a>

#### Content & Publishing

These scripts are from content providers or publishing-specific affiliate tracking.

| Rank | Name                                      | Usage  | Average Impact |
| ---- | ----------------------------------------- | ------ | -------------- |
| 1    | [Spotify](https://www.spotify.com/)       | 10,992 | 9 ms           |
| 2    | OpenTable                                 | 4,314  | 96 ms          |
| 3    | Accuweather                               | 1,477  | 198 ms         |
| 4    | Tencent                                   | 8,726  | 260 ms         |
| 5    | TripAdvisor                               | 2,354  | 318 ms         |
| 6    | Embedly                                   | 10,836 | 463 ms         |
| 7    | Cloudinary                                | 2,129  | 558 ms         |
| 8    | Booking.com                               | 2,448  | 675 ms         |
| 9    | CPEx                                      | 1,104  | 691 ms         |
| 10   | Revcontent                                | 1,251  | 922 ms         |
| 11   | [AMP](https://amp.dev/)                   | 66,265 | 1201 ms        |
| 12   | issuu                                     | 2,714  | 2066 ms        |
| 13   | Kaltura Video Platform                    | 1,017  | 2128 ms        |
| 14   | [SoundCloud](https://www.soundcloud.com/) | 5,859  | 2712 ms        |
| 15   | [Hotmart](https://www.hotmart.com/)       | 4,554  | 3374 ms        |
| 16   | Dailymotion                               | 5,142  | 10905 ms       |
| 17   | Medium                                    | 17,027 | 12740 ms       |

<a name="cdn"></a>

#### CDNs

These are a mixture of publicly hosted open source libraries (e.g. jQuery) served over different public CDNs and private CDN usage. This category is unique in that the origin may have no responsibility for the performance of what's being served. Note that rank here does not imply one CDN is better than the other. It simply indicates that the scripts being served from that origin are lighter/heavier than the ones served by another.

| Rank | Name                                                         | Usage     | Average Impact |
| ---- | ------------------------------------------------------------ | --------- | -------------- |
| 1    | [Google Fonts](https://fonts.google.com/)                    | 220,864   | 0 ms           |
| 2    | [Bootstrap CDN](https://www.bootstrapcdn.com/)               | 38,731    | 54 ms          |
| 3    | Fort Awesome                                                 | 3,635     | 179 ms         |
| 4    | Microsoft Hosted Libs                                        | 20,042    | 228 ms         |
| 5    | Monotype                                                     | 3,185     | 229 ms         |
| 6    | [FontAwesome CDN](https://fontawesome.com/)                  | 291,586   | 250 ms         |
| 7    | [jQuery CDN](https://code.jquery.com/)                       | 724,477   | 417 ms         |
| 8    | [Akamai](https://www.akamai.com/)                            | 9,820     | 488 ms         |
| 9    | [Cloudflare CDN](https://cdnjs.com/)                         | 666,628   | 507 ms         |
| 10   | [JSDelivr CDN](https://www.jsdelivr.com/)                    | 399,959   | 651 ms         |
| 11   | [Adobe TypeKit](https://fonts.adobe.com/)                    | 119,621   | 660 ms         |
| 12   | Azure Web Services                                           | 51,378    | 694 ms         |
| 13   | [Google CDN](https://developers.google.com/speed/libraries/) | 3,192,326 | 1505 ms        |
| 14   | [CreateJS CDN](https://code.createjs.com/)                   | 3,880     | 3519 ms        |

<a name="tag-manager"></a>

#### Tag Management

These scripts tend to load lots of other scripts and initiate many tasks.

| Rank | Name                                                                          | Usage     | Average Impact |
| ---- | ----------------------------------------------------------------------------- | --------- | -------------- |
| 1    | [Adobe Tag Manager](https://www.adobe.com/experience-platform/)               | 200,160   | 175 ms         |
| 2    | [Tealium](https://tealium.com/)                                               | 75,434    | 267 ms         |
| 3    | TagCommander                                                                  | 1,509     | 297 ms         |
| 4    | [Ensighten](https://www.ensighten.com/)                                       | 3,199     | 555 ms         |
| 5    | [Google Tag Manager](https://marketingplatform.google.com/about/tag-manager/) | 8,124,119 | 833 ms         |

<a name="consent-provider"></a>

#### Consent Management Provider

IAB Consent Management Providers are the 'Cookie Consent' popups used by many publishers. They're invoked for every page and sit on the critical path between a page loading and adverts being displayed.

| Rank | Name                                                              | Usage   | Average Impact |
| ---- | ----------------------------------------------------------------- | ------- | -------------- |
| 1    | [Trustcommander](https://www.commandersact.com)                   | 1,713   | 190 ms         |
| 2    | [Optanon](https://www.cookielaw.org/)                             | 113,700 | 486 ms         |
| 3    | [UniConsent CMP](https://www.uniconsent.com)                      | 1,336   | 621 ms         |
| 4    | [Google FundingChoices](https://fundingchoices.google.com/start/) | 400,016 | 644 ms         |
| 5    | [Didomi](https://www.didomi.io/)                                  | 84,206  | 1011 ms        |
| 6    | [Usercentrics CMP](https://usercentrics.com)                      | 49,602  | 1069 ms        |

<a name="other"></a>

#### Mixed / Other

These are miscellaneous scripts delivered via a shared origin with no precise category or attribution. Help us out by identifying more origins!

| Rank | Name                                                                | Usage   | Average Impact |
| ---- | ------------------------------------------------------------------- | ------- | -------------- |
| 1    | [ReadSpeaker](https://www.readspeaker.com)                          | 6,265   | 116 ms         |
| 2    | ResponsiveVoice                                                     | 6,863   | 124 ms         |
| 3    | [Browsealoud](https://www.texthelp.com/en-gb/products/browsealoud/) | 1,951   | 341 ms         |
| 4    | [Amazon Web Services](https://aws.amazon.com/s3/)                   | 119,152 | 436 ms         |
| 5    | Sirv                                                                | 1,034   | 584 ms         |
| 6    | Heroku                                                              | 14,119  | 893 ms         |
| 7    | Calendly                                                            | 4,604   | 1873 ms        |

<a name="by-total-impact"></a>

### Third Parties by Total Impact

This section highlights the entities responsible for the most script execution across the web. This helps inform which improvements would have the largest total impact.

| Name                                                                             | Popularity | Total Impact | Average Impact |
| -------------------------------------------------------------------------------- | ---------- | ------------ | -------------- |
| [Google Tag Manager](https://marketingplatform.google.com/about/tag-manager/)    | 8,124,119  | 6,770,913 s  | 833 ms         |
| [YouTube](https://youtube.com)                                                   | 977,311    | 6,277,580 s  | 6423 ms        |
| [Google CDN](https://developers.google.com/speed/libraries/)                     | 3,192,326  | 4,805,631 s  | 1505 ms        |
| [Google/Doubleclick Ads](https://marketingplatform.google.com/about/enterprise/) | 1,232,210  | 3,224,312 s  | 2617 ms        |
| [Wix](https://www.wix.com/)                                                      | 458,273    | 2,112,269 s  | 4609 ms        |
| [Yandex Metrica](https://metrica.yandex.com/about?)                              | 602,136    | 1,438,545 s  | 2389 ms        |
| [Other Google APIs/SDKs](https://developers.google.com/apis-explorer/#p/)        | 2,638,940  | 1,158,368 s  | 439 ms         |
| [Squarespace](https://www.squarespace.com/)                                      | 243,154    | 1,106,480 s  | 4551 ms        |
| [Facebook](https://www.facebook.com)                                             | 3,157,799  | 1,097,107 s  | 347 ms         |
| [Google Maps](https://www.google.com/maps)                                       | 1,195,850  | 904,393 s    | 756 ms         |
| [Twitter](https://twitter.com)                                                   | 319,957    | 804,233 s    | 2514 ms        |
| [Google Analytics](https://marketingplatform.google.com/about/analytics/)        | 4,231,882  | 495,650 s    | 117 ms         |
| [Pubmatic](https://pubmatic.com/)                                                | 279,418    | 417,694 s    | 1495 ms        |
| [Weebly](https://www.weebly.com/)                                                | 67,864     | 413,019 s    | 6086 ms        |
| [Cloudflare CDN](https://cdnjs.com/)                                             | 666,628    | 337,711 s    | 507 ms         |
| [jQuery CDN](https://code.jquery.com/)                                           | 724,477    | 302,334 s    | 417 ms         |
| [Shopify](https://www.shopify.com/)                                              | 338,668    | 287,429 s    | 849 ms         |
| [Rubicon Project](https://rubiconproject.com/)                                   | 270,271    | 287,111 s    | 1062 ms        |
| [Vimeo](https://vimeo.com/)                                                      | 120,397    | 263,944 s    | 2192 ms        |
| [JSDelivr CDN](https://www.jsdelivr.com/)                                        | 399,959    | 260,364 s    | 651 ms         |
| [Google FundingChoices](https://fundingchoices.google.com/start/)                | 400,016    | 257,806 s    | 644 ms         |
| [Hotjar](https://www.hotjar.com/)                                                | 333,356    | 241,418 s    | 724 ms         |
| [WordPress](https://wp.com/)                                                     | 308,694    | 220,911 s    | 716 ms         |
| Medium                                                                           | 17,027     | 216,923 s    | 12740 ms       |
| [Clarity](https://clarity.microsoft.com/)                                        | 456,309    | 208,825 s    | 458 ms         |
| [POWr](https://www.powr.io)                                                      | 39,716     | 191,535 s    | 4823 ms        |
| [Stripe](https://stripe.com)                                                     | 136,440    | 166,355 s    | 1219 ms        |
| [Wistia](https://wistia.com/)                                                    | 27,059     | 115,722 s    | 4277 ms        |
| Klaviyo                                                                          | 161,289    | 113,130 s    | 701 ms         |
| [TikTok](https://www.tiktok.com/en/)                                             | 256,224    | 111,182 s    | 434 ms         |
| [ZenDesk](https://zendesk.com/)                                                  | 72,537     | 106,701 s    | 1471 ms        |
| [Hatena Blog](https://hatenablog.com/)                                           | 43,183     | 106,338 s    | 2462 ms        |
| [Amazon Ads](https://ad.amazon.com/)                                             | 240,331    | 98,704 s     | 411 ms         |
| [Tilda](https://tilda.cc/)                                                       | 70,321     | 94,734 s     | 1347 ms        |
| [GoDaddy](https://www.godaddy.com/)                                              | 110,342    | 94,698 s     | 858 ms         |
| [Hubspot](https://hubspot.com/)                                                  | 154,415    | 92,224 s     | 597 ms         |
| [VK](https://vk.com/)                                                            | 22,377     | 91,334 s     | 4082 ms        |
| [Integral Ad Science](https://integralads.com/uk/)                               | 21,660     | 88,554 s     | 4088 ms        |
| [Didomi](https://www.didomi.io/)                                                 | 84,206     | 85,132 s     | 1011 ms        |
| [AMP](https://amp.dev/)                                                          | 66,265     | 79,591 s     | 1201 ms        |
| [Adobe TypeKit](https://fonts.adobe.com/)                                        | 119,621    | 78,982 s     | 660 ms         |
| [WordAds](https://wordads.co/)                                                   | 100,449    | 74,286 s     | 740 ms         |
| [FontAwesome CDN](https://fontawesome.com/)                                      | 291,586    | 73,007 s     | 250 ms         |
| iubenda                                                                          | 97,074     | 69,911 s     | 720 ms         |
| [Tray Commerce](https://www.tray.com.br/)                                        | 14,071     | 68,362 s     | 4858 ms        |
| [Cookiebot](https://www.cookiebot.com/)                                          | 187,732    | 64,865 s     | 346 ms         |
| [New Relic](https://newrelic.com/)                                               | 227,672    | 64,593 s     | 284 ms         |
| [PayPal](https://paypal.com)                                                     | 62,800     | 64,408 s     | 1026 ms        |
| LiveJournal                                                                      | 9,109      | 63,532 s     | 6975 ms        |
| [Mediavine](https://www.mediavine.com/)                                          | 12,963     | 59,009 s     | 4552 ms        |
| [Cloudflare](https://www.cloudflare.com/website-optimization/)                   | 467,719    | 58,723 s     | 126 ms         |
| [Blogger](https://www.blogger.com/)                                              | 213,326    | 58,390 s     | 274 ms         |
| Dailymotion                                                                      | 5,142      | 56,076 s     | 10905 ms       |
| [Optanon](https://www.cookielaw.org/)                                            | 113,700    | 55,293 s     | 486 ms         |
| Rambler                                                                          | 15,831     | 54,521 s     | 3444 ms        |
| [Usercentrics CMP](https://usercentrics.com)                                     | 49,602     | 53,009 s     | 1069 ms        |
| [Amazon Web Services](https://aws.amazon.com/s3/)                                | 119,152    | 51,892 s     | 436 ms         |
| [LiveChat](https://www.livechat.com/)                                            | 39,034     | 49,171 s     | 1260 ms        |
| [Sentry](https://sentry.io/)                                                     | 85,598     | 47,937 s     | 560 ms         |
| [DoubleVerify](https://www.doubleverify.com/)                                    | 19,453     | 46,891 s     | 2410 ms        |
| Bigcommerce                                                                      | 19,595     | 45,748 s     | 2335 ms        |
| [Tumblr](https://tumblr.com/)                                                    | 18,114     | 45,571 s     | 2516 ms        |
| [Intercom](https://www.intercom.com)                                             | 35,197     | 44,601 s     | 1267 ms        |
| [Tawk.to](https://www.tawk.to/)                                                  | 111,088    | 43,075 s     | 388 ms         |
| Tynt                                                                             | 212,415    | 41,644 s     | 196 ms         |
| [Yandex APIs](https://yandex.ru/)                                                | 51,601     | 40,765 s     | 790 ms         |
| Kakao                                                                            | 62,730     | 38,351 s     | 611 ms         |
| [Jivochat](https://www.jivochat.com/)                                            | 57,540     | 36,664 s     | 637 ms         |
| Azure Web Services                                                               | 51,378     | 35,665 s     | 694 ms         |
| [Adobe Tag Manager](https://www.adobe.com/experience-platform/)                  | 200,160    | 34,938 s     | 175 ms         |
| Skimbit                                                                          | 86,270     | 32,940 s     | 382 ms         |
| [Taboola](https://www.taboola.com/)                                              | 49,191     | 32,632 s     | 663 ms         |
| [Instagram](https://www.instagram.com)                                           | 20,376     | 31,988 s     | 1570 ms        |
| [Judge.me](https://judge.me/)                                                    | 27,483     | 31,887 s     | 1160 ms        |
| [ShareThis](https://www.sharethis.com/)                                          | 88,829     | 30,808 s     | 347 ms         |
| [Drift](https://www.drift.com/)                                                  | 5,515      | 30,180 s     | 5472 ms        |
| [Crazy Egg](https://www.crazyegg.com/)                                           | 43,822     | 27,593 s     | 630 ms         |
| [Tidio Live Chat](https://www.tidiochat.com/en/)                                 | 24,598     | 26,585 s     | 1081 ms        |
| [ID5 Identity Cloud](https://id5.io/)                                            | 119,336    | 26,134 s     | 219 ms         |
| [Criteo](https://www.criteo.com/)                                                | 213,880    | 25,625 s     | 120 ms         |
| [Media.net](https://www.media.net/)                                              | 97,679     | 24,974 s     | 256 ms         |
| InMobi                                                                           | 126,087    | 24,607 s     | 195 ms         |
| [Freshchat](https://www.freshworks.com/live-chat-software/)                      | 7,081      | 23,350 s     | 3298 ms        |
| LinkedIn Ads                                                                     | 199,088    | 22,806 s     | 115 ms         |
| Smart AdServer                                                                   | 107,812    | 22,357 s     | 207 ms         |
| [MGID](https://www.mgid.com/)                                                    | 10,437     | 22,074 s     | 2115 ms        |
| Esri ArcGIS                                                                      | 3,432      | 21,968 s     | 6401 ms        |
| [Mailchimp](https://mailchimp.com/)                                              | 45,506     | 21,592 s     | 474 ms         |
| Fastly                                                                           | 9,582      | 21,362 s     | 2229 ms        |
| [Tealium](https://tealium.com/)                                                  | 75,434     | 20,177 s     | 267 ms         |
| [WebsiteBuilder.com](https://www.websitebuilder.com)                             | 4,688      | 19,568 s     | 4174 ms        |
| [PIXNET](https://www.pixnet.net/)                                                | 13,718     | 18,541 s     | 1352 ms        |
| [Twitch](https://twitch.tv/)                                                     | 1,255      | 18,453 s     | 14703 ms       |
| [OneSignal](https://onesignal.com/)                                              | 68,282     | 17,761 s     | 260 ms         |
| [Pinterest](https://pinterest.com/)                                              | 131,448    | 17,602 s     | 134 ms         |
| Geniee                                                                           | 16,354     | 16,956 s     | 1037 ms        |
| [Yotpo](https://www.yotpo.com/)                                                  | 26,094     | 16,919 s     | 648 ms         |
| [Sumo](https://sumo.com/)                                                        | 10,901     | 16,490 s     | 1513 ms        |
| Crowd Control                                                                    | 101,196    | 16,299 s     | 161 ms         |
| [SoundCloud](https://www.soundcloud.com/)                                        | 5,859      | 15,889 s     | 2712 ms        |
| [Hotmart](https://www.hotmart.com/)                                              | 4,554      | 15,363 s     | 3374 ms        |
| [Brightcove](https://www.brightcove.com/en/)                                     | 13,745     | 15,100 s     | 1099 ms        |
| Cookie-Script.com                                                                | 58,095     | 15,052 s     | 259 ms         |
| Privy                                                                            | 18,961     | 14,993 s     | 791 ms         |
| Trust Pilot                                                                      | 54,942     | 14,795 s     | 269 ms         |
| Microad                                                                          | 23,909     | 14,627 s     | 612 ms         |
| [Bing Ads](https://bingads.microsoft.com)                                        | 117,720    | 14,227 s     | 121 ms         |
| Mapbox                                                                           | 19,555     | 13,816 s     | 707 ms         |
| [CreateJS CDN](https://code.createjs.com/)                                       | 3,880      | 13,654 s     | 3519 ms        |
| [Lucky Orange](https://www.luckyorange.com/)                                     | 16,442     | 12,779 s     | 777 ms         |
| Yahoo! Ad Exchange                                                               | 4,994      | 12,721 s     | 2547 ms        |
| Heroku                                                                           | 14,119     | 12,603 s     | 893 ms         |
| [Optimizely](https://www.optimizely.com/)                                        | 15,998     | 12,600 s     | 788 ms         |
| [Quantcast](https://www.quantcast.com)                                           | 77,646     | 12,419 s     | 160 ms         |
| [Adroll](https://www.adroll.com/)                                                | 30,782     | 11,884 s     | 386 ms         |
| FullStory                                                                        | 14,687     | 11,575 s     | 788 ms         |
| [Segment](https://segment.com/)                                                  | 27,036     | 11,055 s     | 409 ms         |
| [Supership](https://supership.jp/)                                               | 17,934     | 10,809 s     | 603 ms         |
| Hexton                                                                           | 24,738     | 10,807 s     | 437 ms         |
| [AddToAny](https://www.addtoany.com/)                                            | 66,065     | 10,606 s     | 161 ms         |
| OptiMonk                                                                         | 10,615     | 10,318 s     | 972 ms         |
| [33 Across](https://33across.com/)                                               | 192,648    | 10,002 s     | 52 ms          |
| [Smartsupp](https://www.smartsupp.com)                                           | 21,505     | 9,998 s      | 465 ms         |
| [Olark](https://www.olark.com/)                                                  | 6,534      | 9,841 s      | 1506 ms        |
| [Google Optimize](https://marketingplatform.google.com/about/optimize/)          | 38,797     | 9,330 s      | 240 ms         |
| AudienceSearch                                                                   | 46,726     | 9,115 s      | 195 ms         |
| IPONWEB                                                                          | 39,154     | 8,925 s      | 228 ms         |
| Amplitude Mobile Analytics                                                       | 46,524     | 8,704 s      | 187 ms         |
| Google reCAPTCHA                                                                 | 25,662     | 8,694 s      | 339 ms         |
| Calendly                                                                         | 4,604      | 8,623 s      | 1873 ms        |
| [WordPress Site Stats](https://wp.com/)                                          | 128,931    | 8,574 s      | 66 ms          |
| CallRail                                                                         | 29,537     | 8,080 s      | 274 ms         |
| Infolinks                                                                        | 5,950      | 7,995 s      | 1344 ms        |
| [Baidu Analytics](https://tongji.baidu.com/web/welcome/login)                    | 32,612     | 7,739 s      | 237 ms         |
| [RD Station](https://www.rdstation.com/en/)                                      | 21,846     | 7,694 s      | 352 ms         |
| Inspectlet                                                                       | 5,346      | 7,622 s      | 1426 ms        |
| Trusted Shops                                                                    | 17,267     | 7,374 s      | 427 ms         |
| GitHub                                                                           | 14,675     | 7,126 s      | 486 ms         |
| [Snowplow](https://snowplowanalytics.com/)                                       | 58,566     | 7,099 s      | 121 ms         |
| [Ad Lightning](https://www.adlightning.com/)                                     | 3,795      | 6,879 s      | 1813 ms        |
| [Nielsen NetRatings SiteCensus](http://www.nielsen-online.com/intlpage.html)     | 19,525     | 6,840 s      | 350 ms         |
| Connatix                                                                         | 1,195      | 6,751 s      | 5650 ms        |
| [Sizmek](https://www.sizmek.com/)                                                | 4,307      | 6,680 s      | 1551 ms        |
| Forter                                                                           | 6,930      | 6,579 s      | 949 ms         |
| [LiveRamp Privacy Manager](https://liveramp.com/privacy-legal-compliance/)       | 22,295     | 6,546 s      | 294 ms         |
| Conversant                                                                       | 54,802     | 6,532 s      | 119 ms         |
| [VWO](https://vwo.com)                                                           | 7,903      | 6,485 s      | 821 ms         |
| Adyen                                                                            | 2,363      | 6,335 s      | 2681 ms        |
| [OpenX](https://www.openx.com/)                                                  | 76,561     | 6,275 s      | 82 ms          |
| [Yahoo! JAPAN Ads](https://marketing.yahoo.co.jp/service/yahooads/)              | 37,464     | 6,237 s      | 166 ms         |
| Bugsnag                                                                          | 15,069     | 6,198 s      | 411 ms         |
| Twitter Online Conversion Tracking                                               | 73,452     | 6,171 s      | 84 ms          |
| [AppNexus](https://www.appnexus.com/)                                            | 234,133    | 5,949 s      | 25 ms          |
| [LinkedIn](https://www.linkedin.com/)                                            | 16,507     | 5,777 s      | 350 ms         |
| issuu                                                                            | 2,714      | 5,608 s      | 2066 ms        |
| [Attentive](https://attentivemobile.com/)                                        | 9,099      | 5,555 s      | 610 ms         |
| StatCounter                                                                      | 50,769     | 5,427 s      | 107 ms         |
| Technorati                                                                       | 27,186     | 5,383 s      | 198 ms         |
| Heap                                                                             | 12,078     | 5,188 s      | 430 ms         |
| [Yandex Ads](https://yandex.com/adv/)                                            | 8,488      | 5,172 s      | 609 ms         |
| fluct                                                                            | 12,890     | 5,114 s      | 397 ms         |
| Bold Commerce                                                                    | 9,886      | 5,073 s      | 513 ms         |
| Embedly                                                                          | 10,836     | 5,014 s      | 463 ms         |
| SocialShopWave                                                                   | 3,720      | 4,962 s      | 1334 ms        |
| [Pendo](https://www.pendo.io)                                                    | 12,203     | 4,935 s      | 404 ms         |
| Qualtrics                                                                        | 7,134      | 4,907 s      | 688 ms         |
| Key CDN                                                                          | 10,025     | 4,815 s      | 480 ms         |
| [Akamai](https://www.akamai.com/)                                                | 9,820      | 4,796 s      | 488 ms         |
| Signyfyd                                                                         | 2,608      | 4,753 s      | 1822 ms        |
| Sonobi                                                                           | 81,682     | 4,682 s      | 57 ms          |
| Microsoft Hosted Libs                                                            | 20,042     | 4,562 s      | 228 ms         |
| LongTail Ad Solutions                                                            | 5,572      | 4,531 s      | 813 ms         |
| [Scorecard Research](https://www.scorecardresearch.com/)                         | 54,577     | 4,399 s      | 81 ms          |
| Onfocus                                                                          | 8,836      | 4,241 s      | 480 ms         |
| reddit                                                                           | 18,483     | 4,114 s      | 223 ms         |
| Dynatrace                                                                        | 3,221      | 4,107 s      | 1275 ms        |
| Affirm                                                                           | 6,665      | 3,997 s      | 600 ms         |
| LINE Corporation                                                                 | 26,881     | 3,858 s      | 144 ms         |
| Ecwid                                                                            | 4,362      | 3,757 s      | 861 ms         |
| i-mobile                                                                         | 16,595     | 3,701 s      | 223 ms         |
| [Disqus](https://disqus.com/)                                                    | 1,775      | 3,697 s      | 2083 ms        |
| [Brandmetrics](https://www.brandmetrics.com)                                     | 30,850     | 3,690 s      | 120 ms         |
| VigLink                                                                          | 6,219      | 3,670 s      | 590 ms         |
| ContentSquare                                                                    | 2,948      | 3,627 s      | 1230 ms        |
| Dynamic Yield                                                                    | 1,843      | 3,580 s      | 1943 ms        |
| Rackspace                                                                        | 2,624      | 3,573 s      | 1362 ms        |
| GumGum                                                                           | 167,535    | 3,441 s      | 21 ms          |
| TrafficStars                                                                     | 7,430      | 3,435 s      | 462 ms         |
| [Outbrain](https://www.outbrain.com/)                                            | 13,287     | 3,374 s      | 254 ms         |
| [Seedtag](https://www.seedtag.com/)                                              | 1,503      | 3,343 s      | 2224 ms        |
| Datacamp                                                                         | 1,181      | 3,304 s      | 2797 ms        |
| [Mixpanel](https://mixpanel.com/)                                                | 18,817     | 3,251 s      | 173 ms         |
| Conversion Labs                                                                  | 1,898      | 3,243 s      | 1709 ms        |
| [Matomo](https://matomo.org/)                                                    | 14,345     | 3,115 s      | 217 ms         |
| [mPulse](https://developer.akamai.com/akamai-mpulse)                             | 30,624     | 3,090 s      | 101 ms         |
| [Luigis Box](https://www.luigisbox.com/)                                         | 2,356      | 2,975 s      | 1263 ms        |
| LoyaltyLion                                                                      | 4,114      | 2,972 s      | 722 ms         |
| Gemius                                                                           | 15,596     | 2,965 s      | 190 ms         |
| Unbounce                                                                         | 8,808      | 2,902 s      | 330 ms         |
| Civic                                                                            | 7,253      | 2,816 s      | 388 ms         |

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
