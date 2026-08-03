const fs = require('fs');

const filePath = 'src/pages/QuickTask.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Optimize fetchCurrentUser
const fetchUserRegex = /try \{\s*setUserLoading\(true\);\s*setError\(null\);\s*const loggedInUsername = sessionStorage\.getItem\('username'\);\s*if \(!loggedInUsername\) \{\s*throw new Error\("No user logged in\. Please log in to access tasks\."\);\s*\}\s*\/\/ Fetch user role from Whatsapp sheet\s*const response = await fetch\(`\$\{CONFIG\.APPS_SCRIPT_URL\}\?action=fetch&sheet=\$\{CONFIG\.WHATSAPP_SHEET\}`\);\s*const data = await response\.json\(\);/m;

const optimizedFetchUser = `try {
      const loggedInUsername = sessionStorage.getItem('username');
      if (!loggedInUsername) {
        throw new Error("No user logged in. Please log in to access tasks.");
      }

      // Check cache first
      const cacheKey = \`whatsapp_user_cache_\${loggedInUsername}\`;
      const cachedDataStr = localStorage.getItem(cacheKey);
      let hasCache = false;
      if (cachedDataStr) {
        try {
          const foundUser = JSON.parse(cachedDataStr);
          setCurrentUser(foundUser.name);
          setUserRole(foundUser.role);
          setUserLoading(false);
          hasCache = true;
        } catch (e) { console.error("Cache error", e); }
      }

      if (!hasCache) {
        setUserLoading(true);
      }
      setError(null);

      // Background fetch
      const response = await fetch(\`\${CONFIG.APPS_SCRIPT_URL}?action=fetch&sheet=\${CONFIG.WHATSAPP_SHEET}\`);
      const data = await response.json();`;

if (content.match(fetchUserRegex)) {
  content = content.replace(fetchUserRegex, optimizedFetchUser);
  console.log("Optimized fetchCurrentUser");
}

// 2. Optimize fetchChecklistData
const fetchChecklistRegex = /try \{\s*setLoading\(true\);\s*\/\/ Fetch from Checklist sheet\s*const response = await fetch\(`\$\{CONFIG\.APPS_SCRIPT_URL\}\?action=fetch&sheet=\$\{CONFIG\.CHECKLIST_SHEET\}`\);\s*const data = await response\.json\(\);/m;

const optimizedFetchChecklist = `try {
      const cacheKey = \`checklist_cache_\${currentUser}\`;
      const cachedDataStr = localStorage.getItem(cacheKey);
      let hasCache = false;
      if (cachedDataStr) {
        try {
          const cachedTasks = JSON.parse(cachedDataStr);
          setTasks(cachedTasks);
          setLoading(false);
          hasCache = true;
        } catch (e) {}
      }

      if (!hasCache) setLoading(true);

      // Background fetch
      const response = await fetch(\`\${CONFIG.APPS_SCRIPT_URL}?action=fetch&sheet=\${CONFIG.CHECKLIST_SHEET}\`);
      const data = await response.json();`;

if (content.match(fetchChecklistRegex)) {
  content = content.replace(fetchChecklistRegex, optimizedFetchChecklist);
  console.log("Optimized fetchChecklistData");
}

// In fetchChecklistData, we need to save to cache where setTasks(filteredData) is called.
const setChecklistTasksRegex = /setTasks\(filteredData\);/g;
// Replace only the first occurrence which should be in fetchChecklistData
let replacedChecklist = false;
content = content.replace(setChecklistTasksRegex, (match) => {
  if (!replacedChecklist) {
    replacedChecklist = true;
    return `setTasks(filteredData);\n        localStorage.setItem(\`checklist_cache_\${currentUser}\`, JSON.stringify(filteredData));`;
  }
  return match;
});

// 3. Optimize fetchDelegationData
const fetchDelegationRegex = /try \{\s*setDelegationLoading\(true\);\s*\/\/ Fetch from Delegation sheet\s*const response = await fetch\(`\$\{CONFIG\.APPS_SCRIPT_URL\}\?action=fetch&sheet=\$\{CONFIG\.DELEGATION_SHEET\}`\);\s*const data = await response\.json\(\);/m;

const optimizedFetchDelegation = `try {
      const cacheKey = \`delegation_cache_\${currentUser}\`;
      const cachedDataStr = localStorage.getItem(cacheKey);
      let hasCache = false;
      if (cachedDataStr) {
        try {
          const cachedTasks = JSON.parse(cachedDataStr);
          setDelegationTasks(cachedTasks);
          setDelegationLoading(false);
          hasCache = true;
        } catch (e) {}
      }

      if (!hasCache) setDelegationLoading(true);

      // Background fetch
      const response = await fetch(\`\${CONFIG.APPS_SCRIPT_URL}?action=fetch&sheet=\${CONFIG.DELEGATION_SHEET}\`);
      const data = await response.json();`;

if (content.match(fetchDelegationRegex)) {
  content = content.replace(fetchDelegationRegex, optimizedFetchDelegation);
  console.log("Optimized fetchDelegationData");
}

// In fetchDelegationData, we need to save to cache where setDelegationTasks(filteredData) is called.
const setDelegationTasksRegex = /setDelegationTasks\(filteredData\);/g;
// Replace only the first occurrence which should be in fetchDelegationData
let replacedDelegation = false;
content = content.replace(setDelegationTasksRegex, (match) => {
  if (!replacedDelegation) {
    replacedDelegation = true;
    return `setDelegationTasks(filteredData);\n        localStorage.setItem(\`delegation_cache_\${currentUser}\`, JSON.stringify(filteredData));`;
  }
  return match;
});

// And don't forget to cache the user in fetchCurrentUser:
// \`setCurrentUser(foundUser.name);\n          setUserRole(foundUser.role);\`
const setUserCacheRegex = /setCurrentUser\(foundUser\.name\);\s*setUserRole\(foundUser\.role\);/;
if (content.match(setUserCacheRegex)) {
  content = content.replace(setUserCacheRegex, `setCurrentUser(foundUser.name);\n          setUserRole(foundUser.role);\n          localStorage.setItem(\`whatsapp_user_cache_\${loggedInUsername}\`, JSON.stringify(foundUser));`);
}

fs.writeFileSync(filePath, content);
console.log("Updated QuickTask.jsx with full caching!");
