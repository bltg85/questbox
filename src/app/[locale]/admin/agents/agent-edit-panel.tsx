'use client';

import { useState } from 'react';
import { Pencil, X, Save } from 'lucide-react';
import type { Agent } from '@/types';

interface Props {
  agent: Agent;
}

export default function AgentEditPanel({ agent }: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(agent.system_prompt);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_prompt: prompt }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setOpen(false);
      }, 1200);
    } catch {
      alert('Kunde inte spara — försök igen.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
      >
        <Pencil className="h-3 w-3" /> Redigera
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            {agent.icon} {agent.name} — System Prompt
          </h3>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 text-xs text-gray-500">
          Agentens personlighet och stil. Läggs till <em>före</em> de tekniska instruktionerna.
          Lämna tomt för standardbeteende.
        </p>

        <textarea
          className="w-full rounded-lg border border-gray-200 p-3 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          rows={10}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`Exempel:\nDu är en kreativ berättare med förkärlek för humor och överraskningar. Du älskar att hitta på oväntade vändningar och skapar alltid innehåll med en distinkt personlig touch.`}
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saved ? 'Sparat!' : saving ? 'Sparar...' : 'Spara'}
          </button>
        </div>
      </div>
    </div>
  );
}
