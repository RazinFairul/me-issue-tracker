import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';

export default function IssueList({ onBackToDashboard, refreshTrigger }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState(''); // Format: "YYYY-MM" (cth: "2026-09")
  const [weekFilter, setWeekFilter] = useState('All'); // 'All' | '1' | '2' | '3' | '4' | '5'
  const [statusFilter, setStatusFilter] = useState('All');
  const [classificationFilter, setClassificationFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [groupFilter, setGroupFilter] = useState('All');
  const [nameFilter, setNameFilter] = useState('All');
  const [picFilter, setPicFilter] = useState('All');

  // Est. Closing Inline Edit
  const [editingEstClosingId, setEditingEstClosingId] = useState(null);
  const [newEstClosingDate, setNewEstClosingDate] = useState('');
  const [savingEstDate, setSavingEstDate] = useState(false);

  // Update Progress & Status Modal
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [newStatus, setNewStatus] = useState('Open');
  const [progressNote, setProgressNote] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  const fetchIssues = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      alert('Error fetching issues: ' + error.message);
    } else {
      setIssues(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIssues();
  }, [refreshTrigger]);

  const uniqueLocations = useMemo(() => {
    return Array.from(new Set(issues.map((i) => i.location).filter(Boolean))).sort();
  }, [issues]);

  const uniqueNames = useMemo(() => {
    return Array.from(new Set(issues.map((i) => i.staff_name || i.staff_id).filter(Boolean))).sort();
  }, [issues]);

  const uniquePICs = useMemo(() => {
    return Array.from(new Set(issues.map((i) => i.pic_name || i.pic).filter(Boolean))).sort();
  }, [issues]);

  const handleDeleteIssue = async (issueId, issueTitle) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${issueTitle || 'this issue'}"?`);
    if (!confirmDelete) return;

    setIssues((prevIssues) => prevIssues.filter((item) => item.id !== issueId));

    const { error } = await supabase.from('issues').delete().eq('id', issueId);

    if (error) {
      alert('Failed to delete issue: ' + error.message);
      fetchIssues();
    } else {
      alert('Issue deleted successfully!');
    }
  };

  const handleSaveEstClosing = async (issueId) => {
    if (!newEstClosingDate) {
      setEditingEstClosingId(null);
      return;
    }

    setSavingEstDate(true);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('issues')
      .update({
        estimated_closing: newEstClosingDate,
        updated_at: now,
      })
      .eq('id', issueId);

    if (error) {
      alert('Failed to update Est. Closing date: ' + error.message);
    } else {
      setIssues((prev) =>
        prev.map((item) =>
          item.id === issueId ? { ...item, estimated_closing: newEstClosingDate, updated_at: now } : item
        )
      );
      setEditingEstClosingId(null);
      setNewEstClosingDate('');
    }
    setSavingEstDate(false);
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    const cleanStr = dateTimeStr.replace('T', ' ');
    const [datePart, timePart] = cleanStr.split(' ');

    if (datePart && datePart.includes('-')) {
      const [year, month, day] = datePart.split('-');
      let formattedTime = '';

      if (timePart) {
        const timeSegments = timePart.split(':');
        let hours = parseInt(timeSegments[0], 10);
        const minutes = timeSegments[1];

        if (!isNaN(hours)) {
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          formattedTime = `, ${hours}:${minutes} ${ampm}`;
        }
      }
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year.slice(-2)}${formattedTime}`;
    }
    return dateTimeStr;
  };

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '-';
    const dateOnlyPart = dateStr.split('T')[0].split(' ')[0];
    if (dateOnlyPart && dateOnlyPart.includes('-')) {
      const [year, month, day] = dateOnlyPart.split('-');
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year.slice(-2)}`;
    }
    return dateStr;
  };

  const getStatusDetails = (status) => {
    switch (status) {
      case 'In Progress (1/4)':
        return { icon: '◔', text: 'In Progress (1/4)', bg: '#fd7e14', color: '#fff' };
      case 'In Progress (2/4)':
        return { icon: '◑', text: 'In Progress (2/4)', bg: '#f59e0b', color: '#000' };
      case 'In Progress (3/4)':
        return { icon: '◕', text: 'In Progress (3/4)', bg: '#0284c7', color: '#fff' };
      case 'In Progress':
        return { icon: '◑', text: 'In Progress (2/4)', bg: '#f59e0b', color: '#000' };
      case 'Closed':
      case 'Completed':
      case 'Complete':
        return { icon: '⚫', text: 'Closed', bg: '#16a34a', color: '#fff' };
      case 'Open':
      default:
        return { icon: '⚪', text: 'Open', bg: '#dc3545', color: '#fff' };
    }
  };

  const handleUpdateProgress = async (e) => {
    e.preventDefault();
    setUpdating(true);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('issues')
      .update({
        status: newStatus,
        progress_note: progressNote,
        updated_at: now,
      })
      .eq('id', selectedIssue.id);

    if (error) {
      alert('Failed to update progress: ' + error.message);
    } else {
      alert('Progress updated successfully!');
      setSelectedIssue(null);
      setProgressNote('');
      fetchIssues();
    }
    setUpdating(false);
  };

  // Helper untuk menentukan Week ke berapa dalam bulan (1 - 5) berdasarkan hari bulan
  const getWeekOfMonth = (dateString) => {
    if (!dateString) return null;
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return null;
    const dayOfMonth = dateObj.getDate();
    // Week 1: 1-7, Week 2: 8-14, Week 3: 15-21, Week 4: 22-28, Week 5: 29-31
    return String(Math.min(5, Math.ceil(dayOfMonth / 7)));
  };

  // Logik Penapisan
  const filteredIssues = issues.filter((issue) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (issue.what_issue && issue.what_issue.toLowerCase().includes(searchLower)) ||
      (issue.description && issue.description.toLowerCase().includes(searchLower)) ||
      (issue.group_name && issue.group_name.toLowerCase().includes(searchLower)) ||
      (issue.classification && issue.classification.toLowerCase().includes(searchLower)) ||
      (issue.staff_name && issue.staff_name.toLowerCase().includes(searchLower)) ||
      (issue.staff_id && issue.staff_id.toLowerCase().includes(searchLower)) ||
      (issue.location && issue.location.toLowerCase().includes(searchLower)) ||
      (issue.pic_name && issue.pic_name.toLowerCase().includes(searchLower)) ||
      (issue.pic && issue.pic.toLowerCase().includes(searchLower));

    const issueDateRaw = issue.date_time || issue.created_at;
    const estClosingRaw = issue.estimated_closing;

    // Filter Month & Week
    let matchesMonthAndWeek = true;
    if (monthFilter) {
      const issueDateOnly = issueDateRaw ? issueDateRaw.split('T')[0].split(' ')[0] : '';
      const estDateOnly = estClosingRaw ? estClosingRaw.split('T')[0].split(' ')[0] : '';

      const issueInMonth = issueDateOnly.slice(0, 7) === monthFilter;
      const estInMonth = estDateOnly.slice(0, 7) === monthFilter;

      if (!issueInMonth && !estInMonth) {
        matchesMonthAndWeek = false;
      } else if (weekFilter !== 'All') {
        const issueWeekNum = issueInMonth ? getWeekOfMonth(issueDateOnly) : null;
        const estWeekNum = estInMonth ? getWeekOfMonth(estDateOnly) : null;
        matchesMonthAndWeek = (issueWeekNum === weekFilter) || (estWeekNum === weekFilter);
      }
    }

    let matchesStatus = true;
    if (statusFilter !== 'All') {
      if (statusFilter === 'Closed') {
        matchesStatus = issue.status === 'Closed' || issue.status === 'Completed' || issue.status === 'Complete';
      } else if (statusFilter === 'In Progress') {
        matchesStatus = Boolean(issue.status && issue.status.includes('In Progress'));
      } else {
        matchesStatus = issue.status === statusFilter;
      }
    }

    let matchesClassification = true;
    if (classificationFilter !== 'All') {
      matchesClassification = issue.classification === classificationFilter;
    }

    let matchesLocation = true;
    if (locationFilter !== 'All') {
      matchesLocation = issue.location === locationFilter;
    }

    let matchesGroup = true;
    if (groupFilter !== 'All') {
      matchesGroup = issue.group_name === groupFilter;
    }

    let matchesName = true;
    if (nameFilter !== 'All') {
      const combinedName = issue.staff_name || issue.staff_id;
      matchesName = combinedName === nameFilter;
    }

    let matchesPic = true;
    if (picFilter !== 'All') {
      const combinedPic = issue.pic_name || issue.pic;
      matchesPic = combinedPic === picFilter;
    }

    return (
      matchesSearch &&
      matchesMonthAndWeek &&
      matchesStatus &&
      matchesClassification &&
      matchesLocation &&
      matchesGroup &&
      matchesName &&
      matchesPic
    );
  });

  return (
    <div style={{ padding: '10px 20px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px', backgroundColor: '#0d3b66', padding: '15px 20px', borderRadius: '8px', color: '#fff' }}>
        <h2 style={{ margin: 0, fontSize: '22px', textAlign: 'center' }}>Issue List</h2>
      </div>

      {/* Search & Filter Section */}
      <div style={{ backgroundColor: '#fff', padding: '16px 18px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', marginBottom: '25px' }}>
        
        {/* Baris 1: Main Search */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '6px' }}>
            🔍 Search
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 35px 9px 12px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                fontSize: '13px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#888',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Baris 2: Filters Grid */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
            gap: '8px',
            alignItems: 'end'
          }}
        >
          {/* TAB GABUNGAN: MONTH & WEEK (1 to 4/5) */}
          <div style={{ minWidth: '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#444', whiteSpace: 'nowrap' }}>
                🗓️ Month & Week:
              </label>
              {/* Dropdown Week aktif jika Month telah dipilih */}
              <select
                value={weekFilter}
                onChange={(e) => setWeekFilter(e.target.value)}
                disabled={!monthFilter}
                style={{ 
                  fontSize: '10px', 
                  padding: '1px 3px', 
                  borderRadius: '3px', 
                  border: '1px solid #0d3b66', 
                  backgroundColor: monthFilter ? '#f0f4f8' : '#f1f5f9', 
                  color: monthFilter ? '#0d3b66' : '#94a3b8',
                  fontWeight: 'bold',
                  cursor: monthFilter ? 'pointer' : 'not-allowed' 
                }}
              >
                <option value="All">All Weeks</option>
                <option value="1">Week 1 (1-7)</option>
                <option value="2">Week 2 (8-14)</option>
                <option value="3">Week 3 (15-21)</option>
                <option value="4">Week 4 (22-28)</option>
                <option value="5">Week 5 (29+)</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  if (!e.target.value) setWeekFilter('All');
                }}
                style={{ width: '100%', padding: '6px 4px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '11px', boxSizing: 'border-box', cursor: 'pointer' }}
              />
              {monthFilter && (
                <button
                  onClick={() => {
                    setMonthFilter('');
                    setWeekFilter('All');
                  }}
                  title="Clear Month & Week"
                  style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', padding: '5px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Status */}
          <div style={{ minWidth: '0' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#444', display: 'block', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              📌 Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 4px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box', cursor: 'pointer' }}
            >
              <option value="All">All Statuses</option>
              <option value="Open">⚪ Open (0/4)</option>
              <option value="In Progress">◑ In Progress</option>
              <option value="Closed">⚫ Closed (4/4)</option>
            </select>
          </div>

          {/* Class */}
          <div style={{ minWidth: '0' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#444', display: 'block', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              🏷️ Class:
            </label>
            <select
              value={classificationFilter}
              onChange={(e) => setClassificationFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 4px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box', cursor: 'pointer' }}
            >
              <option value="All">All Classes</option>
              <option value="A">Class A</option>
              <option value="B">Class B</option>
              <option value="C">Class C</option>
            </select>
          </div>

          {/* Location */}
          <div style={{ minWidth: '0' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#444', display: 'block', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              📍 Location:
            </label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 4px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box', cursor: 'pointer' }}
            >
              <option value="All">All Locations</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Group */}
          <div style={{ minWidth: '0' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#444', display: 'block', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              👥 Group:
            </label>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 4px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box', cursor: 'pointer' }}
            >
              <option value="All">All Groups</option>
              <option value="Assembly Line">Assembly Line</option>
              <option value="Test Line">Test Line</option>
              <option value="Transmission">Transmission</option>
              <option value="IT">IT</option>
            </select>
          </div>

          {/* Name */}
          <div style={{ minWidth: '0' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#444', display: 'block', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              👤 Name:
            </label>
            <select
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 4px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box', cursor: 'pointer' }}
            >
              <option value="All">All Names</option>
              {uniqueNames.map((nm) => (
                <option key={nm} value={nm}>{nm}</option>
              ))}
            </select>
          </div>

          {/* PIC */}
          <div style={{ minWidth: '0' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#444', display: 'block', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              👤 PIC:
            </label>
            <select
              value={picFilter}
              onChange={(e) => setPicFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 4px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box', cursor: 'pointer' }}
            >
              <option value="All">All PICs</option>
              {uniquePICs.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Paparan Senarai Isu */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px' }}>Loading issues...</p>
      ) : filteredIssues.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '40px' }}>No issues found matching your search or filter criteria.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
          {filteredIssues.map((issue) => {
            const statusInfo = getStatusDetails(issue.status);
            const manualDate = issue.date_time || issue.created_at;

            const currentUserName =
              currentUser?.user_metadata?.full_name ||
              currentUser?.user_metadata?.name ||
              currentUser?.email?.split('@')[0] ||
              '';

            const isOwner =
              Boolean(currentUser) &&
              ((issue.user_id && issue.user_id === currentUser.id) ||
                (issue.user_email && issue.user_email.toLowerCase() === currentUser.email?.toLowerCase()) ||
                (issue.staff_name && currentUserName && issue.staff_name.trim().toLowerCase() === currentUserName.trim().toLowerCase()));

            return (
              <div
                key={issue.id}
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  padding: '14px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#666', fontWeight: 'bold' }}>
                      📅 Date: {formatDateTime(manualDate)}
                    </span>

                    {issue.classification && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: '#0d3b66',
                          backgroundColor: '#e2e8f0',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        🏷️ Class: {issue.classification}
                      </span>
                    )}
                  </div>

                  <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#0d3b66', marginBottom: '6px', textTransform: 'capitalize' }}>
                    {issue.what_issue || 'Untitled Issue'}
                  </div>

                  {issue.description && (
                    <div style={{ fontSize: '12px', color: '#555', backgroundColor: '#f1f5f9', padding: '6px 8px', borderRadius: '4px', marginBottom: '10px' }}>
                      📝 <b>Desc:</b> {issue.description}
                    </div>
                  )}

                  <div style={{ fontSize: '12px', color: '#444', display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '12px' }}>
                    <div>👥 <b>Group:</b> {issue.group_name || '-'}</div>
                    <div>👤 <b>Name:</b> {issue.staff_name || issue.staff_id || '-'}</div>
                    <div>📍 <b>Location:</b> {issue.location || '-'}</div>
                    <div>👤 <b>PIC:</b> {issue.pic_name || issue.pic || '-'}</div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span>🎯 <b>Est. Closing:</b></span>
                      {editingEstClosingId === issue.id ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="date"
                            value={newEstClosingDate}
                            onChange={(e) => setNewEstClosingDate(e.target.value)}
                            style={{ padding: '2px 5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #0d3b66' }}
                          />
                          <button
                            onClick={() => handleSaveEstClosing(issue.id)}
                            disabled={savingEstDate}
                            style={{ backgroundColor: '#0d3b66', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            {savingEstDate ? '...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingEstClosingId(null)}
                            style={{ backgroundColor: '#e2e8f0', color: '#333', border: 'none', borderRadius: '4px', padding: '3px 6px', fontSize: '11px', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 'bold', color: '#0d3b66' }}>
                            {formatDateOnly(issue.estimated_closing)}
                          </span>
                          {isOwner && (
                            <button
                              onClick={() => {
                                setEditingEstClosingId(issue.id);
                                setNewEstClosingDate(issue.estimated_closing ? issue.estimated_closing.split('T')[0].split(' ')[0] : '');
                              }}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '0 2px' }}
                              title="Edit Est. Closing"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {issue.progress_note && (
                      <div style={{ fontStyle: 'italic', color: '#555', backgroundColor: '#fff9e6', borderLeft: '3px solid #ffc107', padding: '6px 8px', borderRadius: '4px', marginTop: '4px', fontSize: '11px' }}>
                        💬 <b>Progress:</b> {issue.progress_note}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #eee', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <span
                    style={{
                      backgroundColor: statusInfo.bg,
                      color: statusInfo.color,
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <span style={{ fontSize: '14px', lineHeight: 1 }}>{statusInfo.icon}</span>
                    <span>{statusInfo.text}</span>
                  </span>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {issue.file_url && (
                      <a
                        href={issue.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '11px', color: '#0d3b66', fontWeight: 'bold', textDecoration: 'none', padding: '4px 8px', border: '1px solid #0d3b66', borderRadius: '4px', backgroundColor: '#fff' }}
                      >
                        👁️ View
                      </a>
                    )}

                    {isOwner ? (
                      <>
                        <button
                          onClick={() => {
                            setSelectedIssue(issue);
                            const currentVal = issue.status === 'Completed' || issue.status === 'Complete' 
                              ? 'Closed' 
                              : (issue.status || 'Open');
                            setNewStatus(currentVal);
                            setProgressNote(issue.progress_note || '');
                          }}
                          style={{ border: 'none', backgroundColor: '#e9ecef', cursor: 'pointer', padding: '5px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', color: '#333' }}
                        >
                          ✏️ Update
                        </button>

                        <button
                          onClick={() => handleDeleteIssue(issue.id, issue.what_issue)}
                          style={{ border: 'none', backgroundColor: '#dc3545', color: '#fff', cursor: 'pointer', padding: '5px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}
                        >
                          🗑️ Delete
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                        View only
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Update Progress & Milestone Modal */}
      {selectedIssue && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '440px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, color: '#0d3b66' }}>Update Progress & Closing Status</h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}><b>Issue:</b> {selectedIssue.what_issue}</p>

            <form onSubmit={handleUpdateProgress}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', marginBottom: '5px' }}>
                  Closing Status (Harvey Ball):
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '13px', backgroundColor: '#fff' }}
                >
                  <option value="Open">⚪ Open (0/4)</option>
                  <option value="In Progress (1/4)">◔ In Progress (1/4)</option>
                  <option value="In Progress (2/4)">◑ In Progress (2/4)</option>
                  <option value="In Progress (3/4)">◕ In Progress (3/4)</option>
                  <option value="Closed">⚫ Closed (4/4)</option>
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', marginBottom: '5px' }}>Progress Note / Updates:</label>
                <textarea
                  rows="3"
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  placeholder="Enter progress notes or updates here..."
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedIssue(null)}
                  style={{ padding: '8px 14px', border: 'none', backgroundColor: '#ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  style={{ padding: '8px 14px', border: 'none', backgroundColor: '#0d3b66', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {updating ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}