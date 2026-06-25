// This runs in the Service Worker background
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Intercept the native file share POST request
  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        try {
          // Extract the shared files
          const formData = await event.request.formData();
          const files = formData.getAll('shared_files');
          
          if (files && files.length > 0) {
            // Save them to IndexedDB temporarily
            const db = await new Promise((resolve, reject) => {
              const req = indexedDB.open('ChocoShareDB', 1);
              req.onupgradeneeded = (e) => e.target.result.createObjectStore('shared_store');
              req.onsuccess = (e) => resolve(e.target.result);
              req.onerror = () => reject(req.error);
            });
            
            await new Promise((resolve, reject) => {
              const tx = db.transaction('shared_store', 'readwrite');
              tx.objectStore('shared_store').put(files, 'pending_share');
              tx.oncomplete = resolve;
              tx.onerror = reject;
            });
          }
          
          // Redirect the user back to the main app interface
          return Response.redirect('/', 303);
        } catch (error) {
          console.error('Error handling shared files:', error);
          return Response.redirect('/', 303);
        }
      })()
    );
  }
});
