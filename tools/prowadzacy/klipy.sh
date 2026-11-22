#!/bin/bash
# Zamienia filmiki prowadzącego z generatora (zielone tło) na klipy do gry.
# Użycie: tools/prowadzacy/klipy.sh katalog_z_filmikami   (nazwy: idle.mp4, talk.mp4, read.mp4, laugh.mp4 …)
# Wynik: public/prowadzacy/wideo/<nazwa>.mp4 – H.264, pionowy kadr 600×1080 (postać na środku), tło w kolorze ekranu gry, bez dźwięku.
set -e
IN="$1"; OUT="$(dirname "$0")/../../public/prowadzacy/wideo"; mkdir -p "$OUT"
for f in "$IN"/*.mp4 "$IN"/*.mov "$IN"/*.webm; do
  [ -f "$f" ] || continue
  n=$(basename "${f%.*}")
  ffmpeg -v error -y -i "$f" -filter_complex "\
    [0:v]scale=-2:1080,chromakey=0x00FF00:0.18:0.08,despill=type=green[fg];\
    color=c=0x0b0b0b:s=600x1080:r=30[bg];[bg][fg]overlay=(W-w)/2:H-h:shortest=1,format=yuv420p" \
    -an -c:v libx264 -preset veryfast -crf 26 -movflags +faststart "$OUT/$n.tmp.mp4"
  mv "$OUT/$n.tmp.mp4" "$OUT/$n.mp4"
  echo "ok $n"
done
