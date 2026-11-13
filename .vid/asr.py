import json, subprocess, sys, numpy as np
n = sys.argv[1]
raw = subprocess.run(['ffmpeg','-loglevel','error','-i',f'src/{n}.mp4','-ac','1','-ar','16000','-f','s16le','-'], capture_output=True, check=True).stdout
audio = np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0
out = {}
from faster_whisper import WhisperModel
m = WhisperModel("large-v3", device="cpu", compute_type="int8")
segs, info = m.transcribe(audio, language="bn", beam_size=1, vad_filter=True, initial_prompt="নার্সিং, সিনিয়র স্টাফ নার্স, পরীক্ষা, প্রস্তুতি, ওয়েবসাইট, Nursing Career BD, প্রশ্ন, মডেল টেস্ট, সার্কুলার, প্রাইভেট হাসপাতাল, সিভি, অ্যাকাউন্ট, ফ্রি")
out['large'] = [[round(s.start,2), round(s.end,2), s.text] for s in segs]
try:
    from transformers import pipeline
    p = pipeline("automatic-speech-recognition", model="bangla-speech-processing/BanglaASR", chunk_length_s=20)
    r = p({"raw": audio, "sampling_rate": 16000}, return_timestamps=True)
    out['bangla'] = [[c['timestamp'][0], c['timestamp'][1], c['text']] for c in r.get('chunks', [])] or r['text']
except Exception as e:
    out['bangla_err'] = str(e)[:300]
json.dump(out, open(f'asr/{n}.json','w'), ensure_ascii=False, indent=1)
print(n, json.dumps(out, ensure_ascii=False)[:2000])
