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
  Sparkles,
  Zap,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useMobile } from "@/hooks/use-mobile";
import CropCanvas from "./crop-canvas";

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
        />
      )}
    </div>
  );
}
