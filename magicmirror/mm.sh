#!/bin/bash


csh=/home/pi/new-horizons-conf/backimages.choice.sh
dow=$(date +"%u")
tday=$(date +"%Y%m%d")
nowm=$(date +"%Y%m%d-%H:%M")
nowh=$(date +"%-H")

cd /home/pi/MagicMirror
logger "magicmirror : ${dow} ${nowh}"

# sunday evening over 19 -> local-photo (JWST)
#if [[ "${dow}" == "7" && "${nowh}" -gt 18 ]]; then
#    logger "mm.sh > localphoto.ftp"
#    cp ./config/config.js.ftp ./config/config.js
#
# sunday, sat : myslideshow    
if [[ "${dow}" == "7" && "${nowh}" -gt 8 ]]; then
    logger "magicmirror > myslideshow"
    $csh
#
elif [[ "${dow}" == "6" && "${nowh}" -gt 9 ]]; then
    logger "magicmirror > myslideshow"
    $csh
#
# friday 12 : myslideshow
elif [[ "${dow}" == "5" && "${nowh}" -gt 12 ]]; then
    logger "magicmirror > myslideshow"
    $csh
#
# weekday over 18 : myslideshow
elif [ "${nowh}" -gt 18 ]; then
    logger "magicmirror > myslideshow"
    $csh
#
elif [ "${nowh}" -gt 08 ]; then
    logger "magicmirror > myslideshow"
    $csh
else
    cp ./config/config.js.base ./config/config.js
fi 

#pm2 restart mm
DISPLAY=:0 npm start
