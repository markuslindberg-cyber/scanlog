import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { toast } from 'sonner';

export default function EditKundDialog({ isOpen, onClose, onSuccess, kund }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    namn: kund?.namn || '',
    typ: kund?.typ || 'Cemi',
    projektnummer: kund?.projektnummer || ''
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.namn.trim()) {
      toast.error('Fyll i kundnamn');
      return;
    }

    setLoading(true);
    try {
      await base44.entities.Kund.update(kund.id, {
        namn: form.namn,
        typ: form.typ,
        projektnummer: form.projektnummer || null
      });
      toast.success('Kund uppdaterad!');
      onSuccess();
    } catch (error) {
      toast.error('Kunde inte uppdatera kund');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Redigera kund</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Kundnamn</label>
            <input
              type="text"
              name="namn"
              value={form.namn}
              onChange={handleChange}
              placeholder="t.ex. AB Företaget"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Kundtyp</label>
            <select
              name="typ"
              value={form.typ}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="Cemi">Cemi</option>
              <option value="PHM">PHM</option>
              <option value="Övrig">Övrig</option>
              <option value="BRF">BRF</option>
              <option value="Kommersiella">Kommersiella</option>
              <option value="Koncernbolag">Koncernbolag</option>
              <option value="Internt">Internt</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Projektnummer</label>
            <input
              type="text"
              name="projektnummer"
              value={form.projektnummer}
              onChange={handleChange}
              placeholder="t.ex. PROJ-001"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Uppdaterar...' : 'Uppdatera'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}