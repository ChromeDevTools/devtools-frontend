# Settings, Experiments, and Features in Chromium DevTools

From a developers perspective the Chromium DevTools experience can be
customized in three ways: via Settings\>Preferences, Settings\>Experiments,
or by passing a command line flag to Chromium.

[TOC]

## How to add experiments

If you want to launch a new feature in DevTools behind an experiment flag, you
will need to do two things:

1.  Make Chromium aware of the experiment and enable it to track users
    enabling/disabling the experiment.
2.  Register the experiment in DevTools to have it added to the Settings UI.

### Chromium

In Chromium, edit `tools/metrics/histograms/enums.xml`. Find the enum titled
`DevToolsExperiments` (your best bet is to search for this text in your editor,
as `enums.xml` is very large).

Go to the end of this enum, and add a new entry. Make sure that the `value` is
increased by one from the previous entry. The label can be anything you like but
make sure it is easily identifiable.

```xml
<int value="95" label="yourExperimentNameHere"/>
```

See an example Chromium CL [here](https://crrev.com/c/4915777).

### DevTools front-end

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
   /* documentation */ 'https://goo.gle/js-profiler-deprecation',
   /* feedback */ 'https://crbug.com/1354548'
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

## How to add command line flags

[go/chrome-devtools:command-line-config](http://go/chrome-devtools:command-line-config)

In some situations it would be convenient (or is even necessary) to configure
DevTools directly via the command line interface (CLI). This is particularly
useful for features which have both a DevTools front-end and a Chromium back-end
component, and allows configuration from a single source of truth. For live
demos of features which are still under development, this can be very helpful
as well. Presenters would have peace of mind, knowing that their feature is
working correctly, as long as they are re-using the right command to launch
Chromium.

### Define a new `base::Feature`

Add a new `base::Feature` to DevTools' [`features.cc`](https://crsrc.org/c/chrome/browser/devtools/features.cc). This feature will automatically be available as a Chrome command line parameter:

```cxx
// in browser_features.cc

BASE_FEATURE(kDevToolsNewFeature, "DevToolsNewFeature",
             base::FEATURE_DISABLED_BY_DEFAULT);

// Optionally add feature parameters
const base::FeatureParam<std::string> kDevToolsNewFeatureStringParam{
    &kDevToolsNewFeature, "string_param", /*default_value=*/""};
const base::FeatureParam<double> kDevToolsNewFeatureDoubleParam{
    &kDevToolsNewFeature, "double_param", /*default_value=*/0};

```

Start Chrome via command line including flags:

```
out/Default/chrome --enable-features=DevToolsNewFeature
```

You can even pass additional feature parameters:

```
out/Default/chrome --enable-features="DevToolsNewFeature:string_param/foo/double_param/0.5"
```

### Add the new feature to the host configuration being sent to DevTools

 Add the new feature to `DevToolsUIBindings::GetHostConfig` ([link to code](https://crsrc.org/c/chrome/browser/devtools/devtools_ui_bindings.cc;l=1506;drc=dd0b2a0bee86088ec0d481bd8722c06edaaba4a4), [example CL](https://crrev.com/c/5625935)).

### In DevTools, use the new property added to HostConfig

* Update the type definition in [`Runtime.ts`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/core/root/Runtime.ts;l=326;drc=a1e6997df9503f1c29f84e7ffebcdadbaa91ed71).
* Update the dummy value in [`InspectorFrontendHost.ts`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/core/host/InspectorFrontendHost.ts;l=401;drc=197a33e1793066c8d32b8670e06cd55364121537).
* For tests, update the stub in [`EnvironmentHelpers.ts`](https://crsrc.org/c/third_party/devtools-frontend/src/front_end/testing/EnvironmentHelpers.ts;l=494;drc=f1699bd12f8a486c749a849561391d890208f613).
* Access the host config via `Common.Settings.Settings.instance().getHostConfig()`.

Please refer to this [example CL](https://crrev.com/c/5626314).
