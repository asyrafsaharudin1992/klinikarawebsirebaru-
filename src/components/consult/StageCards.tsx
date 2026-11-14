import React, { useState } from 'react';
import { track } from './consultLib';

const STAGES = [
  {
    key: 'start',
    letter: 'A1',
    title: 'START',
    line: 'From idea to opening day, without the expensive mistakes.',
    teaser: 'Most first-time owners get this part wrong, and it is rarely the part they worry about.',
  },
  {
    key: 'manage',
    letter: 'A2',
    title: 'MANAGE',
    line: 'A clinic that runs well even when you’re not in the room.',
    teaser: 'The clinics that last are built on something most doctors never think to set up.',
  },
  {
    key: 'profit',
    letter: 'A3',
    title: 'PROFIT',
    line: 'Where the real money is, and how it ends up with you.',
    teaser: 'Busy is not the same as profitable. Most doctors find that out late.',
  },
];

/** Three assessment cards. Hover (mouse), focus (keyboard) or tap (touch) reveals one teaser line. */
export const StageCards: React.FC = () => {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="c-stages">
      {STAGES.map((s) => {
        const isOpen = open === s.key;
        return (
          <li key={s.key}>
            <button
              type="button"
              className="c-stage"
              aria-expanded={isOpen}
              onClick={() => {
                setOpen(isOpen ? null : s.key);
                if (!isOpen) track('consult_stage_open', { stage: s.title });
              }}
            >
              <span className="c-stage-tag">{s.letter}</span>
              <span className="c-stage-title">{s.title}</span>
              <span className="c-stage-line">{s.line}</span>
              <span className="c-stage-reveal">
                <span className="c-stage-teaser">{s.teaser}</span>
                <span className="c-stage-nudge">Discuss this in your free session &rarr;</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const FLOW = ['Patients', 'Revenue', 'Smart operations', 'Profit', 'Your pocket'];

/** The profit-flow idea as a picture. Deliberately has no numbers. */
export const ProfitFlow: React.FC = () => (
  <ol className="c-flow" aria-label="How a clinic turns patients into profit for you">
    {FLOW.map((label, i) => (
      <li key={label} className="c-flow-item">
        <span className={`c-flow-node${i === FLOW.length - 1 ? ' c-flow-node--end' : ''}`}>{label}</span>
        {i < FLOW.length - 1 && <span className="c-flow-link" style={{ ['--d' as string]: `${i * 0.45}s` }} aria-hidden="true" />}
      </li>
    ))}
  </ol>
);
