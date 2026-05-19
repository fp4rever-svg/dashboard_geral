import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  status?: string;
}

export function KPICard({ title, value, icon: Icon, trend, status }: KPICardProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-start mb-4">
        <div className="text-teal-600 bg-teal-50 p-2 rounded-lg">
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className="text-green-600 text-xs font-semibold bg-green-100 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
        {status && (
          <span className="text-teal-900 text-xs font-semibold bg-teal-100 px-2 py-1 rounded-full">
            {status}
          </span>
        )}
      </div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
    </div>
  );
}
