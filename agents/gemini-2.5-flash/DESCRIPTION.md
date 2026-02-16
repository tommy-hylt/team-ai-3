# gemini-2.5-flash

Use this agent when:
- you want a non-Claude provider for quota balancing
- you want fast summarization / extraction / drafting
- you want access to Gemini models with large context

Common models (Gemini CLI supports `-m`):
- `gemini-2.5-flash` (fast/cheaper)
- `gemini-2.5-pro` (stronger)

Command notes:
- This template reads the prompt file and passes it as `gemini -p <prompt>`.
- Default model: `gemini-2.5-flash`.
