#!/bin/bash

BTSP="67:24:34:34:CE:48"
BTLT="/tmp/bt.list"
bluetoothctl remove ${BTSP}

cat /dev/null > ${BTLT}
stdbuf -oL bluetoothctl scan on > ${BTLT} &
pid=$!

check_speaker() {
    grep -q $BTSP ${BTLT}
}

# Wait for 30 seconds or until speaker is found
WAIT=30
count=1

while [ $count -lt $WAIT ]; do
    if check_speaker; then
        logger "Speaker found! Exiting..."
        bluetoothctl connect ${BTSP}
        exit 0
    fi
    sleep 1
    ((count++))
done
kill $pid

logger "Speaker not found! ${BTS}"

