with open('src/components/InventoryTab.tsx', 'r') as f:
    c = f.read()

c = c.replace("interface InventoryTabProps {\n  isPublicView?: boolean;\n  currentAdmin: AdminUser | null;\n}", "interface InventoryTabProps {\n  isPublicView?: boolean;\n  currentAdmin: AdminUser | null;\n  dateStr?: string;\n}")

# Also replace the state initialization
c = c.replace("const [currentDate, setCurrentDate] = useState<string>(getTodayDateString());", "const [currentDate, setCurrentDate] = useState<string>(getTodayDateString());\n\n  useEffect(() => {\n    if (dateStr) setCurrentDate(dateStr);\n  }, [dateStr]);")

with open('src/components/InventoryTab.tsx', 'w') as f:
    f.write(c)

# Also update PublicLiveReport
with open('src/components/PublicLiveReport.tsx', 'r') as f:
    r = f.read()
r = r.replace("isPublicView={true}\n          />\n        </div>\n\n      </div>", "isPublicView={true}\n            dateStr={selectedDate}\n          />\n        </div>\n\n      </div>")
with open('src/components/PublicLiveReport.tsx', 'w') as f:
    f.write(r)
