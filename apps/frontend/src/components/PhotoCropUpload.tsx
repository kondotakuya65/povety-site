"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";

type PhotoCropUploadProps = {
  value: File | null;
  onChange: (file: File | null) => void;
  onError: (message: string | null) => void;
};

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

async function croppedFile(source: string, crop: Area, name: string): Promise<File> {
  const image = new Image();
  image.src = source;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not read this image"));
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.min(crop.width, 1600);
  canvas.height = Math.round(canvas.width * (crop.height / crop.width));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image cropping is not supported in this browser");
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!blob) throw new Error("Could not crop this image");
  const baseName = name.replace(/\.[^.]+$/, "") || "request-photo";
  return new File([blob], `${baseName}-cropped.jpg`, { type: "image/jpeg" });
}

export default function PhotoCropUpload({
  value,
  onChange,
  onError,
}: PhotoCropUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("request-photo.jpg");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPixels, setCropPixels] = useState<Area | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source);
    },
    [source],
  );

  function select(file: File | undefined) {
    onError(null);
    if (!file) return;
    if (!ACCEPTED_TYPES.has(file.type)) {
      onError("Photo must be JPEG, PNG, or WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      onError("Photo must be 5MB or smaller.");
      return;
    }
    if (source) URL.revokeObjectURL(source);
    setSource(URL.createObjectURL(file));
    setSourceName(file.name);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropPixels(null);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    select(event.dataTransfer.files[0]);
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    select(event.target.files?.[0]);
    event.target.value = "";
  }

  async function applyCrop() {
    if (!source || !cropPixels) return;
    setBusy(true);
    onError(null);
    try {
      const file = await croppedFile(source, cropPixels, sourceName);
      if (file.size > MAX_BYTES) throw new Error("Cropped photo is larger than 5MB.");
      onChange(file);
      URL.revokeObjectURL(source);
      setSource(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not crop this image.");
    } finally {
      setBusy(false);
    }
  }

  if (source) {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="relative h-80 bg-ink">
          <Cropper
            image={source}
            crop={crop}
            zoom={zoom}
            aspect={4 / 3}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setCropPixels(pixels)}
            showGrid
          />
        </div>
        <div className="space-y-4 p-4">
          <label className="block text-sm font-medium text-ink">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="mt-2 w-full accent-brand"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy || !cropPixels}
              onClick={applyCrop}
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
            >
              {busy ? "Cropping…" : "Use cropped photo"}
            </button>
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(source);
                setSource(null);
              }}
              className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink-muted hover:border-brand"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onInput}
        className="sr-only"
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`group relative flex min-h-56 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition ${
          dragging
            ? "border-brand bg-brand-soft"
            : "border-line bg-brand-mist/60 hover:border-brand hover:bg-brand-soft/50"
        }`}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Cropped request preview" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
            <div className="relative mt-auto flex w-full items-center justify-between p-4 text-white">
              <span className="text-sm font-semibold">Photo ready</span>
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs backdrop-blur">Replace & crop</span>
            </div>
          </>
        ) : (
          <div className="px-6 py-10 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
              </svg>
            </span>
            <p className="mt-4 font-semibold text-ink">Drop a photo here, or browse</p>
            <p className="mt-1 text-sm text-ink-muted">JPEG, PNG or WebP · up to 5MB</p>
            <p className="mt-3 text-xs text-brand">Optional — we’ll use the Prosperax default if skipped</p>
          </div>
        )}
      </div>
      {value ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-2 text-sm text-danger hover:underline"
        >
          Remove photo
        </button>
      ) : null}
    </div>
  );
}
