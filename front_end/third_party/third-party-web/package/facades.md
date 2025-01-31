# Facade data in third-party-web

In addition to identifying entities, third-party-web also includes data on entities' _products_, and available alternative libraries for products known as _facades_. A **third-party product** is a third-party resource that is included on a page associated with a specific integration/SDK/API, for example: a YouTube embed iframe. A **facade** is a frontend element which looks similar to the actual product and lazily loads it upon user interaction.  It's expected to be significantly more lightweight/faster. For example: [lite-youtube-embed](https://github.com/paulirish/lite-youtube-embed).

[Lighthouse](https://github.com/GoogleChrome/lighthouse) 7.0 has a new audit that [identifies third-party embeds](https://web.dev/third-party-facades/) that can be lazy loaded with a facade. The Lighthouse audit is powered by the facade data in third-party-web.

## Criteria for adding a new facade

### Basic functionality

* Loads a frontend "component" which looks like the actual third-party embed.
* After some user interaction (click, mouseover, etc), component replaces itself with the actual third-party embed.

### Well Maintained

* The projects issues and contributions are managed responsibly. Bugs are 
  handled swiftly (e.g within 60 days of filing).
* Is already used in production, ideally by users other than the creator.

### Orthogonal

* The facade handles a use case not covered by existing facades. For example: a 
  lite-youtube clone isn't differentiated, but a react port of lite-youtube 
  would work.

### Small Payload

* Should be significantly smaller in comparison to the deferred third-party 
  product.
    * The JS/CSS/image/etc payload should be the minimum size necessary to mimic 
      the product. (A rough rule of thumb is a facade should be &lt; 10% of the 
      product it's mimicking)
    * We'd expect the facade to score 99+ in Lighthouse if it's tested on an 
      otherwise-blank page.
    * Any required images should be as small as is reasonable. Using blurred, low-res,
      or [SQIP](https://calendar.perfplanet.com/2017/sqip-vague-vectors-for-performant-previews/) 
      techniques may be advantageous.

## Submission Process

Anyone can propose changes, by making a pull request to this repo. Proposals 
don't necessarily need to be submitted by the creator.

Read 
[contributing](https://github.com/patrickhulce/third-party-web#contributing) for 
basics; look in `data/entities.js` for `products` to see how the data is structured.
