<p align="center">
  <img src="docs/images/logo.png" alt="KaizerIDE" height="90"/>
</p>

<h1 align="center">KaizerIDE (Private Fork)</h1>

<p align="center">
  <strong>AI-Powered Desktop IDE - Private personal build</strong>
</p>

<p align="center">
  <img src="docs/images/Preview8.png" alt="KaizerIDE Preview" width="820"/>
</p>

---

## Personal Fork

This is a **private fork** of the KaizerIDE project, maintained for personal use and custom experimentation. This repository contains specialized configurations and builds tailored for a private development environment.

---

## Current Fixes

This build includes backend/editor plumbing fixes so KaizerIDE behaves more like a real AI IDE:

* Agent file writes now update open editor tabs and show reviewable diffs.
* Accepting agent changes now unlocks Monaco and keeps the new file content loaded for normal editing.
* Code edit suggestions can target files that are not currently active; KaizerIDE opens the target file, waits for Monaco, applies the edit, and syncs the tab state.
* The Electron dev shell now loads Vite from the configured `5175` port.
* `npm run dev` uses a small Electron launcher that clears `ELECTRON_RUN_AS_NODE`, preventing Electron from starting as plain Node and losing backend APIs.
* AI models now come from a shared catalog module instead of a giant hardcoded list in `App.jsx`.
* Settings can refresh installed Ollama models from `http://localhost:11434`, pull new Ollama models on demand, or import a raw GitHub JSON model catalog. The default GitHub catalog is LiteLLM's public model metadata file, used only as model metadata.

---

## Local AI

KaizerIDE now prefers direct Ollama for local models:

* Ollama endpoint: `http://localhost:11434/v1`

Use direct Ollama models for the simplest setup. The old script-based LiteLLM bridge has been removed.

In **Settings > AI Models**:

* **Refresh Ollama Models** pulls the models already installed in Ollama.
* **Pull Ollama Model** downloads a model by name, such as `qwen2.5-coder:7b`.
* **Import GitHub Catalog** accepts a raw JSON URL shaped like either an array of models or `{ "models": [...] }`.
* The built-in catalog URL is `https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json`. KaizerIDE reads this as public model metadata; it does not run LiteLLM.

Example catalog entry:

```json
{
  "id": "qwen2.5-coder:7b",
  "name": "Qwen 2.5 Coder 7B (Ollama)",
  "provider": "ollama",
  "endpoint": "http://localhost:11434/v1",
  "maxOutputTokens": 16000
}
```

---

## Run Locally

```bash
npm install
npm run dev
```

The Vite renderer runs at `http://localhost:5175/`. The dev command starts both Vite and Electron.

For a production bundle:

```bash
npm run build
```

---

## Original Project

This project is a derivative of the main **KaizerIDE** repository. For the official version, features, and documentation, please refer to the original source:

* **Repository**: [randheimer/KaizerIDE](https://github.com/randheimer/KaizerIDE)
* **Releases**: [Official Builds](https://github.com/randheimer/KaizerIDE/releases)

---

## Gallery

<table>
  <tr>
    <td align="center"><img src="docs/images/Preview2.png" width="260" alt="Preview"/></td>
    <td align="center"><img src="docs/images/Preview3.png" width="260" alt="Preview"/></td>
    <td align="center"><img src="docs/images/Preview4.png" width="260" alt="Preview"/></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/images/Preview9.png" width="260" alt="Preview"/></td>
    <td align="center"><img src="docs/images/Preview10.png" width="260" alt="Preview"/></td>
    <td align="center"><img src="docs/images/Preview11.png" width="260" alt="Preview"/></td>
  </tr>
</table>

---

<p align="center">
  <img src="docs/images/logo.png" alt="KaizerIDE" height="36"/>
</p>

<p align="center">
  <sub>Built for private use based on the KaizerIDE open source project.</sub>
</p>
