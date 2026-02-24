import time

import pytest


@pytest.mark.e2e
class TestDashboardFlow:
    def test_complete_dashboard_workflow(self, client, auth_headers):
        dashboard_payload = {
            "name": "Sales Dashboard",
            "description": "Monthly sales metrics",
            "layout": {"widgets": []},
            "refresh_interval": 300,
        }

        response = client.post("/api/v1/dashboards", json=dashboard_payload, headers=auth_headers)
        assert response.status_code == 201
        dashboard = response.json()
        dashboard_id = dashboard["id"]

        data_source_payload = {
            "name": "Local CSV",
            "type": "csv",
            "description": "E2E source",
            "config": {"filepath": "tests/data/e2e.csv", "rows": [{"revenue": 1000}]},
        }
        response = client.post("/api/v1/data-sources", json=data_source_payload, headers=auth_headers)
        assert response.status_code == 201
        data_source_id = response.json()["id"]

        widget_payload = {
            "name": "Total Revenue",
            "type": "number",
            "position": {"x": 0, "y": 0, "width": 4, "height": 2},
            "config": {"metric": "revenue", "aggregation": "sum"},
            "data_source_id": data_source_id,
            "query": "SELECT 1 as revenue",
        }

        response = client.post(f"/api/v1/dashboards/{dashboard_id}/widgets", json=widget_payload, headers=auth_headers)
        assert response.status_code == 201
        widget = response.json()

        response = client.post(f"/api/v1/data-sources/{data_source_id}/sync", headers=auth_headers)
        assert response.status_code == 202

        time.sleep(0.1)

        response = client.get(f"/api/v1/dashboards/{dashboard_id}/data", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        assert "widgets" in data
        assert len(data["widgets"]) >= 1
        assert data["widgets"][0]["id"] == widget["id"]
        assert "data" in data["widgets"][0]
