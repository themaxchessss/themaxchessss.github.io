from pathlib import Path
import re

page = Path("index.html")
html = page.read_text(encoding="utf-8")
# HTML ends a script element at the first literal </script>, even when the
# characters appear inside a JavaScript string/template. Escape quoted
pattern = re.compile(r"""(['\"`])</script>\1""", re.IGNORECASE)
fixed, count = pattern.subn(lambda m: m.group(1) + r"<\/script>" + m.group(1), html)
if count:
    page.write_text(fixed, encoding="utf-8")
print(f"MaxChess homepage script-safety check: escaped {count} quoted </script> sequence(s).")
print(f"Homepage size: {page.stat().st_size} bytes.")
