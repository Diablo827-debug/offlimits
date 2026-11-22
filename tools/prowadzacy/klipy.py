# Zamienia filmiki prowadzącej z generatora (zielone tło) na zapętlone klipy do gry.
# Użycie: python3 tools/prowadzacy/klipy.py plik.mp4 nazwa [nazwa2 …]   (np. idle, talk, read, laugh …)
#  • wycina zielone tło (tło = kolor ekranu gry), kadruje do postaci (pomija znak wodny w rogu),
#  • zapętla bez szarpnięcia (końcówka płynnie przechodzi w początek), bez dźwięku, H.264.
# Wynik: public/prowadzacy/wideo/<nazwa>.mp4
import sys, os, subprocess, tempfile, glob
import numpy as np
from PIL import Image

src, names = sys.argv[1], sys.argv[2:] or ['idle']
out = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'prowadzacy', 'wideo')
os.makedirs(out, exist_ok=True)
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]).decode())
tmp = tempfile.mkdtemp()
subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', 'fps=3', os.path.join(tmp, 'f%03d.png')], check=True)
x0 = y0 = 1 << 30; x1 = y1 = 0
for f in sorted(glob.glob(os.path.join(tmp, 'f*.png'))):
    a = np.asarray(Image.open(f).convert('RGB')).astype(int)
    h, w, _ = a.shape
    green = (a[:, :, 1] > 150) & (a[:, :, 1] - np.maximum(a[:, :, 0], a[:, :, 2]) > 60)
    fg = ~green
    fg[int(h * .88):, int(w * .8):] = False  # znak wodny generatora
    fg[:, :2] = fg[:, -2:] = False
    ys, xs = np.where(fg)
    x0, x1, y0, y1 = min(x0, xs.min()), max(x1, xs.max()), min(y0, ys.min()), max(y1, ys.max())
pad = 12
x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
x1, y1 = min(w - 1, x1 + pad), min(h - 1, y1 + pad)
cw, ch = (x1 - x0 + 1) // 2 * 2, (y1 - y0 + 1) // 2 * 2
fade = min(0.6, dur / 4)
body = dur - fade
H = 1080
vf = (f"[0:v]crop={cw}:{ch}:{x0}:{y0},scale=-2:{H},chromakey=0x0BEB0B:0.16:0.06,despill=type=green,split[p][q];"
      f"[p]trim={fade}:{dur},setpts=PTS-STARTPTS[a];[q]trim=0:{fade},setpts=PTS-STARTPTS[b];"
      f"[a][b]xfade=transition=fade:duration={fade}:offset={body - fade}[k];"
      f"color=c=0x0b0b0b:s=2x2:r=30[bg0];[bg0][k]scale2ref[bg][k2];[bg][k2]overlay=shortest=1,fps=30,format=yuv420p")
first = os.path.join(out, names[0] + '.mp4')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-filter_complex', vf, '-an', '-c:v', 'libx264', '-preset', 'veryfast',
                '-crf', '24', '-movflags', '+faststart', first + '.tmp.mp4'], check=True)
os.replace(first + '.tmp.mp4', first)
for n in names[1:]:
    subprocess.run(['cp', first, os.path.join(out, n + '.mp4')], check=True)
print('ok', names, 'kadr', cw, 'x', ch, 'od', x0, y0)
