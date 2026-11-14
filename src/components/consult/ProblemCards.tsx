import React, { useState } from 'react';
import { ArrowRight, Building2, ChevronDown, Compass, GitBranch, MapPin, ShieldCheck, Wallet } from 'lucide-react';
import { track } from './consultLib';
import { Ed, useContent } from './editing';

export const PROBLEM_ICONS = [Compass, Building2, MapPin, Wallet, ShieldCheck, GitBranch];

export interface CardPick {
  situation: string;
  topic: string;
}

/** Six "does this sound familiar" cards. Each expands to its questions and can hand its topic to the booking form. */
const ProblemCards: React.FC<{ onPick: (pick: CardPick) => void }> = ({ onPick }) => {
  const { editing, content, get } = useContent();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <ul className="c-pgrid">
      {content.problems.cards.map((_, i) => {
        const Icon = PROBLEM_ICONS[i];
        const isOpen = editing || open === i;
        const panelId = `c-pcard-panel-${i}`;
        const header = (
          <>
            <span className="c-pcard-icon" aria-hidden="true">
              <Icon size={22} strokeWidth={1.75} />
            </span>
            <Ed as="span" k={`problems.cards.${i}.title`} className="c-pcard-title" />
            {!editing && <ChevronDown className="c-pcard-chev" size={20} aria-hidden="true" />}
          </>
        );
        return (
          <li key={i} className={`c-pcard${isOpen ? ' is-open' : ''}`}>
            {editing ? (
              <div className="c-pcard-head">{header}</div>
            ) : (
              <button
                type="button"
                className="c-pcard-head"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => {
                  setOpen(isOpen ? null : i);
                  if (!isOpen) track('problem_card_expanded', { card: String(i + 1) });
                }}
              >
                {header}
              </button>
            )}
            <Ed as="p" k={`problems.cards.${i}.desc`} className="c-pcard-desc" />
            <div id={panelId} className="c-pcard-panel" hidden={!isOpen}>
              <ul className="c-pcard-qs">
                {content.problems.cards[i].questions.map((_q, j) => (
                  <li key={j}>
                    <Ed k={`problems.cards.${i}.questions.${j}`} />
                  </li>
                ))}
              </ul>
              {editing ? (
                <p className="c-pcard-edit-note">
                  Topic filled into the form: <Ed k={`problems.cards.${i}.topic`} />
                </p>
              ) : (
                <button
                  type="button"
                  className="c-pcard-cta"
                  onClick={() => {
                    track('problem_card_cta_clicked', { card: String(i + 1) });
                    onPick({ situation: get(`problems.cards.${i}.situation`), topic: get(`problems.cards.${i}.topic`) });
                  }}
                >
                  <span>{content.problems.cardCta}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default ProblemCards;
