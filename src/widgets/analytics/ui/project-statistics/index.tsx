import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { cn } from '@/shared/lib/utils/cn'
import { LineChart, Loader2 } from 'lucide-react'

export const ProjectStatisticsTab = () => {
  const { data: chartData, isLoading: isChartLoading } = useQuery({
    queryKey: ['api-chart-stats'],
    queryFn: async () => {
      const { data } = await api.get('/v1/pricing/api-call/api-chart');
      return data;
    }
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

  return (
    <div className="space-y-8 pt-4 animate-in fade-in duration-300">
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
