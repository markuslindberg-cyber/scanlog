import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ArtikelDetaljer() {
  const { streckkod } = useParams();
  const navigate = useNavigate();
  const [artikel, setArtikel] = useState(null);
  const [transaktioner, setTransaktioner] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [personal, setPersonal] = useState([]);
  const [kunder, setKunder] = useState([]);
  const [inköp, setInköp] = useState([]);
  const [editingInköp, setEditingInköp] = useState(null);
  const [inköpForm, setInköpForm] = useState({});
  const [showAddInköp, setShowAddInköp] = useState(false);
  const [newInköpForm, setNewInköpForm] = useState({ datum: new Date().toISOString().split('T')[0], antal: '', pris: '' });

  useEffect(() => {
    loadData();
  }, [streckkod]);

  const loadData = async () => {
    try {
      const [artiklarData, uttagData, personalData, kundarData, inköpData] = await Promise.all([
        base44.entities.Artikel.list(null, 1000),
        base44.entities.Uttag.list(null, 5000),
        base44.entities.Personal.list(),
        base44.entities.Kund.list(),
        base44.entities.Inköp.list()
      ]);

      const sammanslagna = artiklarData.filter(a => a.streckkod === streckkod);
      if (sammanslagna.length === 0) {
        navigate('/lager');
        return;
      }

      const huvudArtikel = sammanslagna[0];
      setArtikel(huvudArtikel);
      setForm({
        benämning: huvudArtikel.benämning,
        artikelnummer: huvudArtikel.artikelnummer || '',
        pris: huvudArtikel.pris,
        inköpsdatum: huvudArtikel.inköpsdatum,
        antal_inköpta: huvudArtikel.antal_inköpta,
        lagertröskelvärde: huvudArtikel.lagertröskelvärde || 10,
        utgående: huvudArtikel.utgående || false
      });

      const relateradeUttag = uttagData.filter(u => 
        sammanslagna.some(a => a.id === u.artikel_id)
      );
      setTransaktioner(relateradeUttag.sort((a, b) => new Date(b.datum) - new Date(a.datum)));
      const relateradeInköp = inköpData.filter(i => 
        sammanslagna.some(a => a.id === i.artikel_id)
      );
      setInköp(relateradeInköp.sort((a, b) => new Date(b.datum) - new Date(a.datum)));
      setPersonal(personalData);
      setKunder(kundarData);
    } catch (error) {
      toast.error('Kunde inte ladda data');
      navigate('/lager');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await base44.entities.Artikel.update(artikel.id, {
        benämning: form.benämning,
        artikelnummer: form.artikelnummer || null,
        pris: parseFloat(form.pris),
        inköpsdatum: form.inköpsdatum,
        antal_inköpta: parseInt(form.antal_inköpta),
        lagertröskelvärde: parseInt(form.lagertröskelvärde),
        utgående: form.utgående
      });
      toast.success('Artikel uppdaterad!');
      setEditing(false);
      loadData();
    } catch (error) {
      toast.error('Kunde inte uppdatera artikel');
    }
  };

  const handleEditInköp = (i) => {
    setEditingInköp(i.id);
    setInköpForm({
      datum: i.datum,
      antal: i.antal,
      pris: i.pris
    });
  };

  const handleSaveInköp = async () => {
    try {
      await base44.entities.Inköp.update(editingInköp, {
        datum: inköpForm.datum,
        antal: parseInt(inköpForm.antal),
        pris: parseFloat(inköpForm.pris)
      });
      toast.success('Inköp uppdaterat!');
      setEditingInköp(null);
      loadData();
    } catch (error) {
      toast.error('Kunde inte uppdatera inköp');
    }
  };

  const handleDeleteInköp = async (id) => {
    if (confirm('Är du säker på att du vill ta bort detta inköp?')) {
      try {
        await base44.entities.Inköp.delete(id);
        toast.success('Inköp borttaget!');
        loadData();
      } catch (error) {
        toast.error('Kunde inte ta bort inköp');
      }
    }
  };

  const handleAddInköp = async () => {
    if (!newInköpForm.antal || !newInköpForm.pris) {
      toast.error('Fyll i alla fält');
      return;
    }
    try {
      await base44.entities.Inköp.create({
        artikel_id: artikel.id,
        datum: newInköpForm.datum,
        antal: parseInt(newInköpForm.antal),
        pris: parseFloat(newInköpForm.pris)
      });
      toast.success('Inköp tillagt!');
      setShowAddInköp(false);
      setNewInköpForm({ datum: new Date().toISOString().split('T')[0], antal: '', pris: '' });
      loadData();
    } catch (error) {
      toast.error('Kunde inte lägga till inköp');
    }
  };

  const getPersonalNamn = (id) => personal.find(p => p.id === id)?.namn || '-';
  const getKundNamn = (id) => kunder.find(k => k.id === id)?.namn || '-';

  const totalFromInköp = inköp.reduce((sum, i) => sum + i.antal, 0);

  if (loading) return <div className="flex justify-center p-8">Laddar...</div>;
  if (!artikel) return null;

  const totalInköpt = artikel.antal_inköpta;
  const totalUttag = transaktioner.reduce((sum, t) => sum + t.antal, 0);
  const saldo = totalInköpt - totalUttag;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/lager')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold">{artikel.benämning}</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Artikelinformation</h2>
          {!editing && (
            <Button
              onClick={() => setEditing(true)}
              variant="outline"
              className="gap-2"
            >
              <Edit2 className="w-4 h-4" /> Redigera
            </Button>
          )}
        </div>

        {!editing ? (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Streckkod</p>
              <p className="text-lg font-semibold">{artikel.streckkod}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Artikelnummer</p>
              <p className="text-lg font-semibold">{artikel.artikelnummer || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Pris</p>
              <p className="text-lg font-semibold">{artikel.pris} kr</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Inköpsdatum</p>
              <p className="text-lg font-semibold">{artikel.inköpsdatum}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Antal inköpt</p>
              <p className="text-lg font-semibold">{totalFromInköp > 0 ? totalFromInköp : totalInköpt}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Lagertröskelvärde</p>
              <p className="text-lg font-semibold">{artikel.lagertröskelvärde}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Totalt uttag</p>
              <p className="text-lg font-semibold text-blue-600">{totalUttag}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Saldo</p>
              <p className={`text-lg font-semibold ${saldo === 0 ? 'text-red-600' : saldo < artikel.lagertröskelvärde ? 'text-yellow-600' : 'text-green-600'}`}>
                {saldo}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-lg font-semibold">
                {artikel.utgående ? <span className="text-orange-600">Utgående</span> : <span className="text-green-600">Aktiv</span>}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Benämning</label>
              <input
                type="text"
                value={form.benämning}
                onChange={(e) => setForm({ ...form, benämning: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Artikelnummer</label>
                <input
                  type="text"
                  value={form.artikelnummer}
                  onChange={(e) => setForm({ ...form, artikelnummer: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Pris</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.pris}
                  onChange={(e) => setForm({ ...form, pris: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Inköpsdatum</label>
                <input
                  type="date"
                  value={form.inköpsdatum}
                  onChange={(e) => setForm({ ...form, inköpsdatum: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Antal inköpt</label>
                <input
                  type="number"
                  value={form.antal_inköpta}
                  onChange={(e) => setForm({ ...form, antal_inköpta: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Lagertröskelvärde</label>
              <input
                type="number"
                value={form.lagertröskelvärde}
                onChange={(e) => setForm({ ...form, lagertröskelvärde: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="utgående-edit"
                checked={form.utgående}
                onCheckedChange={(checked) => setForm({ ...form, utgående: !!checked })}
              />
              <label htmlFor="utgående-edit" className="text-sm font-semibold cursor-pointer">
                Utgående artikel (köps inte längre in)
              </label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setEditing(false)}
                variant="outline"
                className="flex-1 gap-2"
              >
                <X className="w-4 h-4" /> Avbryt
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
              >
                <Save className="w-4 h-4" /> Spara
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Inköp av denna artikel</h2>
          {!showAddInköp && (
            <Button
              onClick={() => setShowAddInköp(true)}
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" /> Lägg till inköp
            </Button>
          )}
        </div>

        {showAddInköp && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3 border border-gray-200">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Datum</label>
                <input
                  type="date"
                  value={newInköpForm.datum}
                  onChange={(e) => setNewInköpForm({ ...newInköpForm, datum: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Antal</label>
                <input
                  type="number"
                  value={newInköpForm.antal}
                  onChange={(e) => setNewInköpForm({ ...newInköpForm, antal: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Pris per enhet</label>
                <input
                  type="number"
                  step="0.01"
                  value={newInköpForm.pris}
                  onChange={(e) => setNewInköpForm({ ...newInköpForm, pris: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAddInköp}
                className="bg-green-600 hover:bg-green-700"
              >
                Lägg till
              </Button>
              <Button
                onClick={() => setShowAddInköp(false)}
                variant="outline"
              >
                Avbryt
              </Button>
            </div>
          </div>
        )}

        {inköp.length === 0 ? (
          <p className="text-gray-600">Ingen inköp registrerad än</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Datum</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Antal</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Pris per enhet</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Totalt</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Åtgärd</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inköp.map(i => (
                  <tr key={i.id}>
                    {editingInköp === i.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={inköpForm.datum}
                            onChange={(e) => setInköpForm({ ...inköpForm, datum: e.target.value })}
                            className="px-3 py-1 border border-gray-300 rounded w-full"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={inköpForm.antal}
                            onChange={(e) => setInköpForm({ ...inköpForm, antal: e.target.value })}
                            className="px-3 py-1 border border-gray-300 rounded w-full text-right"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={inköpForm.pris}
                            onChange={(e) => setInköpForm({ ...inköpForm, pris: e.target.value })}
                            className="px-3 py-1 border border-gray-300 rounded w-full text-right"
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {(inköpForm.antal * inköpForm.pris).toFixed(2)} kr
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={handleSaveInköp}
                            className="text-green-600 hover:bg-green-50 p-1 rounded"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingInköp(null)}
                            className="text-gray-600 hover:bg-gray-100 p-1 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">{i.datum}</td>
                        <td className="px-4 py-3 text-right">{i.antal}</td>
                        <td className="px-4 py-3 text-right">{i.pris} kr</td>
                        <td className="px-4 py-3 text-right text-gray-600">{(i.antal * i.pris).toFixed(2)} kr</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => handleEditInköp(i)}
                            className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteInköp(i.id)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Alla uttag av denna artikel</h2>
        {transaktioner.length === 0 ? (
          <p className="text-gray-600">Ingen uttag registrerad än</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Datum</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Personal</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Kund</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Ordernummer</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Antal</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Pris</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transaktioner.map(uttag => (
                  <tr key={uttag.id}>
                    <td className="px-4 py-3">{uttag.datum}</td>
                    <td className="px-4 py-3">{getPersonalNamn(uttag.personal_id)}</td>
                    <td className="px-4 py-3">{getKundNamn(uttag.kund_id)}</td>
                    <td className="px-4 py-3">{uttag.ordernummer || '-'}</td>
                    <td className="px-4 py-3 text-right">{uttag.antal}</td>
                    <td className="px-4 py-3 text-right">{uttag.pris} kr</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}