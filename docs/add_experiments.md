# How to add experiments in DevTools frontend

If you want to launch a new feature in DevTools behind an experiment flag, you
will need to do two things:

1.  Make Chromium aware of the experiment and enable it to track users
    enabling/disabling the experiment.
2.  Register the experiment in DevTools to have it added to the Settings UI.

[TOC]

## Chromium

In Chromium, edit `tools/metrics/histograms/enums.xml`. Find the enum titled
`DevToolsExperiments` (your best bet is to search for this text in your editor,
as `enums.xml` is very large).

Go to the end of this enum, and add a new entry. Make sure that the `value` is
increased by one from the previous entry. The label can be anything you like but
make sure it is easily identifiable.

```xml
<int value="95" label="yourExperimentNameHere"/>
```

[See an example Chromium CL here](https://crrev.com/c/4915777).

## DevTools frontend

In DevTools, you need to register the experiment. This is done in
`front_end/entrypoints/main/MainImpl.ts` and is done by calling
`Root.Runtime.experiments.register`:

```ts
Root.Runtime.experiments.register(
  'yourExperimentNameHere',
  'User facing short description of experiment here',
  false);
```

The first argument is the experiment's label, and **this must match the label
you used in your Chromium CL**.

The second argument is a short description of the experiment. This string will
be shown to users.

Finally, the third argument marks the experiment as unstable. You should pass
`true` if you want your experiment to be marked as unstable. This moves it into
a separate part of the UI where users are warned that enabling the experiment
may cause issues.

You may also pass in two additional arguments which can be used to link users to
documentation and a way to provide feedback:

```ts
Root.Runtime.experiments.register(
  'jsProfilerTemporarilyEnable',
  'Enable JavaScript Profiler temporarily',
   /* unstable= */ false,
   /* documentation */ 'https://developer.chrome.com/blog/js-profiler-deprecation/',
   /* feedback */ 'https://bugs.chromium.org/p/chromium/issues/detail?id=1354548'
);
```

You must also add the experiment to `front_end/core/host/UserMetrics.ts`. Add an
entry to the `DevToolsExperiments` enum, using **the same label and integer
value** that you used in the Chromium CL. You should also increase the
`MaxValue` entry by one.

Once the experiment is registered, you can check if it is enabled and use this
to run certain code blocks conditionally:

```ts
if(Root.Runtime.experiments.isEnabled('yourExperimentNameHere')) {
   // Experiment code here
}
```
