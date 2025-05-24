import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Edit3, RotateCcw, X, ZoomIn, Check } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import ReactDOM from "react-dom";

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
}

export default function CropCanvas({
  imageSrc,
  onClose,
  onApply,
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

    // Dibuja el rectángulo del cropArea en la lupa
    const cropCanvasX1 = ((cropArea.x1 / 100) * canvas.width - sourceX) * zoom;
    const cropCanvasY1 = ((cropArea.y1 / 100) * canvas.height - sourceY) * zoom;
    const cropCanvasX2 = ((cropArea.x2 / 100) * canvas.width - sourceX) * zoom;
    const cropCanvasY2 = ((cropArea.y2 / 100) * canvas.height - sourceY) * zoom;
    const cropW = cropCanvasX2 - cropCanvasX1;
    const cropH = cropCanvasY2 - cropCanvasY1;

    // Dibuja las esquinas
    const size = 6;
    magnifierCtx.fillStyle = "white";
    magnifierCtx.fillRect(
      cropCanvasX1 - size / 2,
      cropCanvasY1 - size / 2,
      size,
      size
    ); // Top-left
    magnifierCtx.fillRect(
      cropCanvasX2 - size / 2,
      cropCanvasY1 - size / 2,
      size,
      size
    ); // Top-right
    magnifierCtx.fillRect(
      cropCanvasX1 - size / 2,
      cropCanvasY2 - size / 2,
      size,
      size
    ); // Bottom-left
    magnifierCtx.fillRect(
      cropCanvasX2 - size / 2,
      cropCanvasY2 - size / 2,
      size,
      size
    ); // Bottom-right

    // Solo dibuja si el área está dentro de los límites visibles
    if (
      cropCanvasX2 > 0 &&
      cropCanvasY2 > 0 &&
      cropCanvasX1 < magnifierSize &&
      cropCanvasY1 < magnifierSize
    ) {
      magnifierCtx.strokeStyle = "white";
      magnifierCtx.lineWidth = 2;
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

    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropW, cropH);

    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      const gridX = cropX + (cropW / 3) * i;
      const gridY = cropY + (cropH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(gridX, cropY);
      ctx.lineTo(gridX, cropY + cropH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cropX, gridY);
      ctx.lineTo(cropX + cropW, gridY);
      ctx.stroke();
    }

    const size = 10;
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 max-w-3xl w-full max-h-[95vh] overflow-auto border border-white/20 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <Edit3 className="h-6 w-6" />
            Crop Image
            {isMobile && <ZoomIn className="h-5 w-5 text-cyan-300" />}
          </h3>
          <Button
            onClick={onClose}
            variant="outline"
            size="icon"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          <div className="bg-white/5 rounded-2xl p-4 relative">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto mx-auto rounded-lg cursor-crosshair touch-none"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onTouchStart={handleCanvasTouchStart}
              onTouchMove={handleCanvasTouchMove}
              onTouchEnd={handleCanvasTouchEnd}
            />
            <img ref={imageRef} className="hidden" alt="Original" />
          </div>

          <div className="text-center text-white/80 text-sm space-y-2">
            {isMobile ? (
              <>
                <p>
                  🔍 Touch and drag the white corners to adjust the crop area
                </p>
                <p>✨ A magnifier will appear for precise positioning</p>
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

          {/* {magnifier.visible && isMobile && ( */}
          {magnifier.visible &&
            ReactDOM.createPortal(
              (() => {
                const screenWidth = window.innerWidth;
                const magnifierSize = 120;
                const margin = 16;
                const canvas = canvasRef.current;

                const canvasRect = canvas?.getBoundingClientRect();
                const canvasLeft = canvasRect?.left || 0;
                const canvasTop = canvasRect?.top || 0;
                const canvasWidth = canvas?.offsetWidth || 0;
                const canvasHeight = canvas?.offsetHeight || 0;

                const posX = (magnifier.x / 100) * canvasWidth + canvasLeft;
                const posY = (magnifier.y / 100) * canvasHeight + canvasTop;

                const isNearRight = posX + magnifierSize + margin > screenWidth;
                const isNearLeft = posX - magnifierSize - margin < 0;

                let adjustedX = posX;
                if (isNearRight) adjustedX = posX - magnifierSize - margin;
                else if (isNearLeft) adjustedX = posX + magnifierSize + margin;

                return (
                  <div
                    className="fixed bg-white/95 rounded-2xl p-2 border-4 border-white shadow-2xl pointer-events-none z-[9999]"
                    style={{
                      left: `${adjustedX}px`,
                      top: `${posY}px`,
                      transform: "translate(-50%, -120%)",
                    }}
                  >
                    <canvas
                      ref={magnifierCanvasRef}
                      className="rounded-xl"
                      width={magnifierSize}
                      height={magnifierSize}
                    />
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      🔍 Precision Crop Mode
                    </div>
                  </div>
                );
              })(),
              document.getElementById("magnifier-root")!
            )}

          <div className="flex gap-4 justify-center">
            <Button
              onClick={resetCrop}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={applyCrop}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl"
            >
              <Check className="h-4 w-4 mr-2" />
              Apply Crop
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
