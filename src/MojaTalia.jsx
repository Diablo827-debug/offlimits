// Ekran „Moja talia” na telefonie: zdjęcie karty → odczytany tekst → poprawki → dodanie kart.
import React from 'react';
import { tr } from './i18n.js';
import { loadMine, addCards, removeCard, editCard, readPhoto, parseCards, exportMine, importMine, countMine, kartPl } from './moja.js';
import { Parts } from './ui.jsx';
import { fillParts } from './deck.js';

function CardRow({ id, text, black, onDel, onEdit, t }) {
  const [edit, setEdit] = React.useState(false);
  const [val, setVal] = React.useState(text);
  if (edit) {
    return (
      <div className="opt">
        <textarea className="md-text" rows={3} value={val} onChange={(e) => setVal(e.target.value)} />
        <div className="md-row">
          <button type="button" className="btn btn-primary btn-small" onClick={() => { onEdit(id, val); setEdit(false); }}>{t('mdSave')}</button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => { setVal(text); setEdit(false); }}>{t('mdCancel')}</button>
        </div>
      </div>
    );
  }
  return (
    <div className={'opt md-card' + (black ? ' black' : '')}>
      <div className="md-t">{black ? <Parts parts={fillParts(text, [])} /> : text}</div>
      <div className="md-row">
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setEdit(true)}>{t('mdEdit')}</button>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => onDel(id)}>{t('mdDelete')}</button>
      </div>
    </div>
  );
}

export default function MojaTalia({ lang, onClose, onChange }) {
  const t = tr(lang);
  const [mine, setMine] = React.useState(loadMine);
  const [kind, setKind] = React.useState('c');
  const [busy, setBusy] = React.useState(null); // null | 'load' | liczba 0..1
  const [text, setText] = React.useState(null);
  const [msg, setMsg] = React.useState('');
  const [ok, setOk] = React.useState(false);
  const camRef = React.useRef(null);
  const galRef = React.useRef(null);
  const impRef = React.useRef(null);

  const update = (d) => { setMine(d); if (onChange) onChange(d); };

  async function onFiles(files) {
    if (!files || !files.length) return;
    setMsg(''); setBusy('load');
    const parts = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const txt = await readPhoto(files[i], kind, (p) => setBusy((i + p) / files.length));
        if (txt) parts.push(txt);
      }
    } catch (e) { /* błąd odczytu – komunikat niżej */ }
    setBusy(null);
    if (!parts.length) { setOk(false); setMsg(t('mdNoText')); return; }
    setText((text ? text + '\n\n' : '') + parts.join('\n\n'));
  }

  const parsed = text != null ? parseCards(text, kind) : [];
  const cs = Object.keys(mine.c); const bs = Object.keys(mine.b);

  return (
    <div className="phone md">
      <div className="md-head">
        <button type="button" className="btn btn-ghost btn-small" onClick={onClose}>← {t('mdBack')}</button>
        <div className="big" style={{ fontSize: 22 }}>{t('myDeck')}</div>
        <span className="muted">{countMine(mine)}</span>
      </div>
      <div className="muted" style={{ fontSize: 14 }}>{t('mdIntro')}</div>

      <div className="muted" style={{ marginTop: 6 }}>{t('mdWhat')}</div>
      <div className="seg md-seg">
        <button type="button" className={kind === 'c' ? 'on' : ''} onClick={() => setKind('c')}>{t('mdQuestions')}</button>
        <button type="button" className={kind === 'b' ? 'on' : ''} onClick={() => setKind('b')}>{t('mdAnswers')}</button>
      </div>

      {text == null && busy == null ? (
        <div className="md-actions">
          <button type="button" className="btn btn-primary" onClick={() => camRef.current.click()}>📷 {t('mdPhoto')}</button>
          <button type="button" className="btn btn-ghost" onClick={() => galRef.current.click()}>🖼 {t('mdGallery')}</button>
          <button type="button" className="btn btn-ghost" onClick={() => setText('')}>✎ {t('mdType')}</button>
          <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
          <input ref={galRef} type="file" accept="image/*" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
        </div>
      ) : null}

      {busy != null ? (
        <div className="md-busy">
          <div>{busy === 'load' ? t('mdLoading') : t('mdReading', { n: Math.round(busy * 100) })}</div>
          <div className="md-bar"><i style={{ width: (busy === 'load' ? 5 : Math.round(busy * 100)) + '%' }} /></div>
        </div>
      ) : null}

      {msg ? <div className={ok ? 'gold-text' : 'err'}>{msg}</div> : null}

      {text != null && busy == null ? (
        <div className="md-edit">
          <div className="muted" style={{ fontSize: 14 }}>{t('mdCheck')}</div>
          <textarea className="md-text" rows={8} value={text} onChange={(e) => setText(e.target.value)} autoFocus={!text} />
          {parsed.length ? (
            <div className="list">
              {parsed.map((c, i) => (
                <div key={i} className={'opt md-card' + (kind === 'c' ? ' black' : '')}>
                  <div className="md-t">{kind === 'c' ? <Parts parts={fillParts(c.text, [])} /> : c.text}{c.luki === 2 ? <span className="muted"> · {t('mdPick2')}</span> : null}</div>
                </div>
              ))}
            </div>
          ) : null}
          <div className="md-row">
            <button type="button" className="btn btn-primary" disabled={!parsed.length}
              onClick={() => { const d = addCards(mine, parsed); update(d); setMsg(t('mdAdded', { n: lang === 'pl' ? kartPl(parsed.length) : parsed.length })); setOk(true); setText(null); }}>
              {t('mdAdd', { n: lang === 'pl' ? kartPl(parsed.length) : parsed.length })}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setText(null)}>{t('mdCancel')}</button>
          </div>
          <div className="md-row">
            <button type="button" className="btn btn-ghost btn-small" onClick={() => camRef.current && camRef.current.click()}>📷 +</button>
            <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
          </div>
        </div>
      ) : null}

      <details className="fold">
        <summary>{t('mdQuestions')} ({cs.length})</summary>
        <div className="inner list">
          {cs.length ? cs.map((id) => <CardRow key={id} id={id} text={mine.c[id][0]} black t={t} onDel={(x) => update(removeCard(mine, x))} onEdit={(x, v) => update(editCard(mine, x, v))} />) : <div className="muted">{t('mdEmpty')}</div>}
        </div>
      </details>
      <details className="fold">
        <summary>{t('mdAnswers')} ({bs.length})</summary>
        <div className="inner list">
          {bs.length ? bs.map((id) => <CardRow key={id} id={id} text={mine.b[id]} t={t} onDel={(x) => update(removeCard(mine, x))} onEdit={(x, v) => update(editCard(mine, x, v))} />) : <div className="muted">{t('mdEmpty')}</div>}
        </div>
      </details>
      <details className="fold">
        <summary>{t('mdBackup')}</summary>
        <div className="inner md-actions">
          <button type="button" className="btn btn-ghost btn-small" onClick={() => exportMine(mine)}>{t('mdExport')}</button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => impRef.current.click()}>{t('mdImport')}</button>
          <input ref={impRef} type="file" accept="application/json,.json" hidden
            onChange={(e) => { const f = e.target.files[0]; if (f) f.text().then((j) => { try { update(importMine(mine, j)); } catch (er) { /* zły plik */ } }); e.target.value = ''; }} />
        </div>
      </details>
    </div>
  );
}
