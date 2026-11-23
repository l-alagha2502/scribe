/**
 * Pure client-side canvas image manipulation algorithms
 * Runs 100% locally in the browser with zero external network or backend dependencies.
 */

export interface ImageEnhanceOptions {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  vibrance: number; // -100 to 100
  sharpen: boolean;
}

/**
 * Robust Client-Side Background Removal Algorithm:
 * 1. Samples edge and perimeter pixels to identify background color clusters
 * 2. Runs a BFS flood fill strictly starting from the exterior borders inward
 *    (Crucial: Interior pixels sharing background colors are never eaten!)
 * 3. Applies anti-aliased edge feathering on the mask boundary for crisp cutouts
 */
export function removeBackgroundCanvas(
  sourceCanvas: HTMLCanvasElement,
  tolerance: number = 32,
  featherRadius: number = 2
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outCtx = outputCanvas.getContext('2d', { willReadFrequently: true });
  const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });

  if (!outCtx || !srcCtx) return sourceCanvas;

  const srcData = srcCtx.getImageData(0, 0, width, height);
  const data = srcData.data;
  const totalPixels = width * height;

  // 1. Gather perimeter seed samples (corners + outer edges)
  const bgSeeds: [number, number, number][] = [];
  const addSample = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    bgSeeds.push([data[idx], data[idx + 1], data[idx + 2]]);
  };

  // Sample corners
  addSample(0, 0);
  addSample(width - 1, 0);
  addSample(0, height - 1);
  addSample(width - 1, height - 1);

  // Sample outer perimeter edges every few pixels
  const stepX = Math.max(1, Math.floor(width / 30));
  const stepY = Math.max(1, Math.floor(height / 30));
  for (let x = 0; x < width; x += stepX) {
    addSample(x, 0);
    addSample(x, height - 1);
  }
  for (let y = 0; y < height; y += stepY) {
    addSample(0, y);
    addSample(width - 1, y);
  }

  // Calculate average perimeter background color & cluster variance
  let sumR = 0, sumG = 0, sumB = 0;
  for (let i = 0; i < bgSeeds.length; i++) {
    sumR += bgSeeds[i][0];
    sumG += bgSeeds[i][1];
    sumB += bgSeeds[i][2];
  }
  const avgR = sumR / bgSeeds.length;
  const avgG = sumG / bgSeeds.length;
  const avgB = sumB / bgSeeds.length;

  // 2. BFS Flood Fill from exterior perimeter to build background mask
  // 0 = unvisited/subject, 1 = background, 2 = boundary feather zone
  const mask = new Uint8Array(totalPixels);
  const queue: number[] = [];

  const colorDist = (r: number, g: number, b: number, br: number, bg: number, bb: number) => {
    const dr = r - br;
    const dg = g - bg;
    const db = b - bb;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  // Helper to check if pixel color matches background
  const threshold = Math.max(15, tolerance * 2.2);
  const isBgMatch = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];
    if (a < 10) return true; // already transparent

    // Check against average and closest corner seed
    const dAvg = colorDist(r, g, b, avgR, avgG, avgB);
    if (dAvg <= threshold) return true;

    // Check nearest perimeter seeds
    for (let s = 0; s < Math.min(8, bgSeeds.length); s++) {
      if (colorDist(r, g, b, bgSeeds[s][0], bgSeeds[s][1], bgSeeds[s][2]) <= threshold) {
        return true;
      }
    }
    return false;
  };

  // Enqueue all perimeter edge pixels that match background
  for (let x = 0; x < width; x++) {
    const topP = 0 * width + x;
    if (isBgMatch(x, 0)) {
      mask[topP] = 1;
      queue.push(topP);
    }
    const botP = (height - 1) * width + x;
    if (isBgMatch(x, height - 1) && !mask[botP]) {
      mask[botP] = 1;
      queue.push(botP);
    }
  }

  for (let y = 0; y < height; y++) {
    const leftP = y * width + 0;
    if (!mask[leftP] && isBgMatch(0, y)) {
      mask[leftP] = 1;
      queue.push(leftP);
    }
    const rightP = y * width + (width - 1);
    if (!mask[rightP] && isBgMatch(width - 1, y)) {
      mask[rightP] = 1;
      queue.push(rightP);
    }
  }

  // Run BFS
  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);

    // 4-neighborhood
    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ];

    for (let n = 0; n < 4; n++) {
      const nx = neighbors[n][0];
      const ny = neighbors[n][1];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nPos = ny * width + nx;
        if (mask[nPos] === 0) {
          if (isBgMatch(nx, ny)) {
            mask[nPos] = 1;
            queue.push(nPos);
          }
        }
      }
    }
  }

  // 3. Apply mask to alpha channel with anti-aliasing feathering
  const feather = Math.max(1, featherRadius * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = y * width + x;
      const idx = pos * 4;

      if (mask[pos] === 1) {
        // Definite exterior background -> transparent
        data[idx + 3] = 0;
      } else {
        // Interior pixel: check if on the boundary of the background mask for feathering
        let hasBgNeighbor = false;
        let minEdgeDist = 999;

        // Check 8-neighborhood for smooth edge transition
        for (let dy = -featherRadius; dy <= featherRadius; dy++) {
          for (let dx = -featherRadius; dx <= featherRadius; dx++) {
            const checkX = x + dx;
            const checkY = y + dy;
            if (checkX >= 0 && checkX < width && checkY >= 0 && checkY < height) {
              const checkPos = checkY * width + checkX;
              if (mask[checkPos] === 1) {
                hasBgNeighbor = true;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minEdgeDist) minEdgeDist = dist;
              }
            }
          }
        }

        if (hasBgNeighbor && minEdgeDist <= featherRadius) {
          // Soft alpha edge feathering
          const alphaFactor = Math.min(1, Math.max(0, minEdgeDist / (featherRadius + 1)));
          data[idx + 3] = Math.round(data[idx + 3] * alphaFactor);
        }
      }
    }
  }

  outCtx.putImageData(srcData, 0, 0);
  return outputCanvas;
}

/**
 * Object Eraser / Inpainting patch tool:
 * Localized neighborhood blur & sample fill around clicked coordinate
 */
export function eraseAtPoint(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  radius: number = 25
): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const left = Math.max(0, Math.floor(x - radius));
  const top = Math.max(0, Math.floor(y - radius));
  const width = Math.min(canvas.width - left, Math.ceil(radius * 2));
  const height = Math.min(canvas.height - top, Math.ceil(radius * 2));

  if (width <= 0 || height <= 0) return;

  // Sample surrounding border pixels outside radius to synthesize filler
  const sampleRing: [number, number, number, number][] = [];
  const imgData = ctx.getImageData(left, top, width, height);
  const data = imgData.data;

  const sampleMargin = 4;
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const isBorder =
        px < sampleMargin ||
        px >= width - sampleMargin ||
        py < sampleMargin ||
        py >= height - sampleMargin;
      if (isBorder) {
        const idx = (py * width + px) * 4;
        sampleRing.push([data[idx], data[idx + 1], data[idx + 2], data[idx + 3]]);
      }
    }
  }

  if (sampleRing.length === 0) return;

  const avgColor = sampleRing.reduce(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2], acc[3] + p[3]],
    [0, 0, 0, 0]
  );
  const avgR = avgColor[0] / sampleRing.length;
  const avgG = avgColor[1] / sampleRing.length;
  const avgB = avgColor[2] / sampleRing.length;
  const avgA = avgColor[3] / sampleRing.length;

  const cx = radius;
  const cy = radius;
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        const idx = (py * width + px) * 4;
        const blendFactor = Math.pow(dist / radius, 1.2);
        data[idx] = Math.round(data[idx] * blendFactor + avgR * (1 - blendFactor));
        data[idx + 1] = Math.round(data[idx + 1] * blendFactor + avgG * (1 - blendFactor));
        data[idx + 2] = Math.round(data[idx + 2] * blendFactor + avgB * (1 - blendFactor));
        data[idx + 3] = Math.round(data[idx + 3] * blendFactor + avgA * (1 - blendFactor));
      }
    }
  }

  ctx.putImageData(imgData, left, top);
}

/**
 * Image enhancer / filter engine:
 * Adjusts brightness, contrast, saturation, vibrance, and applies sharpening convolution
 */
export function enhanceImageCanvas(
  sourceCanvas: HTMLCanvasElement,
  options: ImageEnhanceOptions
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
  const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!outCtx || !srcCtx) return sourceCanvas;

  const srcData = srcCtx.getImageData(0, 0, width, height);
  const data = srcData.data;

  const brightness = options.brightness * 2.55; // -255 to 255
  const contrastFactor = (259 * (options.contrast + 255)) / (255 * (259 - options.contrast));
  const satFactor = (options.saturation + 100) / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Brightness
    r += brightness;
    g += brightness;
    b += brightness;

    // 2. Contrast
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // 3. Saturation & Vibrance
    const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
    r = gray + satFactor * (r - gray);
    g = gray + satFactor * (g - gray);
    b = gray + satFactor * (b - gray);

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  outCtx.putImageData(srcData, 0, 0);

  // 4. Sharpen convolution kernel if requested
  if (options.sharpen) {
    const sharpData = outCtx.getImageData(0, 0, width, height);
    const sData = sharpData.data;
    const copy = new Uint8ClampedArray(sData);

    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let val = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pIdx = ((y + ky) * width + (x + kx)) * 4 + c;
              const kIdx = (ky + 1) * 3 + (kx + 1);
              val += copy[pIdx] * kernel[kIdx];
            }
          }
          const outIdx = (y * width + x) * 4 + c;
          sData[outIdx] = Math.max(0, Math.min(255, val));
        }
      }
    }
    outCtx.putImageData(sharpData, 0, 0);
  }

  return outCanvas;
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
