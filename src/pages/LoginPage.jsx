"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const TypingText = ({ text }) => {
  const [displayed, setDisplayed] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timer = setTimeout(() => {
        setDisplayed((prev) => prev + text.charAt(index));
        setIndex((prev) => prev + 1);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setDisplayed("");
        setIndex(0);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [index, text]);

  return (
    <span className="font-semibold inline-flex items-center">
      {displayed}
      <span className="ml-1 w-0.5 h-4 bg-white animate-pulse inline-block"></span>
    </span>
  );
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [masterData, setMasterData] = useState({
    userCredentials: {}, // Object where keys are usernames and values are passwords
    userRoles: {},
    userEmails: {}, // Object where keys are usernames and values are roles
  });
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState("");

  // Function to check if a role is any variation of "inactive"
  const isInactiveRole = (role) => {
    if (!role) return false;

    // Convert to lowercase
    const normalizedRole = String(role).toLowerCase().trim();

    // Check for different variations of "inactive" status
    return (
      normalizedRole === "inactive" ||
      normalizedRole === "in active" ||
      normalizedRole === "inactiv" ||
      normalizedRole === "in activ"
    );
  };

  // Fetch master data on component mount
  useEffect(() => {
    const fetchMasterData = async () => {
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
        const response = await fetch(`${SCRIPT_URL}?action=fetch&sheet=master`);
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
        try { localStorage.setItem("masterDataCache", JSON.stringify(newMasterData)); } catch(e) { console.warn('Cache full'); }

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
            `Network error: ${error.message}. Please try again later.`,
            "error"
          );
        }
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchMasterData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const logAttendance = async (username, role) => {
    const SCRIPT_URL =
      "https://script.google.com/macros/s/AKfycbyAy98t3XAyRP3pFE7XOoDiTDU3Yc9WOIFayRXELW2XnUAzl7yE9bnO94GvZV0wJkH_/exec";
    const SPREADSHEET_ID = "1r3YHyjqv24gZXBI9IofAhodnlBuDTA3sgyzU_PNCaQg";

    try {
      // Step 1: Fetch sheet data using Apps Script to find the user's row
      const response = await fetch(`${SCRIPT_URL}?action=fetch&sheet=Attendance%20Login`);
      const data = await response.json();

      let rowIndex = -1;
      // Search for the username in Column B (index 1)
      if (data.table && data.table.rows) {
        for (let i = 0; i < data.table.rows.length; i++) {
          const row = data.table.rows[i];
          const cellValue =
            row.c && row.c[1]
              ? String(row.c[1].v || "")
                .trim()
                .toLowerCase()
              : "";

          if (cellValue === username.trim().toLowerCase()) {
            // i is 0-based index from the rows array
            // User reported it was writing 1 row too high, so we increment by 2
            // i=0 (likely first data row after header) -> should be Row 2 in sheet
            rowIndex = i + 2;
            break;
          }
        }
      }

      if (rowIndex === -1) {
        console.warn(
          "User not found in Attendance Login sheet for attendance logging"
        );
        return;
      }

      // Step 2: Update the specific row
      const now = new Date();
      const day = now.getDate().toString().padStart(2, "0");
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const year = now.getFullYear();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const seconds = now.getSeconds().toString().padStart(2, "0");

      const formattedTimestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

      const payload = new FormData();
      payload.append("sheetName", "Attendance Login");
      payload.append("action", "update");
      payload.append("rowIndex", rowIndex.toString());

      // We send a flat array to update specific columns
      // Index 0 -> Column A: "" (No change)
      // Index 1 -> Column B: "" (No change)
      // Index 2 -> Column C: Timestamp
      const rowData = ["", "", formattedTimestamp];

      payload.append("rowData", JSON.stringify(rowData));

      // Fire and forget - don't await to avoid blocking UI
      fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: payload,
      }).catch((err) => console.error("Attendance logging failed", err));
    } catch (error) {
      console.error("Error preparing attendance log:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoginLoading(true);

    try {
      const trimmedUsername = formData.username.trim().toLowerCase();
      const trimmedPassword = formData.password.trim();

      //console.log("Login Attempt Details:")
      //console.log("Entered Username:", trimmedUsername)
      //console.log("Entered Password:", trimmedPassword) // For debugging (remove in production)
      //console.log("Available Credentials Count:", Object.keys(masterData.userCredentials).length)
      //console.log("Current userCredentials:", masterData.userCredentials)
      //console.log("Current userRoles:", masterData.userRoles)

      // Check if the username exists in our credentials map
      if (trimmedUsername in masterData.userCredentials) {
        const correctPassword = masterData.userCredentials[trimmedUsername];
        const userRole = masterData.userRoles[trimmedUsername];
        const userEmail = masterData.userEmails[trimmedUsername] || "";

        //console.log("Found user in credentials map")
        //console.log("Expected Password:", correctPassword)
        //console.log("Password Match:", correctPassword === trimmedPassword)
        //console.log("User Role:", userRole)
        //console.log("User Email:", userEmail)

        // Check if password matches
        if (correctPassword === trimmedPassword) {
          // Store user info in sessionStorage
          sessionStorage.setItem("username", trimmedUsername);
          sessionStorage.setItem("email", userEmail);
          setLoggedInUsername(trimmedUsername); // Set the username for the popup

          // Check if user is admin - explicitly compare with the string "admin"
          const isAdmin = userRole === "admin";
          //console.log(`User ${trimmedUsername} is admin: ${isAdmin}`);

          // Set role based on the fetched role
          sessionStorage.setItem("role", isAdmin ? "admin" : "user");

          // For admin users, we don't want to restrict by department
          if (isAdmin) {
            sessionStorage.setItem("department", "all"); // Admin sees all departments
            sessionStorage.setItem("isAdmin", "true"); // Additional flag to ensure admin permissions
            //console.log("ADMIN LOGIN - Setting full access permissions");
          } else {
            sessionStorage.setItem("department", trimmedUsername);
            sessionStorage.setItem("isAdmin", "false");
            //console.log("USER LOGIN - Setting restricted access");
          }

          // Log attendance to Google Sheet
          logAttendance(trimmedUsername, userRole);

          // Show success popup
          setShowSuccessPopup(true);

          // After 2 seconds, hide the success popup and show the "What's New" update popup.
          // Navigation happens when the user closes the update popup (cross button).
          setTimeout(() => {
            setShowSuccessPopup(false);
            setShowUpdatePopup(true);
          }, 2000);

          showToast(
            `Login successful. Welcome, ${trimmedUsername}!`,
            "success"
          );
          return;
        } else {
          showToast(
            "Username or password is incorrect. Please try again.",
            "error"
          );
        }
      } else {
        showToast(
          "Username or password is incorrect. Please try again.",
          "error"
        );
      }

      // If we got here, login failed
      console.error("Login Failed", {
        usernameExists: trimmedUsername in masterData.userCredentials,
        passwordMatch:
          trimmedUsername in masterData.userCredentials
            ? "Password did not match"
            : "Username not found",
        userRole: masterData.userRoles[trimmedUsername] || "No role",
      });
    } catch (error) {
      console.error("Login Error:", error);
      showToast(`Login failed: ${error.message}. Please try again.`, "error");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 5000); // Toast duration
  };

  const togglePasswordVisibility = () => {
    setVisible(!visible);
  };

  // Close the "What's New" popup and continue to the dashboard.
  const handleCloseUpdatePopup = () => {
    setShowUpdatePopup(false);
    navigate("/dashboard/admin");
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 font-sans">
      {/* Left/Top Side - Image and Branding */}
      <div className="relative w-full md:w-5/12 lg:w-1/2 min-h-[35vh] md:min-h-screen flex flex-col justify-center items-center overflow-hidden bg-purple-900">
        <div className="absolute inset-0 z-0">
          <img src="/login-bg.png" alt="Abstract Background" className="w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 to-blue-900/80 mix-blend-multiply"></div>
        </div>
        
        <div className="relative z-10 text-center text-white px-6 py-10 md:px-12 w-full max-w-lg mx-4 md:mx-0 rounded-3xl backdrop-blur-md bg-white/10 border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
          <div className="mx-auto w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-6 shadow-inner backdrop-blur-xl border border-white/30">
            <i className="fas fa-clipboard-check text-4xl text-white"></i>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-md">
            TaskMaster
          </h1>
          <p className="text-lg md:text-xl text-purple-100 font-light tracking-wide mb-8">
            Checklist & Delegation System
          </p>
          
          <div className="pt-6 border-t border-white/20 inline-block px-8">
            <TypingText text="DEVELOPED BY DEEPAK SAHU" />
          </div>
        </div>
      </div>

      {/* Right/Bottom Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-gray-50 relative overflow-hidden">
        {/* Subtle decorative blobs for right side */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        
        <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-[2rem] shadow-xl border border-gray-100 relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome Back</h2>
            <p className="text-gray-500 mt-3 text-sm">Please enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-semibold text-gray-700 block">
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-purple-600 transition-colors">
                  <i className="fas fa-user"></i>
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 focus:bg-white transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-gray-700 block">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-purple-600 transition-colors">
                  <i className="fas fa-lock"></i>
                </div>
                <input
                  id="password"
                  name="password"
                  type={visible ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 focus:bg-white transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-purple-600 transition-colors bg-transparent border-none outline-none focus:outline-none shadow-none"
                  style={{ border: 'none', background: 'transparent' }}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-8 py-3.5 px-4 gradient-bg text-white rounded-xl font-semibold tracking-wide shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5 border-none outline-none"
              style={{ border: 'none' }}
              disabled={isLoginLoading || isDataLoading}
            >
              {isLoginLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </span>
              ) : isDataLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading Data...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in-down">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm border ${toast.type === "success"
              ? "bg-green-50/90 border-green-200 text-green-800"
              : "bg-red-50/90 border-red-200 text-red-800"
            }`}>
            {toast.type === "success" ? (
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-green-100 text-green-600">
                <i className="fas fa-check"></i>
              </div>
            ) : (
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600">
                <i className="fas fa-exclamation"></i>
              </div>
            )}
            <p className="font-medium">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Success Popup Modal */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl transform transition-all duration-300 scale-100 opacity-100 text-center relative overflow-hidden">
            {/* Decorative background glow */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -mt-10 w-32 h-32 bg-green-400 rounded-full blur-3xl opacity-20"></div>
            
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-50 border-4 border-green-100 mb-6 relative z-10">
              <svg className="h-10 w-10 text-green-500 animate-bounce-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2 relative z-10">
              Login Successful!
            </h3>
            
            <p className="text-gray-600 text-base mb-8 relative z-10">
              Welcome back, <span className="font-bold text-green-600">{loggedInUsername}</span>! We're redirecting you to your dashboard.
            </p>
            
            <div className="flex flex-col items-center justify-center relative z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              <p className="text-xs text-gray-400 mt-3 font-medium uppercase tracking-widest">
                Redirecting
              </p>
            </div>
          </div>
        </div>
      )}

      {/* What's New / Update Popup */}
      {showUpdatePopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl transform transition-all duration-300 scale-100 opacity-100 relative max-h-[92vh] overflow-y-auto">
            {/* Decorative background glow */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -mt-10 w-32 h-32 bg-purple-400 rounded-full blur-3xl opacity-20"></div>

            {/* Cross / Close button */}
            <button
              type="button"
              onClick={handleCloseUpdatePopup}
              aria-label="Close"
              className="absolute top-4 right-4 z-20 flex items-center justify-center h-9 w-9 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors bg-transparent border-none outline-none focus:outline-none"
              style={{ border: 'none' }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-purple-50 border border-purple-100 mb-4 relative z-10">
              <i className="fas fa-bullhorn text-2xl text-purple-600"></i>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-1 text-center relative z-10">
              New Update
            </h3>
            <p className="text-sm text-gray-500 mb-6 text-center relative z-10">
              नया अपडेट
            </p>

            <ul className="space-y-3 relative z-10">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-purple-100 text-purple-600 text-sm font-bold">1</span>
                <div>
                  <p className="text-gray-800 font-medium">अब से आप फाइल अपलोड कर सकते हैं।</p>
                  <p className="text-gray-500 text-sm">You can now upload a file.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-purple-100 text-purple-600 text-sm font-bold">2</span>
                <div>
                  <p className="text-gray-800 font-medium">अब से आप एक साथ कई इमेज अपलोड कर सकते हैं।</p>
                  <p className="text-gray-500 text-sm">You can now upload multiple images.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-purple-100 text-purple-600 text-sm font-bold">3</span>
                <div>
                  <p className="text-gray-800 font-medium">अब से आप सीधे कैमरा से फोटो अपलोड कर सकते हैं।</p>
                  <p className="text-gray-500 text-sm">You can now upload a photo directly from the camera.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-purple-100 text-purple-600 text-sm font-bold">4</span>
                <div>
                  <p className="text-gray-800 font-medium">अब से आप स्क्रीनशॉट लेकर सीधे Paste बटन से इमेज पेस्ट कर सकते हैं।</p>
                  <p className="text-gray-500 text-sm">You can now take a screenshot and directly paste it as an image using the Paste button.</p>
                </div>
              </li>
            </ul>

            {/* Tutorial: screenshot-style mockup showing where to upload */}
            <div className="relative z-10 mt-6">
              <p className="text-sm font-semibold text-gray-700">कैसे अपलोड करें? / How to upload?</p>
              <p className="text-xs text-gray-500 mt-0.5 mb-3">
                टास्क टेबल में <span className="font-semibold text-purple-600">Upload</span> बटन पर क्लिक करें।
                / Click the highlighted <span className="font-semibold text-purple-600">Upload</span> button in the tasks table.
              </p>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 shadow-inner">
                {/* Fake browser/app top bar to look like a screenshot */}
                <div className="flex items-center gap-1.5 px-1 pb-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400"></span>
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400"></span>
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400"></span>
                  <span className="ml-2 text-[10px] text-gray-400 font-medium">Checklist Tasks</span>
                </div>

                {/* Fake table */}
                <div className="rounded-lg overflow-hidden border border-gray-200 bg-white text-[11px]">
                  <div className="grid grid-cols-3 bg-gray-100 text-gray-500 font-semibold uppercase tracking-wide">
                    <div className="px-3 py-2">Task</div>
                    <div className="px-3 py-2">Status</div>
                    <div className="px-3 py-2">Upload Image</div>
                  </div>
                  <div className="grid grid-cols-3 items-center border-t border-gray-100">
                    <div className="px-3 py-3 text-gray-700">Daily Report</div>
                    <div className="px-3 py-3 text-gray-700">Yes</div>
                    <div className="px-2 py-3 bg-green-50 relative">
                      {/* Highlighted Upload button */}
                      <span className="relative inline-flex">
                        <span className="absolute -inset-1.5 rounded-lg ring-2 ring-purple-500 animate-pulse"></span>
                        <span className="relative inline-flex items-center gap-1 rounded-md bg-white border border-purple-300 px-2 py-1 text-purple-700 font-semibold shadow-sm">
                          <i className="fas fa-upload"></i> Upload
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Arrow + callout pointing up to the Upload button */}
                <div className="flex items-start justify-end gap-2 mt-1.5 pr-3">
                  <div className="text-right pt-1">
                    <p className="text-[11px] font-bold text-purple-700">यहाँ से अपलोड करें</p>
                    <p className="text-[10px] text-gray-500">Tap here to upload</p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-9 w-9 text-purple-600 animate-bounce">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </div>

                {/* Options that appear on tapping Upload — each one individually highlighted with its own arrow + caption */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="flex flex-col items-center text-center">
                    <p className="text-[9px] font-bold text-purple-700 leading-tight">फोटो खींचें</p>
                    <p className="text-[8px] text-gray-500 leading-tight mb-0.5">Take photo</p>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4 text-purple-500 animate-bounce">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                    <div className="mt-0.5 flex flex-col items-center justify-center rounded-lg bg-white border-2 border-purple-400 py-2 px-1 w-full">
                      <i className="fas fa-camera text-purple-500 text-base mb-1"></i>
                      <span className="text-[10px] font-medium text-gray-700 leading-tight">कैमरा<br />Camera</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <p className="text-[9px] font-bold text-purple-700 leading-tight">गैलरी से चुनें</p>
                    <p className="text-[8px] text-gray-500 leading-tight mb-0.5">Choose from gallery</p>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4 text-purple-500 animate-bounce">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                    <div className="mt-0.5 flex flex-col items-center justify-center rounded-lg bg-white border-2 border-purple-400 py-2 px-1 w-full">
                      <i className="fas fa-images text-purple-500 text-base mb-1"></i>
                      <span className="text-[10px] font-medium text-gray-700 leading-tight">कई इमेज<br />Gallery</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <p className="text-[9px] font-bold text-purple-700 leading-tight">स्क्रीनशॉट पेस्ट करें</p>
                    <p className="text-[8px] text-gray-500 leading-tight mb-0.5">Paste screenshot</p>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4 text-purple-500 animate-bounce">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                    <div className="mt-0.5 flex flex-col items-center justify-center rounded-lg bg-white border-2 border-purple-400 py-2 px-1 w-full">
                      <i className="fas fa-clipboard text-purple-500 text-base mb-1"></i>
                      <span className="text-[10px] font-medium text-gray-700 leading-tight">पेस्ट<br />Paste</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 text-center">
                  स्क्रीनशॉट पहले कॉपी करें, फिर <span className="font-semibold text-purple-600">Paste</span> पर क्लिक करें।
                  / Copy a screenshot first, then click <span className="font-semibold text-purple-600">Paste</span> to attach it directly.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCloseUpdatePopup}
              className="w-full mt-8 py-3 px-4 gradient-bg text-white rounded-xl font-semibold tracking-wide shadow-md hover:shadow-lg focus:outline-none transition-all duration-300 relative z-10 border-none"
              style={{ border: 'none' }}
            >
              Got it / समझ गया
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
