#!/bin/bash

cd /home/pi/new-horizons-conf

FILTER="jwst"  # 필터링할 문자열(여러개라면 정규식 사용 가능)
IMAGE_PATH="/media/pi/SSD-256-USB/PHOTOS"
CONFIG_BASE="./magicmirror/config.js.onthisdayslideshow"
CONFIG_LAST="/home/pi/MagicMirror/config/config.js"
CONFIG_RECENT="./magicmirror/config.js.backimages"  # 최근 추가 폴더 전체 재생용 (MMM-MySlideshow)
RECENT_DAYS=${RECENT_DAYS:-10}  # 가장 최근 폴더가 이 일수 이내에 추가됐으면 CONFIG_RECENT 사용


# 1. 디렉토리 목록 생성 및 필터링
dirs=()
while IFS= read -r -d '' dir; do
  dir_name=$(basename "$dir")
  [[ "$dir_name" == *$FILTER* ]] && continue
  dirs+=("$dir")
done < <(find ${IMAGE_PATH} -mindepth 1 -maxdepth 1 -type d -print0)

# 필터링 결과가 없을 때 처리
if [ ${#dirs[@]} -eq 0 ]; then
  echo "필터 \"$FILTER\"를 포함하는 디렉토리가 없습니다."
  exit 1
fi

# 2. 생성일자 추출 및 정렬
dirinfo=()
for dir in "${dirs[@]}"; do
  btime=$(stat -c '%W' "$dir" 2>/dev/null || stat -f '%B' "$dir")
  [ "$btime" = "0" ] && btime=$(date +%s -r "$dir" 2>/dev/null)
  dirinfo+=("$btime|$dir")
done

IFS=$'\n' sorted=($(sort <<<"${dirinfo[*]}"))
unset IFS

# 2-1. 가장 최근에 추가된 폴더가 RECENT_DAYS일 이내면 MMM-MySlideshow로 해당 폴더 사진 전체 재생
newest="${sorted[${#sorted[@]}-1]}"
newest_btime="${newest%%|*}"
newest_name=$(basename "${newest#*|}")
age_days=$(( ($(date +%s) - newest_btime) / 86400 ))
if [ "$age_days" -lt "$RECENT_DAYS" ]; then
  echo "최근 추가 폴더: ${newest_name} (${age_days}일 전) --> backimages"
  logger "backimages.choice > recent folder ${newest_name} (${age_days}d) : backimages"
  sed "s/@IMG_DIR@/${newest_name}/g" "$CONFIG_RECENT" > "$CONFIG_LAST"
  exit 0
fi

# 3. 올해의 현재 주차(0부터 시작)
week_num=$(date +%d)
week_index=$((10#$week_num - 1))

# 4. 모듈러 연산
dir_count=${#sorted[@]}
mod_idx=$((week_index % dir_count))

# 5. 출력
TARGET=""
for i in "${!sorted[@]}"; do
  entry="${sorted[$i]}"
  dir_path="${entry#*|}"
  dir_name=$(basename "$dir_path")
  btime="${entry%%|*}"
  btime_human=$(date -d @"$btime" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || date -r "$btime" "+%Y-%m-%d %H:%M:%S")
  if [[ $i -eq $mod_idx ]]; then
    printf "[%d] %-30s %s   <-- 선택됨(week mod count)\n" "$i" "$dir_name" "$btime_human"
    #TARGET=${IMAGE_PATH}/"${dir_name}"
    TARGET="${dir_name}"
  else
    printf "[%d] %-30s %s\n" "$i" "$dir_name" "$btime_human"
  fi
done

#TARGET="26.01.shanghai"
#TARGET="26.04.nagoya"

sed "s/@IMG_DIR@/${TARGET}/g"  "$CONFIG_BASE" > "$CONFIG_LAST"

