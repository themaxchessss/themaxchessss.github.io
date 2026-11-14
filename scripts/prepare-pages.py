from pathlib import Path
import re
html = Path("index.html").read_text(encoding="utf-8")
positions = [m.start() for m in re.finditer(re.escape("</script>"), html, re.IGNORECASE)]
for n in (9, 10):
    pos=positions[n]
    print(f"TAG_{n+1}_LONG={html[max(0,pos-4500):pos+80]!r}")
