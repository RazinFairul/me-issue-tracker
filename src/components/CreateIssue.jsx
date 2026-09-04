import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Dapatkan data pengguna yang sedang log masuk
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

      // 2. Upload fail lampiran jika ada
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

      // 3. Simpan isu ke Supabase bersama maklumat pemilik (user_id & user_email)
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

        {/* File Uploads */}
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>File Uploads:</label>
          <input 
            type="file" 
            accept="image/*,video/*,.pdf,.doc,.docx"
            onChange={(e) => setFile(e.target.files[0])} 
            style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
          <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
            Max: 50 MB
          </small>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '12px', 
            backgroundColor: '#0d3b66', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '5px', 
            fontWeight: 'bold', 
            fontSize: '16px', 
            cursor: loading ? 'not-allowed' : 'pointer', 
            marginTop: '10px' 
          }}
        >
          {loading ? 'Submitting...' : 'Submit Issue'}
        </button>
      </form>
    </div>
  );
}