'use client';

import * as React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Global Error Boundary caught error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="font-sans antialiased bg-gray-50 text-gray-900 flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow border border-gray-200 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Critical System Error</h2>
          <p className="text-sm text-gray-600 mb-6">
            A fatal error prevented the application layout from rendering.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-teal-600 text-white rounded font-medium text-sm hover:bg-teal-700 transition-colors"
          >
            Restart Application
          </button>
        </div>
      </body>
    </html>
  );
}
