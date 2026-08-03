const fs = require('fs');

const filePath = 'src/pages/QuickTask.jsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /localStorage\.setItem\(`checklist_cache_\${currentUser}`, JSON\.stringify\(filteredData\)\);/g,
  `try { localStorage.setItem(\`checklist_cache_\${currentUser}\`, JSON.stringify(filteredData)); } catch(e) { console.warn('Cache full'); }`
);

content = content.replace(
  /localStorage\.setItem\(`delegation_cache_\${currentUser}`, JSON\.stringify\(filteredData\)\);/g,
  `try { localStorage.setItem(\`delegation_cache_\${currentUser}\`, JSON.stringify(filteredData)); } catch(e) { console.warn('Cache full'); }`
);

content = content.replace(
  /localStorage\.setItem\(`whatsapp_user_cache_\${loggedInUsername}`, JSON\.stringify\(foundUser\)\);/g,
  `try { localStorage.setItem(\`whatsapp_user_cache_\${loggedInUsername}\`, JSON.stringify(foundUser)); } catch(e) { console.warn('Cache full'); }`
);

fs.writeFileSync(filePath, content);
console.log("Wrapped localStorage.setItem in try-catch in QuickTask.jsx");
