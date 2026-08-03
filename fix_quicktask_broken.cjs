const fs = require('fs');

const filePath = 'src/pages/QuickTask.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetString = `    PAGE_CONFIG: {
      title: "Task Management",
      description: "Showing your tasks"

        // Skip header row and search for user`;

const replacementString = `    PAGE_CONFIG: {
      title: "Task Management",
      description: "Showing your tasks"
    }
  };

  // Auto-detect current user from login session and get role from Whatsapp sheet
  const fetchCurrentUser = useCallback(async () => {
    try {
      // Get user data from your login system (sessionStorage)
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

      // Background fetch
      const response = await fetch(\`\${CONFIG.APPS_SCRIPT_URL}?action=fetch&sheet=\${CONFIG.WHATSAPP_SHEET}\`);
      const data = await response.json();

      if (data?.table?.rows) {
        let foundUser = null;

        // Skip header row and search for user`;

if (content.includes(targetString)) {
  content = content.replace(targetString, replacementString);
  fs.writeFileSync(filePath, content);
  console.log("Restored and optimized fetchCurrentUser successfully!");
} else {
  console.log("Could not find the exact broken string. Target string:");
  console.log(targetString);
}
