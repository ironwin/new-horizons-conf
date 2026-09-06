#!/bin/bash


csh=/home/pi/new-horizons-conf/backimages.choice.sh
dow=$(date +"%u")
tday=$(date +"%Y%m%d")
nowm=$(date +"%Y%m%d-%H:%M")
nowh=$(date +"%-H")

cd /home/pi/MagicMirror
logger "magicmirror : ${dow} ${nowh}"

# 1. 매일 20시 이후 : 타임라인 슬라이드쇼 실행
if [ "${nowh}" -ge 20 ]; then
    logger "magicmirror > myslideshow (20시)"
    $csh
# 2. 일요일 (8시 이후) / 토요일 (9시 이후) : 타임라인 슬라이드쇼
elif [[ "${dow}" == "7" && "${nowh}" -gt 8 ]]; then
    logger "magicmirror > myslideshow"
    $csh
elif [[ "${dow}" == "6" && "${nowh}" -gt 9 ]]; then
    logger "magicmirror > myslideshow"
    $csh
# 3. 금요일 12시 이후 : 타임라인 슬라이드쇼
elif [[ "${dow}" == "5" && "${nowh}" -gt 12 ]]; then
    logger "magicmirror > myslideshow"
    $csh
# 4. 평일 주간 : 기본 화면 (달력, 날씨 등)
else
    cp ./config/config.js.base ./config/config.js
fi 

#pm2 restart mm
DISPLAY=:0 npm start
