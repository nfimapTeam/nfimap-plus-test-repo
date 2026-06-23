const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function optimizeSvgEmbeddedImages(svgPath) {
  console.log(`Optimizing ${svgPath}...`);
  let content = fs.readFileSync(svgPath, 'utf8');
  
  // Find all xlink:href="data:image/png;base64,..." or href="data:image/png;base64,..."
  // We can use a regex with a capture group for the base64 part
  const regex = /(xlink:href|href)="data:image\/png;base64,([^"]+)"/g;
  let match;
  const matches = [];
  
  while ((match = regex.exec(content)) !== null) {
    matches.push({
      fullMatch: match[0],
      attributeName: match[1],
      base64Data: match[2]
    });
  }
  
  console.log(`Found ${matches.length} embedded PNG images in ${path.basename(svgPath)}`);
  
  let newContent = content;
  for (let i = 0; i < matches.length; i++) {
    const matchObj = matches[i];
    const buffer = Buffer.from(matchObj.base64Data, 'base64');
    
    // Get metadata to determine size
    const metadata = await sharp(buffer).metadata();
    const origWidth = metadata.width;
    const newWidth = Math.round(origWidth / 2);
    
    console.log(`  Image ${i}: original size ${origWidth}x${metadata.height}, compressing/resizing to ${newWidth}px wide WebP...`);
    
    const webpBuffer = await sharp(buffer)
      .resize({ width: newWidth })
      .webp({ quality: 75 })
      .toBuffer();
    
    const webpBase64 = webpBuffer.toString('base64');
    const replacement = `${matchObj.attributeName}="data:image/webp;base64,${webpBase64}"`;
    
    // Replace this specific match in newContent
    newContent = newContent.replace(matchObj.fullMatch, replacement);
    console.log(`  Image ${i} optimized. Old base64 len: ${matchObj.base64Data.length}, New base64 len: ${webpBase64.length}`);
  }
  
  fs.writeFileSync(svgPath, newContent, 'utf8');
  console.log(`Saved optimized SVG to ${svgPath}. New size: ${fs.statSync(svgPath).size} bytes (was ${content.length} bytes)\n`);
}

async function run() {
  const publicDir = path.join(__dirname, '..', 'public', 'image');
  const svgSave = path.join(publicDir, 'Final_UI_save.svg');
  const svgShare = path.join(publicDir, 'Final_UI_share.svg');
  
  await optimizeSvgEmbeddedImages(svgSave);
  await optimizeSvgEmbeddedImages(svgShare);
}

run().catch(console.error);
