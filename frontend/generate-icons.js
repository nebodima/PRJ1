// Скрипт для генерации иконок PWA из SVG
// Использует sharp для конвертации SVG в PNG разных размеров

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = path.join(__dirname, 'public', 'icon.svg');
const outputDir = path.join(__dirname, 'public');

async function generateIcons() {
  try {
    const svgBuffer = fs.readFileSync(svgPath);

    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Создана иконка: icon-${size}x${size}.png`);
    }

    console.log('\n✓ Все иконки успешно созданы!');
  } catch (error) {
    console.error('✗ Ошибка при генерации иконок:', error.message);
  }
}

generateIcons();

