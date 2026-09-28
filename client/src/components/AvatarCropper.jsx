import React, { useEffect, useRef, useState } from "react";

const AvatarCropper = ({ file, onCancel, onConfirm }) => {
  const imageRef = useRef(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [imageReady, setImageReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const isImage = file?.type.startsWith("image/");

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setImageReady(false);
  }, [file]);

  if (!file) return null;

  const handlePointerDown = (event) => {
    if (!isImage) return;
    setDragging(true);
    dragStart.current = {
      x: event.clientX - offset.x,
      y: event.clientY - offset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragging || !dragStart.current) return;
    setOffset({
      x: event.clientX - dragStart.current.x,
      y: event.clientY - dragStart.current.y,
    });
  };

  const finishDrag = () => {
    setDragging(false);
    dragStart.current = null;
  };

  const confirmCrop = () => {
    if (!isImage) {
      onConfirm(file);
      return;
    }

    const image = imageRef.current;
    const previewSize = 320;
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    const scale =
      Math.max(
        previewSize / image.naturalWidth,
        previewSize / image.naturalHeight,
      ) * zoom;
    const drawnWidth = image.naturalWidth * scale;
    const drawnHeight = image.naturalHeight * scale;
    const outputScale = size / previewSize;
    const x = (size - drawnWidth * outputScale) / 2 + offset.x * outputScale;
    const y = (size - drawnHeight * outputScale) / 2 + offset.y * outputScale;
    context.drawImage(
      image,
      x,
      y,
      drawnWidth * outputScale,
      drawnHeight * outputScale,
    );
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const extension = file.type === "image/png" ? "png" : "jpg";
        onConfirm(
          new File([blob], `profile-picture.${extension}`, { type: file.type }),
        );
      },
      file.type,
      file.type === "image/jpeg" ? 0.98 : undefined,
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0f1e35]/70 p-4">
      <div className="w-full max-w-md rounded-[24px] bg-[#f8faf8] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-navy">
              Profile preview
            </h2>
            <p className="text-xs text-navy/65">
              {isImage
                ? "Drag the image and adjust the crop before uploading."
                : "Preview the selected PDF before uploading."}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary px-3 py-2 text-sm"
          >
            Cancel
          </button>
        </div>

        <div
          className={`relative mx-auto flex aspect-square w-full max-w-[320px] items-center justify-center overflow-hidden rounded-2xl bg-[#dfeae3] ${isImage ? "cursor-move" : ""}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          {isImage ? (
            <img
              ref={imageRef}
              src={sourceUrl}
              alt="Profile crop preview"
              onLoad={() => setImageReady(true)}
              draggable="false"
              className="pointer-events-none absolute max-w-none select-none"
              style={{
                width: imageReady
                  ? `${imageRef.current.naturalWidth * Math.max(320 / imageRef.current.naturalWidth, 320 / imageRef.current.naturalHeight) * zoom}px`
                  : "320px",
                transform: `translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          ) : (
            <iframe
              title="Profile PDF preview"
              src={sourceUrl}
              className="h-full w-full border-0"
            />
          )}
        </div>

        {isImage && (
          <label className="mt-4 block text-sm font-semibold text-navy">
            Zoom
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="mt-2 w-full accent-[#0b5d3d]"
            />
          </label>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmCrop}
            disabled={isImage && !imageReady}
            className="btn-primary px-4 py-2 text-sm"
          >
            {isImage && !imageReady ? "Loading Preview..." : "Use This File"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarCropper;
