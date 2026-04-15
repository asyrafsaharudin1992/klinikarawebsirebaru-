import React, { useState } from 'react';
import { Service } from '../types';
import { CheckCircle2, AlertCircle, Loader2, ToggleLeft, ToggleRight, ExternalLink, MessageSquare } from 'lucide-react';

interface ServiceRoutingProps {
  services: Service[];
  fetchServices: () => void;
}

const ServiceRouting: React.FC<ServiceRoutingProps> = ({ services, fetchServices }) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const safeFetch = async (url: string, options: RequestInit) => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (e: any) {
      console.error('Fetch error:', e);
      throw e;
    }
  };

  const handleToggleRouting = async (service: Service) => {
    setUpdatingId(service.id);
    setError(null);
    const currentStatus = service.is_arapower_linked ?? true;

    try {
      await safeFetch(`/api/services/${service.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_arapower_linked: !currentStatus }),
      });
      fetchServices();
    } catch (err: any) {
      setError(`Failed to update ${service.title}: ${err.message}`);
    } finally {
      setUpdatingId(null);
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
