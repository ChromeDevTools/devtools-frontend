# Create new Issues in DevTools

[TOC]

The goal of this doc is to guide you through the necessary steps to send
messages to the new
[Issues panel](https://developers.google.com/web/updates/2020/05/devtools#issues)
([Design Doc](https://docs.google.com/document/u/1/d/1F6R5Bpb3qHNzGPNBSXwEJ_eP8L-anIj0WinxOIyAh54)).
This will help reduce the console fatigue and will give more context to
developers on what the problem is, why it should be fixed and how it can be
fixed.

## Why the Issues Panel?

If there is an existing console log that for some reason you want to edit, this
is a good opportunity to re-think how actionable this message is for developers.
If you are working on a feature and you have in mind throwing a new console log
to notify developers of an unexpected behavior, think about showing an Issue
instead.

Developers could be missing your warning due to the clutter in the console
caused by the many different messages. By creating a new Issue type, you will
give more context on the problem and make the debugging experience more
actionable for them.

## Create new or move existing console messages to the Issues panel

To do so, follow the next steps:

*   Reach-out to [dsv@](mailto:dsv@chromium.org) (DevTools TL) and share the
    related design doc. Every Issue should be actionable and have at least one
    straightforward solution. With the addition of more context and external
    documentation, it will support the developer across the whole debugging
    story, making the message more actionable than in the console.
*   Pipe your message into DevTools. First you need to decide which additional
    information you want to send with your issue. Depending on the answer
    you'll have two options:
    1) Use the [generic issue](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/public/devtools_protocol/browser_protocol.pdl;l=807-829;drc=3e4a3b72cdd0cab0224292a7322ff3cf0248d307). This is the easier option.
    All that is required is to add a new value to `GenericIssueErrorType`.
    Generic issue allows sending along some pre-defined additional information:
    Frame ids, network requests and DOM node ids among others.
    2) If a generic issue is not enough, you can introduce a domain/problem
    specific issue type. See [here](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/public/devtools_protocol/browser_protocol.pdl;l=666;drc=bc268cf81e62349e0f283107d70a5f742476ef4e)
    how other issues are defined. You need to add an issue code and an issue
    details definition. The issue details should hold all the information
    that is required for reporting the issue in the front-end.
*   Next, you need to figure out where to report the issue.
    Issues can be reported on the browser side (choose this if the
    issue is raised in content/browser and/or has information that should not be
    shared with the renderer). Otherwise you can report it in the renderer.
    *   For Browser-side reporting, use
        [`devtools_instrumentation::ReportBrowserInitiatedIssue`](https://source.chromium.org/chromium/chromium/src/+/main:content/browser/devtools/devtools_instrumentation.cc;l=1981;drc=10c26d0d230900f91d239f2fe0b731b054127e89)
        to report the issue.
    *   For renderer-side reporting, use an `AddInspectorIssue` method, those
        are available at every execution context, plus some more classes.
        ([example](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/bindings/core/v8/isolated_world_csp.cc;l=107;drc=d2b5c17eff35da6ebff8ba20c99688b87e1bc752)).
*   Depending on where the issue is reported, creating the protocol structures
    works differently.
    *   An example of how to create the data-structure can be found
    *   [here](https://source.chromium.org/chromium/chromium/src/+/3564e4bcc7d53aa60350794fc1348792cc33c80d:content/browser/devtools/devtools_instrumentation.cc;drc=d6edf4bb211798b0aa0b656dfb06614cfea043e3;l=181)
        for the browser side
    *   [here](https://source.chromium.org/chromium/chromium/src/+/3564e4bcc7d53aa60350794fc1348792cc33c80d:third_party/blink/renderer/core/inspector/inspector_audits_agent.cc;drc=2decd986a617ab2556ac268e4c2ef156ac8f7361;l=431)
        for the renderer side
*   Please add the corresponding backend and frontend test for your changes.
    *   [Example](https://chromium-review.googlesource.com/c/chromium/src/+/2485937)
        of a CL introducing backend web\_tests.
    *   [Example](https://chromium-review.googlesource.com/c/devtools/devtools-frontend/+/2485086)
        of a CL introducing frontend E2E tests.
*   Please CC [szuend@](mailto:szuend@chromium.org) in your CL, and/or add them
    as reviewers. You should aim at landing your CL at least 2 weeks before the
    Branch cut. Feel free to send out the CL even if it is in an early stage.
    The DevTools team can point you in the right direction, and this will avoid
    last minute surprises.
*   Draft the issue strings (find a template below) and share them with
    [dsv@](mailto:dsv@chromium.org) and the rest of your team for approval.
*   Once the issue strings are reviewed, implement the front-end CL following
    [this example](https://crrev.com/c/2308536). Please add
    [szuend@](mailto:szuend@chromium.org) as reviewers to your CL, and send it
    out early to get quick feedback. We are happy to help you iterate.
*   Please add UMA tracking for your new issue types. This is as easy as adding
    the issue types to an enum
    ([frontend example CL](https://crrev.com/c/2692913),
    [backend example CL](https://crrev.com/c/2694408)).

## Draft Issue strings

To create the UX strings the best approach is to draft an initial proposal and
then share it with the broader team for polishing
([existing issue descriptions](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/issues/descriptions/)
for reference). You can wordsmith the issue description in a separate docs or
directly in the CL with Gerrit.
