"use client";

import { useRouter } from 'next/navigation';
// import { Button } from '@material-ui/core'; // You can use any UI library or your own custom styles

export default function Home() {
  const router = useRouter();

  const handleUploadRedirect = () => {
    router.push('/upload');
  };

  const handleFetchFilesRedirect = () => {
    router.push('/getAllFiles'); 
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-cyan-800">
      <h1 className="text-center text-2xl font-bold mb-8">Welcome to the Video Compression App</h1>
      <div className="flex flex-col gap-4">
        <button
          onClick={handleUploadRedirect}
          className="px-6 py-3 text-white bg-blue-500 rounded-lg shadow-lg hover:bg-blue-600 transition"
        >
          Upload Files
        </button>
        <button
          onClick={handleFetchFilesRedirect}
          className="px-6 py-3 text-white bg-green-500 rounded-lg shadow-lg hover:bg-green-600 transition"
        >
          Get All Files
        </button>
      </div>
    </div>
  );
}
