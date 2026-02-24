import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { createDataSource, listDataSources, syncDataSource, uploadCsvDataSource } from "../services/api";

export default function DataSourcesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("csv");
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const dataSourcesQuery = useQuery({ queryKey: ["data-sources"], queryFn: listDataSources });

  const createMutation = useMutation({
    mutationFn: createDataSource,
    onSuccess: () => {
      setName("");
      setDescription("");
      setCsvFile(null);
      queryClient.invalidateQueries({ queryKey: ["data-sources"] });
    },
  });

  const uploadCsvMutation = useMutation({
    mutationFn: uploadCsvDataSource,
    onSuccess: () => {
      setName("");
      setDescription("");
      setCsvFile(null);
      queryClient.invalidateQueries({ queryKey: ["data-sources"] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: syncDataSource,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["data-sources"] }),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    if (type === "csv") {
      if (!csvFile) return;
      uploadCsvMutation.mutate({ name, description, file: csvFile });
      return;
    }

    createMutation.mutate({ name, type, description });
  };

  return (
    <section>
      <header className="page-header">
        <h2 className="page-title">Data Sources</h2>
      </header>

      <div className="panel">
        <form className="form-inline" onSubmit={onSubmit}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Data source name" />
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
          />
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="csv">CSV</option>
            <option value="api">API</option>
            <option value="database">Database</option>
            <option value="google_sheets">Google Sheets</option>
          </select>
          {type === "csv" && (
            <input
              className="input"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
            />
          )}
          <button className="button" type="submit">
            {type === "csv" ? "Upload CSV source" : "Add source"}
          </button>
        </form>
      </div>

      <div className="panel">
        {dataSourcesQuery.isLoading && <p className="status">Loading data sources...</p>}
        {dataSourcesQuery.isError && <p className="status error">Unable to load data sources.</p>}

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(dataSourcesQuery.data ?? []).map((source) => (
              <tr key={source.id}>
                <td>{source.name}</td>
                <td>{source.type}</td>
                <td>{source.last_sync_status ?? "never synced"}</td>
                <td>
                  <button className="button secondary" onClick={() => syncMutation.mutate(source.id)}>
                    Sync
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
