"use client";

import { useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const UploadFile = () => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please choose files first');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('videos', file)); 

    setIsLoading(true); 

    try {
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      setIsLoading(false); 

      if (response.ok) {
        toast.success('Upload successful');
        setFiles([]); 
        document.querySelector('input[type="file"]').value = '';
      } else {
        toast.error('Upload failed');
      }
    } catch (error) {
      setIsLoading(false);
      toast.error('An error occurred');
    }
  };

  return (
    <div className="flex flex-col items-center w-full h-screen p-6 bg-cyan-800 rounded-lg shadow-lg">
      <input
        type="file"
        onChange={handleFileChange}
        className="mb-4 p-2 w-full border border-gray-300 rounded-lg"
        multiple 
        disabled={isLoading} 
      />
      <button
        onClick={handleUpload}
        className={`px-6 py-3 text-white rounded-lg ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-700'}`}
        disabled={isLoading} 
      >
        {isLoading ? 'Uploading...' : 'Upload'}
      </button>
      {isLoading && (
        <div className="mt-4">
          <div className="loader"></div>
          <style jsx>{`
            .loader {
              border: 4px solid rgba(0, 0, 0, 0.1);
              border-top: 4px solid #3498db;
              border-radius: 50%;
              width: 36px;
              height: 36px;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              0% {
                transform: rotate(0deg);
              }
              100% {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      )}
      <ToastContainer />
    </div>
  );
};

export default UploadFile;
