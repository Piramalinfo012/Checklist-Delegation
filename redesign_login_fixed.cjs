const fs = require('fs');

const filePath = 'src/pages/LoginPage.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const searchTarget = '  return (\r\n    <div className="flex min-h-screen items-center';
let startIndex = content.indexOf(searchTarget);
if (startIndex === -1) {
  startIndex = content.indexOf('  return (\n    <div className="flex min-h-screen items-center');
}

const newReturn = `  return (
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
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-purple-600 transition-colors"
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-8 py-3.5 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold tracking-wide shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5"
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
          <div className={\`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm border \${toast.type === "success"
              ? "bg-green-50/90 border-green-200 text-green-800"
              : "bg-red-50/90 border-red-200 text-red-800"
            }\`}>
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
    </div>
  );
};

export default LoginPage;
`;

if (startIndex !== -1) {
  content = content.substring(0, startIndex) + newReturn;
  fs.writeFileSync(filePath, content);
  console.log("Updated LoginPage.jsx successfully");
} else {
  console.log("Could not find precise 'return' start string");
}
