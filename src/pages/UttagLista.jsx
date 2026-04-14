import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, Calendar, ArrowUp, ArrowDown, Upload, FileDown, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useMemo } from 'react';

export default function UttagLista() {
  const [uttag, setUttag] = useState([]);
  const [loading, setLoading] = useState(true);
  const [personal, setPersonal] = useState([]);
  const [kunder, setKunder] = useState([]);
  const [artiklar, setArtiklar] = useState([]);
  const [sortBy, setSortBy] = useState('datum');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [selectedKundIds, setSelectedKundIds] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [dataLimit, setDataLimit] = useState(100);
  const fileInputRef = useRef(null);

  const loadData = async (limit = dataLimit) => {
    try {
      const [uttagData, personalData, kunderData, artiklarData] = await Promise.all([
        base44.entities.Uttag.list(null, limit === -1 ? 10000 : limit),
        base44.entities.Personal.list(),
        base44.entities.Kund.list(),
        base44.entities.Artikel.list(null, 500)
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

  useEffect(() => {
    loadData(dataLimit);
  }, [dataLimit]);

  const getPersonalNamn = (id) => personal.find(p => p.id === id)?.namn || '-';
  const getKundNamn = (id) => kunder.find(k => k.id === id)?.namn || '-';
  const getArtikelNamn = (id) => artiklar.find(a => a.id === id)?.benämning || '-';
  const getStreckkod = (id) => artiklar.find(a => a.id === id)?.streckkod || '-';

  const availablePeriods = useMemo(() =>
    [...new Set(uttag.map(u => u.månad).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
    [uttag]
  );

  const filtered = uttag
    .filter(u => (selectedPeriods.length === 0 || selectedPeriods.includes(u.månad)) && (selectedKundIds.length === 0 || selectedKundIds.includes(u.kund_id)))
    .map(u => ({
      ...u,
      personalNamn: getPersonalNamn(u.personal_id),
      kundNamn: getKundNamn(u.kund_id),
      artikelNamn: getArtikelNamn(u.artikel_id),
      streckkod: getStreckkod(u.artikel_id)
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

  const handleDownloadTemplate = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const ws_data = [
        ['datum', 'personal', 'kund', 'ordernummer', 'streckkod', 'antal', 'pris', 'månad'],
        [today, personal[0]?.namn || '', kunder[0]?.namn || '', 'ORD-001', artiklar[0]?.streckkod || '', 10, 100, today.slice(0, 7)]
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
      link.download = 'uttag_mall.csv';
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
    console.log('Upload startat, fil:', file?.name);
    if (!file) return;

    setUploading(true);
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      const uttagSchema = {
        type: 'object',
        properties: {
          datum: { type: 'string', format: 'date' },
          personal: { type: 'string' },
          kund: { type: 'string' },
          ordernummer: { type: 'string' },
          streckkod: { type: 'string' },
          antal: { type: 'integer' },
          pris: { type: 'number' },
          månad: { type: 'string' }
        },
        required: ['datum', 'personal', 'kund', 'streckkod', 'antal', 'pris', 'månad']
      };
      
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadResult.file_url,
        json_schema: uttagSchema
      });

      if (result.status === 'success' && Array.isArray(result.output)) {
        const personalMap = Object.fromEntries(personal.map(p => [p.namn, p.id]));
        const kundMap = Object.fromEntries(kunder.map(k => [k.namn, k.id]));
        const artikelMap = Object.fromEntries(artiklar.map(a => [a.streckkod, a.id]));
        
        const validUttag = result.output
          .filter(u => u.antal > 0)
          .map(u => ({
            ...u,
            personal_id: personalMap[u.personal],
            kund_id: kundMap[u.kund],
            artikel_id: artikelMap[u.streckkod]
          }))
          .filter(u => u.personal_id && u.kund_id && u.artikel_id);

        if (validUttag.length === 0) {
          toast.error('Inga giltiga uttag - kontrollera personal och kundnamn');
          return;
        }

        await base44.entities.Uttag.bulkCreate(validUttag);
        toast.success(`${validUttag.length} uttag importerade!`);
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
  };

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
    a.download = `uttag_${selectedPeriods.length > 0 ? selectedPeriods.join('_') : 'alla'}.csv`;
    a.click();
  };

  const total = sorted.reduce((sum, u) => sum + u.pris, 0);

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setEditForm({
      antal: item.antal,
      pris: item.pris,
      ordernummer: item.ordernummer || ''
    });
  };

  const handleSaveEdit = async () => {
    try {
      await base44.entities.Uttag.update(editingId, {
        antal: parseInt(editForm.antal),
        pris: parseFloat(editForm.pris),
        ordernummer: editForm.ordernummer || null
      });
      toast.success('Uttag uppdaterat!');
      setEditingId(null);
      loadData();
    } catch (error) {
      toast.error('Kunde inte uppdatera uttag');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  if (loading) return <div className="flex justify-center p-8">Laddar...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">📋 Samtliga uttag</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Period</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors">
                  {selectedPeriods.length === 0 ? 'Alla' : `${selectedPeriods.length} vald${selectedPeriods.length > 1 ? 'a' : ''}`}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {availablePeriods.map(p => (
                    <label key={p} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                      <Checkbox checked={selectedPeriods.includes(p)} onCheckedChange={(checked) => setSelectedPeriods(prev => checked ? [...prev, p] : prev.filter(id => id !== p))} />
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
          {/* Kund filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kund</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors">
                  {selectedKundIds.length === 0 ? 'Alla' : `${selectedKundIds.length} vald${selectedKundIds.length > 1 ? 'a' : ''}`}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-2" align="end">
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {kunder.map(k => (
                    <label key={k.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                      <Checkbox checked={selectedKundIds.includes(k.id)} onCheckedChange={(checked) => setSelectedKundIds(prev => checked ? [...prev, k.id] : prev.filter(id => id !== k.id))} />
                      <span className="text-sm">{k.namn}</span>
                    </label>
                  ))}
                </div>
                {selectedKundIds.length > 0 && (
                  <button onClick={() => setSelectedKundIds([])} className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                    <X className="w-3 h-3" /> Rensa
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>
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
          <Button size="sm" onClick={handleImportClick} disabled={uploading} className="bg-blue-600 hover:bg-blue-700">
            <Upload className="w-4 h-4 mr-1" /> Importera
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
          {sorted.length > 0 && (
            <Button size="sm" onClick={handleExport} className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
          )}
        </div>
      </div>

      {sorted.length > 0 ? (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span className="text-sm text-blue-700 font-medium">Totalt {sorted.length} uttag</span>
            <span className="text-xl font-bold text-blue-900">{total.toFixed(2)} kr</span>
          </div>
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
                  <th className="px-4 py-3 text-left text-sm font-semibold">Streckkod</th>
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
                  <th className="px-4 py-3 text-left text-sm font-semibold">Åtgärd</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sorted.map(u => {
                  const isEditing = editingId === u.id;
                  return (
                  <tr key={u.id} className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 text-sm">{u.datum}</td>
                    <td className="px-4 py-3 text-sm">{u.personalNamn}</td>
                    <td className="px-4 py-3 text-sm">{u.kundNamn}</td>
                    <td className="px-4 py-3 text-sm">{u.artikelNamn}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.streckkod}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.antal}
                          onChange={(e) => setEditForm({...editForm, antal: e.target.value})}
                          className="px-2 py-1 border border-gray-300 rounded w-16"
                        />
                      ) : (
                        u.antal
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.pris}
                          onChange={(e) => setEditForm({...editForm, pris: e.target.value})}
                          className="px-2 py-1 border border-gray-300 rounded w-20 text-right"
                        />
                      ) : (
                        u.pris.toFixed(2) + ' kr'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.ordernummer}
                          onChange={(e) => setEditForm({...editForm, ordernummer: e.target.value})}
                          className="px-2 py-1 border border-gray-300 rounded w-24"
                        />
                      ) : (
                        u.ordernummer || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button onClick={handleSaveEdit} className="text-green-600 font-semibold hover:bg-green-50 px-2 py-1 rounded">✓</button>
                          <button onClick={handleCancelEdit} className="text-red-600 font-semibold hover:bg-red-50 px-2 py-1 rounded">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => handleEditClick(u)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded">Redigera</button>
                      )}
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>


        </>
      ) : (
        <div className="text-center py-8 text-gray-500">Ingen uttag för denna period</div>
      )}
    </div>
  );
}