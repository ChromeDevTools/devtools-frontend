# Chromium DevTools UI feature checklist

[goo.gle/devtools-ui-checklist](https://goo.gle/devtools-ui-checklist)

Chrome DevTools is used by most web developers nowadays. In user interviews and
informal conversations web developers voice the opinion that Chrome DevTools is
great, but they have a hard time finding the right tool for the job. Naturally,
the Chrome DevTools suite will grow over time, as the Web Platform keeps on
growing. Without intervention, this will *clutter* the UI of Chrome DevTools
even more. This document here should serve as a checklist when new features are
added to Chrome DevTools' UI.

Please reach out to [hablich@chromium.org](mailto:hablich@chromium.org) (PM) or
[petermueller@chromium.org](mailto:petermueller@chromium.org) (UXD) with any
questions and concerns.

[TOC]

In general there are some categories which are important to look at:

## Measurability

We should be able to define and measure the success of a feature. Ideally, we
treat every feature as an experiment which needs to prove itself before it can
stay forever. (not literally with an experiment checkbox, but as a mental model)

*   Can we clearly state what our **goal** is that we want to solve?
*   Can we formulate a **hypothesis/assumption**, how we believe our feature
    will solve this goal?
*   Can we **validate** this and see if our feature actually does what it
    should?
*   And finally, can we **remove/revert** a feature, if we see that it's not
    used at all?

## Strategic fit

Does a new feature directly support our strategy? Is a feature weighted against
our backlog? Does a feature help us in reaching our strategic goal? If not, we
should de-prioritize it.

## Relevance

How relevant is a feature to our user base as a whole?

Does a feature support one of our core developer journeys or is it related to a
niche area?

*   Are we over-fitting to a tiny niche part of our user base?
*   From the perspective of the implementing team, each feature is super
    relevant, needs to be discoverable and should sit in the prime UI.
*   We as a product team should carefully choose which user journeys are our product
    core and if a new feature adds distractions to these journeys or enhances them.
*   Is a feature relevant for the mainstream of non-Google engineers? Or is it
    mostly a Google-internal feature?
*   Is it adequate to expose a feature to all of DevTools' users, even if only a
    tiny fraction will ever use it?
*   Should the feature be shipped to all of DevTools' users or rather be made
    available as a DevTools extension?

## Potential impact

Is a feature a life-saver or just a quality-of-life improvement?

*   We should prioritize impact for our users.
*   Can developers live without this feature? How do they solve the problem
    right now? What's the worst that would happen if we don't develop this
    feature?

## UI complexity

Is a feature easy to revert/remove if we figure out that it's not used? Or will
it stay forever in the UI and clutter it even more?

What's the least amount of work/UI we need to test how a new feature is actually
used?

Is this extending an existing feature or creating something new? Which (and how
many) other features are in its vicinity on the screen and panel?

*   We should favor solutions, which can be easily reverted or removed if we
    figure out that a feature is not really used. Deeply integrated UI solutions
    tend to stay forever.
*   Instead of going *all-in* as the default, we should add features
    incrementally and measure along the way if a feature is quickly becoming
    mainstream or stays rather niche. Based on this the next iteration can
    either extend the feature or further deemphazise it in the UI.
*   UIs should not be overloaded.
*   Avoid requiring major UI reworks if it is just extending an already existing
    feature
*   We shouldn't default to adding a new "panel" for every feature, just because
    the feature team is looking at the feature in isolation.

## Placement and discoverability

How many user interactions are needed until the user is using the feature
(without Command+P)?

*   Sensible thresholds:
    *   **< 3 interactions**: Very accessible, good if it is intended to be used
        by most users
    *   **3 < 6 interactions**: Likely somewhere in a front panel, likely good
        for most of the features
    *   **6 < interactions**: This is hard to find!

The more often something is used, the easier it should be able to be opened.

## Target audience

Which user type is going to be using this feature? How many of these users?

Will this primarily be used while debugging production instances of web
applications (obfuscated code, no source mapping) or dev versions (local, source
mapping, source code available)?
