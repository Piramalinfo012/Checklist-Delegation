const fs = require('fs');

const filePath = 'src/pages/LoginPage.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const searchTarget = '  return (\n    <div className="flex flex-col md:flex-row';
const startIndex = content.indexOf('  return (\n    <div className="flex flex-col md:flex-row');

const newReturn = `  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 relative overflow-hidden">
        
        {/* Top Header like Dashboard */}
        <div className="space-y-1 p-6 border-b border-gray-100">
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center shadow-md mr-3">
              <i className="fas fa-clipboard-check text-xl text-white"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              Checklist & Delegation
            </h2>
          </div>
          <p className="text-center text-gray-500 text-sm">
            Login to access your dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium text-gray-700 block flex items-center">
              <i className="fas fa-user text-purple-600 mr-2 text-xs"></i> Username
            </label>
            <div className="relative group">
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Enter your username"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-gray-700 block flex items-center">
              <i className="fas fa-lock text-purple-600 mr-2 text-xs"></i> Password
            </label>
            <div className="relative group flex items-center">
              <input
                id="password"
                name="password"
                type={visible ? "text" : "password"}
                placeholder="Enter your password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 pr-10"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-2 p-1.5 flex items-center text-gray-400 hover:text-purple-600 bg-transparent border-none outline-none focus:outline-none shadow-none"
                style={{ border: 'none', background: 'transparent' }}
              >
                {visible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-6 py-3 px-4 gradient-bg text-white rounded-md font-medium tracking-wide shadow-md hover:shadow-lg focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 border-none outline-none"
            style={{ border: 'none' }}
            disabled={isLoginLoading || isDataLoading}
          >
            {isLoginLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </span>
            ) : isDataLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

        <div className="py-3 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-500">
          <TypingText text="DEVELOPED BY DEEPAK SAHU" />
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in-down">
          <div className={\`flex items-center gap-3 px-5 py-3 rounded-md shadow-lg border \${toast.type === "success"
              ? "bg-white border-green-200 text-green-700"
              : "bg-white border-red-200 text-red-700"
            }\`}>
            {toast.type === "success" ? (
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-green-100 text-green-600">
                <i className="fas fa-check text-xs"></i>
              </div>
            ) : (
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-600">
                <i className="fas fa-exclamation text-xs"></i>
              </div>
            )}
            <p className="font-medium text-sm">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Success Popup Modal */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-50 mb-4">
              <svg className="h-8 w-8 text-green-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Login Successful!
            </h3>
            
            <p className="text-gray-600 text-sm mb-6">
              Welcome back, <span className="font-bold text-green-600">{loggedInUsername}</span>! Redirecting you...
            </p>
            
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
`;

if (startIndex !== -1) {
  content = content.substring(0, startIndex) + newReturn;
  fs.writeFileSync(filePath, content);
  console.log("Updated LoginPage.jsx to match dashboard theme");
} else {
  console.log("Could not find return statement");
}
