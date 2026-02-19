# Chat with the paper — testing checklist

## Manual smoke test (local)

1) Start dev server:

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 34267
```

2) Open any paper page:

- `http://<pi-ip>:34267/arxiv-notes/<arxivId>/<slug>/`

3) Click the 💬 button (bottom-right)

Expected:
- Drawer opens (page still visible behind)
- If no key stored: shows API key gate

4) Key gate

- Enter API key + passphrase
- Click **Save & enable**

Expected:
- Drawer switches to chat view
- Refresh page → drawer asks to **Unlock** with passphrase

5) Ask a question

Try:
- “What are the main claims?”
- “What are the failure cases?”

Expected:
- Assistant responds
- “Receipts” section is visible
- Receipt cards are clickable → opens modal with full chunk text

6) Guardrails

- Ask something unrelated

Expected:
- Assistant says it doesn’t know / not in context

7) Forget

- Click **Forget key**

Expected:
- Stored key is removed; next open requires key again

## CI checks

- `npm run build`
- Posts security lint: `python3 scripts/security_lint.py <post.md>`
- Context lint: `python3 scripts/context_lint.py public/paper-context/<id>/context.json`
