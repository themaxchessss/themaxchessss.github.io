from pathlib import Path
from html.parser import HTMLParser
import subprocess

page = Path("index.html")
html = page.read_text(encoding="utf-8")

# The owner-console booklet is returned from a single-quoted JavaScript
# string, but its embedded HTML/JavaScript contains literal newlines and
# unescaped single quotes. Escape both without changing generated HTML.
prefix = "  return '"
suffix = "</body></html>';"
start = html.find(prefix)
content_start = start + len(prefix) if start >= 0 else -1
end = html.find(suffix, content_start) if content_start >= 0 else -1
if start < 0 or end < 0:
    raise SystemExit("Could not locate the MaxChess newsletter booklet string.")
inner = html[content_start:end]
out = []
slash_run = 0
newline_count = 0
quote_count = 0
for ch in inner:
    if ch == "\n":
        out.append("\\n")
        newline_count += 1
        slash_run = 0
    elif ch == "'" and slash_run % 2 == 0:
        out.append("\\'")
        quote_count += 1
        slash_run = 0
    else:
        out.append(ch)
        slash_run = slash_run + 1 if ch == "\\\\" else 0
html = html[:content_start] + "".join(out) + html[end:]
page.write_text(html, encoding="utf-8")
print(f"MaxChess booklet string repair: escaped {newline_count} newline(s) and {quote_count} quote(s).")

class ScriptCollector(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.in_script = False
        self.skip = False
        self.current = []
        self.scripts = []
    def handle_starttag(self, tag, attrs):
        if tag.lower() == "script":
            self.in_script = True
            attrs = dict(attrs)
            self.skip = "src" in attrs or attrs.get("type", "").lower() in ("application/ld+json", "application/json")
            self.current = []
    def handle_data(self, data):
        if self.in_script:
            self.current.append(data)
    def handle_endtag(self, tag):
        if tag.lower() == "script" and self.in_script:
            if not self.skip:
                self.scripts.append("".join(self.current))
            self.in_script = False
            self.skip = False
            self.current = []

collector = ScriptCollector()
collector.feed(html)
errors = []
for number, code in enumerate(collector.scripts, 1):
    if not code.strip():
        continue
    result = subprocess.run(["node", "--check", "-"], input=code, text=True, capture_output=True)
    if result.returncode:
        errors.append(f"Inline script {number}: {result.stderr.strip()}")
    else:
        print(f"Inline script {number}: syntax OK")
if errors:
    for error in errors:
        print(error)
    raise SystemExit("MaxChess homepage JavaScript validation failed.")
print(f"Validated {len(collector.scripts)} inline JavaScript blocks.")
