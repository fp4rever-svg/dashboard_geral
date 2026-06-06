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
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between gap-3.5 transition-all hover:border-slate-350 select-none">
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-teal-600 bg-teal-50 p-2 rounded-lg shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest truncate" title={title}>{title}</p>
          <h3 className="text-lg font-black text-slate-900 mt-0.5 leading-none">{value}</h3>
        </div>
      </div>
      {(trend || status) && (
        <div className="flex flex-col items-end gap-1 shrink-0">
          {trend && (
            <span className="text-green-600 text-[10px] font-black bg-green-50 border border-green-100/50 px-2 py-0.5 rounded-md">
              {trend}
            </span>
          )}
          {status && (
            <span className="text-teal-900 text-[10px] font-black bg-teal-50 border border-teal-100/50 px-2 py-0.5 rounded-md">
              {status}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
