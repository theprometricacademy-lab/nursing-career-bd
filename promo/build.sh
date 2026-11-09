#!/bin/bash
for RATE in "+0%" "+8%" "+15%" "+22%"; do
  python3 tts.py bn-BD-NabanitaNeural "$RATE" || exit 1
  node render.js; c=$?
  [ $c -eq 0 ] && exit 0
  [ $c -eq 3 ] || exit 1
done
exit 1
