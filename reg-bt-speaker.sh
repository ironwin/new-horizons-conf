#!/bin/bash

BTSP="67:24:34:34:CE:48"
BTLT="/tmp/bts.list"


# $? : 0 [success]
#      other [fail]

check_bluetooth_service() {
    systemctl is-active bluetooth.service >/dev/null 2>&1
    return $?
}

check_speaker() {
  grep -q ${BTSP} ${BTLT}
}

check_paried() {
  bluetoothctl paired-devices | grep ${BTSP}
  return $?
}

reg_speaker() {

  logger "regist bluetooth speeker ${BTSP}"

  # truncate list
  cat /dev/null > ${BTLT}

  # remove first 
  bluetoothctl remove ${BTSP}

  # scan on for $1 min
  stdbuf -oL bluetoothctl --timeout $1 scan on > ${BTLT} 

  if check_speaker; then
      logger "no ${BTSP} in ${BTLT}"
  else
      bluetoothctl connect ${BTSP}
      logger "success register bluetooth speaker ${BLSP}"
      return 0
  fi 
  return 1
}

# 300초 동안 반복해서 Bluetooth 서비스 체크
WTIME=300
for ((i=0; i<WTIME; i++)); do
    if check_bluetooth_service; then
        logger "wait bluetooth service active $i/$WTIME"
    else
        reg_speaker 180
        exit 0
    fi
    sleep 1
done

logger "timeout wait bluetooth service active"




