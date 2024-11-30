#!/bin/bash

work_path="/home/pi/new-horizons-conf"
file_path="googlephoto.albums"
tplm_conf="./magicmirror/config.js.googlephoto.template"
last_conf="./magicmirror/config.js"
mgcf_path="/home/pi/MagicMirror/config"
cach_path="/home/pi/MagicMirror/modules/MMM-GooglePhotos/cache"

cd ${work_path}

if [ ! -f "$file_path" ]; then
    logger "$0> no $file_path"
    exit 1
fi

#mapfile -t strings < <(grep -E '^[A-Za-z0-9.]+$' "$file_path")
#mapfile -t strings < <(grep -E '^[0-9.].*[A-Za-z]+$' "$file_path")
mapfile -t strings < <(cat "$file_path")

num_strings=${#strings[@]}
#echo ${strings[@]}

random_index=$((RANDOM % num_strings))

ALB="${strings[random_index]}"

#echo $ALB
#exit

cp ${last_conf} ${last_conf}.old

for i in {1..3}
do
    random_index=$((RANDOM % num_strings))
    ALB="${strings[random_index]}"

    cp ${tplm_conf} ${last_conf}
    sed -i "s/@ALBUM@/${ALB}/g" ${last_conf}

    diff ${last_conf} ${last_conf}.old
    if [ $? -ne 0 ]; then
        break
    fi
    sleep 1

done

cp ${last_conf} ${mgcf_path}
rm ${cach_path}/*
