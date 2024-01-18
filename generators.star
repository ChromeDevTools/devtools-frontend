# Copyright 2024 The DevTools Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

def add_tree_closers_to_som(ctx):
    """
    This callback adds the necessary properties to the tree closer builders
    so they get registered with Sheriff-0-Matic.
    """
    tree_closers = []
    notify = ctx.output["luci-notify.cfg"]
    for notifier in notify.notifiers:
        if notifier.tree_closers:
            for builder in notifier.builders:
                tree_closers.append(builder.name)
    tree_closers = set(tree_closers)

    build_bucket = ctx.output["cr-buildbucket.cfg"]
    for bucket in build_bucket.buckets:
        if bucket.name == "ci":
            for builder in bucket.swarming.builders:
                if builder.name in tree_closers:
                    properties = json.decode(builder.properties)
                    properties["sheriff_rotations"] = ["devtools_frontend"]
                    builder.properties = json.encode(properties)

lucicfg.generator(add_tree_closers_to_som)
