import { useState } from 'react';
import { Camera, AlertCircle } from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';
import { Button } from '@/components/ui/button';

export default function BarcodeInput({ onBarcode, placeholder = "Skanna eller skriv streckkod..." }) {
  const [input, setInput] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState(null);

  const handleInput = (value) => {
    setInput(value);
    if (value.trim()) {
      onBarcode(value.trim());
      setInput('');
      setError(null);
    }
  };

  const handleScan = (barcode) => {
    handleInput(barcode);
    setShowScanner(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleInput(input)}
          placeholder={placeholder}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoFocus
        />
        <Button
          onClick={() => setShowScanner(true)}
          variant="outline"
          size="icon"
          className="rounded-lg"
        >
          <Camera className="w-5 h-5" />
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-800 p-3 rounded-lg border border-red-200">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}