#!/bin/bash

BTSP="67:24:34:34:CE:48"


# $? : 0 [success]
#      other [fail]

check_bluetooth_service() {
    systemctl is-active bluetooth.service >/dev/null 2>&1
    return $?
}

check_speaker() {
  bluetoothctl devices | grep ${BTSP}
  return $?
}

check_paired() {
  bluetoothctl paired-devices | grep ${BTSP}
  return $?
}

reg_speaker() {

  logger "regist bluetooth speeker ${BTSP}"

  # remove first 
  bluetoothctl remove ${BTSP}

  # scan on for $1 min
  stdbuf -oL bluetoothctl --timeout $1 scan on  

  if check_speaker; then
      bluetoothctl connect ${BTSP}
      logger "success register bluetooth speaker ${BLSP}"
      return 0
  fi
  logger "no ${BTSP} in devices"
  return 1
}

# 300초 동안 반복해서 Bluetooth 서비스 체크
WTIME=300
for ((i=0; i<WTIME; i++)); do
    if check_bluetooth_service; then
        reg_speaker 180
        break
    fi
    logger "wait bluetooth service active $i/$WTIME"
    sleep 1
done

# final try 
bluetoothctl paired-devices
if check_paired; then
   bluetoothctl paired-devices
else
   reg_speaker 180
fi





