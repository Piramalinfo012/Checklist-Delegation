const fs = require('fs');

const filePath = 'src/pages/QuickTask.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /try \{\s*setUserLoading\(true\);\s*setError\(null\);\s*const loggedInUsername = sessionStorage\.getItem\('username'\);\s*if \(!loggedInUsername\) \{\s*throw new Error\("No user logged in\. Please log in to access tasks\."\);\s*\}\s*\/\/ Fetch user role from Whatsapp sheet/m;

const replacement = `try {
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
          setUserLoading(false); // unlock subsequent fetches instantly
          hasCache = true;
        } catch (e) { console.error("Cache error", e); }
      }

      if (!hasCache) {
        setUserLoading(true);
      }
      setError(null);

      // Fetch user role from Whatsapp sheet`;

if (content.match(regex)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content);
  console.log("Optimized fetchCurrentUser successfully");
} else {
  console.log("Failed to match fetchCurrentUser regex");
}
