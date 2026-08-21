import re

with open('src/components/Header.tsx', 'r') as f:
    content = f.read()

# Make sure we have Share2 icon
if "Share2" not in content:
    content = content.replace("LogOut,", "LogOut, Share2,")

share_button = """            </button>

            {/* Share Live Report Button */}
            <button
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('view', 'live-report');
                navigator.clipboard.writeText(url.toString());
                alert('Live Report Link copied to clipboard! Share this link with the boss.');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-amber-950/90 hover:bg-amber-900 text-amber-200 border border-amber-700/70 rounded-lg shadow-sm transition-colors cursor-pointer"
              title="Copy link to Live Real-Time Dashboard"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Share Report</span>
            </button>"""

content = content.replace("            </button>\n\n            {/* Backup JSON Button */}", share_button + "\n\n            {/* Backup JSON Button */}")

with open('src/components/Header.tsx', 'w') as f:
    f.write(content)

