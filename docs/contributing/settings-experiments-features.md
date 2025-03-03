# Settings, Experiments, and Features in Chromium DevTools

From a developers perspective the Chromium DevTools experience can be
customized in multiple ways:

* via Settings \> Preferences,
* via Settings \> Experiments,
* via `chrome://flags`,
* or by passing a command line flag to Chromium.

Adding new DevTools experiments is deprecated, the preferred way for adding new
features / exposing experimental features is via `base::Feature`s. These are
controllable via Chromium command line parameters or optionally via `chrome://flags`.


[TOC]

## How to add `base::Feature` feature flags

[go/chrome-devtools:command-line-config](http://go/chrome-devtools:command-line-config)

`base::Feature`s are defined in the Chromium repository and made available to
DevTools via host bindings. This allows configuring features which have both a
DevTools front-end and a Chromium back-end component from a single source of
truth. But front-end-only features can be controlled via a `base::Feature` just
as well.

By default, `base::Feature`s are configurable via command line parameters when
launching Chromium. Optionally, they can be made available via the `chrome://flags`
UI as well.

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

### Make the `base::Feature` available via `chrome://flags`

This step is optional. If you want the `base::Feature` to be controllable via the `chrome://flags` UI and not only via the command line, follow [this documentation](https://chromium.googlesource.com/chromium/src/+/main/docs/how_to_add_your_feature_flag.md#step-2_adding-the-feature-flag-to-the-chrome_flags-ui).

### Add the new feature to the host configuration being sent to DevTools

 Add the new feature to `DevToolsUIBindings::GetHostConfig` ([link to code](https://crsrc.org/c/chrome/browser/devtools/devtools_ui_bindings.cc;l=1506;drc=dd0b2a0bee86088ec0d481bd8722c06edaaba4a4), [example CL](https://crrev.com/c/5625935)).

### In DevTools, use the new property added to HostConfig

* Update the type definition in [`Runtime.ts`](https://crsrc.org/c/third_party/devtools-frontend/src/front_end/core/root/Runtime.ts).
* Update the dummy value returned by `getHostConfig` in [`InspectorFrontendHost.ts`](https://crsrc.org/c/third_party/devtools-frontend/src/front_end/core/host/InspectorFrontendHost.ts).
* Access the host config via `Root.Runtime.hostConfig`.
* In unit tests, make sure to assign the expected configuration using `updateHostConfig({ foo: bar })`.

Please refer to this [example CL](https://crrev.com/c/5626314).

## How to add experiments

Note: Adding new DevTools experiments is deprecated, please use a `base::Feature` instead.

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
