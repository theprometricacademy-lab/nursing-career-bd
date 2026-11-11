# Natural Bangla voice (Microsoft neural, bn-BD Nabanita) for the reel lines.
import asyncio, json, os, edge_tts
lines = json.load(open("tts/lines_edge.json", encoding="utf-8"))
os.makedirs("out", exist_ok=True)
async def main():
    for ln in lines:
        for v in ["bn-BD-NabanitaNeural", "bn-IN-TanishaaNeural"]:
            c = edge_tts.Communicate(ln["text"], v, rate="-6%", pitch="+0Hz")
            await c.save(f"out/{v.split('-')[2][:4].lower()}_{ln['id']}.mp3")
            print(v, ln["id"], flush=True)
asyncio.run(main())
