set -e
mkdir -p raw src
ids="1BZhVD91OE3eNErUpVV-VtXSTezH6WcMJ:IMG_3439 1MpldWUPcLFqsE9ZBhG1Cabk99h1i4N87:IMG_3441 1WK-k3jeAhLks-j9dM8fjsUQQORpTHbqi:IMG_3442 1gkOkkbzi9F2uCTJsrUyjIfYdKyAC0cni:IMG_3443 11G-aiyth2Ne-JTxCfZgA_7JvXdcn_UTW:IMG_3446 1qlQOPsHPjvd1eVJBIvXREQ_8jQAUqUKc:IMG_3448 1JmxlDncJ2r_KmgWdwXQT21bd5BmRP_CU:IMG_3456 14M-rW16rCkDiEqBw0edqYndlBDg5gdhK:IMG_3459 1DpsEPvu1SrXn548ic9lMHy-_8Xp8Z02M:IMG_3460"
for p in $ids; do id=${p%%:*}; n=${p##*:}
  gdown -q "https://drive.google.com/uc?id=$id" -O raw/$n.MOV
  ffprobe -v error -show_format -show_streams -of json raw/$n.MOV > src/$n.probe.json
  ffmpeg -y -loglevel error -i raw/$n.MOV -vf "scale=1080:1920:force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30" -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -ar 48000 -movflags +faststart src/$n.mp4
  ls -la src/$n.mp4
done
python3 - <<'PY'
import json, glob, subprocess, numpy as np
from faster_whisper import WhisperModel
def pcm(f):
    raw = subprocess.run(['ffmpeg','-loglevel','error','-i',f,'-ac','1','-ar','16000','-f','s16le','-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0
m = WhisperModel("medium", device="cpu", compute_type="int8")
for f in sorted(glob.glob("src/*.mp4")):
    segs, info = m.transcribe(pcm(f), language="bn", word_timestamps=True, vad_filter=False, beam_size=5)
    out = [{"start": s.start, "end": s.end, "text": s.text, "words": [[w.start, w.end, w.word] for w in (s.words or [])]} for s in segs]
    json.dump({"duration": info.duration, "segments": out}, open(f[:-4] + ".json", "w"), ensure_ascii=False, indent=0)
    print(f, info.duration, len(out), flush=True)
PY
