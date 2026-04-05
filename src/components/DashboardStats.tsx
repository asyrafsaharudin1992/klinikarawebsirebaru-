import React, { useState } from 'react';
import { 
  Users, 
  MessageCircle, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  MapPin, 
  Search, 
  Smartphone, 
  Monitor, 
  Globe, 
  ChevronDown,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: string;
    isUp: boolean;
  };
  icon: React.ElementType;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, icon: Icon, color }) => (
  <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-6 rounded-2xl">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-xl bg-zinc-950 border border-zinc-800 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
          trend.isUp ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
        }`}>
          {trend.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend.value}
        </div>
      )}
    </div>
    <div>
      <p className="text-zinc-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
    </div>
  </div>
);

const DashboardStats: React.FC = () => {
  const [dateFilter, setDateFilter] = useState('7 Hari Lepas');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Statistik & Analitik</h2>
          <p className="text-zinc-500 mt-1">Pantau prestasi klinik dan interaksi pelanggan anda.</p>
        </div>
        
        <div className="relative group">
          <button className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-white px-4 py-2.5 rounded-xl hover:bg-zinc-800 transition-all">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <span className="font-medium">{dateFilter}</span>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </button>
          
          <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
            {['Hari Ini', '7 Hari Lepas', 'Bulan Ini', 'Tahun Ini'].map((option) => (
              <button 
                key={option}
                onClick={() => setDateFilter(option)}
                className="w-full text-left px-4 py-3 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
          title="Total Pelawat" 
          value="12,482" 
          trend={{ value: '12.5%', isUp: true }}
          icon={Users} 
          color="text-blue-500"
        />
        <StatCard 
          title="Klik WhatsApp" 
          value="842" 
          trend={{ value: '8.2%', isUp: true }}
          icon={MessageCircle} 
          color="text-green-500"
        />
        <StatCard 
          title="Kadar Penukaran" 
          value="6.75%" 
          trend={{ value: '2.1%', isUp: false }}
          icon={Activity} 
          color="text-purple-500"
        />
        <StatCard 
          title="Servis Popular" 
          value="AraVax" 
          icon={TrendingUp} 
          color="text-red-500"
        />
        <StatCard 
          title="Top Cawangan" 
          value="Ara Damansara" 
          icon={MapPin} 
          color="text-cyan-500"
        />
      </div>

      {/* Middle Section: Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic vs Clicks Chart Placeholder */}
        <div className="lg:col-span-2 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-white">Trafik vs Klik WhatsApp</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-zinc-500">Pelawat</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-zinc-500">Klik WA</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-h-[300px] bg-zinc-950/50 rounded-xl border border-zinc-800/50 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="h-full w-full" style={{ backgroundImage: 'radial-gradient(circle, #3f3f46 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            </div>
            <div className="text-center relative z-10">
              <Activity className="w-12 h-12 text-zinc-800 mx-auto mb-3" />
              <p className="text-zinc-600 font-medium">Visualisasi Data (Line Chart)</p>
              <p className="text-zinc-700 text-xs mt-1">Memerlukan integrasi Recharts/D3</p>
            </div>
          </div>
        </div>

        {/* Top Search Keywords */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Search className="w-5 h-5 text-zinc-400" />
            <h3 className="text-lg font-bold text-white">Kata Kunci Popular</h3>
          </div>
          
          <div className="space-y-4">
            {[
              { keyword: 'vaksin bayi', count: 452 },
              { keyword: 'klinik ibu anak', count: 328 },
              { keyword: 'aravax price', count: 215 },
              { keyword: 'pakej bersalin', count: 184 },
              { keyword: 'klinik ara damansara', count: 156 },
              { keyword: 'temujanji doktor', count: 92 },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between group">
                <span className="text-zinc-400 group-hover:text-white transition-colors">{item.keyword}</span>
                <span className="text-zinc-600 font-mono text-sm">{item.count}</span>
              </div>
            ))}
          </div>
          
          <button className="w-full mt-8 py-2 text-sm font-bold text-zinc-500 hover:text-white transition-colors border-t border-zinc-800 pt-4">
            Lihat Semua Kata Kunci
          </button>
        </div>
      </div>

      {/* Bottom Section: Breakdown Data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prestasi Servis */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Prestasi Servis</h3>
          <div className="space-y-4">
            {[
              { name: 'AraVax', clicks: 342, color: 'bg-red-500' },
              { name: 'AraSihat', clicks: 215, color: 'bg-blue-500' },
              { name: 'AraMommy', clicks: 156, color: 'bg-purple-500' },
              { name: 'AraJunior', clicks: 129, color: 'bg-green-500' },
            ].map((service, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-300 font-medium">{service.name}</span>
                  <span className="text-zinc-500">{service.clicks} klik</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${service.color} rounded-full`} 
                    style={{ width: `${(service.clicks / 342) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Klik Mengikut Cawangan */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Klik Mengikut Cawangan</h3>
          <div className="space-y-4">
            {[
              { name: 'Ara Damansara', clicks: 428 },
              { name: 'Setia Alam', clicks: 215 },
              { name: 'Kota Damansara', clicks: 124 },
              { name: 'Subang Bestari', clicks: 75 },
            ].map((branch, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-400 text-xs font-bold">
                    {idx + 1}
                  </div>
                  <span className="text-zinc-300 font-medium">{branch.name}</span>
                </div>
                <span className="text-green-500 font-bold">{branch.clicks}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Peranti & Sumber */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Peranti & Sumber</h3>
          
          <div className="space-y-8">
            {/* Device Breakdown */}
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
                <Smartphone className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">84%</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Mobile</p>
              </div>
              <div className="flex-1 text-center p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
                <Monitor className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">16%</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Desktop</p>
              </div>
            </div>

            {/* Traffic Sources */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Sumber Trafik</h4>
              <div className="space-y-3">
                {[
                  { name: 'Organic Search', value: 45, icon: Search },
                  { name: 'Social Media', value: 35, icon: Globe },
                  { name: 'Direct', value: 20, icon: Activity },
                ].map((source, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <source.icon className="w-4 h-4 text-zinc-600" />
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400">{source.name}</span>
                        <span className="text-zinc-500">{source.value}%</span>
                      </div>
                      <div className="h-1 w-full bg-zinc-950 rounded-full overflow-hidden">
                        <div className="h-full bg-zinc-700 rounded-full" style={{ width: `${source.value}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
