#!/usr/bin/env python3
"""Fix BattleGlue.ts: delete local deriveStraightLen, fix expectedOutcomeCalc.ts"""

import re

# Fix BattleGlue.ts
with open('src/scenes/battle/BattleGlue.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    # Detect the JSDoc comment block for local deriveStraightLen
    if '/**' in line and i + 1 < len(lines) and '从牌型结果推导' in lines[i + 1]:
        # Skip until the closing */ and function body
        # First skip the JSDoc
        while i < len(lines) and not lines[i].strip().endswith('*/'):
            i += 1
        i += 1  # skip the */ line
        # Now skip the function definition
        if i < len(lines) and 'function deriveStraightLen' in lines[i]:
            # Skip until closing brace
            brace_count = 0
            while i < len(lines):
                if '{' in lines[i]:
                    brace_count += lines[i].count('{')
                if '}' in lines[i]:
                    brace_count -= lines[i].count('}')
                if brace_count == 0:
                    i += 1
                    break
                i += 1
            # Skip the blank line after function
            while i < len(lines) and lines[i].strip() == '':
                i += 1
            continue
    new_lines.append(line)
    i += 1

with open('src/scenes/battle/BattleGlue.ts', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print(f"BattleGlue.ts: {len(lines)} -> {len(new_lines)} lines")

# Fix expectedOutcomeCalc.ts - verify deriveStraightLen import is used
with open('src/logic/expectedOutcomeCalc.ts', 'r', encoding='utf-8') as f:
    content = f.read()

if 'deriveStraightLen' in content and 'effectiveStraightLen' not in content:
    print("WARNING: deriveStraightLen import exists but diceCount fix not applied!")
elif 'effectiveStraightLen' in content:
    print("expectedOutcomeCalc.ts: diceCount fix present")
else:
    print("expectedOutcomeCalc.ts: no changes needed")

print("DONE")
