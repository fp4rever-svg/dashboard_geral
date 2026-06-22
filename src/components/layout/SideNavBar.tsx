import { useState, useEffect } from 'react';
import { Factory, Truck, BarChart3, FileText, TableProperties, LineChart, Users, HeartPulse, LayoutDashboard, Megaphone, ExternalLink, GripVertical, Settings, Sparkles, Database, Workflow } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SideNavBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin: boolean;
}

const GESTAO_ITEMS_CONFIG: Record<string, { label: string; icon: any, type?: string }> = {
  log_dashboard: { label: 'Log. Tabela', icon: TableProperties },
  relatorios: { label: 'Gerenciar Produtividade', icon: FileText },
  daily_projection: { label: 'Projeção Diária', icon: LineChart },
  absenteismo: { label: 'Absenteísmo', icon: Users },
  lista_presenca: { label: 'Lista de Presença', icon: ExternalLink, type: 'external' },
  analytics: { label: 'Analytics', icon: BarChart3 },
};

const initialOrder = Object.keys(GESTAO_ITEMS_CONFIG);

function SortableItem({ id, activeTab, onTabChange }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const item = GESTAO_ITEMS_CONFIG[id as keyof typeof GESTAO_ITEMS_CONFIG];

  if (!item) return null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const IconComponent = item.icon;
  const isExternal = item.type === 'external';

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <div {...attributes} {...listeners} className="cursor-grab text-slate-300 hover:text-slate-600">
        <GripVertical className="w-4 h-4" />
      </div>
      <button 
        onClick={() => isExternal ? window.open('https://lista-presenca2.onrender.com', '_blank') : onTabChange(id)}
        className={`flex-1 flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${!isExternal && activeTab === id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}
      >
        <IconComponent className="w-5 h-5" />
        <span className="text-sm font-bold">{item.label}</span>
      </button>
    </div>
  );
}

export function SideNavBar({ activeTab, onTabChange, isAdmin }: SideNavBarProps) {
  const [gestaoOrder, setGestaoOrder] = useState(() => {
    const saved = localStorage.getItem('gestaoOrder');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
          // Merge to ensure any newly added tabs (like 'relatorios') are appended
          const missingKeys = initialOrder.filter(key => !parsed.includes(key));
          if (missingKeys.length > 0) {
            return [...parsed, ...missingKeys];
          }
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse gestaoOrder, resetting.", e);
      }
    }
    return initialOrder;
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    localStorage.setItem('gestaoOrder', JSON.stringify(gestaoOrder));
  }, [gestaoOrder]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setGestaoOrder((items: any) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <aside className="hidden md:flex flex-col h-full w-64 bg-slate-50 border-r border-slate-200 p-6 gap-8 shrink-0 overflow-y-auto">
      <div className="px-2">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Operações</h2>
        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => onTabChange('avisos')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${activeTab === 'avisos' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <Megaphone className="w-5 h-5" />
            <span className="text-sm font-bold">Avisos</span>
          </button>
          <button 
            onClick={() => onTabChange('log_analytics')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${activeTab === 'log_analytics' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <Truck className="w-5 h-5" />
            <span className="text-sm font-bold">Log. Dashboard</span>
          </button>
          <button 
            onClick={() => onTabChange('route_dashboard')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${activeTab === 'route_dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <Workflow className="w-5 h-5" />
            <span className="text-sm font-bold">Cortes & Fluxo Caixa</span>
          </button>
          <button 
            onClick={() => onTabChange('painel')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${activeTab === 'painel' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <Factory className="w-5 h-5" />
            <span className="text-sm font-bold">Produção</span>
          </button>
          <button 
            onClick={() => onTabChange('saude')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${activeTab === 'saude' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <HeartPulse className="w-5 h-5" />
            <span className="text-sm font-bold">Saúde</span>
          </button>
          <button 
            onClick={() => onTabChange('productivity_ops')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${activeTab === 'productivity_ops' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-sm font-bold">Produtividade</span>
          </button>
        </nav>
      </div>

      {isAdmin && (
        <div className="px-2">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Gestão</h2>
          <nav className="flex flex-col gap-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={gestaoOrder} strategy={verticalListSortingStrategy}>
                {gestaoOrder.map((id: string) => (
                  <SortableItem key={id} id={id} activeTab={activeTab} onTabChange={onTabChange} />
                ))}
              </SortableContext>
            </DndContext>
            <button 
              onClick={() => onTabChange('ai_admin')}
              className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all mt-1 ${activeTab === 'ai_admin' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <Database className="w-5 h-5" />
              <span className="text-sm font-bold">Base de Conhecimento IA</span>
            </button>
            <button 
              onClick={() => onTabChange('configuracoes')}
              className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all mt-1 ${activeTab === 'configuracoes' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <Settings className="w-5 h-5 animate-spin-slow-hover" />
              <span className="text-sm font-bold">Configurações</span>
            </button>
          </nav>
        </div>
      )}

      <div className="mt-auto px-4 py-6 border-t border-slate-200 flex flex-col items-center">
        <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest italic text-center leading-relaxed">
          Logistics Control <br /> System
        </p>
      </div>
    </aside>
  );
}
