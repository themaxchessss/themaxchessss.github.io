from pathlib import Path
import re
html = Path("index.html").read_text(encoding="utf-8")
needle = "</script>"
positions = [m.start() for m in re.finditer(re.escape(needle), html, re.IGNORECASE)]
print(f"Homepage script closing-tag count: {len(positions)}")
for n in (7, 8, 9, 10):
    if n < len(positions):
        pos = positions[n]
        print(f"TAG_{n+1}_CONTEXT={html[max(0,pos-1100):pos+len(needle)+500]!r}")
