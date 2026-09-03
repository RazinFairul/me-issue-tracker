import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3];

export default function DashboardAnalytics() {
  const [loading, setLoading] = useState(true);
  const [rawIssues, setRawIssues] = useState([]);
  
  // Penapis Tarikh
  const [filterMode, setFilterMode] = useState('all'); 
  const [timeRange, setTimeRange] = useState('all'); 
  
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedWeek, setSelectedWeek] = useState('all'); // 'all' | '1' | '2' | '3' | '4' | '5'
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  // Penapis Kumpulan (Group Filter)
  const [selectedGroup, setSelectedGroup] = useState('all');

  // Power BI Cross-Filter
  const [selectedClassification, setSelectedClassification] = useState(null);

  // States Paparan Data
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, closed: 0 });
  const [statusData, setStatusData] = useState([]);
  const [locationData, setLocationData] = useState([]);
  const [classificationData, setClassificationData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [agingData, setAgingData] = useState([]);
  const [showAllLocations, setShowAllLocations] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data, error } = await supabase.from('issues').select('*');
      if (error) {
        console.error('Error fetching issues:', error.message);
      } else {
        setRawIssues(data || []);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Helper untuk menentukan minggu ke berapa dalam bulan (1 - 5)
  const getWeekOfMonth = (dayNumber) => {
    return String(Math.min(5, Math.ceil(dayNumber / 7)));
  };

  const processDashboard = useCallback(() => {
    if (!rawIssues.length) {
      setStats({ total: 0, open: 0, inProgress: 0, closed: 0 });
      setStatusData([]);
      setLocationData([]);
      setClassificationData([]);
      setTrendData([]);
      setAgingData([]);
      return;
    }

    const now = new Date();

    // 1. Penapis Tarikh & Penapis Group
    const dateAndGroupFiltered = rawIssues.filter((item) => {
      // Penapis Kumpulan
      if (selectedGroup !== 'all') {
        const itemGroup = (item.group_name || '').trim();
        if (itemGroup !== selectedGroup) return false;
      }

      // Penapis Masa
      if (filterMode === 'all') return true;

      const rawDateStr = item.date_time || item.created_at || item.created_date;
      if (!rawDateStr) return false;

      const dateOnlyStr = rawDateStr.split('T')[0].split(' ')[0];
      if (!dateOnlyStr || !dateOnlyStr.includes('-')) return false;

      const [year, month, day] = dateOnlyStr.split('-').map(Number);
      const issueDate = new Date(year, month - 1, day);

      if (filterMode === 'preset') {
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffInTime = todayDate.getTime() - issueDate.getTime();
        const diffInDays = Math.round(diffInTime / (1000 * 3600 * 24));

        if (timeRange === 'day') return diffInDays === 0;
        if (timeRange === 'week') return diffInDays >= 0 && diffInDays <= 7;
        if (timeRange === 'month') return diffInDays >= 0 && diffInDays <= 30;
        if (timeRange === 'year') return diffInDays >= 0 && diffInDays <= 365;
      }

      if (filterMode === 'custom') {
        const isYearMatch = year === Number(selectedYear);
        const isMonthMatch = selectedMonth === 'all' || month === Number(selectedMonth);
        
        let isWeekMatch = true;
        if (selectedWeek !== 'all') {
          const issueWeekNum = getWeekOfMonth(day);
          isWeekMatch = issueWeekNum === selectedWeek;
        }

        return isYearMatch && isMonthMatch && isWeekMatch;
      }

      return true;
    });

    // 2. Cross-filtering Classification
    const fullyFiltered = selectedClassification
      ? dateAndGroupFiltered.filter((item) => {
          const c = item.classification ? `Class ${item.classification.toUpperCase()}` : 'UNCLASSIFIED';
          return c === selectedClassification;
        })
      : dateAndGroupFiltered;

    let openCount = 0;
    let inProgressCount = 0;
    let closedCount = 0;
    const locationMap = {};
    const classMap = {};
    let agingUnder3 = 0;
    let aging3to7 = 0;
    let agingOver7 = 0;

    dateAndGroupFiltered.forEach((item) => {
      const classKey = item.classification ? `Class ${item.classification.toUpperCase()}` : 'UNCLASSIFIED';
      classMap[classKey] = (classMap[classKey] || 0) + 1;
    });

    fullyFiltered.forEach((item) => {
      const status = (item.status || 'Open').trim().toLowerCase();
      const isDone = status === 'closed' || status === 'close' || status === 'completed' || status === 'complete';
      const isInProg = status === 'in progress' || status === 'in-progress' || status.includes('in progress');

      if (isDone) closedCount++;
      else if (isInProg) inProgressCount++;
      else openCount++;

      const loc = item.location ? item.location.toUpperCase() : 'UNKNOWN';
      locationMap[loc] = (locationMap[loc] || 0) + 1;

      if (!isDone) {
        const rawDateStr = item.date_time || item.created_at || item.created_date;
        if (rawDateStr) {
          const [y, m, d] = rawDateStr.split('T')[0].split(' ')[0].split('-').map(Number);
          const createdDate = new Date(y, m - 1, d);
          const ageDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

          if (ageDays < 3) agingUnder3++;
          else if (ageDays <= 7) aging3to7++;
          else agingOver7++;
        }
      }
    });

    // Monthly Trend
    const monthCounts = {};
    MONTHS.forEach((m) => { 
      monthCounts[m.label.substring(0, 3)] = { created: 0, closed: 0 }; 
    });

    fullyFiltered.forEach((item) => {
      const rawDateStr = item.date_time || item.created_at || item.created_date;
      if (rawDateStr) {
        const [, m] = rawDateStr.split('T')[0].split('-').map(Number);
        if (m >= 1 && m <= 12) {
          const monthKey = MONTHS[m - 1].label.substring(0, 3);
          monthCounts[monthKey].created++;
          const status = (item.status || '').trim().toLowerCase();
          if (status === 'closed' || status === 'close' || status === 'completed' || status === 'complete') {
            monthCounts[monthKey].closed++;
          }
        }
      }
    });

    setStats({
      total: fullyFiltered.length,
      open: openCount,
      inProgress: inProgressCount,
      closed: closedCount,
    });

    setStatusData([
      { name: 'Open', value: openCount, color: '#dc3545' },
      { name: 'In Progress', value: inProgressCount, color: '#ffc107' },
      { name: 'Closed', value: closedCount, color: '#28a745' },
    ]);

    setLocationData(
      Object.keys(locationMap)
        .map((loc) => ({ location: loc, count: locationMap[loc] }))
        .sort((a, b) => b.count - a.count)
    );

    setClassificationData(
      Object.keys(classMap)
        .map((cls) => ({ classification: cls, count: classMap[cls] }))
        .sort((a, b) => b.count - a.count)
    );

    setAgingData([
      { range: '< 3 Days', count: agingUnder3, fill: '#28a745' },
      { range: '3 - 7 Days', count: aging3to7, fill: '#ffc107' },
      { range: '> 7 Days (Critical)', count: agingOver7, fill: '#dc3545' },
    ]);

    setTrendData(
      Object.keys(monthCounts).map((k) => ({
        month: k,
        Created: monthCounts[k].created,
        Closed: monthCounts[k].closed
      }))
    );

  }, [rawIssues, filterMode, timeRange, selectedMonth, selectedWeek, selectedYear, selectedGroup, selectedClassification]);

  useEffect(() => {
    processDashboard();
  }, [processDashboard]);

  // Label peratusan (%) untuk Pie Chart
  const renderCustomPercentageLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }) => {
    if (!value || percent === 0) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 22;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#333"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: '12px', fontWeight: 'bold' }}
      >
        {`${(percent * 100).toFixed(1)}% (${value})`}
      </text>
    );
  };

  const displayedLocationData = showAllLocations ? locationData : locationData.slice(0, 20);
  const chartWidth = showAllLocations ? Math.max(1000, locationData.length * 45) : '100%';

  return (
    <div style={{ padding: '20px', maxWidth: '1300px', margin: '0 auto', fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#0d3b66', padding: '15px 20px', borderRadius: '8px', color: '#fff', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0, fontSize: '22px' }}>Dashboard Analytics</h2>
        
        {/* Dropdown Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Group Filter */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#0d3b66', backgroundColor: '#fff' }}
          >
            <option value="all">All Groups</option>
            <option value="Assembly Line">Assembly Line</option>
            <option value="Test Line">Test Line</option>
            <option value="Transmission">Transmission</option>
            <option value="IT">IT</option>
          </select>

          {/* Date Filter Modes */}
          <select
            value={filterMode}
            onChange={(e) => {
              setFilterMode(e.target.value);
              if (e.target.value !== 'custom') {
                setSelectedWeek('all');
              }
            }}
            style={{ padding: '7px 10px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#0d3b66', backgroundColor: '#fff' }}
          >
            <option value="all">All Time</option>
            <option value="preset">Quick Range</option>
            <option value="custom">Specific Week, Month & Year</option>
          </select>

          {filterMode === 'preset' && (
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#0d3b66', backgroundColor: '#fff' }}
            >
              <option value="day">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
              <option value="year">Past 365 Days</option>
            </select>
          )}

          {filterMode === 'custom' && (
            <>
              {/* Month Dropdown */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                style={{ padding: '7px 10px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#0d3b66', backgroundColor: '#fff' }}
              >
                <option value="all">All Months</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              {/* Week Dropdown */}
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#0d3b66', backgroundColor: '#fff' }}
              >
                <option value="all">All Weeks</option>
                <option value="1">Week 1 (1-7)</option>
                <option value="2">Week 2 (8-14)</option>
                <option value="3">Week 3 (15-21)</option>
                <option value="4">Week 4 (22-28)</option>
                <option value="5">Week 5 (29+)</option>
              </select>

              {/* Year Dropdown */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{ padding: '7px 10px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#0d3b66', backgroundColor: '#fff' }}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Slicer Indicator */}
      {selectedClassification && (
        <div style={{ backgroundColor: '#e2e8f0', padding: '10px 15px', borderRadius: '6px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Filtered by: <strong>{selectedClassification}</strong></span>
          <button 
            onClick={() => setSelectedClassification(null)}
            style={{ border: 'none', background: '#0d3b66', color: '#fff', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            Clear Filter ✕
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px' }}>Loading analytics data...</p>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
            <div style={{ backgroundColor: '#fff', borderLeft: '6px solid #0d3b66', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '13px', color: '#666', fontWeight: 'bold' }}>
                TOTAL ISSUES {selectedGroup !== 'all' && `(${selectedGroup})`}
              </span>
              <h2 style={{ margin: '8px 0 0 0', fontSize: '28px', color: '#0d3b66' }}>{stats.total}</h2>
            </div>
            <div style={{ backgroundColor: '#fff', borderLeft: '6px solid #dc3545', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '13px', color: '#666', fontWeight: 'bold' }}>OPEN ISSUES</span>
              <h2 style={{ margin: '8px 0 0 0', fontSize: '28px', color: '#dc3545' }}>{stats.open}</h2>
            </div>
            <div style={{ backgroundColor: '#fff', borderLeft: '6px solid #ffc107', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '13px', color: '#666', fontWeight: 'bold' }}>IN PROGRESS</span>
              <h2 style={{ margin: '8px 0 0 0', fontSize: '28px', color: '#d39e00' }}>{stats.inProgress}</h2>
            </div>
            <div style={{ backgroundColor: '#fff', borderLeft: '6px solid #28a745', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '13px', color: '#666', fontWeight: 'bold' }}>CLOSED</span>
              <h2 style={{ margin: '8px 0 0 0', fontSize: '28px', color: '#28a745' }}>{stats.closed}</h2>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* Row 1: Pie Chart (Percentage %) + Classification Slicer */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              
              <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginTop: 0, color: '#0d3b66', fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                  📊 Issue Status Distribution (%) {selectedGroup !== 'all' && `(${selectedGroup})`}
                </h3>
                <div style={{ width: '100%', height: '280px' }}>
                  {stats.total === 0 ? (
                    <div style={{ textAlign: 'center', padding: '100px 0', color: '#888' }}>No data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={statusData.filter((d) => d.value > 0)} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={0} 
                          outerRadius={85} 
                          paddingAngle={2} 
                          dataKey="value" 
                          labelLine={true}
                          label={renderCustomPercentageLabel}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(val, name) => [
                            `${val} (${stats.total > 0 ? ((val / stats.total) * 100).toFixed(1) : 0}%)`,
                            name
                          ]} 
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                  <h3 style={{ margin: 0, color: '#0d3b66', fontSize: '16px' }}>🏷️ Classification (Click bar to cross-filter)</h3>
                </div>
                <div style={{ width: '100%', height: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classificationData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="classification" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar 
                        dataKey="count" 
                        cursor="pointer"
                        onClick={(entry) => setSelectedClassification((prev) => prev === entry.classification ? null : entry.classification)}
                        radius={[4, 4, 0, 0]}
                      >
                        {classificationData.map((entry, idx) => (
                          <Cell 
                            key={`cls-${idx}`} 
                            fill={selectedClassification === entry.classification ? '#0d3b66' : '#6b7280'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Row 2: Monthly Trend & Aging Analysis */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              
              <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginTop: 0, color: '#0d3b66', fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                  📈 Issues Created vs Closed Trend
                </h3>
                <div style={{ width: '100%', height: '260px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Created" stroke="#dc3545" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Closed" stroke="#28a745" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginTop: 0, color: '#0d3b66', fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                  ⏱️ Pending Issues Aging (Unresolved Backlog)
                </h3>
                <div style={{ width: '100%', height: '260px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingData} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="range" width={110} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {agingData.map((entry, idx) => (
                          <Cell key={`aging-${idx}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Row 3: Issues Breakdown by Location */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: '#0d3b66', fontSize: '16px' }}>
                  📍 Issues Breakdown by Location/Station ({showAllLocations ? 'All' : 'Top 20'})
                </h3>
                <button
                  onClick={() => setShowAllLocations(!showAllLocations)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderRadius: '4px',
                    border: '1px solid #0d3b66',
                    backgroundColor: '#fff',
                    color: '#0d3b66',
                    cursor: 'pointer'
                  }}
                >
                  {showAllLocations ? 'Show Top 20' : 'Show All'}
                </button>
              </div>

              <div style={{ width: '100%', height: '350px', overflowX: showAllLocations ? 'auto' : 'hidden' }}>
                <div style={{ width: chartWidth, height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayedLocationData} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="location" interval={0} angle={-30} textAnchor="end" height={50} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0d3b66" name="Total Issues" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}