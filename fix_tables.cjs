const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const filesToFix = [
  'src/pages/admin/SalesDataPage.jsx',
  'src/pages/admin/ware-house-data.jsx',
  'src/pages/admin/managingDirector-data-page.jsx',
  'src/pages/admin/account-data-page.jsx',
  'src/pages/delegation.jsx'
];

function getSafeReplacement(colName) {
  return `{history["${colName}"] ? (
                                  <a
                                    href={history["${colName}"]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative group block w-14 h-14 rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-all flex-shrink-0"
                                  >
                                    <img
                                      src={history["${colName}"]}
                                      alt="Attachment"
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        const url = history["${colName}"] || "";
                                        if (url.match(/\\.pdf|\\.doc|\\.xls|\\.csv|\\.txt|\\.zip|\\.rar/i)) {
                                          e.target.src = "https://img.icons8.com/color/48/document--v1.png";
                                        } else {
                                          e.target.src = "https://img.icons8.com/color/48/image.png";
                                        }
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

for (const file of filesToFix) {
  console.log("Fixing", file);
  // Get original file from HEAD
  const originalContent = cp.execSync(`git show HEAD:${file}`).toString();
  const currentContent = fs.readFileSync(file, 'utf8');

  // Find the exact attachment block in the original file
  // It looks like {history["col14"] ? ( ... alt="Attachment" ... ) : ( ... No attachment ... )}
  // We can use a more constrained regex on the ORIGINAL file to find the exact block for col14
  
  // Actually, we can just find the index of 'alt="Attachment"' in the original file, and expand outwards to find the full ternary expression.
  const altIdx = originalContent.indexOf('alt="Attachment"');
  if (altIdx === -1) {
    console.log("alt=Attachment not found in original", file);
    continue;
  }
  
  // Find the start of the block `{history["col14"] ? (`
  let blockStart = -1;
  let colName = "";
  for (let i = altIdx; i >= 0; i--) {
    if (originalContent.substring(i, i + 10) === '{history["') {
      blockStart = i;
      const match = originalContent.substring(i).match(/^\{history\["([^"]+)"\] \? \(/);
      if (match) {
        colName = match[1];
        break;
      }
    }
  }

  // Find the end of the block `No attachment` and its closing `)}`
  let blockEnd = -1;
  const noAttIdx = originalContent.indexOf('No attachment', altIdx);
  if (noAttIdx !== -1) {
    const endStr = ')}';
    blockEnd = originalContent.indexOf(endStr, noAttIdx) + endStr.length;
  }

  if (blockStart !== -1 && blockEnd !== -1) {
    const originalBlock = originalContent.substring(blockStart, blockEnd);
    
    // Now, in the CURRENT file, we have a mangled block.
    // The mangled block started by matching {history["col6"] ? ( or something similar.
    // Since the bug was caused by the regex: 
    // /\{history\["([^"]+)"\] \? \([\s\S]*?<a[\s\S]*?alt="Attachment"[\s\S]*?<\/a>\s*\) : \(\s*<span[^>]*>\s*No attachment\s*<\/span>\s*\)\}/g
    
    // We can run the same buggy regex on the ORIGINAL content to see exactly what was replaced!
    const buggyRegex = /\{history\["([^"]+)"\] \? \([\s\S]*?<a[\s\S]*?alt="Attachment"[\s\S]*?<\/a>\s*\) : \(\s*<span[^>]*>\s*No attachment\s*<\/span>\s*\)\}/g;
    let originalMangledBlock = "";
    let buggyColName = "";
    originalContent.replace(buggyRegex, (match, col) => {
      originalMangledBlock = match;
      buggyColName = col;
      return match; // don't change
    });
    
    if (originalMangledBlock) {
      // Find the replacement string that our buggy script generated
      // Wait, in update_icons.cjs, we also modified it.
      // Let's just find the exact text in currentContent that replaced originalMangledBlock
      
      // Since it's hard to guess what it looks like now, let's just find where it starts and ends in currentContent.
      const prefix = originalContent.substring(blockStart - 100, blockStart);
      const prefixStart = originalContent.substring(originalContent.indexOf(originalMangledBlock) - 100, originalContent.indexOf(originalMangledBlock));
      
      // We will look for prefixStart in currentContent.
      const currentStart = currentContent.indexOf(prefixStart);
      if (currentStart !== -1) {
        const replaceStartIdx = currentStart + prefixStart.length;
        
        // Find the suffix after the mangled block in original
        const suffix = originalContent.substring(originalContent.indexOf(originalMangledBlock) + originalMangledBlock.length, originalContent.indexOf(originalMangledBlock) + originalMangledBlock.length + 100);
        const currentEnd = currentContent.indexOf(suffix, replaceStartIdx);
        
        if (currentEnd !== -1) {
          // Now we have the exact broken chunk in currentContent: from replaceStartIdx to currentEnd
          
          // We want to replace it with the ORIGINAL originalMangledBlock, BUT with the col14 attachment block upgraded.
          
          // First, take originalMangledBlock and upgrade the attachment part inside it.
          // Wait, originalMangledBlock spans from col6 to col14.
          // If we take originalMangledBlock, and replace originalBlock (which is just col14) with getSafeReplacement(colName),
          // we get the PERFECT fixed chunk!
          
          const fixedMangledBlock = originalMangledBlock.replace(originalBlock, getSafeReplacement(colName));
          
          const newContent = currentContent.substring(0, replaceStartIdx) + fixedMangledBlock + currentContent.substring(currentEnd);
          
          fs.writeFileSync(file, newContent);
          console.log("Successfully fixed", file);
        } else {
          console.log("Suffix not found in current for", file);
        }
      } else {
        console.log("Prefix not found in current for", file);
      }
    }
  }
}
