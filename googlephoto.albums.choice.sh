#!/bin/bash

file_path="googlephoto.albums"

if [ ! -f "$file_path" ]; then
    exit 1
fi

#mapfile -t strings < <(grep -E '^[A-Za-z0-9.]+$' "$file_path")
mapfile -t strings < <(grep -E '^[0-9.].*[A-Za-z]+$' "$file_path")

num_strings=${#strings[@]}

random_index=$((RANDOM % num_strings))

echo "${strings[random_index]}"

