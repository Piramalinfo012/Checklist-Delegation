const fs = require('fs');
const path = require('path');

const newSpinner = `<div className="relative inline-flex items-center justify-center w-12 h-12 mb-4">
  <div className="absolute inset-0 rounded-full border-4 border-t-purple-600 border-b-purple-600 border-l-transparent border-r-transparent animate-spin shadow-[0_0_15px_rgba(147,51,234,0.5)]"></div>
  <div className="absolute inset-1 rounded-full border-4 border-r-pink-500 border-l-pink-500 border-t-transparent border-b-transparent animate-[spin_1.5s_linear_infinite_reverse] shadow-[0_0_10px_rgba(236,72,153,0.5)]"></div>
  <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(147,51,234,1)]"></div>
</div>`;

const pattern = /<div className="inline-block animate-spin rounded-full h-\d+ w-\d+ border-t-\d+ border-b-\d+ border-purple-500 mb-\d+"><\/div>/g;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('src');
let replacedCount = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (pattern.test(content)) {
    console.log('Replacing in ' + file);
    const newContent = content.replace(pattern, newSpinner);
    fs.writeFileSync(file, newContent);
    replacedCount++;
  }
});

console.log('Replaced in ' + replacedCount + ' files.');
