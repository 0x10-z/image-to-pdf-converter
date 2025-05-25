import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Edit3, RotateCcw, X, ZoomIn, Check } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { getThemeClasses } from "@/themes";

interface CropArea {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

type CornerType =
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight"
  | "move"
  | null;

interface MagnifierState {
  visible: boolean;
  x: number;
  y: number;
  corner: CornerType;
}

interface CropCanvasProps {
  imageSrc: string;
  onClose: () => void;
  onApply: (blob: Blob) => void;
  isDarkMode: boolean;
}

export default function CropCanvas({
  imageSrc,
  onClose,
  onApply,
  isDarkMode,
}: CropCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null);

  const isMobile = useMobile();

  const [cropArea, setCropArea] = useState<CropArea>({
    x1: 10,
    y1: 10,
    x2: 90,
    y2: 90,
  });
  const [activeCorner, setActiveCorner] = useState<CornerType>(null);
  const [magnifier, setMagnifier] = useState<MagnifierState>({
    visible: false,
    x: 0,
    y: 0,
    corner: null,
  });

  const themeClasses = getThemeClasses(isDarkMode);

  const drawMagnifier = useCallback(() => {
    const canvas = canvasRef.current;
    const magnifierCanvas = magnifierCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !magnifierCanvas || !img) return;

    const ctx = canvas.getContext("2d");
    const magnifierCtx = magnifierCanvas.getContext("2d");
    if (!ctx || !magnifierCtx) return;

    const magnifierSize = 120;
    const zoom = 3;
    magnifierCanvas.width = magnifierSize;
    magnifierCanvas.height = magnifierSize;

    const canvasX = (magnifier.x / 100) * canvas.width;
    const canvasY = (magnifier.y / 100) * canvas.height;
    const sourceSize = magnifierSize / zoom;
    const sourceX = canvasX - sourceSize / 2;
    const sourceY = canvasY - sourceSize / 2;

    magnifierCtx.clearRect(0, 0, magnifierSize, magnifierSize);
    magnifierCtx.drawImage(
      img,
      (sourceX / canvas.width) * img.naturalWidth,
      (sourceY / canvas.height) * img.naturalHeight,
      (sourceSize / canvas.width) * img.naturalWidth,
      (sourceSize / canvas.height) * img.naturalHeight,
      0,
      0,
      magnifierSize,
      magnifierSize
    );

    magnifierCtx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    magnifierCtx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      const gridX = (magnifierSize / 3) * i;
      const gridY = (magnifierSize / 3) * i;
      magnifierCtx.beginPath();
      magnifierCtx.moveTo(gridX, 0);
      magnifierCtx.lineTo(gridX, magnifierSize);
      magnifierCtx.stroke();
      magnifierCtx.beginPath();
      magnifierCtx.moveTo(0, gridY);
      magnifierCtx.lineTo(magnifierSize, gridY);
      magnifierCtx.stroke();
    }

    const cropCanvasX1 = ((cropArea.x1 / 100) * canvas.width - sourceX) * zoom;
    const cropCanvasY1 = ((cropArea.y1 / 100) * canvas.height - sourceY) * zoom;
    const cropCanvasX2 = ((cropArea.x2 / 100) * canvas.width - sourceX) * zoom;
    const cropCanvasY2 = ((cropArea.y2 / 100) * canvas.height - sourceY) * zoom;
    const cropW = cropCanvasX2 - cropCanvasX1;
    const cropH = cropCanvasY2 - cropCanvasY1;

    // Esquinas blancas
    const size = 6;
    magnifierCtx.fillStyle = "white";
    magnifierCtx.fillRect(
      cropCanvasX1 - size / 2,
      cropCanvasY1 - size / 2,
      size,
      size
    );
    magnifierCtx.fillRect(
      cropCanvasX2 - size / 2,
      cropCanvasY1 - size / 2,
      size,
      size
    );
    magnifierCtx.fillRect(
      cropCanvasX1 - size / 2,
      cropCanvasY2 - size / 2,
      size,
      size
    );
    magnifierCtx.fillRect(
      cropCanvasX2 - size / 2,
      cropCanvasY2 - size / 2,
      size,
      size
    );

    // Rectángulo del cropArea con borde negro y línea blanca encima
    if (
      cropCanvasX2 > 0 &&
      cropCanvasY2 > 0 &&
      cropCanvasX1 < magnifierSize &&
      cropCanvasY1 < magnifierSize
    ) {
      magnifierCtx.strokeStyle = "black";
      magnifierCtx.lineWidth = 3;
      magnifierCtx.strokeRect(cropCanvasX1, cropCanvasY1, cropW, cropH);

      magnifierCtx.strokeStyle = "white";
      magnifierCtx.lineWidth = 1.5;
      magnifierCtx.strokeRect(cropCanvasX1, cropCanvasY1, cropW, cropH);
    }
  }, [magnifier]);

  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  };

  const getCornerAtPosition = (x: number, y: number): CornerType => {
    const tolerance = 5;
    const { x1, y1, x2, y2 } = cropArea;
    if (Math.abs(x - x1) < tolerance && Math.abs(y - y1) < tolerance)
      return "topLeft";
    if (Math.abs(x - x2) < tolerance && Math.abs(y - y1) < tolerance)
      return "topRight";
    if (Math.abs(x - x1) < tolerance && Math.abs(y - y2) < tolerance)
      return "bottomLeft";
    if (Math.abs(x - x2) < tolerance && Math.abs(y - y2) < tolerance)
      return "bottomRight";
    if (x >= x1 && x <= x2 && y >= y1 && y <= y2) return "move";
    return null;
  };

  const updateCropArea = (corner: CornerType, x: number, y: number) => {
    setCropArea((prev) => {
      const newArea = { ...prev };
      switch (corner) {
        case "topLeft":
          newArea.x1 = Math.max(0, Math.min(x, prev.x2 - 5));
          newArea.y1 = Math.max(0, Math.min(y, prev.y2 - 5));
          break;
        case "topRight":
          newArea.x2 = Math.min(100, Math.max(x, prev.x1 + 5));
          newArea.y1 = Math.max(0, Math.min(y, prev.y2 - 5));
          break;
        case "bottomLeft":
          newArea.x1 = Math.max(0, Math.min(x, prev.x2 - 5));
          newArea.y2 = Math.min(100, Math.max(y, prev.y1 + 5));
          break;
        case "bottomRight": {
          newArea.x2 = Math.min(100, Math.max(x, prev.x1 + 5));
          newArea.y2 = Math.min(100, Math.max(y, prev.y1 + 5));
          break;
        }
        case "move": {
          const width = prev.x2 - prev.x1;
          const height = prev.y2 - prev.y1;
          const centerX = (prev.x1 + prev.x2) / 2;
          const centerY = (prev.y1 + prev.y2) / 2;
          const deltaX = x - centerX;
          const deltaY = y - centerY;
          newArea.x1 = Math.max(0, Math.min(100 - width, prev.x1 + deltaX));
          newArea.y1 = Math.max(0, Math.min(100 - height, prev.y1 + deltaY));
          newArea.x2 = newArea.x1 + width;
          newArea.y2 = newArea.y1 + height;
          break;
        }
      }
      return newArea;
    });
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const maxSize = 400;
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const canvasWidth = maxSize;
    const canvasHeight = maxSize / aspectRatio;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

    const cropX = (cropArea.x1 / 100) * canvasWidth;
    const cropY = (cropArea.y1 / 100) * canvasHeight;
    const cropW = ((cropArea.x2 - cropArea.x1) / 100) * canvasWidth;
    const cropH = ((cropArea.y2 - cropArea.y1) / 100) * canvasHeight;

    // Stroke outer (black)
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.strokeRect(cropX, cropY, cropW, cropH);

    // Stroke inner (white)
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropW, cropH);

    // Grid lines (double stroke for each)
    for (let i = 1; i < 3; i++) {
      const gridX = cropX + (cropW / 3) * i;
      const gridY = cropY + (cropH / 3) * i;

      // Vertical black
      ctx.strokeStyle = "black";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gridX, cropY);
      ctx.lineTo(gridX, cropY + cropH);
      ctx.stroke();

      // Vertical white
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gridX, cropY);
      ctx.lineTo(gridX, cropY + cropH);
      ctx.stroke();

      // Horizontal black
      ctx.strokeStyle = "black";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cropX, gridY);
      ctx.lineTo(cropX + cropW, gridY);
      ctx.stroke();

      // Horizontal white
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cropX, gridY);
      ctx.lineTo(cropX + cropW, gridY);
      ctx.stroke();
    }

    const size = 10;
    // Corner squares - black border
    ctx.fillStyle = "black";
    ctx.fillRect(
      cropX - size / 2 - 1,
      cropY - size / 2 - 1,
      size + 2,
      size + 2
    );
    ctx.fillRect(
      cropX + cropW - size / 2 - 1,
      cropY - size / 2 - 1,
      size + 2,
      size + 2
    );
    ctx.fillRect(
      cropX - size / 2 - 1,
      cropY + cropH - size / 2 - 1,
      size + 2,
      size + 2
    );
    ctx.fillRect(
      cropX + cropW - size / 2 - 1,
      cropY + cropH - size / 2 - 1,
      size + 2,
      size + 2
    );

    // Corner squares - white center
    ctx.fillStyle = "white";
    ctx.fillRect(cropX - size / 2, cropY - size / 2, size, size);
    ctx.fillRect(cropX + cropW - size / 2, cropY - size / 2, size, size);
    ctx.fillRect(cropX - size / 2, cropY + cropH - size / 2, size, size);
    ctx.fillRect(
      cropX + cropW - size / 2,
      cropY + cropH - size / 2,
      size,
      size
    );
  }, [cropArea]);

  useEffect(() => {
    // if (magnifier.visible && isMobile) {
    if (magnifier.visible) {
      drawMagnifier();
    }
  }, [magnifier, drawMagnifier, isMobile]);

  const applyCrop = () => {
    const img = imageRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cropX = (cropArea.x1 / 100) * img.naturalWidth;
    const cropY = (cropArea.y1 / 100) * img.naturalHeight;
    const cropW = ((cropArea.x2 - cropArea.x1) / 100) * img.naturalWidth;
    const cropH = ((cropArea.y2 - cropArea.y1) / 100) * img.naturalHeight;

    canvas.width = cropW;
    canvas.height = cropH;

    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    canvas.toBlob(
      (blob) => {
        if (blob) onApply(blob);
      },
      "image/jpeg",
      0.9
    );
  };

  const resetCrop = () => {
    setCropArea({ x1: 10, y1: 10, x2: 90, y2: 90 });
  };

  useEffect(() => {
    if (imageRef.current) {
      imageRef.current.onload = drawCanvas;
      imageRef.current.src = imageSrc;
    }
  }, [imageSrc, drawCanvas]);

  useEffect(() => {
    drawCanvas();
  }, [cropArea, drawCanvas]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
    const corner = getCornerAtPosition(x, y);
    if (corner !== null) setActiveCorner(corner);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeCorner) {
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      updateCropArea(activeCorner, x, y);
    }
  };

  const handleCanvasMouseUp = () => setActiveCorner(null);

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY);
    const corner = getCornerAtPosition(x, y);
    setActiveCorner(corner);
    if (corner && corner !== "move") {
      setMagnifier({ visible: true, x, y, corner });
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (activeCorner) {
      updateCropArea(activeCorner, x, y);
      if (magnifier.visible) {
        setMagnifier((prev) => ({ ...prev, x, y }));
      }
    }
  };

  const handleCanvasTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setActiveCorner(null);
    setMagnifier({ visible: false, x: 0, y: 0, corner: null });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        className={`${
          isDarkMode
            ? "bg-gradient-to-br from-slate-800/90 to-slate-700/90 border-slate-600/50"
            : "bg-gradient-to-br from-white/90 to-slate-50/90 border-slate-300/50"
        } backdrop-blur-xl rounded-3xl py-8 px-4 max-w-4xl w-full max-h-[95vh] overflow-auto border shadow-2xl`}
      >
        <div className="flex items-center justify-between mb-8">
          <h3
            className={`text-3xl font-bold ${themeClasses.text.primary} flex items-center gap-4`}
          >
            <Edit3 className="h-7 w-7" />
            Image Editor
            {isMobile && (
              <ZoomIn className="h-5 w-5 text-blue-400 animate-pulse" />
            )}
          </h3>
          <Button
            onClick={onClose}
            variant="outline"
            size="icon"
            className={`${
              isDarkMode
                ? "bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/50"
                : "bg-slate-200/50 border-slate-300/50 text-slate-600 hover:bg-slate-300/50"
            } rounded-xl`}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-8">
          <div
            className={`${
              isDarkMode
                ? "bg-slate-900/30 border-slate-700/50"
                : "bg-slate-100/30 border-slate-300/50"
            } rounded-3xl p-6 relative border`}
          >
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto mx-auto rounded-2xl cursor-crosshair touch-none shadow-lg"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onTouchStart={handleCanvasTouchStart}
              onTouchMove={handleCanvasTouchMove}
              onTouchEnd={handleCanvasTouchEnd}
            />
            <img ref={imageRef} className="hidden" alt="Original" />

            {/* Magnifier for mobile */}
            {magnifier.visible && isMobile && (
              <div
                className={`absolute ${
                  isDarkMode
                    ? "bg-slate-800/95 border-slate-600"
                    : "bg-white/95 border-slate-400"
                } rounded-2xl p-3 border-2 shadow-2xl pointer-events-none z-60`}
                style={{
                  left: `${magnifier.x}%`,
                  top: `${magnifier.y}%`,
                  transform: "translate(-50%, -120%)",
                }}
              >
                <canvas
                  ref={magnifierCanvasRef}
                  className="rounded-xl"
                  width={120}
                  height={120}
                />
                <div
                  className={`absolute -bottom-8 left-1/2 transform -translate-x-1/2 ${
                    isDarkMode
                      ? "bg-slate-900/90 text-slate-300 border-slate-700/50"
                      : "bg-slate-800/90 text-slate-200 border-slate-600/50"
                  } text-xs px-3 py-1 rounded-lg whitespace-nowrap border`}
                >
                  Precision Mode
                </div>
              </div>
            )}
          </div>

          <div
            className={`text-center ${themeClasses.text.secondary} text-base space-y-3`}
          >
            {isMobile ? (
              <>
                <p>Touch and drag the white corners to adjust the crop area</p>
                <p>Precision magnifier will appear for accurate positioning</p>
              </>
            ) : (
              <>
                <p>
                  Drag the white corners to adjust the crop area independently
                </p>
                <p>Or drag inside the area to move the entire selection</p>
              </>
            )}
          </div>

          <div className="flex gap-4 justify-center">
            <Button
              onClick={resetCrop}
              variant="outline"
              className={`${
                isDarkMode
                  ? "bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/50"
                  : "bg-slate-200/50 border-slate-300/50 text-slate-600 hover:bg-slate-300/50"
              } rounded-xl px-6 py-3`}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={applyCrop}
              className={`${themeClasses.button.success} text-white rounded-xl px-6 py-3 shadow-lg`}
            >
              <Check className="h-4 w-4 mr-2" />
              Apply Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
