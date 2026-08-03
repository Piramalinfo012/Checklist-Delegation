const fs = require("fs");
const path = require("path");

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith(".jsx")) {
      let content = fs.readFileSync(fullPath, "utf8");
      let changed = false;

      // 1. Replace accept="image/*" with accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
      const acceptRegex = /accept="image\/\*"/g;
      if (content.match(acceptRegex)) {
        content = content.replace(acceptRegex, `accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"`);
        changed = true;
      }

      // 2. Fix the fallback icon logic for both hardcoded (col14) and dynamic (header.id)
      
      // Match the hardcoded col14 ones
      const oldOnErrorHardcoded = /onError=\{\(e\) => \{\s*e\.target\.onerror = null;\s*e\.target\.src = "https:\/\/cdn-icons-png\.flaticon\.com\/512\/2965\/2965306\.png";\s*\}\}/g;
      if (content.match(oldOnErrorHardcoded)) {
        content = content.replace(oldOnErrorHardcoded, `onError={(e) => {
                                        e.target.onerror = null;
                                        const url = history["col14"] || "";
                                        if (url.match(/\\.pdf|\\.doc|\\.xls|\\.csv|\\.txt|\\.zip|\\.rar/i)) {
                                          e.target.src = "https://img.icons8.com/color/48/document--v1.png";
                                        } else {
                                          e.target.src = "https://img.icons8.com/color/48/image.png";
                                        }
                                      }}`);
        changed = true;
      }

      // Match the dynamic header.id ones
      const oldOnErrorDynamic = /onError=\{\(e\) => \{\s*e\.target\.onerror = null;\s*e\.target\.src = "https:\/\/cdn-icons-png\.flaticon\.com\/512\/2965\/2965306\.png";\s*\}\}/g;
      // Wait, the regex is the same! But the variable is history[header.id].
      // Let's replace by looking for the history[] variable from context, or just replace both.
      // Actually, since the regex is identical, I will just write a custom replace that checks the surrounding text to know if it's col14 or header.id.
      
      const iconReplaceRegex = /<img\s*src=\{history\[([^\]]+)\]\}\s*alt="Attachment"\s*className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"\s*onError=\{\(e\) => \{\s*e\.target\.onerror = null;\s*e\.target\.src = "https:\/\/cdn-icons-png\.flaticon\.com\/512\/2965\/2965306\.png";\s*\}\}\s*\/>/g;
      
      if (content.match(iconReplaceRegex)) {
        content = content.replace(iconReplaceRegex, (match, key) => {
          return `<img
                                      src={history[${key}]}
                                      alt="Attachment"
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        const url = history[${key}] || "";
                                        if (url.match(/\\.pdf|\\.doc|\\.xls|\\.csv|\\.txt|\\.zip|\\.rar/i)) {
                                          e.target.src = "https://img.icons8.com/color/48/document--v1.png";
                                        } else {
                                          e.target.src = "https://img.icons8.com/color/48/image.png";
                                        }
                                      }}
                                    />`;
        });
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log("Updated", fullPath);
      }
    }
  }
}

processDirectory("./src/pages");
