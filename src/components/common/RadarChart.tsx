import React from 'react';

interface RadarChartProps {
  studentScores: { skill: string; score: number }[];
  targetScores?: { skill: string; score: number }[];
  size?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  studentScores,
  targetScores = [],
  size = 340,
}) => {
  // If fewer than 3 skills are tested, supplement with unbenchmarked default categories for polygon rendering
  const defaultCategories = ['React', 'Python', 'DSA', 'Cloud & DevOps', 'Machine Learning'];
  const effectiveScores = studentScores.length >= 3
    ? studentScores
    : defaultCategories.map((cat) => {
        const found = studentScores.find((s) => s.skill.toLowerCase() === cat.toLowerCase());
        return found || { skill: cat, score: 0 };
      });

  const center = size / 2;
  const radius = center - 52;
  const total = effectiveScores.length;
  const angleSlice = (Math.PI * 2) / total;

  const getCoordinates = (value: number, index: number) => {
    const normalized = Math.max(0, Math.min(100, value)) / 100;
    const x = center + radius * normalized * Math.cos(angleSlice * index - Math.PI / 2);
    const y = center + radius * normalized * Math.sin(angleSlice * index - Math.PI / 2);
    return { x, y };
  };

  const studentPoints = effectiveScores
    .map((s, i) => {
      const { x, y } = getCoordinates(s.score, i);
      return `${x},${y}`;
    })
    .join(' ');

  const targetMap = new Map(targetScores.map((t) => [t.skill.toLowerCase(), t.score]));
  const targetPoints = effectiveScores
    .map((s, i) => {
      const targetVal = targetMap.get(s.skill.toLowerCase()) || 75;
      const { x, y } = getCoordinates(targetVal, i);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="relative flex flex-col items-center select-none">
      <svg width={size} height={size} className="overflow-visible drop-shadow-md">
        {/* Concentric Reference Webs */}
        {[0.25, 0.5, 0.75, 1].map((level, idx) => (
          <polygon
            key={idx}
            points={effectiveScores
              .map((_, i) => {
                const { x, y } = getCoordinates(level * 100, i);
                return `${x},${y}`;
              })
              .join(' ')}
            fill={idx === 3 ? 'rgba(18, 21, 31, 0.4)' : 'none'}
            stroke="#1e2333"
            strokeWidth="1"
          />
        ))}

        {/* Level Markers */}
        {[25, 50, 75, 100].map((pct, idx) => (
          <text
            key={idx}
            x={center + 4}
            y={center - (radius * (pct / 100)) + 3}
            fill="#64748b"
            fontSize="8"
            fontWeight="600"
          >
            {pct}%
          </text>
        ))}

        {/* Axes */}
        {effectiveScores.map((_, i) => {
          const { x, y } = getCoordinates(100, i);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#1e2333"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          );
        })}

        {/* Target Benchmark Threshold Area */}
        {targetScores.length > 0 && (
          <polygon
            points={targetPoints}
            fill="rgba(245, 158, 11, 0.08)"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        )}

        {/* Student Verified Benchmark Area */}
        <polygon
          points={studentPoints}
          fill="rgba(99, 102, 241, 0.25)"
          stroke="#6366f1"
          strokeWidth="2.5"
          className="transition-all duration-500 ease-out"
        />

        {/* Skill Category Labels & Interactive Nodes */}
        {effectiveScores.map((s, i) => {
          const { x, y } = getCoordinates(s.score, i);
          const labelCoord = getCoordinates(124, i);
          const isZero = s.score === 0;

          return (
            <g key={s.skill} className="transition-transform hover:scale-105">
              <circle
                cx={x}
                cy={y}
                r="4.5"
                fill={isZero ? '#475569' : s.score >= 75 ? '#10b981' : '#6366f1'}
                stroke="#fff"
                strokeWidth="1.5"
              />
              <text
                x={labelCoord.x}
                y={labelCoord.y}
                fill={isZero ? '#64748b' : s.score >= 75 ? '#34d399' : '#cbd5e1'}
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {s.skill}
              </text>
              <text
                x={labelCoord.x}
                y={labelCoord.y + 12}
                fill={isZero ? '#475569' : '#94a3b8'}
                fontSize="9"
                fontWeight="500"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {isZero ? '(Not tested)' : `${s.score}%`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
