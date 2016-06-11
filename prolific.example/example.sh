#!/bin/bash

prolific run node program.bin.js
prolific run -- node program.bin.js

prolific run \
    tcp --url tcp://127.0.0.1:8514 \
    syslog --appliation foo --serialize wafer \
    tee \
    tcp --url tcp://127.0.0.1:514 \
    node parent.bin.js --param value prolific run node child.bin.js
