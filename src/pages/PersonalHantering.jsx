import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export default function PersonalHantering() {
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ namn: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadPersonal();
  }, []);

  const loadPersonal = async () => {
    try {
      const data = await base44.entities.Personal.list();
      setPersonal(data.sort((a, b) => a.namn.localeCompare(b.namn)));
    } catch (error) {
      toast.error('Kunde inte ladda personal');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.namn.trim()) {
      toast.error('Namn är obligatoriskt');
      return;
    }

    try {
      await base44.entities.Personal.create({ namn: form.namn });
      toast.success('Personal tillagd!');
      setForm({ namn: '' });
      loadPersonal();
    } catch (error) {
      toast.error('Kunde inte lägga till personal');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Är du säker?')) {
      try {
        await base44.entities.Personal.delete(id);
        toast.success('Personal borttagen!');
        loadPersonal();
      } catch (error) {
        toast.error('Kunde inte ta bort personal');
      }
    }
  };

  const handleEdit = (p) => {
    setEditingId(p.id);
    setForm({ namn: p.namn });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!form.namn.trim()) {
      toast.error('Namn är obligatoriskt');
      return;
    }

    try {
      await base44.entities.Personal.update(editingId, { namn: form.namn });
      toast.success('Personal uppdaterad!');
      setEditingId(null);
      setForm({ namn: '' });
      loadPersonal();
    } catch (error) {
      toast.error('Kunde inte uppdatera personal');
    }
  };

  if (loading) return <div className="flex justify-center p-8">Laddar...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">👤 Personalhantering</h1>

      <form onSubmit={editingId ? handleSaveEdit : handleAdd} className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
        <h2 className="text-xl font-semibold">{editingId ? 'Redigera personal' : 'Lägg till personal'}</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={form.namn}
            onChange={(e) => setForm({ namn: e.target.value })}
            placeholder="Namn"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
          />
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 gap-2">
            {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editingId ? 'Uppdatera' : 'Lägg till'}
          </Button>
          {editingId && (
            <Button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({ namn: '' });
              }}
              variant="outline"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {personal.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Ingen personal tillagd än</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Namn</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Åtgärd</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {personal.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{p.namn}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(p)}
                      className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg inline-flex"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded-lg inline-flex"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}