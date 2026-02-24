import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, setAuthToken } from "../services/api";
import { useAuthStore } from "../store/useDashboardStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);

  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await login(email, password);
      setToken(response.access_token);
      setAuthToken(response.access_token);
      localStorage.setItem("kpi_dashboard_token", response.access_token);
      navigate("/dashboards", { replace: true });
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel" style={{ maxWidth: 420, margin: "80px auto" }}>
      <h2 className="page-title">Sign in</h2>
      <p className="status">Use your dashboard credentials to access KPI data.</p>

      <form onSubmit={onSubmit} className="grid">
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button className="button" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        {error && <p className="status error">{error}</p>}
      </form>
    </div>
  );
}
