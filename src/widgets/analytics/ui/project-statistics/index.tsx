import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { cn } from '@/shared/lib/utils/cn'
import { formatBytesAsGB } from '@/shared/lib/utils/format-bytes'
import { LineChart, Loader2 } from 'lucide-react'

export const ProjectStatisticsTab = ({ pricingData }: any) => {
  const d = pricingData?.data || {};

  const { data: chartData, isLoading: isChartLoading } = useQuery({
    queryKey: ['api-chart-stats'],
    queryFn: async () => {
      const { data } = await api.get('/v1/pricing/api-call/api-chart');
      return data;
    }
  });

  const { data: metricsData } = useQuery({
    queryKey: ['api-performance-metrics'],
    queryFn: async () => {
      const { data } = await api.get('/v1/pricing/api-call/api-metrics');
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds for "real-time" feel
  });

  const { data: performanceData } = useQuery({
    queryKey: ['api-performance-stats'],
    queryFn: async () => {
      const { data } = await api.get('/v1/pricing/performance');
      return data;
    },
    refetchInterval: 30000,
  });

  const chartItems = React.useMemo(() => {
    const rawItems = chartData?.data?.chart || [];
    const fullChart = [];
    const today = new Date();

    // Generate last 7 days including today
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const existing = rawItems.find((item: any) => item.date === dateStr);
      fullChart.push({
        date: dateStr,
        count: existing?.count || 0
      });
    }

    return fullChart;
  }, [chartData]);

  const maxCount = Math.max(...chartItems.map((item: any) => item.count), 1);

  const getDayName = (dateStr: string) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const date = new Date(dateStr);
    return days[date.getDay()];
  };

  const formatUnit = (value: number, unit: string) => {
    if (unit === 'count') return value.toLocaleString();
    if (unit === 'tokens') return value.toLocaleString();
    if (unit === 'MB') return value.toFixed(2) + ' MB';
    if (unit === 'ms') return value % 1 === 0 ? value.toString() + ' ms' : value.toFixed(1) + ' ms';
    if (unit === 'percent') return value % 1 === 0 ? value.toString() + '%' : value.toFixed(2) + '%';
    if (unit === 'rate') return value % 1 === 0 ? value.toString() : value.toFixed(2);
    if (unit === 'bytes') return formatBytesAsGB(value);
    return value.toLocaleString();
  };

  const getPercentage = (current: number, limit: number) => {
    if (!limit) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const renderCard = (key: string, label: string, color: string, textColor: string) => {
    const item = d[key];
    const current = item?.current || 0;
    const limit = item?.limit || 0;
    const unit = item?.unit || 'count';
    const percentage = getPercentage(current, limit);

    return (
      <div key={key} className="bg-bg-card border border-border-subtle rounded-xl p-4 flex flex-col justify-between min-h-[140px] hover:shadow-md transition-shadow">
        <div>
          <div className="text-xs text-text-muted font-semibold mb-2">{label}</div>
          <div className="flex items-baseline gap-1.5 mb-2 flex-wrap">
            <span className={cn("text-[20px] font-bold", textColor)}>{formatUnit(current, unit)}</span>
            <span className="text-[12px] text-text-muted">/ {formatUnit(limit, unit)}</span>
          </div>
        </div>
        <div>
          <div className="h-1.5 bg-bg-sidebar rounded-full overflow-hidden mb-1.5">
            <div
              className={cn("h-full rounded-full transition-all duration-500", color)}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="text-[11px] text-text-muted">
            {formatUnit(Math.max(limit - current, 0), unit)} remaining
          </div>
        </div>
      </div>
    );
  };

  const renderSimpleCard = (label: string, value: number, subtext: string, textColor: string = 'text-text-main', unit: string = 'rate') => {
    return (
      <div className="bg-bg-card border border-border-subtle rounded-xl p-4 flex flex-col justify-between min-h-[140px] hover:shadow-md transition-shadow">
        <div>
          <div className="text-xs text-text-muted font-semibold mb-2">{label}</div>
          <div className={cn("text-[22px] font-bold mb-1", textColor)}>
            {formatUnit(value, unit)}
          </div>
        </div>
        <div className="text-[11px] text-text-muted font-medium">
          {subtext}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pt-4 animate-in fade-in duration-300">
      {/* Stat cards row 1 */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {renderCard('functions', 'Functions', 'bg-primary', 'text-primary')}
        {renderCard('microfrontend', 'Microfrontends', 'bg-purple-500', 'text-purple-500')}
        {renderCard('tables', 'Tables', 'bg-green-500', 'text-green-500')}
        {renderCard('api_keys', 'API Keys', 'bg-orange-500', 'text-orange-500')}
        {renderCard('users', 'Users', 'bg-text-main', 'text-text-main')}
        {renderCard('items', 'Database Records', 'bg-blue-500', 'text-blue-500')}
        {renderSimpleCard('Requests Per Second', metricsData?.data?.rps || 0, 'Current throughput (RPS)', 'text-blue-500')}
        {renderSimpleCard('Requests Per Minute', metricsData?.data?.rpm || 0, 'Throughput per minute', 'text-indigo-500')}
        {renderSimpleCard('Requests Per Hour', metricsData?.data?.rph || 0, 'Hourly traffic volume', 'text-violet-500')}
        {renderSimpleCard('Avg Response Time', performanceData?.data?.average_response_time || 0, 'Average system latency', 'text-emerald-500', 'ms')}
        {renderSimpleCard('Error Rate', performanceData?.data?.error_rate || 0, 'Failed requests percentage', 'text-rose-500', 'percent')}
      </div>

      {/* API Requests Chart */}
      <div>
        <h2 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
          <LineChart size={18} className="text-text-muted" />
          API Requests (Last 7 Days)
        </h2>

        <div className="bg-bg-card border border-border-subtle rounded-xl h-[240px] flex items-end gap-3 p-6 pb-8 relative">
          {isChartLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-card/50 backdrop-blur-[1px] rounded-xl">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : chartItems.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm italic">
              No data available for the last 7 days
            </div>
          ) : (
            chartItems.map((item: any, idx: number) => {
              const heightPercentage = Math.max((item.count / maxCount) * 100, 4);
              const isToday = idx === chartItems.length - 1;

              return (
                <div key={item.date} className="flex-1 flex flex-col items-center gap-3 h-full justify-end group">
                  <div className="relative w-full flex items-end justify-center h-full pt-6">
                    <div
                      className={cn(
                        "w-full max-w-[40px] rounded-t-lg transition-all duration-500 ease-out flex items-center justify-center",
                        isToday ? "bg-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "bg-bg-sidebar group-hover:bg-primary/40"
                      )}
                      style={{ height: `${heightPercentage}%` }}
                    >
                      <div className="absolute -top-7 bg-bg-card border border-border-subtle px-1.5 py-0.5 rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10">
                        {item.count}
                      </div>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[10px] uppercase tracking-wider font-bold transition-colors",
                    isToday ? "text-primary font-extrabold" : "text-text-muted group-hover:text-text-main"
                  )}>
                    {getDayName(item.date)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  )
}
