import re

# Update App.tsx
with open('src/App.tsx', 'r') as f:
    app_content = f.read()

app_content = re.sub(
    r"  // Handler for Resetting Demo Data\n  const handleResetDemoData = \(\) => \{\n    if \(window\.confirm\('Are you sure you want to reset all records to default clean data\? This will clear all attendance and LD logs for today\.'\)\) \{\n      resetAllDataToDemo\(\);\n      refreshData\(\);\n    \}\n  \};\n\n",
    "",
    app_content
)
app_content = re.sub(
    r"\s*onResetDemoData=\{handleResetDemoData\}",
    "",
    app_content
)

with open('src/App.tsx', 'w') as f:
    f.write(app_content)

# Update Header.tsx
with open('src/components/Header.tsx', 'r') as f:
    header_content = f.read()

header_content = re.sub(
    r"\s*onResetDemoData: \(\) => void;",
    "",
    header_content
)
header_content = re.sub(
    r"\s*onResetDemoData,",
    "",
    header_content
)

with open('src/components/Header.tsx', 'w') as f:
    f.write(header_content)
