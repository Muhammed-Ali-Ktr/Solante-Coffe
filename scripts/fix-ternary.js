const fs = require('fs');
const file = 'public/js/main.js';
let s = fs.readFileSync(file, 'utf8');

s = s.replace(
  `: chefPickProduct
              ? ''
            : \`<div class="menu-item"`,
  `: chefPickProduct
              ? ''
              : \`<motion class="menu-item"`
);

s = s.replace(
  `               </div>\`
        }
      </motion>`,
  `               </div>\`)
        }
      </div>`
);

// fix motion back to div in the replacements above
s = s.replace('<motion class="menu-item"', '<div class="menu-item"');

fs.writeFileSync(file, s);
console.log('fixed', s.includes('</div>`)'));
