#!/bin/bash


for ((i = 0; i<3; i++)); do
    node index.js --port $((3000 + i)) --servername server_$i&
done


echo "Press Enter to kill all processes"
read -r


pkill -f 'node index.js'

