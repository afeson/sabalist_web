/**
 * Favicon Generator Script for Sabalist
 * Uses Sharp to generate all required favicon sizes
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Simple ICO generator - creates multi-resolution ICO from PNG buffers
async function createIco(pngPaths) {
  const buffers = [];

  for (const pngPath of pngPaths) {
    const data = fs.readFileSync(pngPath);
    buffers.push(data);
  }

  // ICO file format header
  const numImages = buffers.length;
  const headerSize = 6 + (numImages * 16);

  // Calculate image data positions
  let dataOffset = headerSize;
  const imageEntries = [];

  for (let i = 0; i < buffers.length; i++) {
    const png = buffers[i];
    // Parse PNG to get dimensions (simplified - assumes standard PNG header)
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);

    imageEntries.push({
      width: width >= 256 ? 0 : width,
      height: height >= 256 ? 0 : height,
      dataSize: png.length,
      dataOffset: dataOffset
    });

    dataOffset += png.length;
  }

  // Build ICO file
  const icoBuffer = Buffer.alloc(dataOffset);
  let offset = 0;

  // ICO header
  icoBuffer.writeUInt16LE(0, offset); offset += 2; // Reserved
  icoBuffer.writeUInt16LE(1, offset); offset += 2; // Type: 1 = ICO
  icoBuffer.writeUInt16LE(numImages, offset); offset += 2; // Number of images

  // Image directory entries
  for (const entry of imageEntries) {
    icoBuffer.writeUInt8(entry.width, offset); offset += 1;
    icoBuffer.writeUInt8(entry.height, offset); offset += 1;
    icoBuffer.writeUInt8(0, offset); offset += 1; // Color palette
    icoBuffer.writeUInt8(0, offset); offset += 1; // Reserved
    icoBuffer.writeUInt16LE(1, offset); offset += 2; // Color planes
    icoBuffer.writeUInt16LE(32, offset); offset += 2; // Bits per pixel
    icoBuffer.writeUInt32LE(entry.dataSize, offset); offset += 4;
    icoBuffer.writeUInt32LE(entry.dataOffset, offset); offset += 4;
  }

  // Image data (PNG format embedded)
  for (const png of buffers) {
    png.copy(icoBuffer, offset);
    offset += png.length;
  }

  return icoBuffer;
}

const SOURCE_IMAGE = path.join(__dirname, '..', 'assets', 'branding', 'sabalist-icon-safe.png');
const OUTPUT_DIR = path.join(__dirname, '..', 'public');

const FAVICON_SIZES = [
  { name: 'favicon-16.png', size: 16 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-48.png', size: 48 },
  { name: 'favicon-96x96.png', size: 96 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'web-app-manifest-192x192.png', size: 192 },
  { name: 'web-app-manifest-512x512.png', size: 512 },
];

async function generateFavicons() {
  console.log('Generating favicons for Sabalist...\n');

  // Check source image exists
  if (!fs.existsSync(SOURCE_IMAGE)) {
    console.error(`ERROR: Source image not found: ${SOURCE_IMAGE}`);
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const generatedFiles = [];

  try {
    // Generate PNG favicons at various sizes
    for (const { name, size } of FAVICON_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, name);
      await sharp(SOURCE_IMAGE)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);

      generatedFiles.push(name);
      console.log(`  Created: ${name} (${size}x${size})`);
    }

    // Generate favicon.ico from the smaller PNGs
    const icoSourceFiles = [
      path.join(OUTPUT_DIR, 'favicon-16.png'),
      path.join(OUTPUT_DIR, 'favicon-32.png'),
      path.join(OUTPUT_DIR, 'favicon-48.png'),
    ];

    const icoBuffer = await createIco(icoSourceFiles);
    const icoPath = path.join(OUTPUT_DIR, 'favicon.ico');
    fs.writeFileSync(icoPath, icoBuffer);
    generatedFiles.push('favicon.ico');
    console.log('  Created: favicon.ico (16x16, 32x32, 48x48)');

    // Clean up temporary ICO source files
    fs.unlinkSync(path.join(OUTPUT_DIR, 'favicon-16.png'));
    fs.unlinkSync(path.join(OUTPUT_DIR, 'favicon-32.png'));
    fs.unlinkSync(path.join(OUTPUT_DIR, 'favicon-48.png'));

    console.log('\n✓ All favicon files generated successfully!');
    console.log('\nFiles created in public/:');
    generatedFiles.filter(f => !f.startsWith('favicon-1') && !f.startsWith('favicon-3') && !f.startsWith('favicon-4')).forEach(f => {
      console.log(`  • ${f}`);
    });

  } catch (error) {
    console.error('ERROR generating favicons:', error.message);
    process.exit(1);
  }
}

generateFavicons();
