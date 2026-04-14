import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';

export default function KostnadPerKund() {
  const navigate = useNavigate();
  const [allData, setAllData] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [uttag, kunder] = await Promise.all([
          base44.entities.Uttag.list(),
          base44.entities.Kund.list()
        ]);
        setAllCustomers(kunder);

        const periods = [...new Set(uttag.map(u => u.månad).filter(Boolean))].sort((a, b) => b.localeCompare(a));
        setAvailablePeriods(periods);
        
        const filtered = uttag.filter(u => selectedPeriods.length === 0 || selectedPeriods.includes(u.månad));
        
        const costMap = {};
        filtered.forEach(u => {
          if (!costMap[u.kund_id]) {
            const kund = kunder.find(k => k.id === u.kund_id);
            costMap[u.kund_id] = { kund_id: u.kund_id, namn: kund?.namn || 'Okänd', total: 0 };
          }
          costMap[u.kund_id].total += u.pris;
        });

        const sorted = Object.values(costMap).sort((a, b) => b.total - a.total);
        setAllData(sorted);
      } catch (error) {
        toast.error('Kunde inte ladda kostnaddata');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedPeriods]);

  const data = selectedCustomerIds.length === 0
    ? allData
    : allData.filter(d => selectedCustomerIds.includes(d.kund_id));

  const total = data.reduce((sum, item) => sum + item.total, 0);

  const handleExport = () => {
    const csv = ['Kund,Kostnad (kr)\n', ...data.map(d => `${d.namn},${d.total.toFixed(2)}`), `Totalt,${total.toFixed(2)}`].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kostnad_${selectedPeriods.length > 0 ? selectedPeriods.join('_') : 'alla'}.csv`;
    a.click();
  };

  if (loading) return <div className="flex justify-center p-8">Laddar...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">💰 Kostnad per kund</h1>

      <div className="flex items-center gap-4 flex-wrap">
        <label className="font-semibold">Period:</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              {selectedPeriods.length === 0 ? 'Alla perioder' : `${selectedPeriods.length} period${selectedPeriods.length > 1 ? 'er' : ''} vald${selectedPeriods.length > 1 ? 'a' : ''}`}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2" align="start">
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
                <X className="w-3 h-3" /> Rensa val
              </button>
            )}
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              {selectedCustomerIds.length === 0 ? 'Alla kunder' : `${selectedCustomerIds.length} kund${selectedCustomerIds.length > 1 ? 'er' : ''} vald${selectedCustomerIds.length > 1 ? 'a' : ''}`}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {allCustomers.map(k => (
                <label key={k.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                  <Checkbox
                    checked={selectedCustomerIds.includes(k.id)}
                    onCheckedChange={(checked) => {
                      setSelectedCustomerIds(prev => checked ? [...prev, k.id] : prev.filter(id => id !== k.id));
                    }}
                  />
                  <span className="text-sm">{k.namn}</span>
                </label>
              ))}
            </div>
            {selectedCustomerIds.length > 0 && (
              <button onClick={() => setSelectedCustomerIds([])} className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                <X className="w-3 h-3" /> Rensa val
              </button>
            )}
          </PopoverContent>
        </Popover>
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
              <button
                key={item.kund_id}
                onClick={() => navigate(`/kund-uttag/${item.kund_id}`)}
                className="w-full flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <span className="font-medium">{item.namn}</span>
                <span className="font-bold text-lg">{item.total.toFixed(2)} kr</span>
              </button>
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