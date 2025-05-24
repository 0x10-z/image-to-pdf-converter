import React from "react";
import type { DragEvent, TouchEvent } from "react";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  X,
  Download,
  FileImage,
  Loader2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Zap,
  Edit3,
  Check,
  RotateCcw,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useMobile } from "@/hooks/use-mobile";

interface ImageFile {
  file: File;
  preview: string;
  id: string;
  editedPreview?: string;
}

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

export default function ImageToPDFConverter() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Touch handling
  const [touchStartIndex, setTouchStartIndex] = useState<number | null>(null);
  const isMobile = useMobile();

  // Image editing
  const [editingImage, setEditingImage] = useState<ImageFile | null>(null);
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = useCallback((files: FileList) => {
    const newImages: ImageFile[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const id = Math.random().toString(36).substr(2, 9);
        const preview = URL.createObjectURL(file);
        newImages.push({ file, preview, id });
      }
    });

    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (e.dataTransfer.files) {
        handleFileSelect(e.dataTransfer.files);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const updated = prev.filter((img) => img.id !== id);
      // Clean up object URL
      const removed = prev.find((img) => img.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
        if (removed.editedPreview) {
          URL.revokeObjectURL(removed.editedPreview);
        }
      }
      return updated;
    });
  }, []);

  const convertToPDF = async () => {
    if (images.length === 0) return;

    setIsConverting(true);
    setProgress(0);

    try {
      // Dynamic import of jsPDF
      const { jsPDF } = await import("jspdf");
      // Force A4 format
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 10;

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        setProgress((i / images.length) * 90);

        // Create image element
        const img = new Image();
        img.crossOrigin = "anonymous";

        await new Promise((resolve, reject) => {
          img.onload = () => {
            try {
              const maxWidth = pageWidth - margin * 2;
              const maxHeight = pageHeight - margin * 2;

              let { width, height } = img;

              // Convert pixels to mm (assuming 96 DPI)
              width = (width * 25.4) / 96;
              height = (height * 25.4) / 96;

              // Scale image to fit page while maintaining aspect ratio
              if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              }

              if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
              }

              // Center image on page
              const x = (pageWidth - width) / 2;
              const y = (pageHeight - height) / 2;

              // Add new page if not first image
              if (i > 0) {
                pdf.addPage();
              }

              // Add image to PDF
              pdf.addImage(img, "JPEG", x, y, width, height);
              resolve(void 0);
            } catch (error) {
              reject(error);
            }
          };

          img.onerror = () => reject(new Error("Failed to load image"));
          // Use edited preview if available, otherwise use original
          img.src = image.editedPreview || image.preview;
        });
      }

      setProgress(95);

      // Generate PDF with better filename
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");
      const filename = `images-to-pdf-${timestamp}.pdf`;

      // Save PDF with better browser compatibility
      pdf.save(filename);

      setProgress(100);

      // Reset after a delay
      setTimeout(() => {
        setProgress(0);
        setIsConverting(false);
      }, 1500);
    } catch (error) {
      console.error("Error converting to PDF:", error);
      alert("Error al convertir a PDF. Por favor, inténtalo de nuevo.");
      setIsConverting(false);
      setProgress(0);
    }
  };

  const handleImageDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleImageDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleImageDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];

    // Remove dragged image from its original position
    newImages.splice(draggedIndex, 1);

    // Insert at new position
    newImages.splice(dropIndex, 0, draggedImage);

    setImages(newImages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleImageDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Mobile reordering functions
  const moveImageUp = (index: number) => {
    if (index <= 0) return;

    const newImages = [...images];
    const temp = newImages[index];
    newImages[index] = newImages[index - 1];
    newImages[index - 1] = temp;

    setImages(newImages);
  };

  const moveImageDown = (index: number) => {
    if (index >= images.length - 1) return;

    const newImages = [...images];
    const temp = newImages[index];
    newImages[index] = newImages[index + 1];
    newImages[index + 1] = temp;

    setImages(newImages);
  };

  // Image editing functions
  const openImageEditor = (image: ImageFile) => {
    setEditingImage(image);
    // Reset crop area
    setCropArea({ x1: 10, y1: 10, x2: 90, y2: 90 });
    setActiveCorner(null);
    setMagnifier({ visible: false, x: 0, y: 0, corner: null });
  };

  const closeImageEditor = () => {
    setEditingImage(null);
    setCropArea({ x1: 10, y1: 10, x2: 90, y2: 90 });
    setActiveCorner(null);
    setMagnifier({ visible: false, x: 0, y: 0, corner: null });
  };

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
      let newArea = { ...prev };

      switch (corner) {
        case "topLeft":
          // Solo mueve la esquina superior izquierda, las otras 3 permanecen fijas
          newArea.x1 = Math.max(0, Math.min(x, prev.x2 - 5));
          newArea.y1 = Math.max(0, Math.min(y, prev.y2 - 5));
          // x2, y2 permanecen igual (esquinas fijas)
          break;
        case "topRight":
          // Solo mueve la esquina superior derecha, las otras 3 permanecen fijas
          newArea.x2 = Math.min(100, Math.max(x, prev.x1 + 5));
          newArea.y1 = Math.max(0, Math.min(y, prev.y2 - 5));
          // x1, y2 permanecen igual (esquinas fijas)
          break;
        case "bottomLeft":
          // Solo mueve la esquina inferior izquierda, las otras 3 permanecen fijas
          newArea.x1 = Math.max(0, Math.min(x, prev.x2 - 5));
          newArea.y2 = Math.min(100, Math.max(y, prev.y1 + 5));
          // x2, y1 permanecen igual (esquinas fijas)
          break;
        case "bottomRight":
          // Solo mueve la esquina inferior derecha, las otras 3 permanecen fijas
          newArea.x2 = Math.min(100, Math.max(x, prev.x1 + 5));
          newArea.y2 = Math.min(100, Math.max(y, prev.y1 + 5));
          // x1, y1 permanecen igual (esquinas fijas)
          break;
        case "move":
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

      return newArea;
    });
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !editingImage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const maxSize = isMobile ? 300 : 500;
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    let canvasWidth, canvasHeight;

    if (aspectRatio > 1) {
      canvasWidth = maxSize;
      canvasHeight = maxSize / aspectRatio;
    } else {
      canvasHeight = maxSize;
      canvasWidth = maxSize * aspectRatio;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw image
    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

    // Draw crop overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)"; // Cambiado de 0.6 a 0.8
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Clear crop area
    const cropX = (cropArea.x1 / 100) * canvasWidth;
    const cropY = (cropArea.y1 / 100) * canvasHeight;
    const cropWidth = ((cropArea.x2 - cropArea.x1) / 100) * canvasWidth;
    const cropHeight = ((cropArea.y2 - cropArea.y1) / 100) * canvasHeight;

    ctx.clearRect(cropX, cropY, cropWidth, cropHeight);
    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

    // Draw crop border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);

    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      const gridX = cropX + (cropWidth / 3) * i;
      const gridY = cropY + (cropHeight / 3) * i;
      ctx.beginPath();
      ctx.moveTo(gridX, cropY);
      ctx.lineTo(gridX, cropY + cropHeight);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cropX, gridY);
      ctx.lineTo(cropX + cropWidth, gridY);
      ctx.stroke();
    }

    // Draw corner handles
    const handleSize = isMobile ? 20 : 12;
    const corners = [
      { x: cropX, y: cropY },
      { x: cropX + cropWidth, y: cropY },
      { x: cropX, y: cropY + cropHeight },
      { x: cropX + cropWidth, y: cropY + cropHeight },
    ];

    corners.forEach((corner) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        corner.x - handleSize / 2,
        corner.y - handleSize / 2,
        handleSize,
        handleSize
      );
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        corner.x - handleSize / 2,
        corner.y - handleSize / 2,
        handleSize,
        handleSize
      );
    });
  }, [editingImage, cropArea, isMobile]);

  const drawMagnifier = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current;
      const magnifierCanvas = magnifierCanvasRef.current;
      const img = imageRef.current;

      if (!canvas || !magnifierCanvas || !img) return;

      const ctx = canvas.getContext("2d");
      const magnifierCtx = magnifierCanvas.getContext("2d");
      if (!ctx || !magnifierCtx) return;

      const magnifierSize = 120; // Aumentado para mejor visibilidad
      const zoomLevel = 3;

      magnifierCanvas.width = magnifierSize;
      magnifierCanvas.height = magnifierSize;

      // Calculate source area to magnify
      const sourceSize = magnifierSize / zoomLevel;
      const sourceX = (x / 100) * canvas.width - sourceSize / 2;
      const sourceY = (y / 100) * canvas.height - sourceSize / 2;

      // Clear magnifier
      magnifierCtx.clearRect(0, 0, magnifierSize, magnifierSize);

      // Draw magnified image
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

      // Calculate crop area positions in magnifier coordinates
      const cropX1 = ((cropArea.x1 / 100) * canvas.width - sourceX) * zoomLevel;
      const cropY1 =
        ((cropArea.y1 / 100) * canvas.height - sourceY) * zoomLevel;
      const cropX2 = ((cropArea.x2 / 100) * canvas.width - sourceX) * zoomLevel;
      const cropY2 =
        ((cropArea.y2 / 100) * canvas.height - sourceY) * zoomLevel;

      // Draw crop area overlay
      magnifierCtx.fillStyle = "rgba(0, 0, 0, 0.7)"; // Cambiado de 0.4 a 0.7
      magnifierCtx.fillRect(0, 0, magnifierSize, magnifierSize);

      // Clear crop area in magnifier
      if (
        cropX1 < magnifierSize &&
        cropY1 < magnifierSize &&
        cropX2 > 0 &&
        cropY2 > 0
      ) {
        const visibleX1 = Math.max(0, cropX1);
        const visibleY1 = Math.max(0, cropY1);
        const visibleX2 = Math.min(magnifierSize, cropX2);
        const visibleY2 = Math.min(magnifierSize, cropY2);

        if (visibleX2 > visibleX1 && visibleY2 > visibleY1) {
          magnifierCtx.clearRect(
            visibleX1,
            visibleY1,
            visibleX2 - visibleX1,
            visibleY2 - visibleY1
          );

          // Redraw the image in the cleared area
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
        }
      }

      // Draw crop border lines in magnifier
      magnifierCtx.strokeStyle = "#ffffff";
      magnifierCtx.lineWidth = 2;
      magnifierCtx.setLineDash([]);

      // Draw the crop rectangle if any part is visible
      if (
        cropX1 < magnifierSize &&
        cropY1 < magnifierSize &&
        cropX2 > 0 &&
        cropY2 > 0
      ) {
        const visibleX1 = Math.max(0, cropX1);
        const visibleY1 = Math.max(0, cropY1);
        const visibleX2 = Math.min(magnifierSize, cropX2);
        const visibleY2 = Math.min(magnifierSize, cropY2);

        // Draw border lines
        magnifierCtx.beginPath();
        // Top line
        if (cropY1 >= 0 && cropY1 <= magnifierSize) {
          magnifierCtx.moveTo(Math.max(0, cropX1), cropY1);
          magnifierCtx.lineTo(Math.min(magnifierSize, cropX2), cropY1);
        }
        // Bottom line
        if (cropY2 >= 0 && cropY2 <= magnifierSize) {
          magnifierCtx.moveTo(Math.max(0, cropX1), cropY2);
          magnifierCtx.lineTo(Math.min(magnifierSize, cropX2), cropY2);
        }
        // Left line
        if (cropX1 >= 0 && cropX1 <= magnifierSize) {
          magnifierCtx.moveTo(cropX1, Math.max(0, cropY1));
          magnifierCtx.lineTo(cropX1, Math.min(magnifierSize, cropY2));
        }
        // Right line
        if (cropX2 >= 0 && cropX2 <= magnifierSize) {
          magnifierCtx.moveTo(cropX2, Math.max(0, cropY1));
          magnifierCtx.lineTo(cropX2, Math.min(magnifierSize, cropY2));
        }
        magnifierCtx.stroke();

        // Draw corner points
        magnifierCtx.fillStyle = "#ffffff";
        const cornerSize = 4;

        // Top-left corner
        if (
          cropX1 >= -cornerSize &&
          cropX1 <= magnifierSize + cornerSize &&
          cropY1 >= -cornerSize &&
          cropY1 <= magnifierSize + cornerSize
        ) {
          magnifierCtx.fillRect(
            cropX1 - cornerSize / 2,
            cropY1 - cornerSize / 2,
            cornerSize,
            cornerSize
          );
        }
        // Top-right corner
        if (
          cropX2 >= -cornerSize &&
          cropX2 <= magnifierSize + cornerSize &&
          cropY1 >= -cornerSize &&
          cropY1 <= magnifierSize + cornerSize
        ) {
          magnifierCtx.fillRect(
            cropX2 - cornerSize / 2,
            cropY1 - cornerSize / 2,
            cornerSize,
            cornerSize
          );
        }
        // Bottom-left corner
        if (
          cropX1 >= -cornerSize &&
          cropX1 <= magnifierSize + cornerSize &&
          cropY2 >= -cornerSize &&
          cropY2 <= magnifierSize + cornerSize
        ) {
          magnifierCtx.fillRect(
            cropX1 - cornerSize / 2,
            cropY2 - cornerSize / 2,
            cornerSize,
            cornerSize
          );
        }
        // Bottom-right corner
        if (
          cropX2 >= -cornerSize &&
          cropX2 <= magnifierSize + cornerSize &&
          cropY2 >= -cornerSize &&
          cropY2 <= magnifierSize + cornerSize
        ) {
          magnifierCtx.fillRect(
            cropX2 - cornerSize / 2,
            cropY2 - cornerSize / 2,
            cornerSize,
            cornerSize
          );
        }
      }

      // Draw crosshair for current position
      magnifierCtx.strokeStyle = "#ff0000";
      magnifierCtx.lineWidth = 2;
      magnifierCtx.setLineDash([]);
      const center = magnifierSize / 2;
      magnifierCtx.beginPath();
      magnifierCtx.moveTo(center - 10, center);
      magnifierCtx.lineTo(center + 10, center);
      magnifierCtx.moveTo(center, center - 10);
      magnifierCtx.lineTo(center, center + 10);
      magnifierCtx.stroke();

      // Draw border around magnifier
      magnifierCtx.strokeStyle = "#ffffff";
      magnifierCtx.lineWidth = 3;
      magnifierCtx.setLineDash([]);
      magnifierCtx.strokeRect(0, 0, magnifierSize, magnifierSize);
    },
    [cropArea]
  );

  useEffect(() => {
    if (editingImage && imageRef.current) {
      imageRef.current.onload = drawCanvas;
      imageRef.current.src = editingImage.preview;
    }
  }, [editingImage, drawCanvas]);

  useEffect(() => {
    drawCanvas();
  }, [cropArea, drawCanvas]);

  useEffect(() => {
    if (magnifier.visible) {
      drawMagnifier(magnifier.x, magnifier.y);
    }
  }, [magnifier, drawMagnifier]);

  // Mouse events for desktop
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
    const corner = getCornerAtPosition(x, y);
    setActiveCorner(corner);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);

    if (activeCorner) {
      updateCropArea(activeCorner, x, y);
    }
  };

  const handleCanvasMouseUp = () => {
    setActiveCorner(null);
  };

  // Touch events for mobile
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

  const applyCrop = async () => {
    if (!editingImage || !imageRef.current) return;

    const img = imageRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate crop dimensions
    const cropX = (cropArea.x1 / 100) * img.naturalWidth;
    const cropY = (cropArea.y1 / 100) * img.naturalHeight;
    const cropWidth = ((cropArea.x2 - cropArea.x1) / 100) * img.naturalWidth;
    const cropHeight = ((cropArea.y2 - cropArea.y1) / 100) * img.naturalHeight;

    canvas.width = cropWidth;
    canvas.height = cropHeight;

    // Draw cropped image
    ctx.drawImage(
      img,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    // Convert to blob and create URL
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const editedPreview = URL.createObjectURL(blob);

          setImages((prev) =>
            prev.map((img) =>
              img.id === editingImage.id ? { ...img, editedPreview } : img
            )
          );

          closeImageEditor();
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const resetCrop = () => {
    if (!editingImage) return;

    setImages((prev) =>
      prev.map((img) =>
        img.id === editingImage.id ? { ...img, editedPreview: undefined } : img
      )
    );

    closeImageEditor();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-400 via-pink-300 to-cyan-300 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-yellow-400 to-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-green-400 to-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-lg rounded-2xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-white via-purple-100 to-pink-100 bg-clip-text text-transparent">
              Image to PDF
            </h1>
            <div className="p-3 bg-white/20 backdrop-blur-lg rounded-2xl">
              <Zap className="h-8 w-8 text-white" />
            </div>
          </div>
          <p className="text-white/90 text-lg md:text-xl font-medium">
            ✨ Transform your images into beautiful PDFs ✨
          </p>
        </div>

        {/* Upload Area */}
        <Card className="mb-8 bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
          <CardContent className="p-8">
            <div
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 transform ${
                isDragOver
                  ? "border-white bg-white/20 scale-105 shadow-2xl"
                  : "border-white/40 hover:border-white/60 hover:bg-white/5"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="relative">
                <Upload className="mx-auto h-16 w-16 text-white mb-6 animate-bounce" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-ping"></div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Drop your magic here!
              </h3>
              <p className="text-white/80 text-lg mb-6">
                Or click to select your amazing images
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Upload className="mr-2 h-5 w-5" />
                Choose Images
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  e.target.files && handleFileSelect(e.target.files)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Loading Bar */}
        {isConverting && (
          <Card className="mb-8 bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
                <span className="text-lg font-bold text-white">
                  Creating your PDF magic... {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="h-3 bg-white/20" />
            </CardContent>
          </Card>
        )}

        {/* Image Preview Grid */}
        {images.length > 0 && (
          <Card className="mb-8 bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-green-400 to-blue-400 rounded-xl">
                    <FileImage className="h-6 w-6 text-white" />
                  </div>
                  Your Gallery ({images.length})
                </h3>
                <Button
                  onClick={convertToPDF}
                  disabled={isConverting || images.length === 0}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
                >
                  {isConverting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5 mr-2" />
                      Create PDF ✨
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-white/90 text-lg flex items-center gap-3">
                  {isMobile ? (
                    <>
                      <div className="flex gap-1">
                        <ChevronUp className="h-5 w-5 text-yellow-300" />
                        <ChevronDown className="h-5 w-5 text-yellow-300" />
                      </div>
                      Use the buttons to reorder your masterpiece
                    </>
                  ) : (
                    <>
                      <GripVertical className="h-5 w-5 text-yellow-300" />
                      Drag and drop to arrange your story
                    </>
                  )}
                </p>
                <p className="text-white/80 text-base flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-cyan-300" />
                  {isMobile
                    ? "Tap on any image to crop it with precision zoom"
                    : "Click on any image to crop and edit it"}
                </p>
              </div>

              {isMobile ? (
                // Mobile view - enhanced list
                <div className="space-y-4">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      className="flex items-center bg-white/10 backdrop-blur-lg rounded-2xl p-4 gap-4 border border-white/20 shadow-lg"
                    >
                      <div className="flex-shrink-0 w-20 h-20 relative">
                        <div className="absolute -top-2 -left-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm px-3 py-1 rounded-full font-bold z-20 shadow-lg">
                          {index + 1}
                        </div>
                        <img
                          src={
                            image.editedPreview ||
                            image.preview ||
                            "/placeholder.svg"
                          }
                          alt="Preview"
                          className="w-full h-full object-cover rounded-xl shadow-lg cursor-pointer"
                          onClick={() => openImageEditor(image)}
                        />
                        {image.editedPreview && (
                          <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1 z-20">
                            <Edit3 className="h-3 w-3" />
                          </div>
                        )}
                      </div>

                      <div className="flex-grow truncate">
                        <p className="text-white/70 text-xs truncate font-medium">
                          {image.file.name}
                        </p>
                      </div>

                      <div className="flex-shrink-0 flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl"
                          onClick={() => moveImageUp(index)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl"
                          onClick={() => moveImageDown(index)}
                          disabled={index === images.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 bg-red-500/20 border-red-400/30 text-red-300 hover:bg-red-500/30 hover:text-red-200 rounded-xl"
                        onClick={() => removeImage(image.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                // Desktop view - enhanced grid with larger images
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      className={`relative group bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden aspect-square cursor-move transition-all duration-300 border border-white/20 shadow-lg ${
                        draggedIndex === index
                          ? "opacity-50 scale-95 rotate-3"
                          : "hover:scale-105 hover:shadow-2xl"
                      } ${
                        dragOverIndex === index
                          ? "ring-4 ring-yellow-400 ring-offset-2 ring-offset-transparent scale-110"
                          : ""
                      }`}
                      draggable
                      onDragStart={(e) => handleImageDragStart(e, index)}
                      onDragOver={(e) => handleImageDragOver(e, index)}
                      onDragLeave={handleImageDragLeave}
                      onDrop={(e) => handleImageDrop(e, index)}
                      onDragEnd={handleImageDragEnd}
                    >
                      {/* Page number - more prominent */}
                      <div className="absolute -top-3 -left-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg px-4 py-2 rounded-full font-bold z-30 shadow-lg">
                        {index + 1}
                      </div>

                      {/* Edit indicator */}
                      {image.editedPreview && (
                        <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-2 z-30 shadow-lg">
                          <Edit3 className="h-4 w-4" />
                        </div>
                      )}

                      {/* Drag indicator */}
                      <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-sm text-white rounded-xl p-2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
                        <GripVertical className="h-4 w-4" />
                      </div>

                      {/* Edit button */}
                      <button
                        onClick={() => openImageEditor(image)}
                        className="absolute top-12 right-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-2 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg z-40 transform hover:scale-110"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>

                      {/* Main image - full size */}
                      <img
                        src={
                          image.editedPreview ||
                          image.preview ||
                          "/placeholder.svg"
                        }
                        alt="Preview"
                        className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                      />

                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />

                      {/* Remove button */}
                      <button
                        onClick={() => removeImage(image.id)}
                        className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg z-40 transform hover:scale-110"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      {/* Filename - smaller and subtle */}
                      <div className="absolute bottom-3 left-3 right-3 bg-black/30 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 truncate">
                        {image.file.name.length > 20
                          ? `${image.file.name.substring(0, 20)}...`
                          : image.file.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {images.length === 0 && !isConverting && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
            <CardContent className="p-16 text-center">
              <div className="relative mb-8">
                <FileImage className="mx-auto h-24 w-24 text-white/60" />
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-bounce"></div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">
                Ready for some magic?
              </h3>
              <p className="text-white/80 text-lg">
                Upload your images and watch them transform into a beautiful
                PDF!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-white/70">
          <p className="text-lg">
            🔒 Your images stay private - everything happens in your browser
          </p>
        </div>
      </div>

      {/* Image Editor Modal */}
      {editingImage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 max-w-3xl w-full max-h-[95vh] overflow-auto border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <Edit3 className="h-6 w-6" />
                Crop Image
                {isMobile && <ZoomIn className="h-5 w-5 text-cyan-300" />}
              </h3>
              <Button
                onClick={closeImageEditor}
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

                {/* Magnifier for mobile */}
                {magnifier.visible && isMobile && (
                  <div
                    className="absolute bg-white/95 rounded-2xl p-2 border-4 border-white shadow-2xl pointer-events-none z-60"
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
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      🔍 Precision Crop Mode
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center text-white/80 text-sm space-y-2">
                {isMobile ? (
                  <>
                    <p>
                      🔍 Touch and drag the white corners to adjust the crop
                      area
                    </p>
                    <p>✨ A magnifier will appear for precise positioning</p>
                  </>
                ) : (
                  <>
                    <p>
                      Drag the white corners to adjust the crop area
                      independently
                    </p>
                    <p>Or drag inside the area to move the entire selection</p>
                  </>
                )}
              </div>

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
      )}
    </div>
  );
}
