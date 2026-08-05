#!/usr/bin/env python3
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
ERRORS: list[str] = []


def tracked(path: str) -> bool:
    result = subprocess.run(
        ["git", "ls-files", "--error-unmatch", path],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    return result.returncode == 0


for env_name in [".env", ".env.local", ".env.production", ".env.production.local"]:
    if tracked(env_name):
        ERRORS.append(f"Секретный файл отслеживается Git: {env_name}")

source_roots = [ROOT / name for name in ("app", "components", "lib")]
client_secret_names = (
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADMIN_USER_IDS",
    "ADMIN_RATE_LIMIT_SECRET",
)

jwt_pattern = re.compile(r"eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}")

for source_root in source_roots:
    if not source_root.exists():
        continue
    for path in source_root.rglob("*"):
        if not path.is_file() or path.suffix not in {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        relative = path.relative_to(ROOT)
        first_lines = "\n".join(text.splitlines()[:5])
        is_client = "'use client'" in first_lines or '"use client"' in first_lines
        if is_client:
            for secret_name in client_secret_names:
                if secret_name in text:
                    ERRORS.append(f"Серверный секрет упомянут в клиентском модуле: {relative} ({secret_name})")
        if jwt_pattern.search(text):
            ERRORS.append(f"Похожий на JWT секрет найден в исходнике: {relative}")

if ERRORS:
    print("❌ Проверка исходников не пройдена:")
    for item in ERRORS:
        print(f"  • {item}")
    raise SystemExit(1)

print("✅ Секреты не отслеживаются Git и не попали в клиентские модули")
