const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, '../views/admin');

// Regex to find the <a> tag block enclosing 'Aracı Firmalar'
const regex = /<a\s+href="[^"]*"\s+class="nav-item[^"]*">[\s\S]*?<span>Aracı\s+Firmalar<\/span>[\s\S]*?<\/a>/gi;

fs.readdir(adminDir, (err, files) => {
  if (err) {
    console.error('Error reading admin views directory:', err);
    process.exit(1);
  }

  files.forEach(file => {
    if (path.extname(file) === '.html') {
      const filePath = path.join(adminDir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      if (regex.test(content)) {
        content = content.replace(regex, '');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Removed 'Aracı Firmalar' sidebar link from: ${file}`);
      } else {
        // Fallback for different spacing/attributes if any
        const fallbackRegex = /<a\s+[^>]*>[\s\S]*?<i\s+class="[^"]*fa-shopping-cart[^"]*">[\s\S]*?<span>Aracı\s+Firmalar<\/span>[\s\S]*?<\/a>/gi;
        if (fallbackRegex.test(content)) {
          content = content.replace(fallbackRegex, '');
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`✓ Removed 'Aracı Firmalar' sidebar link (fallback) from: ${file}`);
        } else {
          console.log(`- No 'Aracı Firmalar' link found in: ${file}`);
        }
      }
    }
  });
});
