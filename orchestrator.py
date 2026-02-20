#!/usr/bin/env python3
"""ECHOMEN backend orchestration helpers.

This module provides a small executable orchestration surface for tool calls that
are referenced by the frontend (`services/tools.ts`) and the implementation
guide. It can be imported by a backend service or run directly as a CLI.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Callable

MEMORY_STORE_PATH = Path(os.getenv("ECHOMEN_MEMORY_STORE", ".echomen_memories.json"))


class OrchestratorError(RuntimeError):
    """Raised when orchestration input or execution is invalid."""


def _load_memory_store() -> dict[str, dict[str, Any]]:
    if not MEMORY_STORE_PATH.exists():
        return {}
    try:
        return json.loads(MEMORY_STORE_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise OrchestratorError(f"Memory store is corrupted: {exc}") from exc


def _save_memory_store(data: dict[str, dict[str, Any]]) -> None:
    MEMORY_STORE_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )


def memory_save(key: str, value: str, tags: list[str] | None = None) -> dict[str, Any]:
    """Persist a memory item in the local store."""
    if not key:
        raise OrchestratorError("'key' is required for memory_save")

    store = _load_memory_store()
    store[key] = {"key": key, "value": value, "tags": tags or []}
    _save_memory_store(store)
    return {"success": True, "message": f"Memory item '{key}' saved successfully."}


def memory_retrieve(key: str | None = None, tags: list[str] | None = None) -> dict[str, Any]:
    """Retrieve memory items by key or by tag matching."""
    store = _load_memory_store()

    if key:
        item = store.get(key)
        return {"success": True, "data": [item] if item else []}

    if tags:
        filtered = [
            item for item in store.values() if all(tag in item.get("tags", []) for tag in tags)
        ]
        return {"success": True, "data": filtered}

    raise OrchestratorError("Provide either 'key' or 'tags' for memory_retrieve")


def memory_delete(key: str) -> dict[str, Any]:
    """Delete a memory item by key."""
    store = _load_memory_store()
    existed = key in store
    store.pop(key, None)
    _save_memory_store(store)

    if existed:
        return {"success": True, "message": f"Memory item '{key}' deleted successfully."}
    return {"success": True, "message": f"Memory item '{key}' was not found."}


def _run_python_script(script: str) -> subprocess.CompletedProcess[str]:
    with tempfile.NamedTemporaryFile("w", suffix=".py", encoding="utf-8", delete=False) as handle:
        handle.write(script)
        temp_path = handle.name

    try:
        return subprocess.run(
            ["python3", temp_path],
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
    finally:
        Path(temp_path).unlink(missing_ok=True)


def data_analyze(script: str) -> dict[str, Any]:
    """Run a Python analysis script and return stdout/stderr."""
    completed = _run_python_script(script)
    return {
        "success": completed.returncode == 0,
        "stdout": completed.stdout,
        "stderr": completed.stderr,
        "returncode": completed.returncode,
    }


def data_visualize(script: str, output_path: str) -> dict[str, Any]:
    """Run a plotting script and verify that output image exists."""
    completed = _run_python_script(script)
    image_path = Path(output_path)

    return {
        "success": completed.returncode == 0 and image_path.exists(),
        "stdout": completed.stdout,
        "stderr": completed.stderr,
        "returncode": completed.returncode,
        "output_exists": image_path.exists(),
        "output_path": str(image_path),
    }


TOOL_REGISTRY: dict[str, Callable[..., dict[str, Any]]] = {
    "memory_save": memory_save,
    "memory_retrieve": memory_retrieve,
    "memory_delete": memory_delete,
    "data_analyze": data_analyze,
    "data_visualize": data_visualize,
}


def execute_tool(tool: str, arguments: dict[str, Any]) -> dict[str, Any]:
    """Execute a registered tool call."""
    handler = TOOL_REGISTRY.get(tool)
    if not handler:
        raise OrchestratorError(f"Unknown tool: {tool}")
    return handler(**arguments)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run an ECHOMEN orchestrator tool call")
    parser.add_argument("--tool", help="Tool name (e.g., memory_save)")
    parser.add_argument(
        "--args-json",
        default="{}",
        help="Tool arguments as JSON object string",
    )
    parser.add_argument(
        "--request-json",
        help="Full request JSON containing {'tool': str, 'arguments': {...}}",
    )
    parsed = parser.parse_args()

    try:
        if parsed.request_json:
            request = json.loads(parsed.request_json)
            tool = request["tool"]
            arguments = request.get("arguments", {})
        else:
            if not parsed.tool:
                raise OrchestratorError("--tool is required unless --request-json is provided")
            tool = parsed.tool
            arguments = json.loads(parsed.args_json)

        result = execute_tool(tool, arguments)
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except (OrchestratorError, KeyError, TypeError, json.JSONDecodeError) as exc:
        print(json.dumps({"success": False, "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
