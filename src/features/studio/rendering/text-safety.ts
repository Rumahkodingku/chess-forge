import type {
  CanvasSettings,
  TextOverlay,
} from "@/features/studio/scene/scene.types";

const SAFE_HORIZONTAL = 0.07;
const SAFE_VERTICAL = 0.06;
const MAX_LINES = 4;

interface TextBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  lines: number;
}

function boundsForOverlay(
  overlay: TextOverlay,
  canvas: CanvasSettings,
): TextBounds {
  const scale = Math.min(canvas.width / 1080, canvas.height / 1920);
  const fontSize = overlay.fontSize * scale;
  const safeLeft = canvas.width * SAFE_HORIZONTAL;
  const safeRight = canvas.width * (1 - SAFE_HORIZONTAL);
  const safeTop = canvas.height * SAFE_VERTICAL;
  const safeBottom = canvas.height * (1 - SAFE_VERTICAL);
  const safeWidth = safeRight - safeLeft;
  const safeHeight = safeBottom - safeTop;
  const maxWidth = safeWidth * (overlay.maxWidth / 100);
  const estimatedWidth = overlay.text.length * fontSize * 0.55;
  const lines = Math.max(1, Math.ceil(estimatedWidth / maxWidth));
  const width = Math.min(estimatedWidth, maxWidth);
  const height = lines * fontSize * 1.25;
  const offsetX = (overlay.x / 100) * safeWidth;
  const offsetY = (overlay.y / 100) * safeHeight;

  let left = safeLeft;
  if (overlay.align === "center") left = safeLeft + (safeWidth - width) / 2;
  if (overlay.align === "right") left = safeRight - width;

  let top = safeTop;
  if (overlay.position === "bottom") {
    top = safeBottom - height - offsetY;
  } else if (overlay.position === "center") {
    top = safeTop + (safeHeight - height) / 2 + offsetY;
  } else if (overlay.position === "left" || overlay.position === "right") {
    top = safeTop + (safeHeight - height) / 2 + offsetY;
  } else {
    top = safeTop + offsetY;
  }

  if (overlay.position === "left") {
    left = safeLeft + offsetX;
  } else if (overlay.position === "right") {
    left = safeRight - width - offsetX;
  } else if (overlay.align === "right") {
    left -= offsetX;
  } else {
    left += offsetX;
  }

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    lines,
  };
}

export function validateTextOverlays(
  overlays: TextOverlay[],
  canvas: CanvasSettings,
): string[] {
  const warnings: string[] = [];
  const safeLeft = canvas.width * SAFE_HORIZONTAL;
  const safeRight = canvas.width * (1 - SAFE_HORIZONTAL);
  const safeTop = canvas.height * SAFE_VERTICAL;
  const safeBottom = canvas.height * (1 - SAFE_VERTICAL);

  for (const overlay of overlays) {
    const bounds = boundsForOverlay(overlay, canvas);
    if (bounds.lines > MAX_LINES) {
      warnings.push(
        `Overlay ${overlay.id} needs more than four lines and may be clipped.`,
      );
    }
    if (
      bounds.left < safeLeft - 0.5 ||
      bounds.right > safeRight + 0.5 ||
      bounds.top < safeTop - 0.5 ||
      bounds.bottom > safeBottom + 0.5
    ) {
      warnings.push(
        `Overlay ${overlay.id} may leave the safe area. Reduce its text, size, or offset.`,
      );
    }
  }

  return warnings;
}

export { MAX_LINES, SAFE_HORIZONTAL, SAFE_VERTICAL };
