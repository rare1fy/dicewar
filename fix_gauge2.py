#!/usr/bin/env python3
"""Fix expectedOutcomeCalc.ts: insert diceCount correction before relic.effect call"""

with open('src/logic/expectedOutcomeCalc.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the exact insertion point
old_text = '    const res = relic.effect(relicCtx);\n    const details = [];'

new_text = '''    // PHASER-FIX-ARITHMETIC-GAUGE-DICECOUNT：
    //   diceCount 应代表最终有效牌型长度，非 selected.length。
    //   dimension_crush 把 3顺升成 4顺时，arithmetic_gauge 等按 diceCount 取倍率的遗物
    //   应读升档后的有效长度（4），而非原始选骰数（3）。
    const effectiveStraightLen = deriveStraightLen(activeHands);
    if (effectiveStraightLen > selected.length) {
      relicCtx.diceCount = effectiveStraightLen;
    }

    const res = relic.effect(relicCtx);
    const details = [];'''

if old_text in content:
    content = content.replace(old_text, new_text)
    with open('src/logic/expectedOutcomeCalc.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("REPLACED diceCount fix")
else:
    print("NOT FOUND - checking if already applied")
    if 'effectiveStraightLen' in content:
        print("Already applied!")
    else:
        # Try with different line endings
        old_crlf = old_text.replace('\n', '\r\n')
        if old_crlf in content:
            new_crlf = new_text.replace('\n', '\r\n')
            content = content.replace(old_crlf, new_crlf)
            with open('src/logic/expectedOutcomeCalc.ts', 'w', encoding='utf-8') as f:
                f.write(content)
            print("REPLACED with CRLF")
        else:
            print("STILL NOT FOUND")
            # Debug: show surrounding content
            idx = content.find('relic.effect(relicCtx)')
            if idx >= 0:
                print(f"Found at index {idx}")
                print(repr(content[idx-50:idx+50]))

print("DONE")
