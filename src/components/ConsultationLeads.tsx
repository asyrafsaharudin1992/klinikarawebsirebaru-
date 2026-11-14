import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { AlertCircle, Mail } from 'lucide-react';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../types';
import { formatPhoneNumber } from '../utils';
import { situationLabel } from './consult/consultLib';

interface ConsultLead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  situation?: string;
  topic?: string;
  createdAt?: { toDate?: () => Date };
}

const formatMyTime = (lead: ConsultLead) => {
  const d = lead.createdAt?.toDate?.();
  if (!d) return 'Just now';
  return d.toLocaleString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Read-only list of /business-consultation "Book on WhatsApp" taps.
 * Only mounted by AdminUI after the admin gate, and Firestore rules independently
 * restrict reads of consultation_leads to admins.
 */
export default function ConsultationLeads() {
  const [leads, setLeads] = useState<ConsultLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'consultation_leads'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        setLeads(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ConsultLead[]);
        setLoading(false);
      },
      (error) => {
        console.error('Consultation leads fetch error:', error);
        handleFirestoreError(error, OperationType.LIST, 'consultation_leads', auth);
        setFailed(true);
        setLoading(false);
      },
    );
  }, []);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((l) => l.name?.toLowerCase().includes(term) || l.email?.toLowerCase().includes(term));
  }, [leads, search]);

  return (
    <main className="max-w-6xl mx-auto px-4 mt-8">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center gap-3 bg-zinc-900/50">
          <div className="flex items-center justify-between sm:justify-start gap-3 flex-1">
            <h2 className="text-lg font-semibold text-white">Consultation Leads</h2>
            <span className="px-3 py-1 bg-zinc-800 text-zinc-400 text-xs font-medium rounded-full border border-zinc-700">
              {search.trim() ? `${shown.length} of ${leads.length}` : `${leads.length} Total`}
            </span>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            aria-label="Search consultation leads by name or email"
            className="w-full sm:w-72 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500">Loading…</div>
        ) : failed ? (
          <div className="p-12 text-center text-zinc-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-500" />
            <p>Couldn’t load consultation leads. Check that the Firestore rules for consultation_leads are deployed.</p>
          </div>
        ) : shown.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <p>{leads.length === 0 ? 'No consultation leads yet.' : 'No leads match your search.'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {shown.map((lead) => (
              <li key={lead.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-zinc-800/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold truncate">{lead.name}</div>
                  <div className="text-zinc-400 text-sm break-all">{lead.email}</div>
                  {lead.phone && <div className="text-zinc-400 text-sm">{lead.phone}</div>}
                  {lead.situation && situationLabel(lead.situation) && (
                    <div className="text-sky-300 text-sm mt-1">{situationLabel(lead.situation)}</div>
                  )}
                  {lead.topic && <div className="text-zinc-300 text-sm mt-1 break-words">“{lead.topic}”</div>}
                </div>
                <div className="sm:w-56 sm:text-right">
                  <div className="text-zinc-300 text-sm">{formatMyTime(lead)}</div>
                  <span className="inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Tapped Book on WhatsApp
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {lead.phone && (
                    <a
                      href={`https://wa.me/${formatPhoneNumber(lead.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none justify-center px-3 py-2.5 sm:py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      WhatsApp
                    </a>
                  )}
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex-1 sm:flex-none justify-center px-3 py-2.5 sm:py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
