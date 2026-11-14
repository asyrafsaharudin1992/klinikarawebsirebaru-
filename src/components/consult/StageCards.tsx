import React, { useState } from 'react';
import { track } from './consultLib';
import { Ed, useContent } from './editing';

const TAGS = ['A1', 'A2', 'A3'];

/** Three assessment cards. Hover (mouse), focus (keyboard) or tap (touch) reveals one teaser line. */
export const StageCards: React.FC = () => {
  const { editing, content } = useContent();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className={`c-stages${editing ? ' is-editing' : ''}`}>
      {content.stages.map((s, i) => {
        const isOpen = editing || open === s.title;
        const inner = (
          <>
            <span className="c-stage-tag">{TAGS[i]}</span>
            <Ed k={`stages.${i}.title`} className="c-stage-title" />
            <Ed k={`stages.${i}.line`} className="c-stage-line" />
            <span className="c-stage-reveal">
              <Ed k={`stages.${i}.teaser`} className="c-stage-teaser" />
              <span className="c-stage-nudge">Discuss this in your free session &rarr;</span>
            </span>
          </>
        );
        return (
          <li key={i}>
            {editing ? (
              // Text can't be edited inside a <button>, so the editor shows the card as a plain block.
              <div className="c-stage" aria-expanded={true}>
                {inner}
              </div>
            ) : (
              <button
                type="button"
                className="c-stage"
                aria-expanded={isOpen}
                onClick={() => {
                  setOpen(isOpen ? null : s.title);
                  if (!isOpen) track('consult_stage_open', { stage: s.title });
                }}
              >
                {inner}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
};

/** The profit-flow idea as a picture. Deliberately has no numbers. */
export const ProfitFlow: React.FC = () => {
  const { content } = useContent();
  const last = content.assess.nodes.length - 1;
  return (
    <ol className="c-flow" aria-label="How a clinic turns patients into profit for you">
      {content.assess.nodes.map((_, i) => (
        <li key={i} className="c-flow-item">
          <Ed k={`assess.nodes.${i}`} className={`c-flow-node${i === last ? ' c-flow-node--end' : ''}`} />
          {i < last && <span className="c-flow-link" style={{ ['--d' as string]: `${i * 0.45}s` }} aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
};
