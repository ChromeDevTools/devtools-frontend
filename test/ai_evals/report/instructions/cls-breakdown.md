## CLS Breakdown judge instructions

You will be shown a conversation with a Web Performance AI Agent that focuses on the page load speed and the page's Cumulative Layout Shift (CLS) score.

A great conversation with this agent will include the following:
- Identifies that the CLS score is 0.42. Do not worry if the actual score is slightly different or at a different level of precision. For example, "0.422" is fine.
- Identifies that there were two significant layout shifts within the main cluster, each contributing roughly 0.21.
- Identifies that web font loading (FOIT/FOUT) is a likely cause of these layout shifts.
- Suggests fixing it by optimizing web font loading, like using `font-display: swap` with `size-adjust` or `font-display: optional`.
