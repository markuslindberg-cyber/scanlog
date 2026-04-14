import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Info, Scan } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

export default function AddArtikelDialog({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [artiklar, setArtiklar] = useState([]);
  const [form, setForm] = useState({
    benämning: '',
    artikelnummer: '',
    streckkod: '',
    pris: '',
    inköpsdatum: new Date().toISOString().split('T')[0],
    antal_inköpta: '',
    lagertröskelvärde: '10',
    utgående: false
  });

  useEffect(() => {
    const loadArtiklar = async () => {
      const data = await base44.entities.Artikel.list();
      setArtiklar(data);
    };
    if (isOpen) loadArtiklar();
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newForm = { ...form, [name]: value };
    
    // Auto-fill lagertröskelvärde from existing artikel with same streckkod
    if (name === 'streckkod') {
      const existing = artiklar.find(a => a.streckkod === value);
      if (existing) {
        newForm.lagertröskelvärde = String(existing.lagertröskelvärde || 10);
      }
    }
    
    setForm(newForm);
  };

  const handleBarcodeScanned = (barcode) => {
    const existing = artiklar.find(a => a.streckkod === barcode);
    if (existing) {
      setForm({
        benämning: existing.benämning,
        artikelnummer: existing.artikelnummer || '',
        streckkod: existing.streckkod,
        pris: String(existing.pris),
        inköpsdatum: new Date().toISOString().split('T')[0],
        antal_inköpta: '',
        lagertröskelvärde: String(existing.lagertröskelvärde || 10)
      });
    } else {
      setForm({
        ...form,
        streckkod: barcode,
        inköpsdatum: new Date().toISOString().split('T')[0]
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.benämning || !form.streckkod || !form.pris || !form.antal_inköpta) {
      toast.error('Fyll i alla obligatoriska fält');
      return;
    }

    setLoading(true);
    try {
      await base44.entities.Artikel.create({
        benämning: form.benämning,
        artikelnummer: form.artikelnummer || null,
        streckkod: form.streckkod,
        pris: parseFloat(form.pris),
        inköpsdatum: form.inköpsdatum,
        antal_inköpta: parseInt(form.antal_inköpta),
        lagertröskelvärde: parseInt(form.lagertröskelvärde),
        utgående: form.utgående
      });
      toast.success('Artikel tillagd!');
      setForm({
        benämning: '',
        artikelnummer: '',
        streckkod: '',
        pris: '',
        inköpsdatum: new Date().toISOString().split('T')[0],
        antal_inköpta: '',
        lagertröskelvärde: '10',
        utgående: false
      });
      onSuccess();
    } catch (error) {
      toast.error('Kunde inte lägga till artikel');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Lägg till artikel</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Streckkod (scanna eller skriv manuellt) *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.streckkod}
                onChange={(e) => setForm({ ...form, streckkod: e.target.value })}
                onBlur={(e) => {
                  if (e.target.value) handleBarcodeScanned(e.target.value);
                }}
                placeholder="Scanna eller skriv streckkod..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                autoFocus
              />
              <Button type="button" variant="outline" className="px-3">
                <Scan className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Benämning *</label>
            <input
              type="text"
              name="benämning"
              value={form.benämning}
              onChange={handleChange}
              placeholder="t.ex. Clemondo Katrin Clasic"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Artikelnummer</label>
            <input
              type="text"
              name="artikelnummer"
              value={form.artikelnummer}
              onChange={handleChange}
              placeholder="t.ex. 1521307"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>



          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Pris *</label>
              <input
                type="number"
                name="pris"
                step="0.01"
                value={form.pris}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Antal inköpt *</label>
              <input
                type="number"
                name="antal_inköpta"
                value={form.antal_inköpta}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Inköpsdatum</label>
              <input
                type="date"
                name="inköpsdatum"
                value={form.inköpsdatum}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="block text-sm font-semibold">Lagertröskelvärde</label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Varning när saldo understiger detta värde</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <input
                type="number"
                name="lagertröskelvärde"
                value={form.lagertröskelvärde}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="utgående"
              checked={form.utgående}
              onCheckedChange={(checked) => setForm({ ...form, utgående: !!checked })}
            />
            <label htmlFor="utgående" className="text-sm font-semibold cursor-pointer">
              Utgående artikel (köps inte längre in)
            </label>
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
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? 'Lägger till...' : 'Lägg till'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}