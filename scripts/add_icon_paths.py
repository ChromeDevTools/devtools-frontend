#!/usr/bin/env python3

# Copyright 2024 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import sys


def add_image_to_config(image_name):
    """
    Adds required image paths to the devtools_grd_files.gni and devtools_image_files.gni.

    Args:
        image_name: The name of the image file (e.g., "palette").
    """

    grd_files_path = "config/gni/devtools_grd_files.gni"
    image_files_path = "config/gni/devtools_image_files.gni"

    grd_files_line = f'  "front_end/Images/{image_name}.svg",'
    image_files_line = f'  "{image_name}.svg",'

    # --- Update devtools-frontend/config/gni/devtools_grd_files.gni ---

    with open(grd_files_path, "r") as f:
        grd_files_lines = f.readlines()

    start_index = grd_files_lines.index("grd_files_bundled_sources = [\n") + 1
    end_index = grd_files_lines.index("]\n", start_index)

    for i in range(start_index, end_index):
        current_file_name = grd_files_lines[i].strip().strip('",')
        if current_file_name.startswith("front_end/Images/"):
            current_file_name = current_file_name[len("front_end/Images/"):]
        if current_file_name > f"{image_name}.svg":
            grd_files_lines.insert(i, grd_files_line + "\n")
            break
    else:
        grd_files_lines.insert(end_index, grd_files_line + "\n")

    with open(grd_files_path, "w") as f:
        f.writelines(grd_files_lines)

    # --- Update devtools-frontend/config/gni/devtools_image_files.gni ---

    with open(image_files_path, "r") as f:
        image_files_lines = f.readlines()

    start_index = image_files_lines.index("devtools_svg_sources = [\n") + 1
    end_index = image_files_lines.index("]\n", start_index)

    for i in range(start_index, end_index):
        if image_files_lines[i] > image_files_line:
            image_files_lines.insert(i, image_files_line + "\n")
            break
    else:
        image_files_lines.insert(end_index, image_files_line + "\n")

    with open(image_files_path, "w") as f:
        f.writelines(image_files_lines)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python add_icon_paths.py <image_name>")
        sys.exit(1)

    image_name = sys.argv[1]
    add_image_to_config(image_name)
    print(f"Successfully added {image_name} to the configuration files.")
