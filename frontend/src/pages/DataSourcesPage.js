import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createDataSource, listDataSources, syncDataSource, uploadCsvDataSource } from "../services/api";
export default function DataSourcesPage() {
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("csv");
    const [csvFile, setCsvFile] = useState(null);
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
    const onSubmit = (event) => {
        event.preventDefault();
        if (!name.trim())
            return;
        if (type === "csv") {
            if (!csvFile)
                return;
            uploadCsvMutation.mutate({ name, description, file: csvFile });
            return;
        }
        createMutation.mutate({ name, type, description });
    };
    return (_jsxs("section", { children: [_jsx("header", { className: "page-header", children: _jsx("h2", { className: "page-title", children: "Data Sources" }) }), _jsx("div", { className: "panel", children: _jsxs("form", { className: "form-inline", onSubmit: onSubmit, children: [_jsx("input", { className: "input", value: name, onChange: (e) => setName(e.target.value), placeholder: "Data source name" }), _jsx("input", { className: "input", value: description, onChange: (e) => setDescription(e.target.value), placeholder: "Description (optional)" }), _jsxs("select", { className: "input", value: type, onChange: (e) => setType(e.target.value), children: [_jsx("option", { value: "csv", children: "CSV" }), _jsx("option", { value: "api", children: "API" }), _jsx("option", { value: "database", children: "Database" }), _jsx("option", { value: "google_sheets", children: "Google Sheets" })] }), type === "csv" && (_jsx("input", { className: "input", type: "file", accept: ".csv,text/csv", onChange: (e) => setCsvFile(e.target.files?.[0] ?? null) })), _jsx("button", { className: "button", type: "submit", children: type === "csv" ? "Upload CSV source" : "Add source" })] }) }), _jsxs("div", { className: "panel", children: [dataSourcesQuery.isLoading && _jsx("p", { className: "status", children: "Loading data sources..." }), dataSourcesQuery.isError && _jsx("p", { className: "status error", children: "Unable to load data sources." }), _jsxs("table", { className: "table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Type" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Action" })] }) }), _jsx("tbody", { children: (dataSourcesQuery.data ?? []).map((source) => (_jsxs("tr", { children: [_jsx("td", { children: source.name }), _jsx("td", { children: source.type }), _jsx("td", { children: source.last_sync_status ?? "never synced" }), _jsx("td", { children: _jsx("button", { className: "button secondary", onClick: () => syncMutation.mutate(source.id), children: "Sync" }) })] }, source.id))) })] })] })] }));
}
