import React from "react";

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
  Zap,
  Edit3,
  Sun,
  Moon,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useMobile } from "@/hooks/use-mobile";
import CropCanvas from "./crop-canvas";
import { getThemeClasses } from "@/themes";

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

export default function ImageToPDFConverter() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDarkMode, setIsDarkMode] = useState(false);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isMobile = useMobile();

  // Image editing
  const [editingImage, setEditingImage] = useState<ImageFile | null>(null);
  const [cropArea, setCropArea] = useState<CropArea>({
    x1: 10,
    y1: 10,
    x2: 90,
    y2: 90,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

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

  const themeClasses = getThemeClasses(isDarkMode);

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
      const filename = `file-${timestamp}.pdf`;

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

  useEffect(() => {
    if (editingImage && imageRef.current) {
      imageRef.current.onload = drawCanvas;
      imageRef.current.src = editingImage.preview;
    }
  }, [editingImage, drawCanvas]);

  useEffect(() => {
    drawCanvas();
  }, [cropArea, drawCanvas]);

  return (
    <div
      className={`min-h-screen ${themeClasses.background} p-4 relative overflow-hidden transition-all duration-500`}
    >
      {/* Animated background elements - RESTAURADAS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-40 -right-40 w-80 h-80 ${
            isDarkMode
              ? "bg-gradient-to-br from-blue-600/10 to-indigo-600/10"
              : "bg-gradient-to-br from-blue-400/20 to-indigo-400/20"
          } rounded-full mix-blend-multiply filter blur-3xl animate-pulse`}
        ></div>
        <div
          className={`absolute -bottom-40 -left-40 w-80 h-80 ${
            isDarkMode
              ? "bg-gradient-to-br from-purple-600/10 to-violet-600/10"
              : "bg-gradient-to-br from-purple-400/20 to-violet-400/20"
          } rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2000`}
        ></div>
        <div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 ${
            isDarkMode
              ? "bg-gradient-to-br from-emerald-600/5 to-teal-600/5"
              : "bg-gradient-to-br from-emerald-400/15 to-teal-400/15"
          } rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-4000`}
        ></div>
      </div>

      {/* Theme Toggle Button */}
      <div className="fixed top-6 right-6 z-50">
        <Button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`p-3 rounded-2xl shadow-lg transform hover:scale-110 transition-all duration-300 ${themeClasses.button.primary}`}
        >
          {isDarkMode ? (
            <Sun
              className="h-5 w-5 animate-spin"
              style={{ animationDuration: "8s" }}
            />
          ) : (
            <Moon className="h-5 w-5 animate-pulse" />
          )}
        </Button>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div
              className={`p-4 ${themeClasses.card} backdrop-blur-xl rounded-2xl shadow-2xl transform hover:scale-110 transition-all duration-300`}
            >
              <FileText
                className={`h-8 w-8 ${
                  isDarkMode ? "text-slate-300" : "text-slate-600"
                } animate-pulse`}
              />
            </div>
            <h1
              className={`text-5xl md:text-7xl font-bold ${
                isDarkMode
                  ? "bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400"
                  : "bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900"
              } bg-clip-text text-transparent tracking-tight animate-pulse`}
            >
              Image to PDF
            </h1>
            <div
              className={`p-4 ${themeClasses.card} backdrop-blur-xl rounded-2xl shadow-2xl transform hover:scale-110 transition-all duration-300`}
            >
              <Zap
                className={`h-8 w-8 ${
                  isDarkMode ? "text-slate-300" : "text-slate-600"
                } animate-bounce`}
              />
            </div>
          </div>
          <p
            className={`${themeClasses.text.secondary} text-xl md:text-2xl font-medium max-w-2xl mx-auto leading-relaxed`}
          >
            Professional document conversion with advanced editing capabilities
          </p>
        </div>

        {/* Upload Area */}
        <Card
          className={`mb-8 ${themeClasses.card} backdrop-blur-xl shadow-2xl transform hover:scale-[1.01] transition-all duration-300`}
        >
          <CardContent className="p-10">
            <div
              className={`border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-500 transform ${
                isDragOver
                  ? `${themeClasses.uploadActive} scale-[1.02] shadow-2xl`
                  : `${themeClasses.upload}`
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="relative mb-8">
                <Upload
                  className={`mx-auto h-20 w-20 ${themeClasses.text.secondary} transition-transform duration-300 hover:scale-110 animate-bounce`}
                />
                <div
                  className={`absolute -top-2 -right-2 w-4 h-4 ${
                    isDarkMode
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600"
                  } rounded-full animate-ping`}
                ></div>
              </div>
              <h3
                className={`text-3xl font-bold ${themeClasses.text.primary} mb-4`}
              >
                Upload Your Images
              </h3>
              <p
                className={`${themeClasses.text.secondary} text-lg mb-8 max-w-md mx-auto`}
              >
                Drag and drop your files here or click to browse
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className={`${themeClasses.button.primary} font-semibold py-4 px-8 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300`}
              >
                <Upload className="mr-3 h-5 w-5" />
                Select Images
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
          <Card
            className={`mb-8 ${themeClasses.card} backdrop-blur-xl shadow-2xl animate-pulse`}
          >
            <CardContent className="p-8">
              <div className="flex items-center gap-6 mb-6">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
                <span
                  className={`text-xl font-semibold ${themeClasses.text.primary}`}
                >
                  Processing documents... {Math.round(progress)}%
                </span>
              </div>
              <Progress
                value={progress}
                className={`h-3 ${
                  isDarkMode ? "bg-slate-700/50" : "bg-slate-300/50"
                } rounded-full overflow-hidden`}
              >
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </Progress>
            </CardContent>
          </Card>
        )}

        {/* Image Preview Grid */}
        {images.length > 0 && (
          <Card
            className={`mb-8 ${themeClasses.card} backdrop-blur-xl shadow-2xl`}
          >
            <CardContent className="py-10 px-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-8 w-full">
                <h3
                  className={`text-2xl sm:text-3xl font-bold ${themeClasses.text.primary} flex items-center gap-4 text-center sm:text-left justify-center sm:justify-start`}
                >
                  <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl shadow-lg animate-pulse">
                    <FileImage className="h-6 w-6 text-white" />
                  </div>
                  Document Gallery ({images.length})
                </h3>

                <Button
                  onClick={convertToPDF}
                  disabled={isConverting || images.length === 0}
                  className={`${themeClasses.button.success} text-white font-semibold py-4 px-8 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none w-full sm:w-auto`}
                >
                  {isConverting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5 mr-3" />
                      Generate PDF
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-4 mb-8">
                <p
                  className={`${themeClasses.text.primary} text-lg flex items-center gap-3`}
                >
                  {isMobile ? (
                    <>
                      <div className="flex gap-1">
                        <ChevronUp className="h-5 w-5 text-blue-400 animate-bounce" />
                        <ChevronDown className="h-5 w-5 text-blue-400 animate-bounce animation-delay-1000" />
                      </div>
                      Use controls to reorder documents
                    </>
                  ) : (
                    <>
                      <GripVertical className="h-5 w-5 text-blue-400 animate-pulse" />
                      Drag and drop to arrange document order
                    </>
                  )}
                </p>
                <p
                  className={`${themeClasses.text.secondary} text-base flex items-center gap-3`}
                >
                  <Edit3 className="h-4 w-4 text-emerald-400 animate-pulse" />
                  {isMobile
                    ? "Tap any image to edit with precision tools"
                    : "Click any image to edit and crop"}
                </p>
              </div>

              {isMobile ? (
                // Mobile view - professional list
                <div className="space-y-4">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      className={`flex flex-col gap-2 p-3 rounded-2xl border shadow-md transition-all duration-300 ${
                        isDarkMode
                          ? "bg-slate-800/40 border-slate-600/40 text-slate-100"
                          : "bg-white/70 border-slate-300/50 text-slate-900"
                      }`}
                    >
                      {/* Nombre arriba */}
                      <p className="text-sm font-medium truncate px-1">
                        {image.file.name.length > 40
                          ? image.file.name.slice(0, 40) + "..."
                          : image.file.name}
                      </p>

                      {/* Contenido horizontal */}
                      <div className="flex items-center gap-4">
                        {/* Imagen */}
                        <div className="relative w-20 h-20 flex-shrink-0">
                          <div
                            className={`absolute -top-2 -left-2 px-3 py-1 rounded-full text-sm font-semibold z-10 shadow-md border animate-pulse ${
                              isDarkMode
                                ? "bg-slate-600 text-slate-200 border-slate-500"
                                : "bg-slate-500 text-white border-slate-300"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <img
                            src={
                              image.editedPreview ||
                              image.preview ||
                              "/placeholder.svg"
                            }
                            alt="Preview"
                            className={`w-full h-full object-cover rounded-xl border cursor-pointer transform hover:scale-105 transition-transform ${
                              isDarkMode
                                ? "border-slate-500"
                                : "border-slate-300"
                            }`}
                            onClick={() => openImageEditor(image)}
                          />
                          {image.editedPreview && (
                            <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-1 z-10 shadow-md animate-bounce">
                              <Edit3 className="h-3 w-3" />
                            </div>
                          )}
                        </div>

                        {/* Botones */}
                        <div className="flex gap-2 items-center ml-auto">
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className={`h-10 w-10 ${
                                isDarkMode
                                  ? "bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/50"
                                  : "bg-slate-200/50 border-slate-300/50 text-slate-600 hover:bg-slate-300/50"
                              } rounded-xl transition-all`}
                              onClick={() => moveImageUp(index)}
                              disabled={index === 0}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className={`h-10 w-10 ${
                                isDarkMode
                                  ? "bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/50"
                                  : "bg-slate-200/50 border-slate-300/50 text-slate-600 hover:bg-slate-300/50"
                              } rounded-xl transition-all`}
                              onClick={() => moveImageDown(index)}
                              disabled={index === images.length - 1}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 bg-red-900/30 border-red-700/50 text-red-400 hover:bg-red-800/40 hover:text-red-300 rounded-xl transition-all"
                            onClick={() => removeImage(image.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Desktop view - professional grid
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      className={`relative group ${
                        isDarkMode
                          ? "bg-gradient-to-br from-slate-700/30 to-slate-600/30 border-slate-600/50"
                          : "bg-gradient-to-br from-slate-100/50 to-slate-200/50 border-slate-300/50"
                      } backdrop-blur-lg rounded-2xl overflow-hidden aspect-square cursor-move transition-all duration-300 border shadow-lg ${
                        draggedIndex === index
                          ? "opacity-50 scale-95 rotate-1"
                          : "hover:scale-105 hover:shadow-2xl"
                      } ${
                        dragOverIndex === index
                          ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-transparent scale-110"
                          : ""
                      }`}
                      draggable
                      onDragStart={(e) => handleImageDragStart(e, index)}
                      onDragOver={(e) => handleImageDragOver(e, index)}
                      onDragLeave={handleImageDragLeave}
                      onDrop={(e) => handleImageDrop(e, index)}
                      onDragEnd={handleImageDragEnd}
                    >
                      {/* Page number */}
                      <div
                        className={`absolute -top-3 -left-3 ${
                          isDarkMode
                            ? "bg-gradient-to-r from-slate-600 to-slate-500 text-slate-200 border-slate-500/50"
                            : "bg-gradient-to-r from-slate-500 to-slate-600 text-white border-slate-400/50"
                        } text-lg px-4 py-2 rounded-full font-semibold z-30 shadow-lg border animate-pulse`}
                      >
                        {index + 1}
                      </div>

                      {/* Edit indicator */}
                      {image.editedPreview && (
                        <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-2 z-30 shadow-lg animate-bounce">
                          <Edit3 className="h-4 w-4" />
                        </div>
                      )}

                      {/* Drag indicator */}
                      <div
                        className={`absolute top-3 right-3 ${
                          isDarkMode
                            ? "bg-slate-800/70 text-slate-300"
                            : "bg-slate-200/70 text-slate-600"
                        } backdrop-blur-sm rounded-xl p-2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20`}
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>

                      {/* Edit button */}
                      <button
                        onClick={() => openImageEditor(image)}
                        className="absolute top-12 right-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl p-2 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg z-40 transform hover:scale-110"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>

                      {/* Main image */}
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
                      <div
                        className={`absolute inset-0 ${
                          isDarkMode
                            ? "bg-gradient-to-t from-slate-900/60"
                            : "bg-gradient-to-t from-slate-800/60"
                        } via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300`}
                      />

                      {/* Remove button */}
                      <button
                        onClick={() => removeImage(image.id)}
                        className="absolute top-3 right-3 bg-red-600 hover:bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg z-40 transform hover:scale-110"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      {/* Filename */}
                      <div
                        className={`absolute bottom-3 left-3 right-3 ${
                          isDarkMode
                            ? "bg-slate-800/70 border-slate-700/50 text-slate-300"
                            : "bg-slate-200/70 border-slate-300/50 text-slate-700"
                        } backdrop-blur-sm text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 truncate border`}
                      >
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
          <Card className={`${themeClasses.card} backdrop-blur-xl shadow-2xl`}>
            <CardContent className="p-20 text-center">
              <div className="relative mb-10">
                <FileImage
                  className={`mx-auto h-28 w-28 ${themeClasses.text.muted} animate-pulse`}
                />
                <div
                  className={`absolute -top-2 -right-2 w-6 h-6 ${
                    isDarkMode
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600"
                  } rounded-full animate-ping`}
                ></div>
              </div>
              <h3
                className={`text-4xl font-bold ${themeClasses.text.primary} mb-6`}
              >
                Ready to Convert
              </h3>
              <p
                className={`${themeClasses.text.secondary} text-xl max-w-md mx-auto leading-relaxed`}
              >
                Upload your images to begin creating professional PDF documents
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className={`text-center mt-16 ${themeClasses.text.muted}`}>
          <p className="text-lg">
            🔒 Secure client-side processing - your files never leave your
            device
          </p>
        </div>
      </div>

      {/* Image Editor Modal */}
      {editingImage && (
        <CropCanvas
          imageSrc={editingImage.preview}
          onClose={() => setEditingImage(null)}
          onApply={(blob) => {
            const url = URL.createObjectURL(blob);
            setImages((prev) =>
              prev.map((img) =>
                img.id === editingImage.id
                  ? { ...img, editedPreview: url }
                  : img
              )
            );
            setEditingImage(null);
          }}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}
