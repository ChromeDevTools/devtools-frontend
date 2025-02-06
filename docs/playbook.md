# Chromium DevTools Playbook (aka Work With Us)

This document serves as the Chrome DevTools Playbook and thereby provides guidance on how to work with Chrome DevTools, the types of Chrome DevTools support available, how you and your team can take advantage of that support to contribute features, and how to get help when in doubt of the type of support needed or if you need more support.

## Getting Started

*   If you are a **Googler** see [go/chrome-devtools/work-with-us](go/chrome-devtools/work-with-us) for additional information.
*   If you're a **first-time contributor** and would like some guidance to begin with, please jump to the [First Time Contributor](#first-time-devtools-contributor) section at the end of this document.
*   If you are only looking for **DevTools documentations**, here is the [list](#devtools-documentation).

To help us understand your needs and collaborate effectively, please follow the steps below.

**Answer three preliminary questions:**

1.  [What level of debuggability do you need?](#what-level-of-debuggability-do-you-need)
2.  [What is the scope of your feature request?](#what-is-the-scope-of-your-feature-request)
3.  [What is your preferred collaboration mode?](#what-is-your-preferred-collaboration-mode)

Depending on your answers, you can do one of the following:

*   [Contact DevTools team](#contact-devtools) to discuss your feature request, **OR**
*   Directly design your feature, write your design doc and share with DevTools team, **OR**
*   Directly write your CL(s) and submit them for review.

## Contact DevTools

The team uses a public mailing list for technical discussions, questions, and announcements.

*   **Email address:** [devtools-dev@chromium.org](mailto:devtools-dev@chromium.org)
*   **Web archives:** [devtools-dev](https://groups.google.com/a/chromium.org/g/devtools-dev)

### Points of Contact for Specific Topics

For certain topics, there are dedicated points of contact (PoCs) within the DevTools team, who are considered experts and have guided initiatives within these areas in the past.

| Topic                                 | PoC             |
| ------------------------------------- | --------------- |
| Web Compass, Interop, and Baseline    | pfaffe@chromium.org         |
| UI Capabilities                       | changhaohan@chromium.org    |
| Performance                           | paulirish@chromium.org      |
| JavaScript                            | szuend@chromium.org         |
| WebAssembly                           | pfaffe@chromium.org         |
| Security                              | dsv@chromium.org  |
| Network                               | dsv@chromium.org  |
| Extensions                            | pfaffe@chromium.org         |


## What level of debuggability do you need?

A feature is debuggable in DevTools if developers can use DevTools to more easily identify and fix a bug related to this feature. In some cases, debuggability is important for a feature's adoption, especially when a feature is complex and popular. There are three levels of debuggability, as follows.

### No Debuggability

DevTools doesn't offer any special support for the Web Platform Feature, but using the feature doesn't break DevTools.

### Basic Debuggability

DevTools helps developers understand the use of a feature.

*   **Basic debuggability for CSS features:** The feature properties are displayed and, if applicable, are editable. If the feature includes cross references, references are linkified where appropriate.
*   **Basic debuggability for Web APIs:** Objects can be inspected in the sources panel (scope view, editor popover, console) and function calls can be made from the console.

### Extended Debuggability

DevTools offers dedicated tooling for Web Platform APIs. These tools provide helpful hints, educating developers on how to use these features effectively. Extended tooling support usually follows our [standard feature development process](go/chrome-devtools/development-process).

*   **Extended debuggability for CSS:** DevTools clearly shows the user the different usage options for a feature and offers a non-text UI to configure it where possible (e.g., color picker, flexbox picker).
*   **Extended debuggability for Web APIs:** DevTools offers first-party debugging support for a feature, e.g. through automatic breakpoints.

## What is the scope of your feature request?

Defining the scope of the feature request helps us better understand how to allocate resources, and choose the most appropriate collaboration mode. Specifically, if you need extended debuggability support, please think about the following:

*   the minimal viable product needed to ensure a smooth adoption of the feature by developers
*   the v1.0 of your feature
*   nice-to-haves and out-of-scope features
*   the responsibility to maintain the feature

## What is your preferred collaboration mode?

To scale the tooling support to the number of developer products and APIs being launched throughout Chrome (in particular the various new Web Platform APIs being introduced year-by-year), the Chrome DevTools team has created a guiding framework on how priorities are supported and provided more options for supporting teams.
Each initiative is owned by the feature team. Each engagement will have a definitive level of support defined out of the following categories:

### Self-service

In this self-service model, feature teams are responsible for designing and implementing tooling support, using the provided [documentation](#devtools-documentation). The DevTools team will not actively follow the project but will answer questions, similar to office hours. This type of support is designed to scale the tooling support by providing guidance and resources to product and engineering teams.

**Example:** [Web Audio extension](https://chromewebstore.google.com/detail/audion/cmhomipkklckpomafalojobppmmidlgl?pli=1)

### Consultation

The Chrome DevTools team will consult the feature team on the right solution, in particular on the right usage of DevTools/CDP API, and the design of runtime introspection capabilities. The UI of the solution will either be

*   Chrome Extension,
*   Chrome Internals page, or
*   a separate tool.

There is no meaningful expectation to change the DevTools frontend.

**Example:** Privacy & Security panel

### Review + Upstream

The feature team does the implementation of the DevTools frontend pieces and relevant backend services required for debugging. The Chrome DevTools team does the reviews and consultations required to get the CLs landed and folding nicely into our tool surfaces (e.g. does it meet the [Chromium DevTools UI feature checklist](./checklist/ui.md)?).

**Example:** [Early Hints DevTools support](https://docs.google.com/document/d/1IAbWeu9cj37EYaIvFpWOtnPFLxorO2YVHnxxdX0EwOU)

### 50/50 split

The Chrome DevTools team does the implementation of the DevTools frontend pieces. The feature team does the implementation of the backend services and plumbing required for debugging to be used in the frontend, most likely the CDP methods et. al.

**Example:** [Autofill DevTools MVP](http://go/chrome-devtools:autofill-mvp-prd)

### Fully owned

The Chrome DevTools team does the implementation and design of frontend and backend pieces.

**Examples:** Core Web Vital support in Lighthouse and DevTools, [Modern CSS color features in DevTools](http://go/chrome-devtools:modern-color-prd)

## What are the expectations regarding maintenance?

Any new feature comes with the potential of introducing new bugs (potentially even breaking somewhat unrelated workflows unintentionally).

For any of the collaboration modes listed above except *Fully owned*, the Chrome DevTools team expects the feature team to maintain the tooling aspects of their feature by fixing any bugs that result from the MVP / 1.0, independent of whether these are frontend or backend bugs (except in case of 50/50 split where the Chrome DevTools team will own the frontend issues), for at least a period of **3 Chrome milestones** (since the successful launch).

Additionally the Chrome DevTools team relies on the feature team as the domain experts for any domain-specific bugs that need to be tackled (independent of whether it’s frontend or backend related).

## DevTools Documentation

Depending on your answers above *and/or* your current feature stage, you may need one of these documents below.

### basic level of debuggability + self-service collaboration mode

*   [DevTools support checklist for Blink Intents](https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/checklist/README.md)
*   [DevTools support checklist for JavaScript features](https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/checklist/javascript.md)
*   [DevTools support checklist for WebAssembly features](https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/checklist/webassembly.md)

### Feature request initial review or consultation mode

*  [Contact us](#contact-devtools)

### Feature design phase

*   [DevTools UI feature checklist](./checklist/ui.md)
*   [UX Style Guide](./styleguide/ux/README.md)

## Coding phase

*   [Get the Code](./get_the_code.md)
*   [Contribution Guide](./contributing/README.md)
*   [UX Style Guide](./styleguide/ux/README.md)
*   [Testing Guide](../test/README.md)
*   [Cookbook](./cookbook/README.md)
*   [Visual logging in DevTools](../front_end/ui/visual_logging/README.md)
*   [Style Guides](./styleguide/README.md)
*   [Architecture of DevTools](architecture_of_devtools.md)
*   [Chrome DevTools Protocol (CDP)](devtools-protocol.md)
*   [Resource management in DevTools](resource_management.md)

## First time DevTools contributor?

If you haven't worked with the Chrome DevTools team before, or if you're unsure where your feature fits, please follow the steps outlined below.

1.  Ask yourself who will be using your features and what kind of tooling support they might need to ensure a smooth adoption of your feature.
    Try to think in terms of tasks and challenges developers may face, not UI elements.
2.  Write a short email to devtools-dev@ with your best shot at answering those questions. It doesn't have to be perfect, and it is not a questionnaire
    you need to fill to satisfy some formal process. We are mostly interested in a positive end user experience and are willing to work with you together
    to achieve that.
3.  We will get back to you with some initial thoughts and might ask to formalize your ideas in a design document.
4.  Most likely we will ask you to book an office hours with our UXD to discuss your feature’s UX, so that developers have a consistent experience on
    DevTools. Complex features where developers have to be introduced to significant new capabilities may take multiple iterations. It’s important to
    get this step right.
5.  Depending on the details, we will probably ask you to help us get the information exposed over the
    [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/). We might also ask you to write a few straightforward CLs to
    implement the UI. Don't worry, we won't ask you to re-architect our code to accommodate your feature. We will also offer all the support you
    need along the way.