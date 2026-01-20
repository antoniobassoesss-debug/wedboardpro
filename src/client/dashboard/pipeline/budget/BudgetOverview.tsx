import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  formatCurrency,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type BudgetCategory,
  type Currency,
  type CategoryName,
} from '../../../api/weddingBudgetApi';

interface BudgetDonutChartProps {
  categories: BudgetCategory[];
  currency: Currency;
}

interface ChartData {
  name: string;
  value: number;
  paid: number;
  color: string;
  categoryName: CategoryName;
}

const BudgetDonutChart: React.FC<BudgetDonutChartProps> = ({ categories, currency }) => {
  const chartData = useMemo(() => {
    const data: ChartData[] = categories
      .filter((c) => c.budgeted_amount > 0)
      .map((c) => ({
        name: c.custom_name || CATEGORY_LABELS[c.category_name] || c.category_name,
        value: c.budgeted_amount,
        paid: c.paid_amount,
        color: CATEGORY_COLORS[c.category_name] || '#94a3b8',
        categoryName: c.category_name,
      }))
      .sort((a, b) => b.value - a.value);

    if (data.length > 8) {
      const top7 = data.slice(0, 7);
      const others = data.slice(7);
      const otherTotal = others.reduce((sum, d) => sum + d.value, 0);
      const otherPaid = others.reduce((sum, d) => sum + d.paid, 0);
      return [
        ...top7,
        {
          name: 'Other',
          value: otherTotal,
          paid: otherPaid,
          color: '#94a3b8',
          categoryName: 'other' as CategoryName,
        },
      ];
    }

    return data;
  }, [categories]);

  const totalBudgeted = useMemo(
    () => categories.reduce((sum, c) => sum + c.budgeted_amount, 0),
    [categories]
  );

  const totalPaid = useMemo(
    () => categories.reduce((sum, c) => sum + c.paid_amount, 0),
    [categories]
  );

  const percentSpent = totalBudgeted > 0 ? Math.round((totalPaid / totalBudgeted) * 100) : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartData;
      const percentage = totalBudgeted > 0 ? Math.round((data.value / totalBudgeted) * 100) : 0;
      const paidPercent = data.value > 0 ? Math.round((data.paid / data.value) * 100) : 0;
      return (
        <div className="budget-chart-tooltip">
          <div className="budget-chart-tooltip-name">{data.name}</div>
          <div className="budget-chart-tooltip-row">
            <span>Budgeted:</span>
            <span>{formatCurrency(data.value, currency)}</span>
          </div>
          <div className="budget-chart-tooltip-row">
            <span>Paid:</span>
            <span>{formatCurrency(data.paid, currency)} ({paidPercent}%)</span>
          </div>
          <div className="budget-chart-tooltip-row">
            <span>Share:</span>
            <span>{percentage}% of total</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="budget-chart-container">
      <h3>Budget Allocation</h3>
      <div className="budget-chart-wrapper">
        <div className="budget-chart">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData as any[]}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="80%"
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="budget-chart-center">
            <div className="budget-chart-center-percent">{percentSpent}%</div>
            <div className="budget-chart-center-label">Spent</div>
          </div>
        </div>

        <div className="budget-chart-legend">
          {chartData.map((item) => {
            const paidPercent = item.value > 0 ? Math.round((item.paid / item.value) * 100) : 0;
            return (
              <div key={item.categoryName} className="budget-legend-item">
                <div
                  className="budget-legend-color"
                  style={{ backgroundColor: item.color }}
                />
                <div className="budget-legend-info">
                  <div className="budget-legend-name">{item.name}</div>
                  <div className="budget-legend-amount">
                    {formatCurrency(item.value, currency)}
                    <span className="budget-legend-paid">({paidPercent}% paid)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BudgetDonutChart;
