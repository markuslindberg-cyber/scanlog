import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';

export default function KundUttag() {
  const { kund_id } = useParams();
  const navigate = useNavigate();
  const [allUttag, setAllUttag] = useState([]);
  const [artiklar, setArtiklar] = useState([]);
  const [kund, setKund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriods, setSelectedPeriods] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [uttagData, kundData, artiklarData] = await Promise.all([
          base44.entities.Uttag.list(),
          base44.entities.Kund.list(),
          base44.entities.Artikel.list()
        ]);

        setKund(kundData.find(k => k.id === kund_id));
        setAllUttag(uttagData.filter(u => u.kund_id === kund_id));
        setArtiklar(artiklarData);
      } catch (error) {
        toast.error('Kunde inte ladda uttag');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [kund_id]);

  const availablePeriods = [...new Set(allUttag.map(u => u.månad).filter(Boolean))].sort((a, b) => b.localeCompare(a));

  const uttag = allUttag
    .filter(u => selectedPeriods.length === 0 || selectedPeriods.includes(u.månad))
    .map(u => ({ ...u, artikel: artiklar.find(a => a.id === u.artikel_id) }))
    .sort((a, b) => new Date(b.datum) - new Date(a.datum));

  const total = uttag.reduce((sum, u) => sum + u.pris, 0);

  if (loading) return <div className="flex justify-center p-8">Laddar...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/kostnad')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold">📋 Uttag för {kund?.namn}</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Period</span>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors">
                {selectedPeriods.length === 0 ? 'Alla' : `${selectedPeriods.length} vald${selectedPeriods.length > 1 ? 'a' : ''}`}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {availablePeriods.map(p => (
                  <label key={p} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                    <Checkbox
                      checked={selectedPeriods.includes(p)}
                      onCheckedChange={(checked) => {
                        setSelectedPeriods(prev => checked ? [...prev, p] : prev.filter(id => id !== p));
                      }}
                    />
                    <span className="text-sm">{p}</span>
                  </label>
                ))}
              </div>
              {selectedPeriods.length > 0 && (
                <button onClick={() => setSelectedPeriods([])} className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                  <X className="w-3 h-3" /> Rensa
                </button>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {uttag.length > 0 ? (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Datum</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Artikel</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Mängd</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Pris per enhet</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Totalt</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {uttag.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{u.datum}</td>
                    <td className="px-4 py-3">{u.artikel?.benämning || '-'}</td>
                    <td className="px-4 py-3 text-right">{u.antal}</td>
                    <td className="px-4 py-3 text-right">{(u.pris / u.antal).toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</td>
                    <td className="px-4 py-3 text-right font-semibold">{u.pris.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-lg font-bold text-blue-900">
              Totalt: {total.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr
            </p>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">Ingen uttag för denna period</div>
      )}
    </div>
  );
}