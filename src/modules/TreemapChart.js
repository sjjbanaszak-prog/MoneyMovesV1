// TreemapChart.js
import React from 'react';
import {
  Treemap,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload[0]) return null;
  const { name, value, ticker, percentage } = payload[0].payload;

  return (
    <div className="bg-white p-2 rounded-md shadow text-sm">
      <strong>{ticker}</strong><br />
      {name}<br />
      Value: £{value.toFixed(2)}<br />
      ({percentage.toFixed(1)}%)
    </div>
  );
};

const TreemapChart = ({ data }) => {
  if (!data || Object.keys(data).length === 0) return <p>No holdings to display.</p>;

  const totalValue = Object.values(data).reduce((sum, item) => sum + item.value, 0);

  const chartData = Object.entries(data).map(([ticker, { name, value }]) => ({
    name,
    ticker,
    value,
    percentage: (value / totalValue) * 100,
  }));

  return (
    <div className="bg-white p-4 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold mb-4">Current Portfolio Allocation</h2>
      <ResponsiveContainer width="100%" height={300}>
        <Treemap
          data={chartData}
          dataKey="value"
          nameKey="ticker"
          stroke="#fff"
          fill="#6366f1"
          contentStyle={{ fontSize: 12 }}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
};

export default TreemapChart;
