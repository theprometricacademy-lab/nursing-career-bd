import json, os, torch, soundfile as sf
from parler_tts import ParlerTTSForConditionalGeneration
from transformers import AutoTokenizer

torch.manual_seed(7)
name = "ai4bharat/indic-parler-tts-pretrained"  # Apache-2.0, not gated
model = ParlerTTSForConditionalGeneration.from_pretrained(name)
tok = AutoTokenizer.from_pretrained(name)
dtok = AutoTokenizer.from_pretrained(model.config.text_encoder._name_or_path)
voices = {
  "female": "Aditi speaks in a cheerful, warm and energetic tone at a moderate pace, with very clear audio, close-sounding recording and no background noise.",
  "male": "Arjun speaks in a confident, friendly and energetic tone at a moderate pace, with very clear audio, close-sounding recording and no background noise.",
}
lines = json.load(open("tts/lines.json", encoding="utf-8"))
os.makedirs("out", exist_ok=True)
meta = {}
for v, desc in voices.items():
    d = dtok(desc, return_tensors="pt")
    for ln in lines:
        p = tok(ln["text"], return_tensors="pt")
        with torch.no_grad():
            g = model.generate(input_ids=d.input_ids, attention_mask=d.attention_mask,
                               prompt_input_ids=p.input_ids, prompt_attention_mask=p.attention_mask)
        a = g.cpu().numpy().squeeze()
        path = f"out/{v}_{ln['id']}.wav"
        sf.write(path, a, model.config.sampling_rate)
        meta[f"{v}_{ln['id']}"] = len(a) / model.config.sampling_rate
        print(v, ln["id"], round(meta[f"{v}_{ln['id']}"], 2), flush=True)
json.dump(meta, open("out/durations.json", "w"), indent=1)
