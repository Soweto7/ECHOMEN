import React from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../services/firebase';

export const Login: React.FC = () => {
  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google: ", error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-100 dark:bg-[#0A0A0A]">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to ECHO</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Your thoughts. My echo. Infinite possibility.
        </p>
        <button
          onClick={handleSignIn}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
};
