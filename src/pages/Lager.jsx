import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { AlertCircle, AlertTriangle, Plus, Upload, FileDown, ArrowUp, ArrowDown, Edit2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import AddArtikelDialog from '@/components/AddArtikelDialog';
import { toast } from 'sonner';

export default function Lager() {
  const navigate = useNavigate();
  const [artiklar, setArtiklar] = useState([]);
  const [uttag, setUttag] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sortBy, setSortBy] = useState('benämning');
  const [sortOrder, setSortOrder] = useState('asc');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [dataLimit, setDataLimit] = useState(100);
  const [filterTyp, setFilterTyp] = useState('alla');
  const fileInputRef = useRef(null);

  const loadData = async (limit = dataLimit) => {
    try {
      const [artiklarData, uttagData] = await Promise.all([
        base44.entities.Artikel.list(null, limit === -1 ? 10000 : limit),
        base44.entities.Uttag.list(null, 5000)
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
    loadData(dataLimit);
  }, [dataLimit]);

  const handleDownloadTemplate = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const ws_data = [
        ['benämning', 'artikelnummer', 'streckkod', 'pris', 'inköpsdatum', 'antal_inköpta', 'lagertröskelvärde'],
        ['Clemondo Katrin Clasic S', '1521307', '71387', 23.81, today, 1000, 50],
        ['YES Maskindisk 99st', '2245789', '82904', 110, today, 500, 5],
        ['Torkrulle Tork Uni', '1678934', '56123', 45.50, today, 750, 15],
        ['Activ color 3-pack', '3456789', '91234', 339, today, 200, 1],
        ['Papperskorgspåse', '4567890', '34567', 89.99, today, 800, 20]
      ];

      const csv = ws_data.map(row => 
        row.map(cell => {
          if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      ).join('\n');

      const encoder = new TextEncoder();
      const csvBytes = encoder.encode(csv);
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvBytes], { type: 'text/csv;charset=utf-8' });
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

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      console.log('1. Laddar upp fil:', file.name);
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      console.log('2. Fil uppladdad:', uploadResult.file_url);
      
      const artikelSchema = {
        type: 'object',
        properties: {
          benämning: { type: 'string' },
          artikelnummer: { type: 'string' },
          streckkod: { type: 'string' },
          pris: { type: 'number' },
          inköpsdatum: { type: 'string', format: 'date' },
          antal_inköpta: { type: 'integer' },
          lagertröskelvärde: { type: 'integer' }
        },
        required: ['benämning', 'streckkod', 'pris', 'antal_inköpta']
      };
      console.log('3. Schema definierat');
      
      console.log('4. Extraherar data...');
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadResult.file_url,
        json_schema: artikelSchema
      });
      console.log('5. Extraktion klar:', result);

      if (result.status === 'success' && Array.isArray(result.output)) {
        const validArtiklar = result.output.filter(a => a.antal_inköpta > 0);
        console.log('6. Skapar ', validArtiklar.length, ' artiklar (filtrerade bort ', result.output.length - validArtiklar.length, ' med antal 0)');
        await base44.entities.Artikel.bulkCreate(validArtiklar);
        toast.success(`${result.output.length} artiklar importerade!`);
        loadData();
      } else {
        console.error('5b. Extraktion misslyckades:', result);
        toast.error(result.details || 'Kunde inte parsa filen');
      }
    } catch (error) {
      console.error('Importfel:', error);
      toast.error('Importfel: ' + error.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const calculateSaldo = (artikel) => {
    const totalUttag = uttag
      .filter(u => u.artikel_id === artikel.id)
      .reduce((sum, u) => sum + u.antal, 0);
    return artikel.antal_inköpta - totalUttag;
  };

  const groupedByStreckkod = {};
  artiklar.forEach(a => {
    if (!groupedByStreckkod[a.streckkod]) {
      groupedByStreckkod[a.streckkod] = [];
    }
    groupedByStreckkod[a.streckkod].push(a);
  });

  const unikArtiklar = Object.values(groupedByStreckkod).map(group => {
    const huvudArtikel = group[0];
    const totalInköpt = group.reduce((sum, a) => sum + a.antal_inköpta, 0);
    return {
      ...huvudArtikel,
      antal_inköpta: totalInköpt,
      grupp: group
    };
  });

  const filtered = unikArtiklar.filter(a => {
    const matchSearch = a.benämning.toLowerCase().includes(search.toLowerCase()) || a.streckkod.includes(search);
    if (!matchSearch) return false;
    if (filterTyp === 'ejILager') return calculateSaldo(a) === 0;
    if (filterTyp === 'utgående') return !!a.utgående;
    if (filterTyp === 'utanPris') return !a.pris || a.pris === 0;
    return true;
  });

  const totaltLagervärde = unikArtiklar.reduce((sum, a) => sum + calculateSaldo(a) * a.pris, 0);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    if (sortBy === 'saldo') {
      aVal = calculateSaldo(a);
      bVal = calculateSaldo(b);
    } else if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleRowClick = (streckkod) => {
    navigate(`/artikel/${streckkod}`);
  };

  const handleEditClick = (e, artikel) => {
    e.stopPropagation();
    setEditingId(artikel.id);
    setEditForm({
      benämning: artikel.benämning,
      pris: artikel.pris,
      utgående: !!artikel.utgående
    });
  };

  const handleSaveEdit = async (e) => {
    e.stopPropagation();
    try {
      await base44.entities.Artikel.update(editingId, {
        benämning: editForm.benämning,
        pris: parseFloat(editForm.pris),
        utgående: editForm.utgående
      });
      toast.success('Artikel uppdaterad!');
      setEditingId(null);
      loadData();
    } catch (error) {
      toast.error('Kunde inte uppdatera artikel');
    }
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const tomma = filtered.filter(a => calculateSaldo(a) === 0).length;
  const lågtSaldo = filtered.filter(a => {
    const saldo = calculateSaldo(a);
    return saldo > 0 && saldo < (a.lagertröskelvärde || 10);
  }).length;
  const utanPris = unikArtiklar.filter(a => !a.pris || a.pris === 0).length;

  if (loading) return <div className="flex justify-center p-8">Laddar...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">📦 Lager</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sök */}
          <input
            type="text"
            placeholder="Sök artikel eller streckkod..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-400 w-52"
          />
          {/* Visa antal */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Visa</span>
            <select value={dataLimit} onChange={(e) => setDataLimit(Number(e.target.value))} className="text-sm font-medium text-gray-800 bg-transparent border-none outline-none cursor-pointer">
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={1000}>1 000</option>
              <option value={-1}>Alla</option>
            </select>
          </div>
          <Button size="sm" onClick={handleDownloadTemplate} className="bg-purple-600 hover:bg-purple-700">
            <FileDown className="w-4 h-4 mr-1" /> Mall
          </Button>
          <Button size="sm" onClick={handleImportClick} disabled={uploading} className="bg-green-600 hover:bg-green-700">
            <Upload className="w-4 h-4 mr-1" /> Importera
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
          <Button size="sm" onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" /> Ny artikel
          </Button>
        </div>
      </div>

      <AddArtikelDialog isOpen={showDialog} onClose={() => setShowDialog(false)} onSuccess={() => { setShowDialog(false); loadData(); }} />

      {/* Totalt lagervärde */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
        <span className="text-sm text-blue-700 font-medium">Totalt lagervärde ({sorted.length} artiklar)</span>
        <span className="text-xl font-bold text-blue-900">{totaltLagervärde.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</span>
      </div>

      {/* Filterflikar */}
      <div className="flex gap-1">
        {[
          { key: 'alla', label: 'Alla artiklar' },
          { key: 'ejILager', label: `Slut i lager (${tomma})` },
          { key: 'utgående', label: 'Utgående' },
          ...(utanPris > 0 ? [{ key: 'utanPris', label: `⚠️ Saknar pris (${utanPris})` }] : [])
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterTyp(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterTyp === key
                ? key === 'utanPris' ? 'bg-purple-700 text-white' : 'bg-gray-800 text-white'
                : key === 'utanPris' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Varning: artiklar utan pris */}
      {utanPris > 0 && (
        <div className="flex items-center gap-2 bg-purple-50 border border-purple-300 rounded-lg px-4 py-2.5 text-purple-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-purple-600" />
          <span className="text-sm font-medium">{utanPris} artikel{utanPris > 1 ? 'ar' : ''} saknar pris — dessa påverkar inte lagervärdet korrekt.</span>
          <button
            onClick={() => setFilterTyp('utanPris')}
            className="ml-auto text-xs font-semibold text-purple-700 hover:text-purple-900 underline whitespace-nowrap"
          >
            Visa dessa
          </button>
        </div>
      )}

      {/* Status badges */}
      {(tomma > 0 || lågtSaldo > 0) && (
        <div className="flex gap-2 flex-wrap">
          {tomma > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg border border-red-200 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{tomma} artiklar slut</span>
            </div>
          )}
          {lågtSaldo > 0 && (
            <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg border border-yellow-200 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>{lågtSaldo} lågt saldo</span>
            </div>
          )}
          <div className="flex items-center gap-3 ml-auto text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-100 border border-purple-200 inline-block"></span>Saknar pris</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200 inline-block"></span>Lågt saldo</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block"></span>Slut i lager</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('benämning')}>
                  <div className="flex items-center gap-2">
                    Artikel
                    {sortBy === 'benämning' && (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('streckkod')}>
                  <div className="flex items-center gap-2">
                    Streckkod
                    {sortBy === 'streckkod' && (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('pris')}>
                  <div className="flex items-center justify-end gap-2">
                    Pris
                    {sortBy === 'pris' && (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('antal_inköpta')}>
                  <div className="flex items-center justify-end gap-2">
                    Inköpt
                    {sortBy === 'antal_inköpta' && (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Uttag</th>
                <th className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('saldo')}>
                  <div className="flex items-center justify-end gap-2">
                    Saldo
                    {sortBy === 'saldo' && (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map(artikel => {
                const saldo = calculateSaldo(artikel);
                const totalUttag = uttag
                  .filter(u => u.artikel_id === artikel.id)
                  .reduce((sum, u) => sum + u.antal, 0);
                
                const utanPrisRad = !artikel.pris || artikel.pris === 0;
                let saldoColor = 'text-gray-900';
                let saldoBg = '';
                if (utanPrisRad) {
                  saldoBg = 'bg-purple-50';
                } else if (saldo === 0) {
                  saldoColor = 'text-red-600 font-semibold';
                  saldoBg = 'bg-red-50';
                } else if (saldo < (artikel.lagertröskelvärde || 10)) {
                  saldoColor = 'text-yellow-600 font-semibold';
                  saldoBg = 'bg-yellow-50';
                }

                return (
                  <tr
                    key={artikel.id}
                    className={`${saldoBg} transition-colors hover:bg-blue-50`}
                  >
                    {editingId === artikel.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editForm.benämning}
                            onChange={(e) => setEditForm({ ...editForm, benämning: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded w-full"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{artikel.streckkod}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.pris}
                            onChange={(e) => setEditForm({ ...editForm, pris: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded w-full text-right"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">{artikel.antal_inköpta}</td>
                        <td className="px-4 py-3 text-right">{totalUttag}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer text-sm text-orange-700">
                              <Checkbox
                                checked={editForm.utgående}
                                onCheckedChange={(checked) => setEditForm({ ...editForm, utgående: !!checked })}
                              />
                              Utgående
                            </label>
                            <button
                              onClick={handleSaveEdit}
                              className="text-green-600 hover:bg-green-50 p-1 rounded font-semibold"
                            >
                              ✓
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-red-600 hover:bg-red-50 p-1 rounded font-semibold"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => handleRowClick(artikel.streckkod)}
                              className="font-medium text-left hover:text-blue-600 hover:underline transition-colors"
                            >
                              {artikel.benämning}
                            </button>
                            {artikel.utgående && (
                              <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">Utgående</span>
                            )}
                            <button
                              onClick={(e) => handleEditClick(e, artikel)}
                              className="text-blue-600 hover:bg-blue-50 p-1 rounded ml-2 flex-shrink-0"
                              title="Redigera"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{artikel.streckkod}</td>
                        <td className="px-4 py-3 text-right">
                          {utanPrisRad
                            ? <span className="text-purple-600 font-semibold text-xs bg-purple-100 px-2 py-0.5 rounded">Saknar pris</span>
                            : `${artikel.pris.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr`
                          }
                        </td>
                        <td className="px-4 py-3 text-right">{artikel.antal_inköpta}</td>
                        <td className="px-4 py-3 text-right">{totalUttag}</td>
                        <td className={`px-4 py-3 text-right ${saldoColor}`}>{saldo}</td>
                      </>
                    )}
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