// import { toast } from 'react-toastify';

// const API_BASE_URL = import.meta.env.VITE_API_URL;

// /**
//  * Get pre-signed URL for recording upload
//  */
// export const getRecordingUploadUrl = async (sessionId, fileName, fileType, fileSize) => {
//   try {
//     const token = localStorage.getItem('token');
    
//     const response = await fetch(`${API_BASE_URL}/recording/${sessionId}/get-upload-url`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${token}`
//       },
//       body: JSON.stringify({
//         fileName,
//         fileType,
//         fileSize
//       })
//     });

//     const data = await response.json();
    
//     if (response.ok) {
//       return data.data;
//     } else {
//       throw new Error(data.message || 'Failed to get upload URL');
//     }
//   } catch (error) {
//     console.error('Error getting upload URL:', error);
//     toast.error('Failed to prepare recording upload');
//     throw error;
//   }
// };

// /**
//  * Save recording metadata to backend
//  */
// export const saveRecordingMetadata = async (sessionId, recordingData) => {
//   try {
//     const token = localStorage.getItem('token');
    
//     const response = await fetch(`${API_BASE_URL}/recording/${sessionId}/save`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${token}`
//       },
//       body: JSON.stringify(recordingData)
//     });

//     const data = await response.json();
    
//     if (response.ok) {
//       return { success: true, data: data.data };
//     } else {
//       throw new Error(data.message || 'Failed to save recording');
//     }
//   } catch (error) {
//     console.error('Error saving recording metadata:', error);
//     toast.error('Failed to save recording details');
//     throw error;
//   }
// };

// /**
//  * Complete recording upload process
//  */
// export const uploadRecordingToBackend = async (sessionId, blob, metadata = {}) => {
//   try {
//     const token = localStorage.getItem('token');
    
//     // Step 1: Get pre-signed URL
//     const fileName = metadata.fileName || `recording_${sessionId}_${Date.now()}.webm`;
    
//     const presignedData = await getRecordingUploadUrl(
//       sessionId,
//       fileName,
//       blob.type,
//       blob.size
//     );

//     // Step 2: Upload to S3
//     const uploadResponse = await fetch(presignedData.uploadUrl, {
//       method: 'PUT',
//       headers: {
//         'Content-Type': blob.type,
//       },
//       body: blob,
//     });

//     if (!uploadResponse.ok) {
//       throw new Error('S3 upload failed');
//     }

//     // Step 3: Save metadata
//     const saveData = {
//       fileUrl: presignedData.fileUrl,
//       fileName: fileName,
//       fileType: blob.type,
//       duration: metadata.duration || 0,
//       fileSize: blob.size,
//       s3Key: presignedData.fileKey,
//       thumbnailUrl: metadata.thumbnailUrl || '',
//       recordedAt: new Date().toISOString()
//     };

//     const saveResult = await saveRecordingMetadata(sessionId, saveData);

//     return {
//       success: true,
//       data: {
//         ...saveData,
//         id: saveResult.data?.recording?.id || Date.now()
//       }
//     };

//   } catch (error) {
//     console.error('Complete upload error:', error);
//     throw error;
//   }
// };

// /**
//  * Fetch session recordings
//  */
// export const fetchSessionRecordings = async (sessionId) => {
//   try {
//     const token = localStorage.getItem('token');
    
//     const response = await fetch(`${API_BASE_URL}/recording/${sessionId}/recordings`, {
//       headers: {
//         'Authorization': `Bearer ${token}`
//       }
//     });

//     const data = await response.json();
    
//     if (response.ok) {
//       return data.data || [];
//     } else {
//       throw new Error(data.message || 'Failed to fetch recordings');
//     }
//   } catch (error) {
//     console.error('Error fetching recordings:', error);
//     throw error;
//   }
// };

// /**
//  * Delete recording
//  */
// export const deleteRecording = async (sessionId, recordingId) => {
//   try {
//     const token = localStorage.getItem('token');
    
//     const response = await fetch(`${API_BASE_URL}/recording/${sessionId}/recordings/${recordingId}`, {
//       method: 'DELETE',
//       headers: {
//         'Authorization': `Bearer ${token}`
//       }
//     });

//     const data = await response.json();
    
//     if (response.ok) {
//       return { success: true, data: data.data };
//     } else {
//       throw new Error(data.message || 'Failed to delete recording');
//     }
//   } catch (error) {
//     console.error('Error deleting recording:', error);
//     throw error;
//   }
// };









// import { toast } from 'react-toastify';

// const API_BASE_URL = import.meta.env.VITE_API_URL;

// /**
//  * ✅ FIX: Safe Response Handler
//  * Ye function pehle text check karega, agar khali hai to crash nahi hone dega.
//  */
// const handleResponse = async (response, context) => {
//   const text = await response.text(); // Pehle text read karo
  
//   // Debugging ke liye log karo ki server ne kya bheja
//   console.log(`[${context}] Raw Response:`, text); 

//   let data = {};
  
//   try {
//     // Agar text hai tabhi JSON parse karo, warna empty object maano
//     data = text ? JSON.parse(text) : {}; 
//   } catch (err) {
//     console.error(`[${context}] JSON Parse Error. Received:`, text);
//     throw new Error(`Server Error: Response was not valid JSON. Status: ${response.status}`);
//   }

//   if (!response.ok) {
//     throw new Error(data.message || `API Error: ${response.status}`);
//   }
  
//   return data;
// };

// /**
//  * Get pre-signed URL for recording upload
//  */
// export const getRecordingUploadUrl = async (sessionId, fileName, fileType, fileSize) => {
//   try {
//     const token = localStorage.getItem('token');
    
//     console.log("1. Requesting Upload URL...");

//     const response = await fetch(`${API_BASE_URL}/recording/${sessionId}/get-upload-url`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${token}`
//       },
//       body: JSON.stringify({
//         fileName,
//         fileType,
//         fileSize
//       })
//     });

//     // Yahan hum safe handler use kar rahe hain
//     const data = await handleResponse(response, 'getRecordingUploadUrl');
    
//     // Check karo ki data structure sahi hai ya nahi
//     if (!data.data || !data.data.uploadUrl) {
//         console.error("Invalid Response Structure:", data);
//         throw new Error("Server responded with 200 OK but 'uploadUrl' is missing!");
//     }

//     return data.data;

//   } catch (error) {
//     console.error('Error getting upload URL:', error);
//     toast.error(`Upload Init Failed: ${error.message}`);
//     throw error;
//   }
// };

// /**
//  * Save recording metadata to backend
//  */
// export const saveRecordingMetadata = async (sessionId, recordingData) => {
//   try {
//     const token = localStorage.getItem('token');
    
//     console.log("3. Saving Metadata...");

//     const response = await fetch(`${API_BASE_URL}/recording/${sessionId}/save`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${token}`
//       },
//       body: JSON.stringify(recordingData)
//     });

//     const data = await handleResponse(response, 'saveRecordingMetadata');
//     return { success: true, data: data.data };

//   } catch (error) {
//     console.error('Error saving recording metadata:', error);
//     // Silent fail mat karo, user ko batao
//     toast.error('Video uploaded but metadata save failed.'); 
//     throw error;
//   }
// };

// /**
//  * Complete recording upload process
//  */
// export const uploadRecordingToBackend = async (sessionId, blob, metadata = {}) => {
//   try {
//     // MIME type fix (S3 ke liye zaroori hai)
//     const safeFileType = 'video/webm'; 
//     const fileName = metadata.fileName || `recording_${sessionId}_${Date.now()}.webm`;
    
//     // Step 1: Get URL
//     const presignedData = await getRecordingUploadUrl(
//       sessionId,
//       fileName,
//       safeFileType,
//       blob.size
//     );

//     console.log("2. Uploading to S3...", presignedData.uploadUrl);

//     // Step 2: Upload to S3 (Isme Authorization header mat bhejna!)
//     const uploadResponse = await fetch(presignedData.uploadUrl, {
//       method: 'PUT',
//       headers: {
//         'Content-Type': safeFileType, 
//       },
//       body: blob,
//     });

//     // S3 usually JSON return nahi karta, isliye .ok check kaafi hai
//     if (!uploadResponse.ok) {
//       const errText = await uploadResponse.text();
//       console.error("S3 Error:", errText);
//       throw new Error(`S3 Upload Failed: ${uploadResponse.status}`);
//     }

//     console.log("✅ S3 Upload Success");

//     // Step 3: Save Metadata
//     const saveData = {
//       fileUrl: presignedData.fileUrl,
//       fileName: fileName,
//       fileType: safeFileType,
//       duration: metadata.duration || 0,
//       fileSize: blob.size,
//       s3Key: presignedData.fileKey,
//       thumbnailUrl: metadata.thumbnailUrl || '',
//       recordedAt: new Date().toISOString()
//     };

//     const saveResult = await saveRecordingMetadata(sessionId, saveData);

//     return {
//       success: true,
//       data: { ...saveData, id: saveResult.data?.id }
//     };

//   } catch (error) {
//     console.error('Complete upload flow failed:', error);
//     throw error;
//   }
// };




import { toast } from 'react-toastify';
// ✅ UPDATED: New API endpoints according to your backend
const API_BASE_URL = import.meta.env.VITE_API_URL;

/**
 * ✅ FIX: Get pre-signed URL for recording upload (Updated for new API)
 */
export const getRecordingUploadUrl = async (sessionId, fileName, fileType, fileSize) => {
  try {
    const token = localStorage.getItem('token');
    
    console.log("1. Requesting Upload URL... (New API)");
    console.log("Session ID:", sessionId);
    console.log("File:", fileName);

    // ✅ UPDATED: New API endpoint with correct path
    const response = await fetch(`${API_BASE_URL}/recording/${sessionId}/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fileName,
        fileType: fileType || "video/webm",
        fileSize: fileSize || 0
      })
    });

    // ✅ Updated safe response handler
    const text = await response.text();
    console.log("[getRecordingUploadUrl] Raw Response:", text);

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      console.error("[getRecordingUploadUrl] JSON Parse Error:", text);
      throw new Error(`Server Error: Invalid JSON response. Status: ${response.status}`);
    }

    if (!response.ok) {
      throw new Error(data.message || `API Error: ${response.status}`);
    }

    // ✅ Check new response structure
    if (!data.data || !data.data.uploadUrl) {
      console.error("Invalid Response Structure:", data);
      throw new Error("Server responded with 200 OK but 'uploadUrl' is missing!");
    }

    console.log("✅ Upload URL received:", data.data.uploadUrl.substring(0, 100) + "...");
    return data.data;

  } catch (error) {
    console.error('❌ Error getting upload URL:', error);
    throw error;
  }
};

/**
 * ✅ FIX: Save recording metadata to backend (Updated for new API)
 */
export const saveRecordingMetadata = async (sessionId, recordingData) => {
  try {
    const token = localStorage.getItem('token');
    
    console.log("3. Saving Metadata... (New API)");
    console.log("Session ID:", sessionId);
    console.log("Recording Data:", recordingData);

    // ✅ UPDATED: New API endpoint with correct path
    const response = await fetch(`${API_BASE_URL}/recording/${sessionId}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(recordingData)
    });

    // ✅ Updated safe response handler
    const text = await response.text();
    console.log("[saveRecordingMetadata] Raw Response:", text);

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      console.error("[saveRecordingMetadata] JSON Parse Error:", text);
      throw new Error(`Server Error: Invalid JSON response. Status: ${response.status}`);
    }

    if (!response.ok) {
      throw new Error(data.message || `API Error: ${response.status}`);
    }

    console.log("✅ Metadata saved successfully:", data);
    return { success: true, data: data.data };

  } catch (error) {
    console.error('❌ Error saving recording metadata:', error);
    throw error;
  }
};

/**
 * ✅ FIX: Get download URL for a recording (NEW FUNCTION)
 */
export const getRecordingDownloadUrl = async (sessionId, recordingId) => {
  try {
    const token = localStorage.getItem('token');
    
    console.log(`Getting download URL for recording: ${recordingId}`);

    // ✅ NEW: Download URL API endpoint
    const response = await fetch(`${API_BASE_URL}/recording/${sessionId}/${recordingId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const text = await response.text();
    console.log("[getRecordingDownloadUrl] Raw Response:", text);

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      console.error("[getRecordingDownloadUrl] JSON Parse Error:", text);
      throw new Error(`Server Error: Invalid JSON response. Status: ${response.status}`);
    }

    if (!response.ok) {
      throw new Error(data.message || `API Error: ${response.status}`);
    }

    if (!data.data || !data.data.downloadUrl) {
      console.error("Invalid Response Structure:", data);
      throw new Error("Server responded with 200 OK but 'downloadUrl' is missing!");
    }

    console.log("✅ Download URL received");
    return data.data;

  } catch (error) {
    console.error('❌ Error getting download URL:', error);
    throw error;
  }
};

/**
 * ✅ UPDATED: Complete recording upload process (Optimized)
 */
export const uploadRecordingToBackend = async (sessionId, blob, metadata = {}) => {
  try {
    console.log("🎬 Starting complete recording upload flow...");
    
    // ✅ Step 1: Generate safe filename
    const safeFileType = blob.type || 'video/webm';
    const timestamp = Date.now();
    const originalFileName = metadata.fileName || `recording_${sessionId}_${timestamp}.webm`;
    const safeFileName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    
    console.log("📁 File info:", {
      fileName: safeFileName,
      fileType: safeFileType,
      fileSize: blob.size,
      sessionId: sessionId
    });

    // ✅ Step 2: Get presigned upload URL from NEW API
    const presignedData = await getRecordingUploadUrl(
      sessionId,
      safeFileName,
      safeFileType,
      blob.size
    );

    if (!presignedData?.uploadUrl) {
      throw new Error('Failed to get upload URL from new API');
    }

    console.log("2. Uploading to S3 via presigned URL...");
    console.log("Upload URL:", presignedData.uploadUrl.substring(0, 100) + "...");

    // ✅ Step 3: Upload to S3 using presigned URL (NO Authorization header!)
    const uploadResponse = await fetch(presignedData.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': safeFileType,
      },
      body: blob,
    });

    // ✅ S3 upload response check
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("❌ S3 Upload Error Response:", errorText);
      throw new Error(`S3 Upload Failed: ${uploadResponse.status} - ${errorText}`);
    }

    console.log("✅ S3 Upload Success");

    // ✅ Step 4: Prepare metadata for NEW API structure
    const recordingMetadata = {
      fileUrl: presignedData.fileUrl,
      fileName: safeFileName,
      fileType: safeFileType,
      duration: metadata.duration || 0,
      fileSize: blob.size,
      s3Key: presignedData.fileKey || presignedData.fileUrl,
      thumbnailUrl: metadata.thumbnailUrl || '',
      recordingTitle: metadata.title || `Recording ${new Date().toLocaleDateString()}`,
      description: metadata.description || `Recording of session ${sessionId}`,
      // ✅ Optional fields for new API
      recordedAt: new Date().toISOString(),
      metadata: {
        originalFileName: originalFileName,
        sessionId: sessionId,
        uploadType: "auto"
      }
    };

    console.log("3. Saving metadata via new API...");
    console.log("Metadata:", recordingMetadata);

    // ✅ Step 5: Save metadata using NEW API
    const saveResult = await saveRecordingMetadata(sessionId, recordingMetadata);

    if (!saveResult.success) {
      throw new Error('Failed to save recording metadata');
    }

    console.log("✅ Complete upload flow successful!");
    return {
      success: true,
      data: { 
        ...recordingMetadata, 
        id: saveResult.data?.recording?._id || saveResult.data?.id,
        sessionId: sessionId
      }
    };

  } catch (error) {
    console.error('❌ Complete upload flow failed:', error);
    throw error;
  }
};

/**
 * ✅ HELPER: Format file size for display
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * ✅ HELPER: Validate recording file
 */
export const validateRecordingFile = (file) => {
  const errors = [];
  
  if (!file.fileName) errors.push("File name is required");
  if (!file.fileType) errors.push("File type is required");
  
  // Allowed types according to new controller
  const allowedTypes = [
    'video/mp4',
    'video/webm', 
    'video/quicktime',
    'video/x-matroska',
    'video/x-msvideo',
    'video/ogg'
  ];
  
  if (!allowedTypes.includes(file.fileType)) {
    errors.push(`File type ${file.fileType} not allowed. Allowed: ${allowedTypes.join(', ')}`);
  }
  
  // Size limit (2GB) according to new controller
  if (file.fileSize && file.fileSize > 2 * 1024 * 1024 * 1024) {
    errors.push("File size exceeds 2GB limit");
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};














