import asyncio, json, edge_tts, subprocess, sys
VOICE = sys.argv[1] if len(sys.argv) > 1 else "bn-BD-NabanitaNeural"
RATE = sys.argv[2] if len(sys.argv) > 2 else "+0%"
S = json.load(open("script.json"))
async def main():
    for i, s in enumerate(S):
        await edge_tts.Communicate(s["voice"], VOICE, rate=RATE).save(f"a{i}.mp3")
asyncio.run(main())
ff = "ffmpeg"
durs = []
for i in range(len(S)):
    out = subprocess.run([ff, "-i", f"a{i}.mp3", "-f", "null", "-"], capture_output=True, text=True).stderr
    t = [l for l in out.splitlines() if "time=" in l][-1].split("time=")[1].split()[0]
    h, m, s = t.split(":"); durs.append(round(int(h)*3600 + int(m)*60 + float(s), 3))
json.dump(durs, open("durs.json", "w")); print(durs, sum(durs))
