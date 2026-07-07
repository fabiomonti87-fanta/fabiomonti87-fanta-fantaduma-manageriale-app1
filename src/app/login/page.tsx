'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [stato, setStato] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errore, setErrore] = useState<string | null>(null);

  async function inviaMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStato('sending');
    setErrore(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (error) {
      setErrore(error.message);
      setStato('error');
    } else {
      setStato('sent');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">FantaDuma Manageriale</h1>
        <p className="mb-6 text-sm text-gray-500">
          Accedi con la tua email: riceverai un link di accesso.
        </p>

        {stato === 'sent' ? (
          <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">
            Link inviato a <strong>{email}</strong>. Controlla la posta.
          </p>
        ) : (
          <form onSubmit={inviaMagicLink} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@esempio.it"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={stato === 'sending'}
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {stato === 'sending' ? 'Invio…' : 'Invia magic link'}
            </button>
            {errore && <p className="text-sm text-red-600">{errore}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
