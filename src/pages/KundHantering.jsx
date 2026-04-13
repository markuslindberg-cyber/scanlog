import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function KundHantering() {
  const [kunder, setKunder] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    namn: '',
    typ: 'Cemi',
    projektnummer: ''
  });

  const loadKunder = async () => {
    try {
      const data = await base44.entities.Kund.list();
      setKunder(data);
    } catch (error) {
      toast.error('Kunde inte ladda kunder');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKunder();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.namn.trim()) {
      toast.error('Fyll i kundnamn');
      return;
    }

    try {
      await base44.entities.Kund.create({
        namn: form.namn,
        typ: form.typ,
        projektnummer: form.projektnummer || null
      });
      toast.success('Kund tillagd!');
      setForm({ namn: '', typ: 'Cemi', projektnummer: '' });
      loadKunder();
    } catch (error) {
      toast.error('Kunde inte lägga till kund');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Är du säker?')) {
      try {
        await base44.entities.Kund.delete(id);
        toast.success('Kund borttagen');
        loadKunder();
      } catch (error) {
        toast.error('Kunde inte ta bort kund');
      }
    }
  };

  if (loading) return <div className="flex justify-center p-8">Laddar...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">👥 Kundhantering</h1>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Lägg till ny kund</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Kundnamn</label>
            <input
              type="text"
              value={form.namn}
              onChange={(e) => setForm({ ...form, namn: e.target.value })}
              placeholder="t.ex. AB Företaget"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Kundtyp</label>
            <select
              value={form.typ}
              onChange={(e) => setForm({ ...form, typ: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="Cemi">Cemi</option>
              <option value="PHM">PHM</option>
              <option value="Övrig">Övrig</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Projektnummer</label>
            <input
              type="text"
              value={form.projektnummer}
              onChange={(e) => setForm({ ...form, projektnummer: e.target.value })}
              placeholder="t.ex. PROJ-001"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full">
            <Plus className="w-4 h-4 mr-2" /> Lägg till kund
          </Button>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Namn</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Typ</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Projektnummer</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Åtgärd</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {kunder.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                    Inga kunder ännu
                  </td>
                </tr>
              ) : (
                kunder.map(kund => (
                  <tr key={kund.id}>
                    <td className="px-4 py-3 font-medium">{kund.namn}</td>
                    <td className="px-4 py-3">{kund.typ}</td>
                    <td className="px-4 py-3">{kund.projektnummer || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(kund.id)}
                        className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}