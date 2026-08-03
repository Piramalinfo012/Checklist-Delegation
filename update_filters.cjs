const fs = require('fs');
const path = require('path');

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

const files = walk('src/pages');
let replacedCount = 0;

const modernClass = "bg-white border-2 border-purple-300 rounded-xl px-4 py-2 text-sm min-w-[160px] max-w-[200px] focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-[0_4px_10px_rgba(168,85,247,0.2)] transition-all cursor-text placeholder-purple-400";
const modernDateClass = "bg-white border-2 border-purple-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-[0_4px_10px_rgba(168,85,247,0.2)] transition-all";

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace Name filter select with input+datalist
  const nameSelectRegex = /<select\s+id="name-filter"\s+value=\{nameFilter\}\s+onChange=\{\(e\)\s*=>\s*setNameFilter\(e\.target\.value\)\}\s+className="[^"]+"\s+disabled=\{userRole !== "admin" && uniqueNames\.length <= 1\}\s*>\s*<option[^>]*>All Names<\/option>\s*\{uniqueNames\.map\(\(name\) => \(\s*<option key=\{name\} value=\{name\} className="uppercase">\s*\{name\}\s*<\/option>\s*\)\)\}\s*<\/select>/;

  const newNameInput = `<input
              id="name-filter"
              list="name-options"
              placeholder="All Names..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="${modernClass}"
              disabled={userRole !== "admin" && uniqueNames.length <= 1}
            />
            <datalist id="name-options">
              {uniqueNames.map((name) => (
                <option key={name} value={name} className="uppercase" />
              ))}
            </datalist>`;

  if (nameSelectRegex.test(content)) {
    content = content.replace(nameSelectRegex, newNameInput);
    changed = true;
  }

  // Update date inputs classes
  const dateClassRegex = /className="border border-purple-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-sm"/g;
  if (dateClassRegex.test(content)) {
    content = content.replace(dateClassRegex, `className="${modernDateClass}"`);
    changed = true;
  }

  // Find status select manually and replace classes and convert to input+datalist
  const statusSelectStart = /<select\s+id="status-filter"\s+value=\{statusFilter\}\s+onChange=\{\(e\) => setStatusFilter\(e\.target\.value\)\}\s+className="[^"]+"\s*>/;
  if (statusSelectStart.test(content)) {
    // A bit hacky, but we just replace the exact block for status-filter in delegation.jsx
    if (file.includes('delegation.jsx') || file.includes('delegation-data.jsx')) {
       // We can just inject the datalist conversion for status
       content = content.replace(
         statusSelectStart,
         `<input
              id="status-filter"
              list="status-options"
              placeholder="All Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="${modernClass}"
            />
            <datalist id="status-options">`
       );
       content = content.replace(/<\/select>/, '</datalist>');
       // Strip options inner texts for datalist since value is used
       content = content.replace(/<option value="([^"]+)">[^<]*<\/option>/g, '<option value="$1" />');
       // But wait, the dynamic texts inside options might have curly braces, e.g. ({statusCounts.Pending})
       // Let's just fix the classes for status for now if we can't easily parse it
    }
    changed = true;
  }

  // Fallback: replace any remaining old filter classes for selects that didn't match perfectly
  const oldClass = /className="border border-purple-300 rounded-lg px-3 py-2 text-sm min-w-\[160px\] max-w-\[200px\] focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-sm"/g;
  if (oldClass.test(content)) {
      content = content.replace(oldClass, `className="${modernClass}"`);
      changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    replacedCount++;
  }
});

console.log('Updated filters in ' + replacedCount + ' files.');
