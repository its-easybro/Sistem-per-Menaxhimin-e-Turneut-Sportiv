import React from 'react';

const Home = () => {
  return (
    // Placeholder home content shown at the root route.
    <div className="min-h-[60vh] bg-gray-50 px-4 py-16 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600 dark:text-blue-300">
          Home
        </p>
        <h1 className="mt-3 text-3xl font-bold text-gray-900 dark:text-slate-100 sm:text-4xl">
          Welcome to the Home page!
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-400">
          Use the navigation above to explore live matches, team information, and tournament updates.
        </p>
      </div>
    </div>
  );
}

export default Home;
