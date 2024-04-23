#!/bin/bash


csh=/home/pi/new-horizons-conf/googlephoto.albums.choice.sh
dow=$(date +"%u")
tday=$(date +"%Y%m%d")
nowm=$(date +"%Y%m%d-%H:%M")
nowh=$(date +"%H")

cd /home/pi/MagicMirror
logger "mm.sh > magicmirror : ${dow} ${nowh}"

# sunday evening over 19 -> local-photo (JWST)
if [[ "${dow}" == "7" && "${nowh}" -gt 18 ]]; then
    logger "mm.sh > localphoto.ftp"
    cp ./config/config.js.ftp ./config/config.js
#
# sunday, sat : googlephtots    
elif [[ "${dow}" == "6" || "${dow}" == "7" ]]; then
    logger "mm.sh > googlephoto"
    $(${csh})
#
# friday 12 : googlephotos
elif [[ "${dow}" == "5" && "${nowh}" -gt 12 ]]; then
    logger "mm.sh > googlephoto"
    $(${csh})
#
# weekday over 18 : googlephoto
elif [ "${nowh}" -gt 18 ]; then
    logger "mm.sh > googlephoto"
    $(${csh})
#
else
    logger "mm.sh > calendor"
    cp ./config/config.js.common ./config/config.js
fi 

export ELECTRON_DISABLE_GPU=1
DISPLAY=:0 npm start

