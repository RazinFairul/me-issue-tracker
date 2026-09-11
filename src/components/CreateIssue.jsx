import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import imageCompression from 'browser-image-compression';

export default function CreateIssue({ onBackToDashboard, onIssueCreated }) {
  const [whatIssue, setWhatIssue] = useState('');
  const [description, setDescription] = useState('');
  const [groupName, setGroupName] = useState('');
  const [location, setLocation] = useState('');
  const [engineVariant, setEngineVariant] = useState('');
  const [pic, setPic] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [classification, setClassification] = useState('');
  const [estimatedClosing, setEstimatedClosing] = useState('');
  const [file, setFile] = useState(null);
  const [onedriveLink, setOnedriveLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  // Dynamic stations state
  const [stationList, setStationList] = useState([]);
  const [isAddingStation, setIsAddingStation] = useState(false);
  const [newStationCode, setNewStationCode] = useState('');
  const [stationLoading, setStationLoading] = useState(false);

  // Dynamic engine variants state
  const [variantList, setVariantList] = useState([]);
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [newVariantName, setNewVariantName] = useState('');
  const [variantLoading, setVariantLoading] = useState(false);

  // Modal Picker States (Untuk rupa Android Dialog pada semua fon)
  const [openStationModal, setOpenStationModal] = useState(false);
  const [stationSearchQuery, setStationSearchQuery] = useState('');

  const [openVariantModal, setOpenVariantModal] = useState(false);
  const [variantSearchQuery, setVariantSearchQuery] = useState('');

  const fileInputRef = useRef(null);

  // Fetch stations from Supabase table based on selected Group
  useEffect(() => {
    if (!groupName) {
      setStationList([]);
      setLocation('');
      return;
    }

    const fetchStations = async () => {
      setStationLoading(true);
      try {
        let query = supabase.from('stations').select('station_code, group_name');

        if (groupName !== 'IT') {
          query = query.eq('group_name', groupName);
        }

        const { data, error } = await query.order('station_code', { ascending: true });

        if (!error && data) {
          const uniqueStations = Array.from(new Set(data.map((item) => item.station_code))).sort();
          setStationList(uniqueStations);
        } else {
          setStationList([]);
        }
      } catch (err) {
        console.error('Failed to fetch stations:', err);
        setStationList([]);
      } finally {
        setStationLoading(false);
      }
    };

    fetchStations();
  }, [groupName]);

  // Fetch engine variants from Supabase table on load
  useEffect(() => {
    const fetchVariants = async () => {
      setVariantLoading(true);
      try {
        const { data, error } = await supabase
          .from('engine_variants')
          .select('variant_name')
          .order('variant_name', { ascending: true });

        if (!error && data) {
          const uniqueVariants = Array.from(new Set(data.map((item) => item.variant_name))).sort();
          setVariantList(uniqueVariants);
        } else {
          setVariantList([]);
        }
      } catch (err) {
        console.error('Failed to fetch engine variants:', err);
        setVariantList([]);
      } finally {
        setVariantLoading(false);
      }
    };

    fetchVariants();
  }, []);

  // Handle group change
  const handleGroupChange = (e) => {
    const selectedGroup = e.target.value;
    setGroupName(selectedGroup);
    setLocation('');
    setIsAddingStation(false);
  };

  // Add new station to Supabase
  const handleAddNewStation = async () => {
    const trimmed = newStationCode.trim().toUpperCase();
    if (!trimmed) {
      alert('Please enter a station code.');
      return;
    }

    if (stationList.includes(trimmed)) {
      alert('This station already exists in the list.');
      return;
    }

    setStationLoading(true);
    const targetGroup = groupName || 'Assembly Line';

    const { error } = await supabase.from('stations').insert([
      { group_name: targetGroup, station_code: trimmed }
    ]);

    if (error) {
      alert('Failed to add station: ' + error.message);
    } else {
      const updated = [...stationList, trimmed].sort();
      setStationList(updated);
      setLocation(trimmed);
      setNewStationCode('');
      setIsAddingStation(false);
    }
    setStationLoading(false);
  };

  // Delete station from Supabase
  const handleDeleteSelectedStation = async () => {
    if (!location) {
      alert('Please select a station to delete.');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete station "${location}" from the system?`
    );
    if (!confirmDelete) return;

    setStationLoading(true);
    let query = supabase.from('stations').delete().eq('station_code', location);

    if (groupName !== 'IT') {
      query = query.eq('group_name', groupName);
    }

    const { error } = await query;

    if (error) {
      alert('Failed to delete station: ' + error.message);
    } else {
      const updated = stationList.filter((s) => s !== location);
      setStationList(updated);
      setLocation('');
      alert(`Station "${location}" has been deleted successfully.`);
    }
    setStationLoading(false);
  };

  // Add new engine variant to Supabase
  const handleAddNewVariant = async () => {
    const trimmed = newVariantName.trim().toUpperCase();
    if (!trimmed) {
      alert('Please enter an engine variant name.');
      return;
    }

    if (variantList.includes(trimmed)) {
      alert('This engine variant already exists in the list.');
      return;
    }

    setVariantLoading(true);
    const { error } = await supabase.from('engine_variants').insert([
      { variant_name: trimmed }
    ]);

    if (error) {
      alert('Failed to add engine variant: ' + error.message);
    } else {
      const updated = [...variantList, trimmed].sort();
      setVariantList(updated);
      setEngineVariant(trimmed);
      setNewVariantName('');
      setIsAddingVariant(false);
    }
    setVariantLoading(false);
  };

  // Delete engine variant from Supabase
  const handleDeleteSelectedVariant = async () => {
    if (!engineVariant) {
      alert('Please select an engine variant to delete.');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete engine variant "${engineVariant}" from the system?`
    );
    if (!confirmDelete) return;

    setVariantLoading(true);
    const { error } = await supabase
      .from('engine_variants')
      .delete()
      .eq('variant_name', engineVariant);

    if (error) {
      alert('Failed to delete engine variant: ' + error.message);
    } else {
      const updated = variantList.filter((v) => v !== engineVariant);
      setVariantList(updated);
      setEngineVariant('');
      alert(`Engine variant "${engineVariant}" has been deleted successfully.`);
    }
    setVariantLoading(false);
  };

  // Remove selected file attachment
  const handleRemoveFile = () => {
    setFile(null);
    setCompressing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle file selection and automatic image compression
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (selectedFile.type.startsWith('image/')) {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };

      try {
        setCompressing(true);
        const compressedBlob = await imageCompression(selectedFile, options);
        const compressedFile = new File([compressedBlob], selectedFile.name, {
          type: selectedFile.type,
          lastModified: Date.now(),
        });
        setFile(compressedFile);
      } catch (error) {
        console.error('Image compression failed, using original file:', error);
        setFile(selectedFile);
      } finally {
        setCompressing(false);
      }
    } else {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (compressing) {
      alert('Please wait, image is still being compressed...');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('You must be logged in to create an issue.');
      }

      const autoStaffName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split('@')[0] ||
        'Staff';

      const staffEmail = user?.email || null;
      let fileUrl = null;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('issue-attachments')
          .upload(filePath, file);

        if (uploadError) {
          throw new Error('File upload failed: ' + uploadError.message);
        }

        const { data: urlData } = supabase.storage
          .from('issue-attachments')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase.from('issues').insert([
        {
          what_issue: whatIssue,
          description: description,
          group_name: groupName,
          location: location.trim() || null,
          engine_variant: engineVariant.trim() || null,
          pic: pic,
          pic_name: pic,
          pic_email: staffEmail,
          date_time: dateTime || null,
          classification: classification,
          estimated_closing: estimatedClosing,
          staff_name: autoStaffName,
          staff_id: user?.user_metadata?.staff_id || null,
          file_url: fileUrl,
          onedrive_link: onedriveLink.trim() || null,
          user_id: user.id,
          user_email: user.email,
          status: 'Open',
        },
      ]);

      if (insertError) {
        throw insertError;
      }

      alert('Issue submitted successfully!');

      if (onIssueCreated) {
        onIssueCreated();
      } else if (onBackToDashboard) {
        onBackToDashboard();
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Tapis senarai mengikut carian dalam modal
  const filteredModalStations = stationList.filter((s) =>
    s.toLowerCase().includes(stationSearchQuery.toLowerCase())
  );

  const filteredModalVariants = variantList.filter((v) =>
    v.toLowerCase().includes(variantSearchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '10px 20px 30px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ color: '#0d3b66', marginTop: '0', marginBottom: '20px' }}>Open Issue</h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* What the Issue */}
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>What the Issue:</label>
          <input 
            type="text" 
            value={whatIssue} 
            onChange={(e) => setWhatIssue(e.target.value)} 
            required
            placeholder="Enter the Issue"
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        {/* Description */}
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Description:</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            rows="4" 
            required
            placeholder="Enter a Description" 
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        {/* Group Dropdown */}
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Group:</label>
          <select
            required
            value={groupName}
            onChange={handleGroupChange}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '5px',
              border: '1px solid #ccc',
              boxSizing: 'border-box',
              backgroundColor: '#fff',
              cursor: 'pointer',
              color: groupName ? '#000' : '#888'
            }}
          >
            <option value="" disabled hidden>Choose Group</option>
            <option value="Assembly Line" style={{ color: '#000' }}>Assembly Line</option>
            <option value="Test Line" style={{ color: '#000' }}>Test Line</option>
            <option value="7DCT" style={{ color: '#000' }}>7DCT</option>
            <option value="EDU & DHT" style={{ color: '#000' }}>EDU & DHT</option>
            <option value="IT" style={{ color: '#000' }}>IT (All Stations)</option>
          </select>
        </div>

        {/* Station (Modal Radio Picker) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <label style={{ fontWeight: 'bold' }}>Station (Optional):</label>
            {groupName && (
              <button
                type="button"
                onClick={() => setIsAddingStation(!isAddingStation)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textDecoration: 'underline'
                }}
              >
                {isAddingStation ? '← Back to select' : '+ Add New Station'}
              </button>
            )}
          </div>

          {isAddingStation ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Example: STN700M / STN700A-C"
                value={newStationCode}
                onChange={(e) => setNewStationCode(e.target.value.toUpperCase())}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #2563eb',
                  boxSizing: 'border-box',
                  textTransform: 'uppercase'
                }}
              />
              <button
                type="button"
                onClick={handleAddNewStation}
                disabled={stationLoading}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {stationLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* Kotak pilihan yang membuka Modal Picker bila disentuh */}
              <div
                onClick={() => {
                  if (groupName) {
                    setStationSearchQuery('');
                    setOpenStationModal(true);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ccc',
                  boxSizing: 'border-box',
                  backgroundColor: !groupName ? '#f8fafc' : '#fff',
                  color: location ? '#000' : '#888',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: !groupName ? 'not-allowed' : 'pointer'
                }}
              >
                <span>
                  {location
                    ? location
                    : !groupName
                    ? 'Please select Group first'
                    : stationLoading
                    ? 'Loading stations...'
                    : `-- Select Station (${stationList.length} available) --`}
                </span>
                <span style={{ fontSize: '11px', color: '#666' }}>▼</span>
              </div>

              {location && (
                <button
                  type="button"
                  onClick={handleDeleteSelectedStation}
                  title="Delete this station from database"
                  disabled={stationLoading}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    borderRadius: '5px',
                    padding: '8px 12px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🗑️ Delete
                </button>
              )}
            </div>
          )}
        </div>

        {/* Engine Variant (Modal Radio Picker) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <label style={{ fontWeight: 'bold' }}>Engine Variant (Optional):</label>
            <button
              type="button"
              onClick={() => setIsAddingVariant(!isAddingVariant)}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                textDecoration: 'underline'
              }}
            >
              {isAddingVariant ? '← Back to select' : '+ Add New Variant'}
            </button>
          </div>

          {isAddingVariant ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Example: CFN-000 / AFD-A09"
                value={newVariantName}
                onChange={(e) => setNewVariantName(e.target.value.toUpperCase())}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #2563eb',
                  boxSizing: 'border-box',
                  textTransform: 'uppercase'
                }}
              />
              <button
                type="button"
                onClick={handleAddNewVariant}
                disabled={variantLoading}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {variantLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <div
                onClick={() => {
                  setVariantSearchQuery('');
                  setOpenVariantModal(true);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ccc',
                  boxSizing: 'border-box',
                  backgroundColor: '#fff',
                  color: engineVariant ? '#000' : '#888',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <span>
                  {engineVariant
                    ? engineVariant
                    : variantLoading
                    ? 'Loading engine variants...'
                    : `-- Select Engine Variant (${variantList.length} available) --`}
                </span>
                <span style={{ fontSize: '11px', color: '#666' }}>▼</span>
              </div>

              {engineVariant && (
                <button
                  type="button"
                  onClick={handleDeleteSelectedVariant}
                  title="Delete this engine variant from database"
                  disabled={variantLoading}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    borderRadius: '5px',
                    padding: '8px 12px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🗑️ Delete
                </button>
              )}
            </div>
          )}
        </div>

        {/* Person in Charge (PIC) */}
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Person in Charge (PIC):</label>
          <input 
            type="text" 
            value={pic} 
            onChange={(e) => setPic(e.target.value)} 
            required 
            placeholder="Enter Person in Charge"
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        {/* Time and Date */}
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Time and Date:</label>
          <input 
            type="datetime-local" 
            value={dateTime} 
            onChange={(e) => setDateTime(e.target.value)} 
            required 
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        {/* Issue Classification */}
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Issue Classification:</label>
          <select 
            required
            value={classification} 
            onChange={(e) => setClassification(e.target.value)} 
            style={{ 
              width: '100%', 
              padding: '10px', 
              borderRadius: '5px', 
              border: '1px solid #ccc', 
              boxSizing: 'border-box', 
              backgroundColor: '#fff', 
              cursor: 'pointer', 
              color: classification ? '#000' : '#888'
            }}
          >
            <option value="" disabled hidden>Choose Issue Classification</option>
            <option value="A" style={{ color: '#000' }}>Class A - Safety / Quality Issue / Government Issue / Without Temporary Countermeasure</option>
            <option value="B" style={{ color: '#000' }}>Class B - Cause to Breakdown / Downtime Production / With Temporary Countermeasure</option>
            <option value="C" style={{ color: '#000' }}>Class C - Minor Issue / Improvement</option>
          </select>
        </div>

        {/* Estimated Time of Closing */}
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Estimated Time of Closing Issue:</label>
          <input 
            type="date" 
            value={estimatedClosing} 
            onChange={(e) => setEstimatedClosing(e.target.value)} 
            required 
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        {/* File Uploads with Cancel Button */}
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>File Uploads:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*,video/*,.pdf,.doc,.docx"
              onChange={handleFileChange} 
              style={{ 
                flex: 1, 
                padding: '8px', 
                borderRadius: '5px', 
                border: '1px solid #ccc', 
                boxSizing: 'border-box', 
                backgroundColor: '#fff'
              }}
            />
            {file && (
              <button
                type="button"
                onClick={handleRemoveFile}
                title="Cancel and remove selected file"
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  borderRadius: '5px',
                  padding: '8px 12px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap'
                }}
              >
                ✕ Cancel
              </button>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px', flexWrap: 'wrap', gap: '4px' }}>
            <small style={{ color: '#666' }}>Max: 50 MB (Images will be automatically compressed)</small>
            {compressing && <span style={{ color: '#0284c7', fontWeight: 'bold' }}>⏳ Compressing image...</span>}
            {!compressing && file && file.type.startsWith('image/') && (
              <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ {(file.size / 1024).toFixed(0)} KB ready</span>
            )}
          </div>
        </div>

        {/* Attachment Link */}
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
            Attachment Link:
          </label>
          <input 
            type="url" 
            value={onedriveLink} 
            onChange={(e) => setOnedriveLink(e.target.value)} 
            placeholder="Enter Link" 
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
          <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
            *Recommended for large files or videos exceeding standard size (OneDrive, SharePoint, or Google Drive).
          </small>
        </div>

        <button 
          type="submit" 
          disabled={loading || compressing}
          style={{ 
            padding: '12px', 
            backgroundColor: loading || compressing ? '#94a3b8' : '#0d3b66', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '5px', 
            fontWeight: 'bold', 
            fontSize: '16px', 
            cursor: loading || compressing ? 'not-allowed' : 'pointer', 
            marginTop: '10px' 
          }}
        >
          {loading ? 'Submitting...' : compressing ? 'Optimizing Image...' : 'Submit Issue'}
        </button>
      </form>

      {/* ========================================================= */}
      {/* MODAL PICKER STATION (SAMA DI ANDROID & IOS)             */}
      {/* ========================================================= */}
      {openStationModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}
          onClick={() => setOpenStationModal(false)}
        >
          <div
            style={{
              backgroundColor: '#1f2430',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '380px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div style={{ padding: '16px 20px 10px', borderBottom: '1px solid #2d3342' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ color: '#fff', fontSize: '17px', fontWeight: 'bold' }}>Select Station</span>
                <button
                  type="button"
                  onClick={() => setOpenStationModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Kotak Search di Dalam Modal */}
              <input
                type="text"
                placeholder="🔍 Search station..."
                value={stationSearchQuery}
                onChange={(e) => setStationSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  boxSizing: 'border-box',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* List Radio Button Beralun */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0', WebkitOverflowScrolling: 'touch' }}>
              {filteredModalStations.length > 0 ? (
                filteredModalStations.map((stn) => {
                  const isSelected = location === stn;
                  return (
                    <div
                      key={stn}
                      onClick={() => {
                        setLocation(stn);
                        setOpenStationModal(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 20px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #2d3342',
                        backgroundColor: isSelected ? '#283042' : 'transparent'
                      }}
                    >
                      <span style={{ color: '#fff', fontSize: '16px', fontWeight: isSelected ? 'bold' : 'normal' }}>
                        {stn}
                      </span>
                      {/* Radio Circle Bulat sebiji macam Android */}
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: isSelected ? '6px solid #6366f1' : '2px solid #64748b',
                          backgroundColor: isSelected ? '#fff' : 'transparent',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '20px', color: '#94a3b8', textAlign: 'center', fontSize: '14px' }}>
                  No station found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL PICKER ENGINE VARIANT (SAMA DI ANDROID & IOS)      */}
      {/* ========================================================= */}
      {openVariantModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}
          onClick={() => setOpenVariantModal(false)}
        >
          <div
            style={{
              backgroundColor: '#1f2430',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '380px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div style={{ padding: '16px 20px 10px', borderBottom: '1px solid #2d3342' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ color: '#fff', fontSize: '17px', fontWeight: 'bold' }}>Select Engine Variant</span>
                <button
                  type="button"
                  onClick={() => setOpenVariantModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Kotak Search Engine Variant */}
              <input
                type="text"
                placeholder="🔍 Search variant..."
                value={variantSearchQuery}
                onChange={(e) => setVariantSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  boxSizing: 'border-box',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* List Radio Button Variant */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0', WebkitOverflowScrolling: 'touch' }}>
              {filteredModalVariants.length > 0 ? (
                filteredModalVariants.map((v) => {
                  const isSelected = engineVariant === v;
                  return (
                    <div
                      key={v}
                      onClick={() => {
                        setEngineVariant(v);
                        setOpenVariantModal(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 20px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #2d3342',
                        backgroundColor: isSelected ? '#283042' : 'transparent'
                      }}
                    >
                      <span style={{ color: '#fff', fontSize: '16px', fontWeight: isSelected ? 'bold' : 'normal' }}>
                        {v}
                      </span>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: isSelected ? '6px solid #6366f1' : '2px solid #64748b',
                          backgroundColor: isSelected ? '#fff' : 'transparent',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '20px', color: '#94a3b8', textAlign: 'center', fontSize: '14px' }}>
                  No engine variant found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}