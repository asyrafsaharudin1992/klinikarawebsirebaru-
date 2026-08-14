import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Service } from '../types';
import { CheckCircle2, AlertCircle, Loader2, ToggleLeft, ToggleRight, ExternalLink, MessageSquare } from 'lucide-react';
import { db } from '../firebase';
import { slugify, uniqueSlug } from '../utils';

interface ServiceRoutingProps {
  services: Service[];
  fetchServices: () => void;
}

const ServiceRouting: React.FC<ServiceRoutingProps> = ({ services, fetchServices }) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const servicesMissingSlugs = services.filter(s => !s.slug);
  const arapowerRoutedServices = services.filter(s => s.is_arapower_linked ?? true);

  const handleBackfillSlugs = async () => {
    setBackfilling(true);
    setError(null);
    try {
      const taken = new Set<string>(services.filter(s => s.slug).map(s => s.slug as string));
      for (const service of servicesMissingSlugs) {
        const slug = uniqueSlug(slugify(service.title || service.id), taken);
        taken.add(slug);
        await updateDoc(doc(db, 'services', service.id), { slug });
      }
      fetchServices();
    } catch (err: any) {
      setError(`Backfill failed: ${err.message}`);
    } finally {
      setBackfilling(false);
    }
  };

  // Writes directly through the app's own authenticated Firestore session
  // rather than the /api/services/:id endpoint, which only works when
  // server.ts is actually running as a real Node server (it isn't on the
  // current Vercel static deployment, and needs credentials this app's
  // local dev environment doesn't have either).
  const handleToggleRouting = async (service: Service) => {
    setUpdatingId(service.id);
    setError(null);
    const currentStatus = service.is_arapower_linked ?? true;

    try {
      await updateDoc(doc(db, 'services', service.id), { is_arapower_linked: !currentStatus });
      fetchServices();
    } catch (err: any) {
      setError(`Failed to update ${service.title}: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSetAllToWhatsApp = async () => {
    setBulkUpdating(true);
    setError(null);
    try {
      for (const service of arapowerRoutedServices) {
        await updateDoc(doc(db, 'services', service.id), { is_arapower_linked: false });
      }
      fetchServices();
    } catch (err: any) {
      setError(`Bulk update failed: ${err.message}`);
    } finally {
      setBulkUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Service Routing Dashboard</h2>
        <p className="text-sm text-zinc-400">Manage booking flow for each service</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {servicesMissingSlugs.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/50 text-amber-700 p-4 rounded-xl flex items-center justify-between gap-3">
          <span className="text-sm font-medium">
            {servicesMissingSlugs.length} service{servicesMissingSlugs.length === 1 ? '' : 's'} missing a URL slug (needed for /service/&lt;slug&gt; pages).
          </span>
          <button
            onClick={handleBackfillSlugs}
            disabled={backfilling}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {backfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {backfilling ? 'Generating...' : 'Generate Missing Slugs'}
          </button>
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          onClick={handleSetAllToWhatsApp}
          disabled={bulkUpdating || arapowerRoutedServices.length === 0}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          {bulkUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
          {bulkUpdating
            ? 'Updating...'
            : arapowerRoutedServices.length === 0
              ? 'All services already on WhatsApp'
              : `Set All to WhatsApp (${arapowerRoutedServices.length})`}
        </button>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-zinc-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Service Name</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Current Incentive</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Routing Configuration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-zinc-900">{service.title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded-md uppercase tracking-wide">
                      {service.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-zinc-600 font-medium">
                      {service.commission_rate ? `${service.commission_rate}%` : '0%'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleToggleRouting(service)}
                        disabled={updatingId === service.id}
                        className={`flex items-center gap-3 px-4 py-2 rounded-full border transition-all ${
                          (service.is_arapower_linked ?? true)
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-green-50 border-green-200 text-green-700'
                        } hover:shadow-md active:scale-95 disabled:opacity-50`}
                      >
                        {updatingId === service.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (service.is_arapower_linked ?? true) ? (
                          <ExternalLink className="w-4 h-4" />
                        ) : (
                          <MessageSquare className="w-4 h-4" />
                        )}
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {(service.is_arapower_linked ?? true) ? 'AraPower' : 'WhatsApp'}
                        </span>
                        {(service.is_arapower_linked ?? true) ? (
                          <ToggleRight className="w-6 h-6 text-blue-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-zinc-400" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ServiceRouting;
