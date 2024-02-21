#!/bin/bash

BTSP="67:24:34:34:CE:48"
BTLT="/tmp/bts.list"

# truncate
cat /dev/null > ${BTLT}


check_bluetooth_service() {
    systemctl is-active bluetooth.service >/dev/null 2>&1
    return $?
}

reg_speaker() {

  bluetoothctl remove ${BTSP}
  stdbuf -oL bluetoothctl --timeout 120 scan on > ${BTLT} 
  bluetoothctl connect ${BTSP}
  logger "success register bluetooth speaker ${BLSP}"

}

# 300초 동안 반복해서 Bluetooth 서비스 체크
WTIME=300
for ((i=0; i<WTIME; i++)); do
    if check_bluetooth_service; then
        reg_speaker
        exit 0
    else
        logger "wait bluetooth service active $i/$WTIME"
    fi
    sleep 1
done

logger "timeout wait bluetooth service active"




