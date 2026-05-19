import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, Plus, Trash2, CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';
import { useAnnouncements, Announcement } from '../../hooks/useAnnouncements';

interface AnnouncementsViewProps {
  isAdmin?: boolean;
}

export default function AnnouncementsView({ isAdmin }: AnnouncementsViewProps) {
  const { announcements, addAnnouncement, deleteAnnouncement, toggleAnnouncement } = useAnnouncements();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<Announcement['type']>('info');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;
    await addAnnouncement(newTitle, newContent, newType);
    setNewTitle('');
    setNewContent('');
    setIsAdding(false);
  };

  const getIcon = (type: Announcement['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-rose-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const activeAnnouncements = announcements.filter(a => a.active);

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Comunicados Operacionais</h2>
            <p className="text-slate-500 font-medium">Fique por dentro das atualizações e avisos importantes.</p>
          </div>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold transition-all hover:bg-slate-800 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Novo Aviso
          </button>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Título</label>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Ex: Manutenção no Sistema"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tipo</label>
                  <select 
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="info">Informação (Azul)</option>
                    <option value="success">Sucesso (Verde)</option>
                    <option value="warning">Alerta (Laranja)</option>
                    <option value="error">Urgente (Vermelho)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Conteúdo</label>
                <textarea 
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all min-h-[120px]"
                  placeholder="Descreva o comunicado em detalhes..."
                />
              </div>
              <div className="flex justify-end gap-4">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-3 font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  Publicar Aviso
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6">
        {(isAdmin ? announcements : activeAnnouncements).map((announcement) => (
          <motion.div
            layout
            key={announcement.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`bg-white p-6 rounded-2xl border-l-[6px] shadow-sm flex items-start gap-6 transition-all hover:shadow-md ${
              announcement.type === 'info' ? 'border-l-blue-500' :
              announcement.type === 'success' ? 'border-l-emerald-500' :
              announcement.type === 'warning' ? 'border-l-amber-500' :
              'border-l-rose-500'
            } ${!announcement.active ? 'opacity-50 grayscale' : ''}`}
          >
            <div className={`p-3 rounded-xl ${
              announcement.type === 'info' ? 'bg-blue-50' :
              announcement.type === 'success' ? 'bg-emerald-50' :
              announcement.type === 'warning' ? 'bg-amber-50' :
              'bg-rose-50'
            }`}>
              {getIcon(announcement.type)}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-800">{announcement.title}</h3>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  {announcement.timestamp?.toDate ? announcement.timestamp.toDate().toLocaleString('pt-BR') : 'Agora'}
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed font-medium">
                {announcement.content}
              </p>
            </div>

            {isAdmin && (
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => toggleAnnouncement(announcement.id, !announcement.active)}
                  className={`p-2 rounded-lg transition-colors ${announcement.active ? 'bg-slate-100 text-slate-400 hover:text-slate-600' : 'bg-emerald-100 text-emerald-600'}`}
                  title={announcement.active ? "Desativar" : "Ativar"}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => deleteAnnouncement(announcement.id)}
                  className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        ))}

        {activeAnnouncements.length === 0 && !isAdmin && (
          <div className="text-center py-20 bg-slate-100 rounded-3xl border-2 border-dashed border-slate-200">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-500">Nenhum aviso no momento</h3>
            <p className="text-slate-400">Tudo operando normalmente!</p>
          </div>
        )}
      </div>
    </div>
  );
}
