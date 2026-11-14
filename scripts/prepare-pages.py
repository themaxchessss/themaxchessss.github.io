from pathlib import Path
import subprocess

page = Path("index.html")
html = page.read_text(encoding="utf-8")

# The owner-console booklet is assembled as a single-quoted JavaScript string.
# Escape every source newline inside that returned HTML document so the
# embedded script and markup remain one valid JavaScript string.
start_marker = "  return '<!doctype html>"
end_marker = "</body></html>';"
start = html.find(start_marker)
end = html.find(end_marker, start + len(start_marker)) if start >= 0 else -1
if start < 0 or end < 0:
    raise SystemExit("Could not locate the MaxChess newsletter booklet HTML string.")
end += len("</body></html>")
segment = html[start:end]
newline_count = segment.count("\n")
if newline_count:
    html = html[:start] + segment.replace("\n", "\\n") + html[end:]
    page.write_text(html, encoding="utf-8")
print(f"MaxChess booklet string repair: escaped {newline_count} newline(s).")

pos = 0
number = 0
errors = []
while True:
    start = html.lower().find("<script", pos)
    if start < 0:
        break
    tag_end = html.find(">", start)
    if tag_end < 0:
        break
    end = html.lower().find("</script>", tag_end + 1)
    if end < 0:
        errors.append("A script element has no closing </script> tag.")
        break
    tag = html[start:tag_end + 1]
    code = html[tag_end + 1:end]
    is_json = "application/ld+json" in tag.lower() or "application/json" in tag.lower()
    if "src=" not in tag.lower() and not is_json and code.strip():
        number += 1
        result = subprocess.run(["node", "--check", "-"], input=code, text=True, capture_output=True)
        if result.returncode:
            errors.append(f"Inline script {number}: {result.stderr.strip()}")
        else:
            print(f"Inline script {number}: syntax OK")
    pos = end + len("</script>")

if errors:
    for error in errors:
        print(error)
    raise SystemExit("MaxChess homepage JavaScript validation failed.")
print(f"Validated {number} inline JavaScript blocks.")
