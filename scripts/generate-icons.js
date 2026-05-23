const sharp = require('sharp');
const path = require('path');

const assets = path.join(__dirname, '../assets');

// 다크 배경 + 골드 텍스트 느낌의 SVG 아이콘
function makeSvg(size) {
  const fontSize = Math.floor(size * 0.45);
  const subSize = Math.floor(size * 0.13);
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#0A0A0A"/>
    <rect x="${size*0.08}" y="${size*0.08}" width="${size*0.84}" height="${size*0.84}" rx="${size*0.12}" fill="#141414"/>
    <text x="50%" y="52%" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle" fill="#C9A84C" font-family="serif">🌃</text>
    <text x="50%" y="82%" font-size="${subSize}" text-anchor="middle" dominant-baseline="middle" fill="#C9A84C" font-family="sans-serif" font-weight="bold" letter-spacing="2">LT</text>
  </svg>`;
}

async function generate() {
  const sizes = [
    { name: 'icon.png', size: 1024 },
    { name: 'adaptive-icon.png', size: 1024 },
    { name: 'splash-icon.png', size: 512 },
    { name: 'favicon.png', size: 64 },
  ];

  for (const { name, size } of sizes) {
    const svg = Buffer.from(makeSvg(size));
    await sharp(svg).png().toFile(path.join(assets, name));
    console.log(`✓ ${name} (${size}x${size})`);
  }
  console.log('\n아이콘 생성 완료!');
}

generate().catch(console.error);
