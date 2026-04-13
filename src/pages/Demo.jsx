import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function Demo() {
  const [loading, setLoading] = useState(false);

  const demoData = {
    artiklar: [
      { benämning: 'Clemondo Katrin Clasic S', artikelnummer: '1521307', streckkod: '71387', pris: 23.81, inköpsdatum: '2025-06-05', antal_inköpta: 515 },
      { benämning: 'YES Maskindisk 99st', artikelnummer: '2245789', streckkod: '82904', pris: 110, inköpsdatum: '2025-06-05', antal_inköpta: 17 },
      { benämning: 'Torkrulle Tork Uni', artikelnummer: '1678934', streckkod: '56123', pris: 45.50, inköpsdatum: '2025-06-05', antal_inköpta: 42 },
      { benämning: 'Activ color 3-pack', artikelnummer: '3456789', streckkod: '91234', pris: 339, inköpsdatum: '2025-06-05', antal_inköpta: 2 },
      { benämning: 'Papperskorgspåse', artikelnummer: '4567890', streckkod: '34567', pris: 89.99, inköpsdatum: '2025-06-05', antal_inköpta: 100 }
    ],
    kunder: [
      { namn: 'WC Hagalund', typ: 'Cemi' },
      { namn: 'Industrivägen Cemi', typ: 'Cemi' },
      { namn: 'Sturehov slott', typ: 'PHM' },
      { namn: 'Håbo', typ: 'PHM' },
      { namn: 'Danmarksgatan Cemi', typ: 'Cemi' }
    ],
    personal: [
      { namn: 'Gintare Terepe' },
      { namn: 'Anna Svensson' },
      { namn: 'Marcus Bergström' }
    ]
  };

  const seedData = async () => {
    setLoading(true);
    try {
      // Clear existing data
      const [existingArtiklar, existingKunder, existingPersonal] = await Promise.all([
        base44.entities.Artikel.list(),
        base44.entities.Kund.list(),
        base44.entities.Personal.list()
      ]);

      await Promise.all([
        ...existingArtiklar.map(a => base44.entities.Artikel.delete(a.id)),
        ...existingKunder.map(k => base44.entities.Kund.delete(k.id)),
        ...existingPersonal.map(p => base44.entities.Personal.delete(p.id))
      ]);

      // Add new data
      const [artiklarIds, kundIds, personalIds] = await Promise.all([
        Promise.all(demoData.artiklar.map(a => base44.entities.Artikel.create(a))),
        Promise.all(demoData.kunder.map(k => base44.entities.Kund.create(k))),
        Promise.all(demoData.personal.map(p => base44.entities.Personal.create(p)))
      ]);

      // Add some sample uttag
      const månad = new Date().toISOString().slice(0, 7);
      const sampleUttag = [
        { datum: new Date().toISOString().split('T')[0], personal_id: personalIds[0].id, kund_id: kundIds[0].id, ordernummer: 'ORD-001', artikel_id: artiklarIds[0].id, antal: 4, pris: 95.24, månad },
        { datum: new Date().toISOString().split('T')[0], personal_id: personalIds[1].id, kund_id: kundIds[1].id, ordernummer: 'ORD-002', artikel_id: artiklarIds[0].id, antal: 2, pris: 47.62, månad },
        { datum: new Date().toISOString().split('T')[0], personal_id: personalIds[0].id, kund_id: kundIds[2].id, ordernummer: null, artikel_id: artiklarIds[1].id, antal: 1, pris: 110, månad }
      ];
      await Promise.all(sampleUttag.map(u => base44.entities.Uttag.create(u)));

      toast.success('Testdata laddat!');
    } catch (error) {
      toast.error('Fel vid laddning av testdata: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearData = async () => {
    setLoading(true);
    try {
      const [artiklar, kunder, personal, uttag] = await Promise.all([
        base44.entities.Artikel.list(),
        base44.entities.Kund.list(),
        base44.entities.Personal.list(),
        base44.entities.Uttag.list()
      ]);

      await Promise.all([
        ...artiklar.map(a => base44.entities.Artikel.delete(a.id)),
        ...kunder.map(k => base44.entities.Kund.delete(k.id)),
        ...personal.map(p => base44.entities.Personal.delete(p.id)),
        ...uttag.map(u => base44.entities.Uttag.delete(u.id))
      ]);

      toast.success('All data borttagen');
    } catch (error) {
      toast.error('Fel vid borttagning: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">🧪 Demo & Testdata</h1>
      
      <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            Använd denna sida för att fylla databasen med exempeldata från Excel-filen för att testa appen.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="font-semibold mb-2">Testdata som kommer att laddas:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✓ 5 artiklar med streckkoder</li>
              <li>✓ 5 kunder</li>
              <li>✓ 3 personal</li>
              <li>✓ 3 exempelscanningar</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Button
              onClick={seedData}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
            >
              <Plus className="w-4 h-4 mr-2" />
              {loading ? 'Laddar...' : 'Ladda testdata'}
            </Button>

            <Button
              onClick={clearData}
              disabled={loading}
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50 py-3"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {loading ? 'Rensar...' : 'Rensa all data'}
            </Button>
          </div>
        </div>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-900">
            💡 Tips: Ladda testdata först, sedan går du till Uttag-sidan för att testa streckkodsskanning med dessa streckkoder: 71387, 82904, 56123, 91234, 34567
          </p>
        </div>
      </div>
    </div>
  );
}