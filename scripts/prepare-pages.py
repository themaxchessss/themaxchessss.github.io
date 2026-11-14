from pathlib import Path
html=Path("index.html").read_text(encoding="utf-8")
for needle in ("function booklet()", "ownerNewsletterMakeBooklet"):
    p=html.find(needle)
    print(f"NEEDLE_{needle!r}_AT_{p}_CONTEXT={html[max(0,p-2500):p+500]!r}")
