import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Replace import
content = content.replace("fetchServerDatabase,", "fetchServerDatabase,\n  subscribeToServerDatabase,")

# Replace useEffect logic
old_effect = """    fetchServerDatabase().then(() => {
      if (isAuthenticated) refreshData();
    });

    if (isAuthenticated) {
      refreshData();
      // Poll server DB every 5 seconds for real-time multi-device sync
      const syncTimer = setInterval(() => {
        fetchServerDatabase().then(() => {
          refreshData();
        });
      }, 5000);

      return () => clearInterval(syncTimer);
    }"""

new_effect = """    fetchServerDatabase().then(() => {
      if (isAuthenticated) refreshData();
    });

    if (isAuthenticated) {
      refreshData();
      // Listen to real-time updates from Firestore
      const unsubscribe = subscribeToServerDatabase(() => {
        refreshData();
      });

      return () => unsubscribe();
    }"""

content = content.replace(old_effect, new_effect)

with open('src/App.tsx', 'w') as f:
    f.write(content)
