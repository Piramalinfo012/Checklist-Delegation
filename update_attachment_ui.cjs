const fs = require("fs");
const path = require("path");

function getReplacement(colName) {
  return `{history["${colName}"] ? (
                                  <a
                                    href={history["${colName}"]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative group block w-14 h-14 rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-all flex-shrink-0"
                                  >
                                    <img
                                      src={
                                        history["${colName}"]
                                      }
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
                                  <span className="text-gray-400">
                                    No attachment
                                  </span>
                                )}`;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith(".jsx")) {
      let content = fs.readFileSync(fullPath, "utf8");
      let changed = false;

      // Regex to match the ternary operator for attachment link
      // {history["col14"] ? ( ... <a ... alt="Attachment" ... </a> ... ) : ( <span ... >No attachment</span> )}
      const regex = /\{history\["([^"]+)"\] \? \([\s\S]*?<a[\s\S]*?alt="Attachment"[\s\S]*?<\/a>\s*\) : \(\s*<span[^>]*>\s*No attachment\s*<\/span>\s*\)\}/g;
      
      content = content.replace(regex, (match, colName) => {
        changed = true;
        return getReplacement(colName);
      });

      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log("Updated", fullPath);
      }
    }
  }
}

processDirectory("./src/pages");
