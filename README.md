# Lingua — Language Translator

A production-style React + Vite translation application with a FastAPI backend, designed for a single Vercel deployment.

## Stack

- React 19 + Vite
- FastAPI + Pydantic
- `deep-translator` for translation requests
- LocalStorage for theme and recent translation history
- Vercel for frontend hosting and the Python API function

## Project structure

```text
.
├── api/
│   └── index.py
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── History.jsx
│   │   └── Translator.jsx
│   ├── data/languages.js
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env.example
├── index.html
├── package.json
├── pyproject.toml
├── requirements.txt
└── vite.config.js
```

## Local development

### Frontend only

```bash
npm install
npm run dev
```

### API

Create a Python environment and install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.index:app --reload --port 8000
```

Then open the Vite URL shown in the terminal. The Vite development server proxies `/api` requests to `http://127.0.0.1:8000`.

### Build check

```bash
npm run build
```

## Deploy to Vercel

This repository is intentionally structured so the React site and FastAPI API can live in the same Vercel project. Vercel's current Python runtime supports FastAPI, and the `api/` entrypoint is packaged as a serverless function.

1. Push this folder to GitHub.
2. In Vercel, import the GitHub repository.
3. Keep the project root at the repository root.
4. Vercel should detect Vite automatically.
5. Deploy.
6. Test:
   - `/` for the frontend
   - `/api/health` for the backend
   - `/api` for the API status

No frontend API URL environment variable is required because the frontend calls `/api/translate` on the same domain.

If you later host the frontend separately, set `FRONTEND_ORIGINS` in the backend environment variables to the frontend origin(s).

## Important note about translation provider

`deep-translator` uses an unofficial Google Translate web endpoint. It is suitable for a portfolio/demo application, but it is not the right choice for a high-volume commercial product. For production business usage, replace it with an official translation API and keep its credentials in Vercel environment variables.
