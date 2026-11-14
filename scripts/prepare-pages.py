from pathlib import Path
import subprocess

html = Path("index.html").read_text(encoding="utf-8")
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
    if "src=" not in tag.lower() and code.strip():
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
