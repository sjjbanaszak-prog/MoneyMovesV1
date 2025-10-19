import React, { useMemo, useState } from "react";
import { TrendingUp, AlertCircle, Zap } from "lucide-react";
import "./PensionPeerComparisonStyles.css";

export default function PensionPeerComparison({ pensionBuilderData }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState("tooltip-center");

  // Benchmark data from ONS and PensionBee (2025)
  const benchmarks = {
    "16-24": { median: 5500, mean: 10500 },
    "25-34": { median: 18800, mean: 25000 },
    "35-44": { median: 39500, mean: 82500 },
    "45-54": { median: 85000, mean: 120000 },
    "55-64": { median: 140000, mean: 300000 },
    "65+": { median: 140000, mean: 310000 },
  };

  const getAgeGroup = (age) => {
    if (age < 25) return "16-24";
    if (age < 35) return "25-34";
    if (age < 45) return "35-44";
    if (age < 55) return "45-54";
    if (age < 65) return "55-64";
    return "65+";
  };

  const calculatePercentile = (value, ageGroup) => {
    const benchmark = benchmarks[ageGroup];
    if (!benchmark) return 50;

    const median = benchmark.median;
    const mean = benchmark.mean;
    const stdDev = (mean - median) * 0.8;

    if (value < median) {
      return Math.max(5, Math.min(50, 50 * (value / median)));
    } else {
      const zScore = (value - mean) / stdDev;
      const percentile = 50 + zScore * 15;
      return Math.min(99, Math.max(50, percentile));
    }
  };

  // Function to calculate optimal tooltip position
  const calculateTooltipPosition = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const tooltipWidth =
      window.innerWidth <= 480 ? 200 : window.innerWidth <= 640 ? 240 : 280;
    const viewportWidth = window.innerWidth;

    // Calculate if tooltip would overflow on the right
    const rightEdge = rect.left + tooltipWidth / 2;
    const leftEdge = rect.left - tooltipWidth / 2;

    if (rightEdge > viewportWidth - 20) {
      return "tooltip-left"; // Position tooltip to the left
    } else if (leftEdge < 20) {
      return "tooltip-right"; // Position tooltip to the right
    }
    return "tooltip-center"; // Default center position
  };

  const handleTooltipMouseEnter = (event) => {
    setTooltipPosition(calculateTooltipPosition(event));
    setShowTooltip(true);
  };

  // Extract data from pensionBuilderData
  const age = pensionBuilderData?.age || 35;
  const currentPot = pensionBuilderData?.currentPot || 0;

  const ageGroup = useMemo(() => getAgeGroup(age), [age]);
  const percentile = useMemo(
    () => calculatePercentile(currentPot, ageGroup),
    [currentPot, ageGroup]
  );
  const benchmark = benchmarks[ageGroup];

  const getMotivationalMessage = () => {
    const difference = currentPot - benchmark.median;
    const percentDiff = ((difference / benchmark.median) * 100).toFixed(0);

    if (percentile >= 75) {
      return `Outstanding! You're in the top ${
        100 - Math.round(percentile)
      }% of savers in your age group. Keep up the excellent work!`;
    } else if (percentile >= 50) {
      return `You're ahead of the average! Increasing contributions by just £100/month could move you into the top 25%.`;
    } else {
      const shortfall = benchmark.median - currentPot;
      return `You're £${shortfall.toLocaleString()} behind the median. But it's not too late - small changes now can make a huge difference!`;
    }
  };

  if (!pensionBuilderData || !currentPot) {
    return null;
  }

  return (
    <div className="peer-comparison-wrapper">
      <div className="peer-comparison-header">
        <h3 className="peer-comparison-title">
          <TrendingUp className="title-icon" />
          How You Compare to Your Peers
        </h3>
        <p className="peer-comparison-subtitle">
          Based on your age group and UK pension benchmarks
          <span
            className="peer-info-icon-wrapper"
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <AlertCircle className="peer-info-icon-inline" />
            {showTooltip && (
              <div className={`peer-tooltip ${tooltipPosition}`}>
                <strong>Data Sources:</strong> Benchmarks based on ONS Pension
                Wealth (2025) and PensionBee customer data (2025). Median values
                represent the middle point where 50% have less and 50% have
                more.
              </div>
            )}
          </span>
        </p>
      </div>

      {/* Motivational Message */}
      <div className="peer-motivational-message">
        <Zap className="peer-zap-icon" />
        <p>{getMotivationalMessage()}</p>
      </div>

      {/* Chart Section */}
      <div className="peer-chart-section">
        <h4 className="peer-chart-title">
          Your Position vs Peers ({ageGroup})
        </h4>

        {/* Bell Curve Visualization */}
        <div className="peer-chart-container">
          <svg
            className="peer-bell-curve"
            viewBox="0 0 800 400"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Grid line */}
            <line
              x1="0"
              y1="350"
              x2="800"
              y2="350"
              stroke="#475569"
              strokeWidth="2"
            />

            {/* Bell curve path */}
            <path
              d="M 50,350 Q 150,280 200,180 T 300,80 T 400,40 T 500,80 T 600,180 T 700,280 T 750,350"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              opacity="0.6"
            />

            {/* Fill under curve */}
            <path
              d="M 50,350 Q 150,280 200,180 T 300,80 T 400,40 T 500,80 T 600,180 T 700,280 T 750,350 L 750,350 L 50,350 Z"
              fill="url(#peerGradient)"
              opacity="0.3"
            />

            {/* Percentile markers */}
            <line
              x1="200"
              y1="350"
              x2="200"
              y2="365"
              stroke="#64748b"
              strokeWidth="1"
            />
            <text
              x="200"
              y="385"
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="14"
            >
              25th
            </text>

            <line
              x1="400"
              y1="350"
              x2="400"
              y2="365"
              stroke="#64748b"
              strokeWidth="1"
            />
            <text
              x="400"
              y="385"
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="14"
            >
              50th (Median)
            </text>

            <line
              x1="600"
              y1="350"
              x2="600"
              y2="365"
              stroke="#64748b"
              strokeWidth="1"
            />
            <text
              x="600"
              y="385"
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="14"
            >
              75th
            </text>

            {/* User position marker */}
            {(() => {
              const xPos = 50 + (percentile / 100) * 700;
              const yPos =
                percentile < 50
                  ? 350 - (percentile / 50) * 310
                  : 350 - ((100 - percentile) / 50) * 310;

              return (
                <>
                  <line
                    x1={xPos}
                    y1={yPos}
                    x2={xPos}
                    y2="350"
                    stroke="#fbbf24"
                    strokeWidth="4"
                    strokeDasharray="8,6"
                  />
                  <circle cx={xPos} cy={yPos} r="10" fill="#fbbf24" />
                  <text
                    x={xPos}
                    y={yPos - 30}
                    textAnchor="middle"
                    fill="#fbbf24"
                    fontSize="18"
                    fontWeight="bold"
                  >
                    YOU
                  </text>
                  <text
                    x={xPos}
                    y={yPos - 13}
                    textAnchor="middle"
                    fill="#fbbf24"
                    fontSize="14"
                  >
                    {Math.round(percentile)}th
                  </text>
                </>
              );
            })()}

            {/* Gradient definition */}
            <defs>
              <linearGradient
                id="peerGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
                <stop offset="25%" stopColor="#f59e0b" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#10b981" stopOpacity="0.6" />
                <stop offset="75%" stopColor="#3b82f6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Percentile Breakdown */}
        <div className="peer-percentile-grid">
          <div className="peer-percentile-box peer-bottom">
            <div className="peer-percentile-label">Bottom 25%</div>
            <div className="peer-percentile-value">
              Below £{Math.round(benchmark.median * 0.5).toLocaleString()}
            </div>
          </div>
          <div className="peer-percentile-box peer-below-median">
            <div className="peer-percentile-label">25th-50th</div>
            <div className="peer-percentile-value">
              £{Math.round(benchmark.median * 0.5).toLocaleString()}-£
              {benchmark.median.toLocaleString()}
            </div>
          </div>
          <div className="peer-percentile-box peer-above-median">
            <div className="peer-percentile-label">50th-75th</div>
            <div className="peer-percentile-value">
              £{benchmark.median.toLocaleString()}-£
              {Math.round(benchmark.median * 1.5).toLocaleString()}
            </div>
          </div>
          <div className="peer-percentile-box peer-high">
            <div className="peer-percentile-label">75th-90th</div>
            <div className="peer-percentile-value">
              £{Math.round(benchmark.median * 1.5).toLocaleString()}-£
              {Math.round(benchmark.median * 2.5).toLocaleString()}
            </div>
          </div>
          <div className="peer-percentile-box peer-top">
            <div className="peer-percentile-label">Top 10%</div>
            <div className="peer-percentile-value">
              Above £{Math.round(benchmark.median * 2.5).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="peer-progress-section">
        <div className="peer-progress-header">
          <span className="peer-progress-label">
            Progress to UK Median ({ageGroup})
          </span>
          <span className="peer-progress-label">
            {Math.min(100, Math.round((currentPot / benchmark.median) * 100))}%
          </span>
        </div>
        <div className="peer-progress-bar-container">
          <div
            className="peer-progress-bar-fill"
            style={{
              width: `${Math.min(100, (currentPot / benchmark.median) * 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
