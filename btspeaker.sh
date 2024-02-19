#!/bin/bash

BTSP="67:24:34:34:CE:48"

bluetoothctl remove ${BTSP}

bluetoothctl scan on > ./bt.list &
pid=$!

check_speaker() {
    grep -q $BTSP ./bt.list
}

# Wait for 30 seconds or until speaker is found
WAIT=30
count=1

while [ $count -lt $WAIT ]; do
    if check_speaker; then
        echo "Speaker found! Exiting..."
        break
    fi
    sleep 1
    ((count++))
done
kill $pid

bluetoothctl connect ${BTSP}

