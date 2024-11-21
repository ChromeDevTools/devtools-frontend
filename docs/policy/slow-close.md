# Chromium DevTools Slow-Close Policy

[goo.gle/devtools-slow-close]
<small>([go/chrome-devtools:slow-close-policy])</small>

In November 2024, we instituted a slow close policy for Chrome DevTools to
automatically maintain hygiene of our bug database. We ended up with a list
of over 1650 open bugs and over 750 open feature requests, some of them going
back over 10 years, which was not only challenging to maintain, but also made
it difficult to determine what's relevant and where we should invest our
resources best.

By automatically nudging and closing stale bugs and feature requests, we can
reduce this burden, and better communicate to our users what will actually be
actioned, and hear from them what remains relevant.

[TOC]

## Rules

The criteria for slow close:

- Status: unassigned
- Type: Bug or Feature Request
- Created: over 3 years ago
- Last updated: over 90 days ago
- Popularity: (cc count + vote count) < 10
- No open descendants

Googlers can mark issues as exempt from slow close by adding them to the
[`DevTools-Blintz-Close-Exempt` hotlist](https://issues.chromium.org/hotlists/6459983).

## Process

The automation runs on a daily basis, and performs the following steps:

- Issues that meet the criteria outlined above are added to the
  [`DevTools-Blintz-Close-Candidate` hotlist](https://issues.chromium.org/hotlists/6459982)
  for closure.
- If 14 days have passed and no updates have occurred, the issue will be closed
  and moved to the
  [`DevTools-Blintz-Close` hotlist](https://issues.chromium.org/hotlists/6460812)
  for recording purposes.
- No more than 25 issues will be updated in a single run.

## Implementation

**(Googlers only)**: This is implemented in [go/chrome-devtools:blintz].

[goo.gle/devtools-slow-close]: http://goo.gle/devtools-slow-close
[go/chrome-devtools:slow-close-policy]: http://go/chrome-devtools:slow-close-policy
[go/chrome-devtools:blintz]: http://go/chrome-devtools:blintz
