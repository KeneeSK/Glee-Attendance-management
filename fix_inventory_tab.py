import re

with open('src/components/InventoryTab.tsx', 'r') as f:
    content = f.read()

# Let's fix the closing tags.
# Before:
#         })}
#       </div>
#       </div>   <--- this was the closing of animate-fade-in
#       {/* Modal */}

content = re.sub(
    r"      </div>\n\n      \{\/\* PDF \/ Print Preview Modal",
    r"      </div>\n      </div>\n\n      {/* PDF / Print Preview Modal",
    content
)

with open('src/components/InventoryTab.tsx', 'w') as f:
    f.write(content)
