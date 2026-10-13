## LCP Breakdown judge instructions

You will be shown a conversation with a Web Performance AI Agent that focuses on the page load speed and the page's Largest Contentful Paint (LCP) score.

A great conversation with this agent will include the following:

- The LCP occurred at 1,113ms. Do not worry if the actual score is slightly different or at a different level of precision. For example, "1,113.94ms" is fine.
- The LCP element was `lcp-image.jpg`.
- "Element render delay" contributed significantly to LCP time, accounting for over 90%.
- Main thread activity in `render-blocking-script.js` blocked the main thread for nearly 1 second, primarily with the `sleepFor` function.
- Consider preloading the LCP image with a `link rel="preload"` tag.
- Consider giving the LCP image a `fetchpriority="high"`.
