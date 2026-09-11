function History({ history, languageNames, onRestore, onClear }) {
  return (
    <section className="history-section" aria-labelledby="history-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Local only</p>
          <h2 id="history-title">Recent translations</h2>
        </div>
        {history.length > 0 && (
          <button className="ghost-button" type="button" onClick={onClear}>
            Clear history
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="empty-history">
          <span className="empty-icon" aria-hidden="true">↺</span>
          <p>No translations yet</p>
          <span>Your latest translations will appear here on this device.</span>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <button
              className="history-item"
              type="button"
              key={item.id}
              onClick={() => onRestore(item)}
              aria-label={`Restore translation from ${languageNames[item.source]} to ${languageNames[item.target]}`}
            >
              <span className="history-main">
                <span className="history-source">{item.text}</span>
                <span className="history-result">{item.translation}</span>
              </span>
              <span className="history-meta">
                {languageNames[item.source]} → {languageNames[item.target]}
                <small>{new Date(item.createdAt).toLocaleString()}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default History;
