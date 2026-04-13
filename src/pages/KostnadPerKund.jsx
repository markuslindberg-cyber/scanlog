import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export default function KostnadPerKund() {
  const [data, setData] = useState([]);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const uttag = await base44.entities.Uttag.list();
        const kunder = await base44.entities.Kund.list();
        
        const filtered = uttag.filter(u => u.månad === period);
        
        const costMap = {};
        filtered.forEach(u => {
          if (!costMap[u.kund_id]) {
            const kund = kunder.find(k => k.id === u.kund_id);
            costMap[u.kund_id] = { kund_id: u.kund_id, namn: kund?.namn || 'Okänd', total: 0 };
          }
          costMap[u.kund_id].total += u.pris;
        });

        const sorted = Object.values(costMap).sort((a, b) => b.total - a.total);
        setData(sorted);
      } catch (error) {
        toast.error('Kunde inte ladda kostnaddata');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [period]);

  const total = data.reduce((sum, item) => sum + item.total, 0);

  const handleExport = () => {
    const csv = ['Kund,Kostnad (kr)\n', ...data.map(d => `${d.namn},${d.total.toFixed(2)}`), `Totalt,${total.toFixed(2)}`].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kostnad_${period}.csv`;
    a.click();
  };

  if (loading) return <div className="flex justify-center p-8">Laddar...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">💰 Kostnad per kund</h1>

      <div className="flex items-center gap-4">
        <label className="font-semibold">Period:</label>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      {data.length > 0 ? (
        <>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="namn" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toFixed(2)} kr`} />
                <Bar dataKey="total" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {data.map(item => (
              <div key={item.kund_id} className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
                <span className="font-medium">{item.namn}</span>
                <span className="font-bold text-lg">{item.total.toFixed(2)} kr</span>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-lg font-bold text-blue-900">
              Totalt alla kunder: {total.toFixed(2)} kr
            </p>
          </div>

          <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" /> Exportera CSV
          </Button>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">Ingen data för denna period</div>
      )}
    </div>
  );
}