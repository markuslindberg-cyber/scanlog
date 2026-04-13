import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import BarcodeInput from '@/components/BarcodeInput';
import { Play, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Inventering() {
  const [inventeringar, setInventeringar] = useState([]);
  const [activeInventering, setActiveInventering] = useState(null);
  const [artiklar, setArtiklar] = useState([]);
  const [scanningar, setScanningar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [invenData, artiklarData] = await Promise.all([
          base44.entities.Inventering.list(),
          base44.entities.Artikel.list()
        ]);
        setInventeringar(invenData);
        setArtiklar(artiklarData);
        
        const ongoing = invenData.find(i => i.status === 'pågående');
        if (ongoing) {
          setActiveInventering(ongoing);
          const scanData = await base44.entities.InventeringScannnning.list();
          const filtered = scanData.filter(s => s.inventering_id === ongoing.id);
          setScanningar(filtered);
        }
      } catch (error) {
        toast.error('Kunde inte ladda inventeringsdata');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const startInventering = async () => {
    try {
      const idn = await base44.entities.Inventering.create({
        startdatum: new Date().toISOString().split('T')[0],
        status: 'pågående'
      });
      setActiveInventering(idn);
      setScanningar([]);
      toast.success('Inventering startad');
    } catch (error) {
      toast.error('Kunde inte starta inventering');
    }
  };

  const handleBarcode = async (barcode) => {
    if (!activeInventering) return;
    
    const artikel = artiklar.find(a => a.streckkod === barcode);
    if (!artikel) {
      toast.error('Artikel inte hittas');
      return;
    }

    try {
      const scan = await base44.entities.InventeringScannnning.create({
        streckkod: barcode,
        scannad_tid: new Date().toISOString(),
        inventering_id: activeInventering.id,
        antal: 1
      });
      setScanningar([...scanningar, scan]);
      toast.success(`${artikel.benämning} skannad`);
    } catch (error) {
      toast.error('Kunde inte spara skanning');
    }
  };

  const endInventering = async () => {
    try {
      await base44.entities.Inventering.update(activeInventering.id, { status: 'avslutad' });
      setActiveInventering(null);
      toast.success('Inventering avslutad');
    } catch (error) {
      toast.error('Kunde inte avsluta inventering');
    }
  };

  const getUttagTotal = (artikelId) => {
    // In a real app, fetch from database
    return 0;
  };

  const getStatus = (artikel) => {
    const scanCount = scanningar.filter(s => s.streckkod === artikel.streckkod).length;
    const expectedCount = artikel.antal_inköpta - getUttagTotal(artikel.id);
    
    if (scanCount === expectedCount) return { type: 'fullt', text: '✔ Fullt lager' };
    if (scanCount < expectedCount) return { type: 'saknas', text: `❌ Saknas ${expectedCount - scanCount}` };
    return { type: 'överflöd', text: `⚠ Överflöd ${scanCount - expectedCount}` };
  };

  if (loading) return <div className="flex justify-center p-8">Laddar...</div>;

  if (!activeInventering) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold">🔍 Inventering</h1>
        <div className="bg-white rounded-lg p-6 border border-gray-200 text-center space-y-4">
          <p className="text-gray-600">Ingen aktiv inventering</p>
          <Button onClick={startInventering} className="bg-blue-600 hover:bg-blue-700 w-full py-3 text-lg">
            <Play className="w-5 h-5 mr-2" /> Starta inventering
          </Button>
        </div>
      </div>
    );
  }

  const scanned = artiklar.filter(a => scanningar.some(s => s.streckkod === a.streckkod)).length;
  const progress = (scanned / artiklar.length) * 100;
  const fullCount = artiklar.filter(a => getStatus(a).type === 'fullt').length;
  const missingCount = artiklar.filter(a => getStatus(a).type === 'saknas').length;
  const excessCount = artiklar.filter(a => getStatus(a).type === 'överflöd').length;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">🔍 Inventering {new Date(activeInventering.startdatum).toLocaleDateString('sv-SE')}</h1>

      <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">Framsteg: {scanned}/{artiklar.length} ({progress.toFixed(0)}%)</p>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <h2 className="font-semibold text-lg">📷 Skanna nästa artikel</h2>
        <BarcodeInput onBarcode={handleBarcode} />
      </div>

      {scanningar.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-3">
          <h3 className="font-semibold">Senast skannad:</h3>
          {(() => {
            const last = scanningar[scanningar.length - 1];
            const art = artiklar.find(a => a.streckkod === last.streckkod);
            const status = getStatus(art);
            return (
              <div className={`p-3 rounded-lg ${status.type === 'fullt' ? 'bg-green-50 border border-green-200' : status.type === 'saknas' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <p>{art?.benämning} — {status.text}</p>
              </div>
            );
          })()}
        </div>
      )}

      <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-3">
        <h3 className="font-semibold text-lg">📊 Realtidsstatus</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-2xl font-bold text-green-600">{fullCount}</p>
            <p className="text-sm text-green-700">✔ Fullt</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-2xl font-bold text-red-600">{missingCount}</p>
            <p className="text-sm text-red-700">❌ Saknas</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-2xl font-bold text-yellow-600">{excessCount}</p>
            <p className="text-sm text-yellow-700">⚠ Överflöd</p>
          </div>
        </div>
      </div>

      <Button onClick={endInventering} className="w-full bg-green-600 hover:bg-green-700 py-3 text-lg">
        <CheckCircle className="w-5 h-5 mr-2" /> Avsluta inventering
      </Button>
    </div>
  );
}