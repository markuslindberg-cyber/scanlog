import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function UttagLista() {
  const [uttag, setUttag] = useState([]);
  const [loading, setLoading] = useState(true);
  const [personal, setPersonal] = useState([]);
  const [kunder, setKunder] = useState([]);
  const [artiklar, setArtiklar] = useState([]);
  const [sortBy, setSortBy] = useState('datum');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterPeriod, setFilterPeriod] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const loadData = async () => {
      try {
        const [uttagData, personalData, kunderData, artiklarData] = await Promise.all([
          base44.entities.Uttag.list(),
          base44.entities.Personal.list(),
          base44.entities.Kund.list(),
          base44.entities.Artikel.list()
        ]);
        setUttag(uttagData);
        setPersonal(personalData);
        setKunder(kunderData);
        setArtiklar(artiklarData);
      } catch (error) {
        toast.error('Kunde inte ladda uttag');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getPersonalNamn = (id) => personal.find(p => p.id === id)?.namn || '-';
  const getKundNamn = (id) => kunder.find(k => k.id === id)?.namn || '-';
  const getArtikelNamn = (id) => artiklar.find(a => a.id === id)?.benämning || '-';

  const filtered = uttag
    .filter(u => u.månad === filterPeriod)
    .map(u => ({
      ...u,
      personalNamn: getPersonalNamn(u.personal_id),
      kundNamn: getKundNamn(u.kund_id),
      artikelNamn: getArtikelNamn(u.artikel_id)
    }));

  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleExport = () => {
    const csv = [
      'Datum,Personal,Kund,Artikel,Mängd,Pris,Ordernummer\n',
      ...sorted.map(u => 
        `${u.datum},${u.personalNamn},${u.kundNamn},${u.artikelNamn},${u.antal},${u.pris.toFixed(2)},${u.ordernummer || ''}`
      ),
      `\nTotalt:,,,,${sorted.reduce((sum, u) => sum + u.pris, 0).toFixed(2)}`
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uttag_${filterPeriod}.csv`;
    a.click();
  };

  const total = sorted.reduce((sum, u) => sum + u.pris, 0);

  if (loading) return <div className="flex justify-center p-8">Laddar...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">📋 Samtliga uttag</h1>

      <div className="flex items-center gap-4">
        <label className="font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Period:
        </label>
        <input
          type="month"
          value={filterPeriod}
          onChange={(e) => setFilterPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        />
        {sorted.length > 0 && (
          <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700 ml-auto">
            <Download className="w-4 h-4 mr-2" /> Exportera CSV
          </Button>
        )}
      </div>

      {sorted.length > 0 ? (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('datum')}>
                    <div className="flex items-center gap-2">
                      Datum
                      {sortBy === 'datum' && (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('personalNamn')}>
                    <div className="flex items-center gap-2">
                      Personal
                      {sortBy === 'personalNamn' && (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('kundNamn')}>
                    <div className="flex items-center gap-2">
                      Kund
                      {sortBy === 'kundNamn' && (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('artikelNamn')}>
                    <div className="flex items-center gap-2">
                      Artikel
                      {sortBy === 'artikelNamn' && (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('antal')}>
                    <div className="flex items-center justify-end gap-2">
                      Mängd
                      {sortBy === 'antal' && (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('pris')}>
                    <div className="flex items-center justify-end gap-2">
                      Pris
                      {sortBy === 'pris' && (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Ordernummer</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sorted.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{u.datum}</td>
                    <td className="px-4 py-3 text-sm">{u.personalNamn}</td>
                    <td className="px-4 py-3 text-sm">{u.kundNamn}</td>
                    <td className="px-4 py-3 text-sm">{u.artikelNamn}</td>
                    <td className="px-4 py-3 text-right text-sm">{u.antal}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold">{u.pris.toFixed(2)} kr</td>
                    <td className="px-4 py-3 text-sm">{u.ordernummer || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-lg font-bold text-blue-900">
              Totalt {sorted.length} uttag: {total.toFixed(2)} kr
            </p>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">Ingen uttag för denna period</div>
      )}
    </div>
  );
}