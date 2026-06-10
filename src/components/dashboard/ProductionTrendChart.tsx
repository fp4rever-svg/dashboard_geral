import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList, ReferenceLine } from 'recharts';

interface ProductionTrendChartProps {
  data: any[];
  target: number;
}

export function ProductionTrendChart({ data, target }: ProductionTrendChartProps) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes() || 1;

  const processedData = data.map((item, index) => {
    const [hourStr] = item.name.split(':');
    const itemHour = parseInt(hourStr);
    
    let projection = null;
    
    // If it's the current hour, calculate projection
    if (itemHour === currentHour) {
      projection = Math.round((item.SeparaACS / currentMinutes) * 60);
    } else {
      // Connect line from previous hour's actual to current hour's projection
      const nextItem = data[index + 1];
      if (nextItem) {
        const [nextHourStr] = nextItem.name.split(':');
        if (parseInt(nextHourStr) === currentHour) {
          projection = item.SeparaACS;
        }
      }
    }

    return {
      ...item,
      Projeção: projection,
      Alvo: target,
      ProjectionLabel: itemHour === currentHour ? projection : null
    };
  });

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={processedData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          <Legend verticalAlign="top" height={36}/>
          
          <ReferenceLine 
            y={target} 
            label={{ value: `Meta: ${target}`, position: 'top', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} 
            stroke="#ef4444" 
            strokeDasharray="5 5" 
          />
          
          <Bar dataKey="SeparaACS" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Realizado ACS">
            <LabelList dataKey="SeparaACS" position="top" fontSize={10} fill="#1e40af" fontWeight="bold" />
          </Bar>
          
          <Line 
            type="monotone" 
            dataKey="Projeção" 
            stroke="#10b981" 
            strokeWidth={3} 
            strokeDasharray="5 5"
            dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
            name="Tendência ACS"
            connectNulls
          >
            <LabelList 
              dataKey="ProjectionLabel" 
              position="top" 
              fontSize={10} 
              fill="#065f46" 
              fontWeight="bold" 
              offset={10}
            />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
