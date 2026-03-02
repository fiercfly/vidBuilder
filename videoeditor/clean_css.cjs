const fs = require('fs');
const path = 'C:\\Users\\fierc\\Downloads\\src-org\\src\\component\\videoeditor\\VideoEditor.css';
let content = fs.readFileSync(path, 'utf8');

const mediaIndex = content.lastIndexOf('@media (max-width: 768px)');
if (mediaIndex === -1) {
    console.log('Media query not found!');
    process.exit(1);
}

const desktopCSS = content.substring(0, mediaIndex);
const mobileCSS = content.substring(mediaIndex);

const cleanDesktopCSS = desktopCSS.replace(/\s*!important/g, '');

fs.writeFileSync(path, cleanDesktopCSS + mobileCSS);
console.log('Successfully stripped !important from desktop CSS rules.');
