"""AGI 1.7.0 — OMEGA COMMAND Primary Runtime Entrypoint."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from agents.AGI_1_7.engine.agi17.adapters.agi_17_adapter import AGI17Adapter


def main() -> int:
    parser = argparse.ArgumentParser(description="AGI 1.7.0 — OMEGA COMMAND Runtime")
    parser.add_argument("--title", default="AGI 1.7 Mission", help="Mission title")
    parser.add_argument("--prompt", default=None, help="Mission prompt to execute")
    parser.add_argument("--profile-only", action="store_true", help="Run capability profiler and startup reconciliation only")
    parser.add_argument("--force-hierarchical", action="store_true", help="Force hierarchical DAG planning")
    args = parser.parse_args()

    adapter = AGI17Adapter()
    startup = adapter.run_startup_reconciliation()

    if args.profile_only or not args.prompt:
        profile = adapter.profiler.profile_all()
        print(
            json.dumps(
                {
                    "runtime": "AGI 1.7.0 — OMEGA COMMAND",
                    "startup": startup,
                    "capability_profile_summary": {
                        "logical_cores": profile["cpu"]["logical_cores"],
                        "avail_phys_mb": profile["memory_live"]["avail_phys_mb"],
                        "d_drive_free_gb": profile["storage"]["D"]["free_gb"],
                        "d_probe_sha256": profile["storage"]["D"]["write_read_probe"]["sha256"],
                        "agy_available": profile["antigravity_cli"]["available"],
                        "docker_available": profile["docker"]["available"],
                    },
                },
                indent=2,
            )
        )
        return 0

    result = adapter.execute(
        title=args.title,
        prompt=args.prompt,
        force_hierarchical=args.force_hierarchical,
    )
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
