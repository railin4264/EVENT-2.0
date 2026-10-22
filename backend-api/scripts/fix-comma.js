const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/services/eventIngestion/planetaryCatalog.js');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `    activityType: 'masterclass'
  }
  // =========================================================================`,
  `    activityType: 'masterclass'
  },
  // =========================================================================`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed comma in planetaryCatalog.js');
