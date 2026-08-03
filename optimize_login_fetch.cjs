const fs = require('fs');

const filePath = 'src/pages/LoginPage.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find the fetchMasterData function block
const fetchMasterDataRegex = /const fetchMasterData = async \(\) => \{[\s\S]*?fetchMasterData\(\);\s*\}, \[\]\);/;

const newFetchMasterData = `const fetchMasterData = async () => {
      const SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbyAy98t3XAyRP3pFE7XOoDiTDU3Yc9WOIFayRXELW2XnUAzl7yE9bnO94GvZV0wJkH_/exec";

      // 1. Try to load from cache first for instant UI response
      const cachedDataStr = localStorage.getItem("masterDataCache");
      let hasCache = false;
      if (cachedDataStr) {
        try {
          const cachedData = JSON.parse(cachedDataStr);
          setMasterData(cachedData);
          setIsDataLoading(false); // Enable login button immediately
          hasCache = true;
        } catch (e) {
          console.error("Failed to parse cache", e);
        }
      }

      try {
        if (!hasCache) {
          setIsDataLoading(true); // Only show spinner if no cache exists
        }

        // Fetch data using Apps Script Web App to avoid CORS issues (Background update)
        const response = await fetch(\`\${SCRIPT_URL}?action=fetch&sheet=master\`);
        const data = await response.json();

        // Create userCredentials and userRoles objects from the sheet data
        const userCredentials = {};
        const userRoles = {};
        const userEmails = {};

        // Process the data rows (skip header row if it exists)
        if (data.table && data.table.rows) {
          for (let i = 1; i < data.table.rows.length; i++) {
            const row = data.table.rows[i];
            const username = row.c[2]
              ? String(row.c[2].v || "")
                .trim()
                .toLowerCase()
              : "";
            const password = row.c[3] ? String(row.c[3].v || "").trim() : "";
            const role = row.c[4] ? String(row.c[4].v || "").trim() : "user";
            const email = row.c[5] ? String(row.c[5].v || "").trim() : "";

            if (username && password && password.trim() !== "") {
              if (isInactiveRole(role)) continue;
              const normalizedRole = role.toLowerCase();
              userCredentials[username] = password;
              userRoles[username] = normalizedRole;
              userEmails[username] = email;
            }
          }
        }

        const newMasterData = { userCredentials, userRoles, userEmails };
        
        // Only update state if we didn't have cache, OR if we want to ensure latest state is there 
        // (but updating state might be unnoticeable unless they typed a brand new password)
        setMasterData(newMasterData);
        
        // Save to cache for next time
        localStorage.setItem("masterDataCache", JSON.stringify(newMasterData));

      } catch (error) {
        console.error("Error Fetching Master Data:", error);
        
        if (!hasCache) {
          // Fallback only if we have NO cache
          try {
            const fallbackResponse = await fetch(SCRIPT_URL, {
              method: "GET",
            });

            if (fallbackResponse.ok) {
              showToast(
                "Unable to load user data. Please contact administrator.",
                "error"
              );
            }
          } catch (fallbackError) {
            console.error("Fallback also failed:", fallbackError);
          }

          showToast(
            \`Network error: \${error.message}. Please try again later.\`,
            "error"
          );
        }
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchMasterData();
  }, []);`;

if (content.match(fetchMasterDataRegex)) {
  content = content.replace(fetchMasterDataRegex, newFetchMasterData);
  fs.writeFileSync(filePath, content);
  console.log("Updated LoginPage.jsx successfully with caching!");
} else {
  console.log("Could not find fetchMasterData function block in LoginPage.jsx");
}
