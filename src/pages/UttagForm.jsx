import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import BarcodeInput from '@/components/BarcodeInput';
import { Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function UttagForm() {
  const [personal, setPersonal] = useState(null);
  const [kund, setKund] = useState(null);
  const [ordernummer, setOrdernummer] = useState('');
  const [articles, setArticles] = useState([]);
  const [scannedeArtiklar, setScannedArticles] = useState([]);
  const [personalList, setPersonalList] = useState([]);
  const [kundList, setKundList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todaysUttag, setTodaysUttag] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [personelData, kundData, artiklarData, uttagData] = await Promise.all([
          base44.entities.Personal.list(),
          base44.entities.Kund.list(),
          base44.entities.Artikel.list(),
          base44.entities.Uttag.list()
        ]);
        setPersonalList(personelData);
        setKundList(kundData);
        setArticles(artiklarData);
        const todaysData = uttagData.filter(u => u.datum === today);
        setTodaysUttag(todaysData);
      } catch (error) {
        toast.error('Kunde inte ladda data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleBarcode = async (barcode) => {
    const artikel = articles.find(a => a.streckkod === barcode);
    if (!artikel) {
      toast.error('Artikel inte hittas');
      return;
    }

    const existing = scannedeArtiklar.find(sa => sa.artikel_id === artikel.id);
    if (existing) {
      setScannedArticles(scannedeArtiklar.map(sa =>
        sa.artikel_id === artikel.id ? { ...sa, antal: sa.antal + 1 } : sa
      ));
    } else {
      setScannedArticles([...scannedeArtiklar, {
        artikel_id: artikel.id,
        benämning: artikel.benämning,
        pris: artikel.pris,
        antal: 1,
        totalt: artikel.pris
      }]);
    }
    toast.success(`${artikel.benämning} tillagd`);
  };



  const handleConfirm = async () => {
    if (!personal || !kund || scannedeArtiklar.length === 0) {
      toast.error('Fyll i alla fält');
      return;
    }

    try {
      const månad = new Date().toISOString().slice(0, 7);
      for (const item of scannedeArtiklar) {
        await base44.entities.Uttag.create({
          datum: new Date().toISOString().split('T')[0],
          personal_id: personal,
          kund_id: kund,
          ordernummer: ordernummer || null,
          artikel_id: item.artikel_id,
          antal: item.antal,
          pris: item.totalt,
          månad
        });
      }
      toast.success('Uttag bekräftat!');
      setScannedArticles([]);
      setPersonal(null);
      setKund(null);
      setOrdernummer('');
    } catch (error) {
      toast.error('Kunde inte spara uttag');
    }
  };

  const total = scannedeArtiklar.reduce((sum, item) => sum + item.totalt, 0);

  if (loading) return <div className="flex justify-center p-8">Laddar...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">📦 Nytt uttag</h1>



      <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Personal</label>
          <select
            value={personal || ''}
            onChange={(e) => setPersonal(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Välj personal...</option>
            {personalList.map(p => (
              <option key={p.id} value={p.id}>{p.namn}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Kund</label>
          <select
            value={kund || ''}
            onChange={(e) => setKund(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Välj kund...</option>
            {kundList.map(k => (
              <option key={k.id} value={k.id}>{k.namn}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Ordernummer (valfritt)</label>
          <input
            type="text"
            value={ordernummer}
            onChange={(e) => setOrdernummer(e.target.value)}
            placeholder="ORD-12345"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
        <h2 className="font-semibold text-lg">📷 Skanna streckkod</h2>
        <BarcodeInput onBarcode={handleBarcode} />
      </div>

      {todaysUttag.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
          <h2 className="font-semibold text-lg">📋 Dagens uttag ({todaysUttag.length})</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {todaysUttag.map((item) => {
              const personalNamn = personalList.find(p => p.id === item.personal_id)?.namn || '-';
              const kundNamn = kundList.find(k => k.id === item.kund_id)?.namn || '-';
              const artikelNamn = articles.find(a => a.id === item.artikel_id)?.benämning || '-';
              return (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="font-medium">{artikelNamn} × {item.antal}</p>
                  <p className="text-gray-600">{personalNamn} → {kundNamn}</p>
                  <p className="text-gray-600">{item.pris} kr {item.ordernummer && `(${item.ordernummer})`}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {scannedeArtiklar.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
          <h2 className="font-semibold text-lg">Skannade artiklar ({scannedeArtiklar.length})</h2>
          <div className="space-y-2">
            {scannedeArtiklar.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{item.benämning}</p>
                  <p className="text-sm text-gray-600">{item.pris} kr × {item.antal} = {item.totalt} kr</p>
                </div>
                <button
                  onClick={() => setScannedArticles(scannedeArtiklar.filter((_, i) => i !== idx))}
                  className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          
          <div className="pt-4 border-t-2">
            <p className="text-xl font-bold">Totalt: {total.toFixed(2)} kr</p>
          </div>

          <Button
            onClick={handleConfirm}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
          >
            <Check className="w-5 h-5 mr-2" /> Bekräfta uttag
          </Button>
        </div>
      )}
    </div>
  );
}