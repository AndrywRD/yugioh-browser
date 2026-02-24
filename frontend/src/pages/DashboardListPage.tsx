import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { createDashboard, listDashboards } from "../services/api";

export default function DashboardListPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const dashboardsQuery = useQuery({ queryKey: ["dashboards"], queryFn: listDashboards });

  const createMutation = useMutation({
    mutationFn: createDashboard,
    onSuccess: () => {
      setName("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name, description });
  };

  return (
    <section>
      <header className="page-header">
        <h2 className="page-title">Dashboards</h2>
      </header>

      <div className="panel">
        <form className="form-inline" onSubmit={onSubmit}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dashboard name" />
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
          />
          <button className="button" type="submit">
            Create
          </button>
        </form>
      </div>

      <div className="panel">
        {dashboardsQuery.isLoading && <p className="status">Loading dashboards...</p>}
        {dashboardsQuery.isError && <p className="status error">Unable to load dashboards.</p>}

        <div className="grid grid-3">
          {(dashboardsQuery.data ?? []).map((dashboard) => (
            <article key={dashboard.id} className="card">
              <h3>{dashboard.name}</h3>
              <p className="status">{dashboard.description || "No description"}</p>
              <p className="status">Refresh: {dashboard.refresh_interval}s</p>
              <Link to={`/dashboards/${dashboard.id}`}>Open dashboard</Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
