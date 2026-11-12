
import { useState } from "react";
import {
  ShieldCheck, Lock, Mail, Eye, EyeOff,
  Upload, Download, Trash2, FileText, LogOut,
  Users, Shield, Activity
} from "lucide-react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");

  async function loadDocuments(accessToken) {
    const response = await fetch(`${API_URL}/documents`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Could not load documents");
    }

    setDocuments(data);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (isRegistering) {
        const response = await fetch(`${API_URL}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Registration failed");
        }

        setMessage("Registration successful! Please sign in.");
        setIsRegistering(false);
        setPassword("");
      } else {
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const response = await fetch(`${API_URL}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: formData
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Login failed");
        }

        const accessToken = data.access_token;

        const profileResponse = await fetch(`${API_URL}/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        const profile = await profileResponse.json();

        if (!profileResponse.ok) {
          throw new Error(profile.detail || "Could not load profile");
        }

        await loadDocuments(accessToken);

        setToken(accessToken);
        setUser(profile);

        if (profile.role === "admin") {
          await loadAdminData(accessToken);
        } else {
          setAdminUsers([]);
          setAuditLogs([]);
        }
        setPassword("");
        setMessage("");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function uploadDocument(e) {
    e.preventDefault();

    if (!selectedFile) {
      setMessage("Please select a file first.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      await loadDocuments(token);
      setSelectedFile(null);
      e.target.reset();
      setMessage("Document uploaded successfully!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadDocument(doc) {
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/documents/${doc.id}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Download failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = doc.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteDocument(doc) {
    if (!window.confirm(`Delete ${doc.filename}?`)) {
      return;
    }

    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/documents/${doc.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Delete failed");
      }

      await loadDocuments(token);
      setMessage("Document deleted successfully!");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadAdminData(accessToken) {
    setAdminLoading(true);
    setAdminMessage("");

    try {
      const [usersResponse, logsResponse] = await Promise.all([
        fetch(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        }),
        fetch(`${API_URL}/admin/audit-logs`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      ]);

      const usersData = await usersResponse.json();
      const logsData = await logsResponse.json();

      if (!usersResponse.ok) {
        throw new Error(usersData.detail || "Could not load users");
      }
      if (!logsResponse.ok) {
        throw new Error(logsData.detail || "Could not load audit logs");
      }

      setAdminUsers(usersData);
      setAuditLogs(logsData);
    } catch (error) {
      setAdminMessage(error.message);
    } finally {
      setAdminLoading(false);
    }
  }

  async function changeUserStatus(targetUser) {
    const nextStatus = !targetUser.is_active;
    const action = nextStatus ? "activate" : "deactivate";

    if (!window.confirm(`Are you sure you want to ${action} ${targetUser.email}?`)) {
      return;
    }

    setAdminMessage("");
    try {
      const response = await fetch(
        `${API_URL}/admin/users/${targetUser.id}/status?is_active=${nextStatus}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Could not update user status");
      }

      await loadAdminData(token);
      setAdminMessage(data.message || "User status updated successfully.");
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  function logout() {
    setToken("");
    setUser(null);
    setDocuments([]);
    setSelectedFile(null);
    setAdminUsers([]);
    setAuditLogs([]);
    setAdminMessage("");
    setEmail("");
    setPassword("");
    setMessage("You have been logged out.");
  }

  function formatSize(bytes) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="brand">
          <ShieldCheck size={30} />
          <span>SecureDoc</span>
        </div>

        <span className="secure-label">
          <Lock size={14} /> Secure Document Storage
        </span>
      </nav>

      <main className="main">
        {user ? (
          <div className="login-card dashboard-card">
            <div className="icon-box">
              <ShieldCheck size={35} />
            </div>

            <h1>My Documents</h1>
            <p className="subtitle">
              Welcome, {user.email}
            </p>

            <p><strong>Role:</strong> {user.role}</p>

            <form onSubmit={uploadDocument}>
              <label>Select a document</label>
              <div className="input-box">
                <Upload size={19} />
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) =>
                    setSelectedFile(e.target.files[0] || null)
                  }
                />
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading || !selectedFile}
              >
                {loading ? "Please wait..." : "Upload Document"}
              </button>
              <p className="subtitle">
                PDF, JPG and PNG. Maximum size: 5 MB.
              </p>
            </form>

            <hr />

            <h2>Uploaded Documents</h2>

            {documents.length === 0 ? (
              <p className="subtitle">No documents uploaded yet.</p>
            ) : (
              documents.map((doc) => (
                <div className="document-item" key={doc.id}>
                  <FileText size={22} />

                  <div className="document-info">
                    <strong>{doc.filename}</strong>
                    <small>{formatSize(doc.file_size)}</small>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadDocument(doc)}
                    title="Download"
                  >
                    <Download size={19} />
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteDocument(doc)}
                    title="Delete"
                  >
                    <Trash2 size={19} />
                  </button>
                </div>
              ))
            )}

            {user.role === "admin" && (
              <section className="admin-panel">
                <hr />
                <div className="admin-heading">
                  <Shield size={24} />
                  <h2>Admin Panel</h2>
                </div>
                <p className="subtitle">
                  Manage registered accounts and review security activity.
                </p>

                {adminMessage && (
                  <p className="admin-message" role="status">{adminMessage}</p>
                )}

                <div className="admin-section-heading">
                  <Users size={20} />
                  <h3>Registered Users</h3>
                </div>

                {adminLoading ? (
                  <p className="subtitle">Loading admin data...</p>
                ) : adminUsers.length === 0 ? (
                  <p className="subtitle">No users found.</p>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminUsers.map((account) => (
                          <tr key={account.id}>
                            <td>{account.email}</td>
                            <td>{account.role}</td>
                            <td>
                              <span className={account.is_active ? "status-active" : "status-inactive"}>
                                {account.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="admin-action-button"
                                onClick={() => changeUserStatus(account)}
                                disabled={account.id === user.id}
                              >
                                {account.id === user.id
                                  ? "Current admin"
                                  : account.is_active ? "Deactivate" : "Activate"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="admin-section-heading">
                  <Activity size={20} />
                  <h3>Audit Logs</h3>
                </div>

                {auditLogs.length === 0 ? (
                  <p className="subtitle">No audit activity recorded yet.</p>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>Resource</th>
                          <th>Actor ID</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id}>
                            <td>{log.action}</td>
                            <td>{log.resource_type} #{log.resource_id ?? "-"}</td>
                            <td>{log.actor_id ?? "-"}</td>
                            <td>{log.created_at ? new Date(log.created_at).toLocaleString() : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            <button
              className="login-button"
              onClick={logout}
            >
              <LogOut size={17} /> Sign Out
            </button>
          </div>
        ) : (
          <div className="login-card">
            <div className="icon-box">
              <ShieldCheck size={35} />
            </div>

            <h1>
              {isRegistering ? "Create account" : "Welcome back"}
            </h1>

            <p className="subtitle">
              {isRegistering
                ? "Create your secure SecureDoc account."
                : "Sign in to access your secure documents."}
            </p>

            <form onSubmit={handleSubmit}>
              <label>Email address</label>
              <div className="input-box">
                <Mail size={19} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <label>Password</label>
              <div className="input-box">
                <Lock size={19} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={isRegistering ? 8 : undefined}
                  required
                />

                <button
                  type="button"
                  className="eye-button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : isRegistering
                  ? "Create Account"
                  : "Sign In"}
              </button>
            </form>

            {message && <p role="status">{message}</p>}

            <p className="signup-text">
              {isRegistering
                ? "Already have an account? "
                : "New to SecureDoc? "}

              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setIsRegistering(!isRegistering);
                  setMessage("");
                  setPassword("");
                }}
              >
                {isRegistering ? "Sign in" : "Create an account"}
              </a>
            </p>
          </div>
        )}

        {user && message && (
          <p role="status">{message}</p>
        )}

        <p className="footer">
          Your documents. Your privacy. Our priority.
        </p>
      </main>
    </div>
  );
}

export default App;
