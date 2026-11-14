import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import baseContent from './content.json';

export type Content = typeof baseContent;

/**
 * Inline editing is a localhost-only convenience: open /business-consultation?edit=1 while running
 * `npm run dev`. `import.meta.env.DEV` is false in production builds, so none of this can switch on
 * for visitors, and the save endpoints only exist in the dev server (server.ts).
 */
export const EDIT_ENABLED =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname) &&
  new URLSearchParams(window.location.search).get('edit') === '1';

const getPath = (obj: unknown, pathStr: string): unknown =>
  pathStr.split('.').reduce<unknown>((o, k) => (o == null ? o : (o as Record<string, unknown>)[k]), obj);

const setPath = (obj: Content, pathStr: string, value: string): Content => {
  const next = structuredClone(obj) as unknown as Record<string, unknown>;
  const keys = pathStr.split('.');
  let cur: Record<string, unknown> = next;
  keys.slice(0, -1).forEach((k) => (cur = cur[k] as Record<string, unknown>));
  cur[keys[keys.length - 1]] = value;
  return next as unknown as Content;
};

interface Ctx {
  editing: boolean;
  content: Content;
  get: (path: string) => string;
  set: (path: string, value: string) => void;
  dirty: boolean;
  save: () => Promise<string | null>; // resolves to an error message, or null on success
  discard: () => void;
}

const EditCtx = createContext<Ctx>({
  editing: false,
  content: baseContent,
  get: (p) => String(getPath(baseContent, p) ?? ''),
  set: () => {},
  dirty: false,
  save: async () => null,
  discard: () => {},
});

export const useContent = () => useContext(EditCtx);

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [saved, setSaved] = useState<Content>(baseContent);
  const [draft, setDraft] = useState<Content>(baseContent);

  const get = useCallback((p: string) => String(getPath(draft, p) ?? ''), [draft]);
  const set = useCallback((p: string, v: string) => setDraft((d) => setPath(d, p, v)), []);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const save = useCallback(async () => {
    try {
      const res = await fetch('/api/dev/consult-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) return `Save failed (${res.status}): ${(await res.text()).slice(0, 120)}`;
      setSaved(draft);
      return null;
    } catch (e) {
      return `Save failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  }, [draft]);

  const discard = useCallback(() => setDraft(saved), [saved]);

  const value = useMemo<Ctx>(
    () => ({ editing: EDIT_ENABLED, content: draft, get, set, dirty, save, discard }),
    [draft, get, set, dirty, save, discard],
  );
  return <EditCtx.Provider value={value}>{children}</EditCtx.Provider>;
};

interface EdProps {
  k: string;
  as?: React.ElementType;
  className?: string;
  id?: string;
}

/** A piece of page text. Plain text for visitors; click-to-type when the localhost editor is on. */
export const Ed: React.FC<EdProps> = ({ k, as: Tag = 'span', className, id }) => {
  const { editing, get, set } = useContent();
  const value = get(k);
  const cls = [className, value.includes('[[FILL:') && 'c-fill', editing && 'c-ed'].filter(Boolean).join(' ') || undefined;
  if (!editing) {
    return (
      <Tag id={id} className={cls}>
        {value}
      </Tag>
    );
  }
  return (
    <Tag
      id={id}
      className={cls}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-ed-key={k}
      onBlur={(e: React.FocusEvent<HTMLElement>) => set(k, (e.currentTarget.textContent ?? '').replace(/\s+/g, ' ').trim())}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onPaste={(e: React.ClipboardEvent<HTMLElement>) => {
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain').replace(/\s+/g, ' '));
      }}
    >
      {value}
    </Tag>
  );
};
