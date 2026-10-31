# Prompt Router

This is a standalone, opt-in OpenAI Responses API CLI. It does not connect the router to ReLoop's product workflows; generation APIs remain unimplemented until a provider adapter is separately reviewed and integrated.

## Run

Put `OPENAI_API_KEY` in `.env.local` (never commit it), then copy the example eval suite and edit each prompt and its acceptance checks:

```sh
Copy-Item evals/prompts.example.json evals/prompts.local.json
npm run prompt:run -- --file evals/prompts.local.json
```

On macOS/Linux, use `cp` instead of `Copy-Item`. Node loads `.env.local`; environment variables can also be supplied directly. Reports and generated answers are written to the ignored `prompt-runs/` directory. Treat reports as potentially sensitive because they include prompts and model output.

## Routing and retries

The initial heuristic uses the fast model for short/simple prompts, standard for coding or longer tasks, and strong for prompts mentioning risk-sensitive or complex work. It is intentionally transparent and can be tuned in `src/lib/prompt-router.mjs`. Set `PROMPT_ROUTER_FAST_MODEL`, `PROMPT_ROUTER_STANDARD_MODEL`, and `PROMPT_ROUTER_STRONG_MODEL` to model IDs enabled for your API account. No model IDs are hard-coded because availability and account access vary.

Each case needs at least one deterministic check: `mustInclude`, `mustNotInclude`, `maxWords`, or `validJson`. Effort is optional. Set `PROMPT_ROUTER_*_EFFORT` to `low`, `medium`, or `high` when the selected model supports reasoning controls. Leave those variables blank for models that do not support them. When effort is configured, a failed result is retried at one higher effort, then with the strong model. When effort is blank, the router changes models only. There are at most three attempts. A passing rubric stops escalation. Rubric checks are not a semantic truth oracle: write checks that cover the task's important requirements. This version does not use a second model as a judge.

API errors stop the run rather than consuming retries, since an invalid model, unsupported effort, authentication error, or quota issue is not evidence that the answer needs more reasoning. Ensure chosen model and effort settings are supported by those models and enabled for your API account.

## Test without API access

```sh
npm run prompt:test
```

These tests exercise prompt classification, overrides, deterministic evaluation, and escalation ordering without making network requests or incurring API costs.
