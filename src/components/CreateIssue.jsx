import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import imageCompression from 'browser-image-compression';

export default function CreateIssue({ onBackToDashboard, onIssueCreated }) {
  const [whatIssue, setWhatIssue] = useState('');
  const [description, setDescription] = useState('');
  const [groupName, setGroupName] = useState('');
  const [location, setLocation] = useState('');
  const [pic, setPic] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [classification, setClassification] = useState('');
  const [estimatedClosing, setEstimatedClosing] = useState('');
  const [file, setFile] = useState(null);
  const [onedriveLink, setOnedriveLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  // Ref untuk mengosongkan pilihan fail pada input browser
  const fileInputRef = useRef(null);

  // Batalkan / padam fail yang dipilih
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

    // Compress image if uploaded file is an image
    if (selectedFile.type.startsWith('image/')) {
      const options = {
        maxSizeMB: 0.5,           // Maximum size limit ~500 KB
        maxWidthOrHeight: 1280,   // Max resolution 1280px (HD clarity for issue tracking)
        useWebWorker: true,
      };

      try {
        setCompressing(true);
        const compressedBlob = await imageCompression(selectedFile, options);
        // Convert blob back to File object to retain filename and properties
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
      // Keep PDF, video, or documents uncompressed
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
      // 1. Get current logged-in user
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

      // 2. Upload file attachment if available
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

      // 3. Save issue record to Supabase
      const { error: insertError } = await supabase.from('issues').insert([
        {
          what_issue: whatIssue,
          description: description,
          group_name: groupName,
          location: location,
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

        {/* Group (Dropdown) */}
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Group:</label>
          <select
            required
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
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
            <option value="Transmission Line" style={{ color: '#000' }}>Transmission Line</option>
            <option value="IT" style={{ color: '#000' }}>IT</option>
          </select>
        </div>

        {/* Location / Station */}
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Location / Station:</label>
          <input 
            type="text" 
            value={location} 
            onChange={(e) => setLocation(e.target.value)} 
            required
            placeholder="Enter Location or Station" 
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
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
            <option value="A" style={{ color: '#000' }}>Class A - Safety/Quality Issue</option>
            <option value="B" style={{ color: '#000' }}>Class B - Cause to Breakdown/Downtime Production</option>
            <option value="C" style={{ color: '#000' }}>Class C - Opportunity for Improvement</option>
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

        {/* File Uploads dengan Butang Pangkah (Cancel) */}
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
            Attachment Link (Optional):
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
    </div>
  );
}