import { useEffect, useState } from 'react';
import './App.css';
import Header from './components/Header';
import Translator from './components/Translator';

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('lingua-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  });

  useEffect(() => {
    localStorage.setItem('lingua-theme', darkMode ? 'dark' : 'light');
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  return (
    <div className={darkMode ? 'app dark' : 'app light'}>
      <main className="container">
        <Header darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)} />
        <section className="translator-card">
          <Translator />
        </section>
        <footer className="site-footer">
          <span>Lingua Translator</span>
          <span>Translations are processed through the configured translation provider.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
