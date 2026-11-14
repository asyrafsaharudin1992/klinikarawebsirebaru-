import React, { useEffect, useState } from 'react';
import { useContent } from './editing';

/** Fixed toolbar for the localhost editor. Only ever imported when EDIT_ENABLED (dev + localhost + ?edit=1). */
const EditorBar: React.FC = () => {
  const { dirty, save, discard } = useContent();
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'saved' | 'error'; msg?: string }>({ kind: 'idle' });

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const onSave = async () => {
    setStatus({ kind: 'saving' });
    const err = await save();
    setStatus(err ? { kind: 'error', msg: err } : { kind: 'saved' });
  };

  const exit = () => {
    if (dirty && !window.confirm('You have unsaved changes. Leave the editor anyway?')) return;
    window.location.href = window.location.pathname;
  };

  return (
    <div className="c-editbar" role="region" aria-label="Page editor">
      <strong>Editing mode</strong>
      <span className="c-editbar-hint">Click any text to edit it. Press Enter or click away to confirm.</span>
      <span className="c-editbar-status" aria-live="polite">
        {status.kind === 'saving' && 'Saving…'}
        {status.kind === 'saved' && !dirty && 'Saved to content.json'}
        {status.kind === 'error' && status.msg}
        {dirty && status.kind !== 'saving' && 'Unsaved changes'}
      </span>
      <button type="button" onClick={discard} disabled={!dirty}>
        Discard
      </button>
      <button type="button" className="is-primary" onClick={onSave} disabled={!dirty || status.kind === 'saving'}>
        Save
      </button>
      <button type="button" onClick={exit}>
        Exit editor
      </button>
    </div>
  );
};

export default EditorBar;
