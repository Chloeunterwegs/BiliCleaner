const fs = require('fs');
const sharp = require('sharp');

const sizes = [16, 48, 128];
const svgContent = `
<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="24" fill="#FB7299"/>
  <path d="M32 40H96V88H32V40Z" fill="white" stroke="white" stroke-width="4"/>
  <rect x="44" y="52" width="40" height="4" rx="2" fill="#FB7299"/>
  <rect x="44" y="64" width="40" height="4" rx="2" fill="#FB7299"/>
  <rect x="44" y="76" width="40" height="4" rx="2" fill="#FB7299"/>
</svg>
`;

// 保存 SVG 文件
fs.writeFileSync('icons/icon.svg', svgContent);

// 生成不同尺寸的 PNG
sizes.forEach(size => {
  sharp(Buffer.from(svgContent))
    .resize(size, size)
    .png()
    .toFile(`icons/icon${size}.png`);
}); 