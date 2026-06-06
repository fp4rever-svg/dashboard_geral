import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList, ReferenceLine } from 'recharts';

interface HourlyTrendChartProps {
  data: any[];
}

export function HourlyTrendChart({ data }: HourlyTrendChartProps) {
  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
          <Tooltip />
          <Legend verticalAlign="top" height={36}/>
          <ReferenceLine y={2000} label={{ value: "Meta 2000", position: 'top', fill: 'red', fontSize: 10 }} stroke="red" strokeDasharray="3 3" />
          <Bar dataKey="SeparaUND" fill="#006b5f" radius={[4, 4, 0, 0]} name="SEPARAÇÃO UNID.">
            <LabelList dataKey="SeparaUND" position="top" fontSize={10} />
          </Bar>
          <Bar dataKey="CFracUND" fill="#1a2b3c" radius={[4, 4, 0, 0]} name="CONFERÊNCIA UNID.">
            <LabelList dataKey="CFracUND" position="top" fontSize={10} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
