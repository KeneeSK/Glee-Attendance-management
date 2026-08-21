import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Add import
content = content.replace(
    "import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';",
    "import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';\nimport { PublicLiveReport } from './components/PublicLiveReport';"
)

# Add URL parsing
url_logic = """
export default function App() {
  // Check for public live view mode first
  const urlParams = new URLSearchParams(window.location.search);
  const isLiveView = urlParams.get('view') === 'live-report';

  if (isLiveView) {
    return <PublicLiveReport />;
  }

  // Persist login state in localStorage
"""

content = content.replace(
    "export default function App() {\n  // Persist login state in localStorage",
    url_logic
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
