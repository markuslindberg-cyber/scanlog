import { useState, useRef, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('Kunde inte få åtkomst till kamera');
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    const detectBarcode = async () => {
      if (videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = await detectCode(imageData);
          if (code) {
            onScan(code);
            setIsScanning(false);
          }
        } catch (err) {
          // Stille fail
        }
      }
      animationId = requestAnimationFrame(detectBarcode);
    };

    animationId = requestAnimationFrame(detectBarcode);

    return () => cancelAnimationFrame(animationId);
  }, [isScanning, onScan]);

  const detectCode = async (imageData) => {
    // Simplified barcode detection - in production use jsQR or similar library
    // This is a placeholder that returns detected patterns
    const data = imageData.data;
    let barcode = '';
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      barcode += brightness > 128 ? '1' : '0';
    }
    // Mock detection - in real app use proper library
    return barcode.includes('111') ? null : null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="w-full max-w-sm">
        <h2 className="text-white text-xl font-semibold mb-4 text-center">Skanna streckkod</h2>
        
        <div className="relative bg-black rounded-lg overflow-hidden border-4 border-blue-500 aspect-square">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Scanning overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-16 border-2 border-green-400 rounded-lg opacity-75" />
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 bg-red-100 text-red-800 p-3 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-white text-center mt-4 text-sm opacity-75">
          Rikta kameran mot streckkoden
        </p>
      </div>
    </div>
  );
}