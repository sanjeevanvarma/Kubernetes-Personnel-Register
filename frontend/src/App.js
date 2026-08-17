import React, { useMemo, useState } from 'react';

const SPECIMEN_RECORD = { id: '000', name: 'Specimen Record' };

function fileNumber(id) {
  return String(id).padStart(4, '0');
}

function stampTilt(id) {
  const seed = Number(id) || 0;
  const angle = ((seed * 37) % 11) - 5;
  return `rotate(${angle}deg)`;
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function downloadCsv(employees) {
  const header = 'File No.,Name\n';
  const rows = employees.map((e) => `${fileNumber(e.id)},"${e.name}"`).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'personnel-register.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [status, setStatus] = useState('idle');
  const [employees, setEmployees] = useState([]);
  const [syncedAt, setSyncedAt] = useState(null);
  const [query, setQuery] = useState('');
  const [letter, setLetter] = useState(null);
  const [sortKey, setSortKey] = useState('id'); // 'id' | 'name'

  async function openTheRegister() {
    setStatus('loading');
    try {
      const response = await fetch('/api/employees');
      if (!response.ok) throw new Error('Request failed');
      const data = await response.json();
      setEmployees(data);
      setSyncedAt(new Date());
      setStatus('done');
    } catch (err) {
      setStatus('error');
    }
  }

  const letters = useMemo(() => {
    const set = new Set(employees.map((e) => (e.name || '?').trim()[0]?.toUpperCase()));
    return Array.from(set).sort();
  }, [employees]);

  const visible = useMemo(() => {
    let list = employees;
    if (letter) list = list.filter((e) => e.name?.trim()[0]?.toUpperCase() === letter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((e) => e.name?.toLowerCase().includes(q) || fileNumber(e.id).includes(q));
    }
    const sorted = [...list].sort((a, b) =>
      sortKey === 'name' ? a.name.localeCompare(b.name) : Number(a.id) - Number(b.id)
    );
    return sorted;
  }, [employees, query, letter, sortKey]);

  return (
    <div className="register">
      <div className="register__paper" />

      <header className="letterhead">
        <div className="letterhead__mark">§</div>
        <div className="letterhead__text">
          <p className="eyebrow">Kubernetes Personnel Office</p>
          <h1>The Personnel Register</h1>
          <p className="subtitle">
            A live roster, pulled fresh from the ledger each time you ask.
          </p>
        </div>
        <div className="letterhead__seal" aria-hidden="true">
          <span>ON&nbsp;FILE</span>
        </div>
      </header>

      <div className="control-strip">
        <button className="lever" onClick={openTheRegister} disabled={status === 'loading'}>
          {status === 'loading' ? 'Consulting the ledger…' : 'Open the Register'}
        </button>
        <span className="control-strip__note">
          {status === 'done' && `${employees.length} record${employees.length === 1 ? '' : 's'} on file · synced ${formatTime(syncedAt)}`}
          {status === 'idle' && 'No records requested yet'}
          {status === 'error' && 'The ledger could not be reached'}
        </span>
        {status === 'done' && employees.length > 0 && (
          <button className="lever lever--ghost" onClick={() => downloadCsv(employees)}>
            Export to CSV
          </button>
        )}
      </div>

      {status === 'done' && employees.length > 0 && (
        <div className="finder">
          <input
            className="finder__search"
            type="text"
            placeholder="Search by name or file no."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="finder__sort" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="id">Sort by file no.</option>
            <option value="name">Sort by name</option>
          </select>
          <div className="finder__rail">
            <button
              className={`rail__chip ${letter === null ? 'rail__chip--active' : ''}`}
              onClick={() => setLetter(null)}
            >
              All
            </button>
            {letters.map((l) => (
              <button
                key={l}
                className={`rail__chip ${letter === l ? 'rail__chip--active' : ''}`}
                onClick={() => setLetter(letter === l ? null : l)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="notice notice--error">
          <p>
            <strong>File not retrieved.</strong> The backend service did not answer.
            Check that the API is running behind <code>/api/employees</code> and try again.
          </p>
        </div>
      )}

      {status === 'idle' && (
        <div className="index-grid index-grid--placeholder">
          <article className="card card--specimen">
            <div className="card__perf" aria-hidden="true" />
            <div className="card__id">No. {fileNumber(SPECIMEN_RECORD.id)}</div>
            <h2 className="card__name">Press the lever above</h2>
            <p className="card__role">to draw a record from the register</p>
          </article>
        </div>
      )}

      {status === 'done' && employees.length === 0 && (
        <div className="notice">
          <p>The register is open, but no entries have been filed yet.</p>
        </div>
      )}

      {status === 'done' && employees.length > 0 && visible.length === 0 && (
        <div className="notice">
          <p>No records match "{query}"{letter ? ` under ${letter}` : ''}.</p>
        </div>
      )}

      {status === 'done' && visible.length > 0 && (
        <div className="index-grid">
          {visible.map((emp) => (
            <article className="card" key={emp.id}>
              <div className="card__perf" aria-hidden="true" />
              <div className="card__id">No. {fileNumber(emp.id)}</div>
              <h2 className="card__name">{emp.name}</h2>
              <p className="card__role">Staff, Production Namespace</p>
              <div className="card__stamp" style={{ transform: stampTilt(emp.id) }}>
                ACTIVE
              </div>
            </article>
          ))}
        </div>
      )}

      <footer className="colophon">
        <span>Filed via NGINX Ingress</span>
        <span className="colophon__dot">•</span>
        <span>Served by Node.js API</span>
        <span className="colophon__dot">•</span>
        <span>Recorded in MySQL</span>
      </footer>
    </div>
  );
}

