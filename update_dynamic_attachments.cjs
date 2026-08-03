const fs = require("fs");
const path = require("path");

const replacement = `{header.id === 'col14' ? (
                                history[header.id] ? (
                                  <a
                                    href={history[header.id]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative group block w-14 h-14 rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-all flex-shrink-0"
                                  >
                                    <img
                                      src={history[header.id]}
                                      alt="Attachment"
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "https://cdn-icons-png.flaticon.com/512/2965/2965306.png";
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                                      <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                                      </div>
                                    </div>
                                  </a>
                                ) : (
                                  <span className="text-gray-400">No attachment</span>
                                )
                              ) : (
                                <div className="text-sm text-gray-900">
                                  {history[header.id] || '—'}
                                </div>
                              )}`;

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith(".jsx")) {
      let content = fs.readFileSync(fullPath, "utf8");
      
      const targetStr = `<div className="text-sm text-gray-900">\n                                {history[header.id] || '—'}\n                              </div>`;
      
      // We will replace all occurrences in files that use the dynamic mapping pattern
      if (content.includes("sheetHeaders.slice") && content.includes(targetStr)) {
        content = content.split(targetStr).join(replacement);
        fs.writeFileSync(fullPath, content);
        console.log("Updated", fullPath);
      } else {
        // Just in case line endings differ
        const regex = /<div className="text-sm text-gray-900">\s*\{history\[header\.id\] \|\| '—'\}\s*<\/div>/g;
        if (content.match(regex) && content.includes("sheetHeaders.slice")) {
          content = content.replace(regex, replacement);
          fs.writeFileSync(fullPath, content);
          console.log("Updated via regex", fullPath);
        }
      }
    }
  }
}

processDirectory("./src/pages/admin");
