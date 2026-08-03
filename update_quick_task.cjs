const fs = require('fs');

const filePath = 'src/pages/QuickTask.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state variable
// We can search for `const [nameFilter, setNameFilter] = useState('');`
const stateRegex = /const \[nameFilter, setNameFilter\] = useState\(''\);/;
if (content.match(stateRegex)) {
  content = content.replace(stateRegex, `const [nameFilter, setNameFilter] = useState('');\n  const [nameSearchTerm, setNameSearchTerm] = useState('');`);
  console.log("Added state variable");
} else {
  console.log("Could not find where to add state variable");
}

// 2. Add input box inside the name filter dropdown
// We can search for `{dropdownOpen.name && (`
const dropdownRegex = /\{dropdownOpen\.name && \(\s*<div className="absolute z-50 mt-1 w-56 rounded-md bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto">\s*<div className="py-1">/;

const newDropdown = `{dropdownOpen.name && (
                  <div className="absolute z-50 mt-1 w-56 rounded-md bg-white shadow-lg border border-gray-200 max-h-60 flex flex-col">
                    <div className="p-2 border-b border-gray-100 flex-shrink-0 bg-white sticky top-0 z-10">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
                        <input
                          type="text"
                          placeholder="Type name..."
                          value={nameSearchTerm}
                          onChange={(e) => setNameSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 bg-gray-50 hover:bg-white transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="py-1 overflow-y-auto">`;

if (content.match(dropdownRegex)) {
  content = content.replace(dropdownRegex, newDropdown);
  console.log("Replaced dropdown container");
} else {
  console.log("Could not find dropdown container");
}

// 3. Update the map function
// `{currentNames.map((name) => (`
// needs to be `{currentNames.filter(n => n.toLowerCase().includes(nameSearchTerm.toLowerCase())).map((name) => (`
const mapRegex = /\{currentNames\.map\(\(name\) => \(/;
if (content.match(mapRegex)) {
  content = content.replace(mapRegex, `{currentNames.filter(n => n.toLowerCase().includes(nameSearchTerm.toLowerCase())).map((name) => (`);
  console.log("Replaced map function");
} else {
  console.log("Could not find map function");
}

fs.writeFileSync(filePath, content);
console.log("Updated QuickTask.jsx");
