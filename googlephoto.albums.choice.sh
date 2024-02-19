#!/bin/bash

work_path="/home/pi/new-horizons-conf"
file_path="googlephoto.albums"
conf_path="config.js.googlephoto.template"
last_conf="config.js"
mgcf_path="/home/pi/MagicMirror/config"
cach_path="/home/pi/MagicMirror/modules/MMM-GooglePhotos/cache"

cd ${work_path}

if [ ! -f "$file_path" ]; then
    logger "$0> no $file_path"
    exit 1
fi

#mapfile -t strings < <(grep -E '^[A-Za-z0-9.]+$' "$file_path")
mapfile -t strings < <(grep -E '^[0-9.].*[A-Za-z]+$' "$file_path")

num_strings=${#strings[@]}

random_index=$((RANDOM % num_strings))

ALB="${strings[random_index]}"

#echo $ALB

cp ${conf_path} ${last_conf}
sed -i "s/@ALBUM@/${ALB}/g" ${last_conf}

cp ${last_conf} ${mgcf_path}
#rm /home/pi/MagicMirror/modules/MMM-GooglePhotos/cache/*
rm ${cach_path}/*
