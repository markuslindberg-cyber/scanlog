import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, AlertTriangle, Plus, Upload, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddArtikelDialog from '@/components/AddArtikelDialog';
import { toast } from 'sonner';

export default function Lager() {
  const [artiklar, setArtiklar] = useState([]);
  const [uttag, setUttag] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    try {
      const [artiklarData, uttagData] = await Promise.all([
        base44.entities.Artikel.list(),
        base44.entities.Uttag.list()
      ]);
      setArtiklar(artiklarData);
      setUttag(uttagData);
    } catch (error) {
      toast.error('Kunde inte ladda lagerdata');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDownloadTemplate = async () => {
    try {
      // Create XLSX workbook
      const ws_data = [
        ['benämning', 'artikelnummer', 'streckkod', 'pris', 'inköpsdatum', 'antal_inköpta', 'lagertröskelvärde'],
        ['Exempel artikel', '123456', '71387', 99.99, new Date().toISOString().split('T')[0], 100, 10]
      ];

      // Convert to CSV string for now (XLSX needs external library)
      const csv = ws_data.map(row => 
        row.map(cell => {
          if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      ).join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'artiklar_mall.csv';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Kunde inte ladda ned mall');
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const schema = await base44.entities.Artikel.schema();
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadResult.file_url,
        json_schema: { type: 'object', properties: schema.properties, required: schema.required }
      });

      if (result.status === 'success' && Array.isArray(result.output)) {
        await base44.entities.Artikel.bulkCreate(result.output);
        toast.success(`${result.output.length} artiklar importerade!`);
        loadData();
      } else {
        toast.error(result.details || 'Kunde inte parsa filen');
      }
    } catch (error) {
      toast.error('Importfel: ' + error.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const calculateSaldo = (artikel) => {
    const totalUttag = uttag
      .filter(u => u.artikel_id === artikel.id)
      .reduce((sum, u) => sum + u.antal, 0);
    return artikel.antal_inköpta - totalUttag;
  };

  const filtered = artiklar.filter(a =>
    a.benämning.toLowerCase().includes(search.toLowerCase()) ||
    a.streckkod.includes(search)
  );

  const tomma = filtered.filter(a => calculateSaldo(a) === 0).length;
  const lågtSaldo = filtered.filter(a => {
    const saldo = calculateSaldo(a);
    return saldo > 0 && saldo < (a.lagertröskelvärde || 10);
  }).length;

  if (loading) return <div className="flex justify-center p-8">Laddar...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">📦 Lager</h1>
        <div className="flex gap-2">
          <Button onClick={handleDownloadTemplate} className="bg-purple-600 hover:bg-purple-700">
            <FileDown className="w-4 h-4 mr-2" /> Ladda ned mall
          </Button>
          <label className="cursor-pointer">
            <Button asChild className="bg-green-600 hover:bg-green-700">
              <span>
                <Upload className="w-4 h-4 mr-2" /> Importera Excel
              </span>
            </Button>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleExcelUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Lägg till artikel
          </Button>
        </div>
      </div>

      <AddArtikelDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onSuccess={() => {
          setShowDialog(false);
          loadData();
        }}
      />

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <input
          type="text"
          placeholder="Sök artikel eller streckkod..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div className="flex gap-4">
        {tomma > 0 && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200">
            <AlertCircle className="w-5 h-5" />
            <span>🔴 {tomma} artiklar slut</span>
          </div>
        )}
        {lågtSaldo > 0 && (
          <div className="flex items-center gap-2 bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg border border-yellow-200">
            <AlertTriangle className="w-5 h-5" />
            <span>🟡 {lågtSaldo} lågt saldo</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Artikel</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Pris</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Inköpt</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Uttag</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(artikel => {
                const saldo = calculateSaldo(artikel);
                const totalUttag = uttag
                  .filter(u => u.artikel_id === artikel.id)
                  .reduce((sum, u) => sum + u.antal, 0);
                
                let saldoColor = 'text-gray-900';
                let saldoBg = '';
                if (saldo === 0) {
                  saldoColor = 'text-red-600 font-semibold';
                  saldoBg = 'bg-red-50';
                } else if (saldo < (artikel.lagertröskelvärde || 10)) {
                  saldoColor = 'text-yellow-600 font-semibold';
                  saldoBg = 'bg-yellow-50';
                }

                return (
                  <tr key={artikel.id} className={saldoBg}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{artikel.benämning}</p>
                        <p className="text-sm text-gray-600">{artikel.streckkod}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{artikel.pris} kr</td>
                    <td className="px-4 py-3 text-right">{artikel.antal_inköpta}</td>
                    <td className="px-4 py-3 text-right">{totalUttag}</td>
                    <td className={`px-4 py-3 text-right ${saldoColor}`}>{saldo}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}