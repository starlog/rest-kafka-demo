#!/bin/bash
echo Processing server1
cd server1
npm install
tsc
echo Processing server2
cd ../server2
npm install
tsc
cd ..
