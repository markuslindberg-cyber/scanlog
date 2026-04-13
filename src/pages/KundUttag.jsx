import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function KundUttag() {
  const { kund_id } = useParams();
  const navigate = useNavigate();
  const [uttag, setUttag] = useState([]);
  const [kund, setKund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const loadData = async () => {
      try {
        const [uttagData, kundData, artiklarData] = await Promise.all([
          base44.entities.Uttag.list(),
          base44.entities.Kund.list(),
          base44.entities.Artikel.list()
        ]);

        const kundInfo = kundData.find(k => k.id === kund_id);
        setKund(kundInfo);

        const filtered = uttagData
          .filter(u => u.kund_id === kund_id && u.månad === period)
          .map(u => ({
            ...u,
            artikel: artiklarData.find(a => a.id === u.artikel_id)
          }))
          .sort((a, b) => new Date(b.datum) - new Date(a.datum));

        setUttag(filtered);
      } catch (error) {
        toast.error('Kunde inte ladda uttag');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [kund_id, period]);

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

      <div className="flex items-center gap-4">
        <label className="font-semibold">Period:</label>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        />
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
                    <td className="px-4 py-3 text-right">{(u.pris / u.antal).toFixed(2)} kr</td>
                    <td className="px-4 py-3 text-right font-semibold">{u.pris.toFixed(2)} kr</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-lg font-bold text-blue-900">
              Totalt: {total.toFixed(2)} kr
            </p>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">Ingen uttag för denna period</div>
      )}
    </div>
  );
}