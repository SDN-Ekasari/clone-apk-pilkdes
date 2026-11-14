import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, ImageUp, RefreshCw, ScanLine, Smartphone, X } from 'lucide-react';

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (qrCodeText: string) => void;
  errorMessage?: string | null;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
    };
  }
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  open,
  onClose,
  onScanSuccess,
  errorMessage,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraStatus, setCameraStatus] = useState<'starting' | 'active' | 'error'>('starting');
  const [cameraError, setCameraError] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const [scanHint, setScanHint] = useState(
    'Kompatibel dengan Kamera HD, HP Android, Tablet Pintar, dan Kamera Laptop.'
  );

  const stopStream = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopStream();
    setCameraStatus('starting');
    setCameraError('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('error');
      setCameraError(
        'Peramban ini tidak mendukung akses kamera langsung. Gunakan fitur Google Lens / Unggah Foto QR atau masukkan kode secara manual.'
      );
      return;
    }

    try {
      const videoConstraints: MediaTrackConstraints = selectedDeviceId
        ? {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          }
        : {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });
      } catch {
        // Fallback for laptops/tablets that reject HD constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);
      setCameraStatus('active');

      const barcodeDetector = window.BarcodeDetector
        ? new window.BarcodeDetector({ formats: ['qr_code'] })
        : null;

      let lastTick = 0;
      const scanFrame = async (timestamp: number) => {
        if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
        const video = videoRef.current;

        if (video.readyState === video.HAVE_ENOUGH_DATA && timestamp - lastTick > 150) {
          lastTick = timestamp;

          // Engine 1: Native BarcodeDetector (Android / Chrome HD fast path)
          if (barcodeDetector) {
            try {
              const detected = await barcodeDetector.detect(video);
              if (detected.length > 0 && detected[0].rawValue) {
                stopStream();
                onScanSuccess(detected[0].rawValue.trim());
                return;
              }
            } catch {
              // Fall back to jsQR below
            }
          }

          // Engine 2: jsQR canvas scanner (Universal laptop / tablet / iOS / desktop)
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
            const targetWidth = Math.min(video.videoWidth, 960);
            const scale = targetWidth / video.videoWidth;
            canvas.width = targetWidth;
            canvas.height = Math.round(video.videoHeight * scale);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });
            if (code?.data) {
              stopStream();
              onScanSuccess(code.data.trim());
              return;
            }
          }
        }

        rafRef.current = requestAnimationFrame(scanFrame);
      };

      rafRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      setCameraStatus('error');
      const msg = err instanceof Error ? err.message : 'Izin kamera ditolak atau tidak tersedia.';
      setCameraError(
        `Kamera tidak dapat diakses (${msg}). Pastikan izin kamera aktif atau gunakan tombol Google Lens / Unggah Gambar QR.`
      );
    }
  }, [facingMode, onScanSuccess, selectedDeviceId, stopStream]);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopStream();
    }
    return () => stopStream();
  }, [open, startCamera, stopStream]);

  const handleImageFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 1200;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (code?.data) {
          stopStream();
          onScanSuccess(code.data.trim());
        } else {
          setScanHint('QR Code tidak terbaca dari gambar tersebut. Pastikan gambar jelas dan tidak terpotong.');
        }
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
    e.target.value = '';
  };

  const handleGoogleLensTrigger = () => {
    // Opens native camera/Google Lens capture on Android/Tablet or file picker on desktop
    fileInputRef.current?.click();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-red-600 text-white flex items-center justify-center">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <h3 id="qr-scanner-title" className="text-base font-bold text-slate-900 font-display">
                Verifikasi QR Code Pemilih
              </h3>
              <p className="text-xs text-slate-600">
                Kamera HD · HP Android · Tablet Pintar · Kamera Laptop · Google Lens
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
            aria-label="Tutup pemindai QR"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {(errorMessage || cameraError) && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage || cameraError}
            </div>
          )}

          {/* Camera Viewport */}
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scanning Reticle */}
            {cameraStatus === 'active' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-48 w-48 sm:h-56 sm:w-56 rounded-2xl border-2 border-red-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] relative">
                  <span className="absolute -top-0.5 -left-0.5 h-6 w-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                  <span className="absolute -top-0.5 -right-0.5 h-6 w-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                  <span className="absolute -bottom-0.5 -left-0.5 h-6 w-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-6 w-6 border-b-4 border-r-4 border-white rounded-br-lg" />
                </div>
              </div>
            )}

            {cameraStatus === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2 bg-slate-900/80">
                <Camera className="h-8 w-8 animate-pulse text-slate-300" />
                <span className="text-sm font-medium">Mengaktifkan kamera perangkat...</span>
              </div>
            )}

            {cameraStatus === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 px-6 text-center gap-3 bg-slate-900">
                <Camera className="h-10 w-10 text-slate-500" />
                <p className="text-sm max-w-md">
                  Arahkan kamera ke kartu QR Code pemilih atau gunakan unggah/tangkap gambar di bawah.
                </p>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-600">{scanHint}</p>

          {/* Device & Google Lens Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {devices.length > 1 && (
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700"
                aria-label="Pilih perangkat kamera"
              >
                <option value="">Kamera Otomatis</option>
                {devices.map((d, idx) => (
                  <option key={d.deviceId || idx} value={d.deviceId}>
                    {d.label || `Kamera ${idx + 1}`}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedDeviceId('');
                setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Ganti Kamera ({facingMode === 'environment' ? 'Belakang' : 'Depan'})
            </button>

            <button
              type="button"
              onClick={handleGoogleLensTrigger}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Smartphone className="h-3.5 w-3.5" />
              Aktifkan Google Lens / Kamera HP
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <ImageUp className="h-3.5 w-3.5" />
              Scan dari File Gambar QR
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageFileScan}
              className="hidden"
            />
          </div>

          {/* Manual QR Entry */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCode.trim()) {
                stopStream();
                onScanSuccess(manualCode.trim());
              }
            }}
            className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Atau ketik Kode QR Pemilih (contoh: PILKADES-2026-001)"
              className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono-code"
            />
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Verifikasi Kode
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
