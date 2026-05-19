import React, { useState } from 'react';
import { Lock, User as UserIcon, X } from 'lucide-react';

interface LoginFormProps {
  onLogin: (user: string, pass: string) => void;
  onClose: () => void;
}

export function LoginForm({ onLogin, onClose }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'Admin' && password === '1234') {
      onLogin(username, password);
    } else {
      setError('Credenciais inválidas');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight text-center">Acesso Restrito</h2>
            <p className="text-slate-500 text-sm mt-1">Insira suas credenciais para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Usuário</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  placeholder="Seu usuário"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-xs font-bold text-red-500 text-center animate-shake">{error}</p>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-black tracking-widest uppercase hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98] mt-4"
            >
              Entrar no Sistema
            </button>
          </form>
        </div>
        
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">GSC Logistics System v2.0</p>
        </div>
      </div>
    </div>
  );
}
