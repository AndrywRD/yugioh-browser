import BarWidgetChart from "../Charts/BarWidgetChart";
import LineWidgetChart from "../Charts/LineWidgetChart";
import PieWidgetChart from "../Charts/PieWidgetChart";

type WidgetData = {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  data: {
    metric_name?: string;
    metric_value?: number;
    timestamp?: string;
  };
};

type Props = {
  widget: WidgetData;
};

const samplePoints = [
  { name: "Mon", value: 24 },
  { name: "Tue", value: 31 },
  { name: "Wed", value: 28 },
  { name: "Thu", value: 42 },
  { name: "Fri", value: 37 },
];

export default function WidgetRenderer({ widget }: Props) {
  if (widget.type === "number") {
    return (
      <div className="card">
        <span className="badge">{widget.data.metric_name ?? "KPI"}</span>
        <p className="kpi-value">{(widget.data.metric_value ?? 0).toLocaleString()}</p>
        <small className="status">Last update: {widget.data.timestamp ?? "-"}</small>
      </div>
    );
  }

  if (widget.type === "bar_chart") {
    return (
      <div className="card">
        <h3>{widget.name}</h3>
        <BarWidgetChart points={samplePoints} />
      </div>
    );
  }

  if (widget.type === "pie_chart") {
    return (
      <div className="card">
        <h3>{widget.name}</h3>
        <PieWidgetChart points={samplePoints} />
      </div>
    );
  }

  if (widget.type === "table") {
    return (
      <div className="card">
        <h3>{widget.name}</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {samplePoints.map((point) => (
              <tr key={point.name}>
                <td>{point.name}</td>
                <td>{point.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>{widget.name}</h3>
      <LineWidgetChart points={samplePoints} />
    </div>
  );
}
