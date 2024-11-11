load(
    "//lib/builders.star",
    "TRY_ACCOUNT",
    "acls",
    "bucket",
    "builder",
    "builder_coverage",
    "cq_acls",
    "cq_retry_config",
    "default_timeout",
    "defaults",
    "dimensions",
    "recipe",
    "try_builder_base",
)

try_builders = []

def try_builder(properties = None, **kwargs):
    try_builder_base(properties = properties, **kwargs)
    try_builders.append(kwargs["name"])

builder_coverage(
    covered_oss = ["linux", "win64", "mac"],
    builder_factory = try_builder,
    builder_name_pattern = "dtf_%s_experiments",
    recipe_name = "devtools/devtools-frontend",
    execution_timeout = default_timeout,
    build_numbers = True,
    properties = {"run_experimental_steps": True},
)

builder_coverage(
    covered_oss = ["linux", "win64", "mac", "mac_arm64"],
    builder_factory = try_builder,
    builder_name_pattern = "devtools_frontend_shuffled_%s_rel",
    recipe_name = "devtools/devtools-frontend",
    execution_timeout = default_timeout + 15 * time.minute,
    priority = 50,
)

builder_coverage(
    covered_oss = ["linux", "win64", "mac", "mac_arm64"],
    builder_factory = try_builder,
    builder_name_pattern = "e2e_stressor_%s",
    recipe_name = "devtools/dtf-e2e-stress",
    execution_timeout = default_timeout,
    priority = 50,
)

luci.list_view(
    name = "try-misc",
    title = "Try misc",
    favicon = defaults.favicon,
    entries = [luci.list_view_entry(builder = b) for b in try_builders],
)
