from pathlib import Path
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
        slash_run = slash_run + 1 if ch == "\\" else 0
html = html[:content_start] + "".join(out) + html[end:]
page.write_text(html, encoding="utf-8")
print(f"MaxChess booklet string repair: escaped {newline_count} newline(s) and {quote_count} quote(s).")

# Validate the real owner-newsletter script block. Find its outer <script>
# tag by searching backward from the unique function marker; the generated
# booklet contains a nested script tag as string data.
fn = html.find("function booklet()")
script_start = html.rfind("<script>", 0, fn)
script_end = html.find("</script>", script_start)
if fn < 0 or script_start < 0 or script_end < 0:
    raise SystemExit("Could not locate the owner-newsletter script block.")
code = html[script_start + len("<script>"):script_end]
result = subprocess.run(["node", "--check", "-"], input=code, text=True, capture_output=True)
if result.returncode:
    print(result.stderr)
    raise SystemExit("Owner-newsletter JavaScript syntax validation failed.")
print("Owner-newsletter script syntax: OK.")
