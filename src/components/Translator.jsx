import { useEffect, useMemo, useState } from 'react';
import languages from '../data/languages';
import History from './History';

const MAX_CHARS = 5000;
const HISTORY_KEY = 'lingua-translation-history-v1';

function readHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(saved) ? saved.slice(0, 10) : [];
  } catch {
    return [];
  }
}

function getLanguageName(language) {
  return language?.name || language || 'Unknown';
}

function Translator() {
  const [text, setText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('ur');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState(readHistory);

  const languageMap = useMemo(
    () => Object.fromEntries(languages.map((item) => [item.code, item])),
    [],
  );

  const languageNames = useMemo(
    () => Object.fromEntries(languages.map((item) => [item.code, item.name])),
    [],
  );

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const setMessage = (message, type = '') => {
    setStatus(message);
    setStatusType(type);
  };

  const handleTextChange = (event) => {
    const next = event.target.value;
    setText(next.slice(0, MAX_CHARS));
    if (statusType === 'error') setMessage('');
  };

  async function translateText() {
    const value = text.trim();
    if (!value || loading) return;

    setLoading(true);
    setCopied(false);
    setMessage('Translating…');

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: value,
          source_lang: sourceLang,
          target_lang: targetLang,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || typeof data.translation !== 'string') {
        throw new Error(data.detail || 'Translation failed. Please try again.');
      }

      setTranslation(data.translation);
      setMessage('Translation ready.');

      setHistory((current) => {
        const next = [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            text: value,
            translation: data.translation,
            source: sourceLang,
            target: targetLang,
            createdAt: Date.now(),
          },
          ...current.filter(
            (item) => !(item.text === value && item.source === sourceLang && item.target === targetLang),
          ),
        ];
        return next.slice(0, 10);
      });
    } catch (error) {
      setMessage(
        error instanceof TypeError
          ? 'The translation service could not be reached. Please try again.'
          : error.message || 'Translation failed. Please try again.',
        'error',
      );
    } finally {
      setLoading(false);
    }
  }

  function swapLanguages() {
    if (sourceLang === 'auto') return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setText(translation);
    setTranslation(text);
    setMessage('');
    setCopied(false);
  }

  function changeSource(nextSource) {
    if (nextSource === targetLang && nextSource !== 'auto') {
      setTargetLang(sourceLang === 'auto' ? 'en' : sourceLang);
    }
    setSourceLang(nextSource);
  }

  function changeTarget(nextTarget) {
    if (nextTarget === sourceLang) setSourceLang('auto');
    setTargetLang(nextTarget);
  }

  function clearFields() {
    setText('');
    setTranslation('');
    setCopied(false);
    setMessage('');
  }

  async function copyText(value, label) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label === 'translation');
      setMessage(`${label === 'translation' ? 'Translation' : 'Text'} copied to clipboard.`);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setMessage('Clipboard access was blocked by your browser.', 'error');
    }
  }

  function restoreHistory(item) {
    setText(item.text);
    setTranslation(item.translation);
    setSourceLang(item.source);
    setTargetLang(item.target);
    setMessage('Translation restored.');
    setCopied(false);
  }

  return (
    <>
      <div className="translator-grid">
        <section className="translation-panel" aria-label="Source text">
          <div className="panel-top">
            <div className="language-control">
              <span className="language-label">From</span>
              <select
                value={sourceLang}
                onChange={(event) => changeSource(event.target.value)}
                aria-label="Source language"
              >
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.flag} {language.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="mini-button"
              type="button"
              onClick={() => copyText(text, 'source')}
              disabled={!text}
            >
              Copy
            </button>
          </div>

          <textarea
            id="source-text"
            value={text}
            onChange={handleTextChange}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                translateText();
              }
            }}
            maxLength={MAX_CHARS}
            placeholder="Type or paste your text here…"
            aria-label="Text to translate"
          />

          <div className="panel-footer">
            <span>{text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}</span>
            <span>Ctrl + Enter</span>
          </div>
        </section>

        <button
          className="swap-button"
          type="button"
          onClick={swapLanguages}
          disabled={sourceLang === 'auto'}
          aria-label="Swap languages"
          title={sourceLang === 'auto' ? 'Select a source language to swap' : 'Swap languages'}
        >
          ⇄
        </button>

        <section className="translation-panel result-panel" aria-label="Translated text">
          <div className="panel-top">
            <div className="language-control">
              <span className="language-label">To</span>
              <select
                value={targetLang}
                onChange={(event) => changeTarget(event.target.value)}
                aria-label="Target language"
              >
                {languages.filter((language) => language.code !== 'auto').map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.flag} {language.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="mini-button"
              type="button"
              onClick={() => copyText(translation, 'translation')}
              disabled={!translation}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <textarea
            value={translation}
            readOnly
            placeholder="Your translation will appear here…"
            aria-label="Translated text"
          />

          <div className="panel-footer">
            <span>{translation ? `${translation.length.toLocaleString()} characters` : 'Ready when you are'}</span>
            <span>{languageMap[targetLang]?.flag} {getLanguageName(languageMap[targetLang])}</span>
          </div>
        </section>
      </div>

      <div className="action-row">
        <div className="status-wrap" aria-live="polite">
          <span className={`status-dot ${statusType}`} aria-hidden="true" />
          <span className={statusType}>{status || 'Ready to translate'}</span>
        </div>
        <div className="actions">
          <button className="secondary-button" type="button" onClick={clearFields} disabled={!text && !translation}>
            Clear
          </button>
          <button className="primary-button" type="button" onClick={translateText} disabled={loading || !text.trim()}>
            {loading ? <><span className="spinner" aria-hidden="true" /> Translating</> : 'Translate'}
          </button>
        </div>
      </div>

      <History
        history={history}
        languageNames={languageNames}
        onRestore={restoreHistory}
        onClear={() => setHistory([])}
      />
    </>
  );
}

export default Translator;
