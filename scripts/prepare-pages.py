from pathlib import Path
import re

html = Path("index.html").read_text(encoding="utf-8")
needle = "</script>"
positions = [m.start() for m in re.finditer(re.escape(needle), html, re.IGNORECASE)]
print(f"Homepage script closing-tag count: {len(positions)}")
for i, pos in enumerate(positions):
    before = html[max(0, pos-100):pos]
    after = html[pos+len(needle):pos+len(needle)+180]
    print(f"CLOSING_TAG_{i+1}: BEFORE={before!r} AFTER={after!r}")
