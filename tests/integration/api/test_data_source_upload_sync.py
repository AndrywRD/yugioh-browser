from pathlib import Path

from src.presentation.api.routers import data_sources as data_sources_router


def test_upload_csv_and_sync_generates_metrics(client, auth_headers, monkeypatch):
    def _force_queue_failure(*args, **kwargs):
        raise RuntimeError("queue unavailable")

    monkeypatch.setattr(data_sources_router.run_etl_job, "apply_async", _force_queue_failure)

    csv_content = "date,revenue,customers\n2026-01-01,100,10\n2026-01-02,150,15\n2026-01-03,200,20\n"
    upload_response = client.post(
        "/api/v1/data-sources/upload-csv",
        data={"name": "Uploaded Sales CSV", "description": "CSV upload integration test"},
        files={"file": ("sales.csv", csv_content.encode("utf-8"), "text/csv")},
        headers=auth_headers,
    )

    assert upload_response.status_code == 201
    uploaded_source = upload_response.json()
    data_source_id = uploaded_source["id"]

    stored_path = uploaded_source["config"].get("filepath")
    assert stored_path is not None
    assert Path(stored_path).exists()

    dashboard_response = client.post(
        "/api/v1/dashboards",
        json={
            "name": "Upload Driven Dashboard",
            "description": "Metrics from CSV upload",
            "layout": {"widgets": []},
            "refresh_interval": 300,
        },
        headers=auth_headers,
    )
    assert dashboard_response.status_code == 201
    dashboard_id = dashboard_response.json()["id"]

    widget_response = client.post(
        f"/api/v1/dashboards/{dashboard_id}/widgets",
        json={
            "name": "Revenue Sum",
            "type": "number",
            "position": {"x": 0, "y": 0, "width": 4, "height": 2},
            "config": {"metric": "revenue", "aggregation": "sum"},
            "data_source_id": data_source_id,
        },
        headers=auth_headers,
    )
    assert widget_response.status_code == 201

    sync_response = client.post(f"/api/v1/data-sources/{data_source_id}/sync", headers=auth_headers)
    assert sync_response.status_code == 202

    dashboard_data_response = client.get(f"/api/v1/dashboards/{dashboard_id}/data", headers=auth_headers)
    assert dashboard_data_response.status_code == 200
    dashboard_data = dashboard_data_response.json()

    assert len(dashboard_data["widgets"]) == 1
    metric_value = dashboard_data["widgets"][0]["data"]["metric_value"]
    assert metric_value is not None
    assert abs(metric_value - 450.0) < 0.0001
