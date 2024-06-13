load(
    "//lib/builders.star",
    "CI_ACCOUNT",
    "TRY_ACCOUNT",
    "dimensions",
    "recipe",
)

PUBLIC_REPO = "https://chromium.googlesource.com/devtools/devtools-frontend"
PUBLIC_MAIN = "refs/heads/main"

def common_properties():
    props = dict(
        e2e_builder = True,
    )
    props.update({"$build/reclient": {
        "instance": "rbe-chrome-trusted",
        "metrics_project": "chromium-reclient-metrics",
    }})
    return props

BUILDERS = [
    luci.builder(
        name = "Cpp Debugging Extension Linux Debug",
        bucket = "ci",
        executable = recipe("devtools/backend"),
        service_account = CI_ACCOUNT,
        dimensions = dimensions.ubuntu,
        properties = dict(
            builder_config = "Debug",
            **common_properties()
        ),
        build_numbers = True,
    ),
    luci.builder(
        name = "Cpp Debugging Extension Linux Release",
        bucket = "ci",
        executable = recipe("devtools/backend"),
        service_account = CI_ACCOUNT,
        dimensions = dimensions.ubuntu,
        properties = dict(
            builder_config = "Release",
            upload_dwarf_binary = True,
            **common_properties()
        ),
        build_numbers = True,
    ),
]

luci.console_view(
    name = "cpp-debugging-extension",
    title = "C++ Debugging Extension",
    repo = PUBLIC_REPO,
    refs = [PUBLIC_MAIN],
    entries = [
        luci.console_view_entry(
            builder = builder,
        )
        for builder in BUILDERS
    ],
)

luci.gitiles_poller(
    name = "devtools-cpp-debugging-extension-trigger",
    bucket = "ci",
    repo = PUBLIC_REPO,
    refs = [PUBLIC_MAIN],
    triggers = BUILDERS,
    path_regexps = [
        "extensions/cxx_debugging/.+",
        "node_modules/.+",
        "third_party/.+",
    ],
)
