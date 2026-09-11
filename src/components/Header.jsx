function Header({ darkMode, onToggleTheme }) {
  return (
    <header className="site-header">
      <div className="brand-wrap">
        <div className="brand-mark" aria-hidden="true">文</div>
        <div>
          <p className="eyebrow">Lingua</p>
          <h1>Language Translator</h1>
          <p className="subtitle">Translate naturally across languages with a clean, distraction-free workspace.</p>
        </div>
      </div>

      <button
        className="theme-button"
        type="button"
        onClick={onToggleTheme}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <span aria-hidden="true">{darkMode ? '☀' : '☾'}</span>
        <span className="theme-label">{darkMode ? 'Light' : 'Dark'}</span>
      </button>
    </header>
  );
}

export default Header;
