"use client"

import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "./pages/LoginPage"
import AdminDashboard from "./pages/admin/Dashboard"
import AdminAssignTask from "./pages/admin/AssignTask"
// import AllTasks from "./pages/admin/AllTasks"
import DataPage from "./pages/admin/DataPage"
import AdminDataPage from "./pages/admin/admin-data-page"
import AccountDataPage from "./pages/delegation"
import "./index.css"
import QuickTask from "./pages/QuickTask"

import TrainingVideo from "./pages/TrainingVideo"
import Calendar from "./pages/Calendar"

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const username = sessionStorage.getItem("username")
  const userRole = sessionStorage.getItem("role")

  if (!username) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard/admin" replace />
  }

  return children
}

function App() {

  return (
    <Router>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Login route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Dashboard redirect */}
        <Route path="/dashboard" element={<Navigate to="/dashboard/admin" replace />} />

        {/* Admin & User Dashboard route */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/quick-task"
          element={
            <ProtectedRoute allowedRoles={["admin", "user"]}>
              <QuickTask />
            </ProtectedRoute>
          }
        />
        {/* Assign Task route - only for admin */}
        <Route
          path="/dashboard/assign-task"
          element={
            <ProtectedRoute allowedRoles={["admin", "user"]}>
              <AdminAssignTask />
            </ProtectedRoute>
          }
        />

        {/* Delegation route for user */}
        <Route
          path="/dashboard/delegation"
          element={
            <ProtectedRoute>
              <AccountDataPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/calendar"
          element={
            <ProtectedRoute>
              <Calendar />
            </ProtectedRoute>
          }
        />

        {/* Data routes */}
        <Route
          path="/dashboard/data/:category"
          element={
            <ProtectedRoute>
              <DataPage />
            </ProtectedRoute>
          }
        />



        <Route
          path="/dashboard/traning-video"
          element={
            <ProtectedRoute>
              <TrainingVideo />
            </ProtectedRoute>
          }
        />

        {/* Specific route for Admin Data Page */}
        <Route
          path="/dashboard/data/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDataPage />
            </ProtectedRoute>
          }
        />

        {/* Backward compatibility redirects */}
        <Route path="/admin/*" element={<Navigate to="/dashboard/admin" replace />} />
        <Route path="/admin/dashboard" element={<Navigate to="/dashboard/admin" replace />} />
        <Route parh="/admin/quick-task" element={<Navigate to="/dashboard/quick-task" replace />} />
        <Route path="/admin/assign-task" element={<Navigate to="/dashboard/assign-task" replace />} />
        <Route path="/admin/data/:category" element={<Navigate to="/dashboard/data/:category" replace />} />
        <Route path="/admin/calendar" element={<Navigate to="/dashboard/calendar" replace />} />

        <Route path="/admin/traning-video" element={<Navigate to="/dashboard/traning-video" replace />} />
        <Route path="/user/*" element={<Navigate to="/dashboard/admin" replace />} />
        
        {/* Catch-all route to redirect unknown URLs to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard/admin" replace />} />
      </Routes>
    </Router>
  )
}

export default App
