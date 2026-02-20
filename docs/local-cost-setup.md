# Local Cost Setup (Cheap Stack)

Run ECHO with local-first model providers when possible to minimize cloud token spend.

## Suggested stack
- **Frontend:** ECHO UI (this repo)
- **Model runtime:** Ollama
- **Model examples:** `qwen2.5-coder`, `llama3.1:8b`

## Steps
1. Start Ollama locally.
2. In ECHO, open **Master Configuration Panel**.
3. Add a model provider with:
   - Provider: `OLLAMA`
   - Type: `LOCAL`
   - Base URL: `http://localhost:11434`
4. Set that provider as default for Planner/Executor agents.
5. Run short tasks first and inspect quality vs latency.

## Cost controls
- Prefer short prompts and constrained outputs.
- Use smaller local models for planning drafts.
- Reserve cloud models for final synthesis only.
