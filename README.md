# Smart Select: Rethinking `Ctrl/CMD + A`

**Smart Select makes `Ctrl+A` progressive and context-aware in Obsidian.** Instead of selecting everything at once, it expands selection logically through document structures: Paragraph → Section → Document.


Traditional `Ctrl+A` was designed for flat text files, but modern documents are structured. Markdown, HTML, and block-based editors introduced hierarchy—paragraphs, lists, tables, code blocks—yet shortcuts haven't evolved. Users think in structures, but selection remains primitive.

Smart Select bridges this gap by making selection **follow meaning, not just position**.

## Quick Start

### Install via Community Plugins
1. Open **Settings → Community plugins**  
2. Search **Smart Select**  
3. Install & Enable  

### Manual Install
1. Download from [Releases](https://github.com/jpaulpoliquit/smart-select/releases)  
2. Extract to `<vault>/.obsidian/plugins/smart-select/`  
3. Reload Obsidian and enable in **Settings → Community plugins**

## How It Works

Press **`Ctrl/CMD + A`** repeatedly to expand selection progressively:

**In paragraphs:** Text block → Section → Document  
**In lists:** Current item → Item with children → Full list → Section → Document  
**In tables:** Cell → Row → Table → Section → Document  
**In code blocks:** Code block → Section → Document

**Escape hatch:** `Ctrl/CMD + Shift + A` always performs classic "Select All"

### Examples

**Paragraph Selection**
```markdown
# Project Notes
This is a detailed paragraph about the project.
It spans multiple lines and contains important information. // cursor here

## Next Section
```
- Press 1: Select the paragraph
- Press 2: Select "Project Notes" section  
- Press 3: Select entire document

**List Selection**
```markdown
- Project Tasks
  - Research phase // cursor here
    - Literature review
    - User interviews
  - Design phase
```
- Press 1: Select "Research phase"
- Press 2: Select research phase + children
- Press 3: Select entire "Project Tasks" list
- Press 4: Select containing section

## Design Philosophy

Smart Select follows three core principles:

1. **Context Sensitivity**. Selection starts with the smallest logical unit at cursor position
2. **Progressive Expansion**. Each press climbs the document hierarchy naturally  
3. **Muscle Memory Safe**. Traditional behavior remains accessible via `Ctrl+Shift+A`

This approach respects established interface conventions while adding structural intelligence. Rather than replacing universality, it extends it.

## The Challenge of Universal Commands

`Ctrl+A` represents one of computing's most successful interface standards, originating from ASCII control character 1 and becoming universal through Apple's 1984 Human Interface Guidelines. Across platforms and applications, `Ctrl+A` exhibits remarkably consistent behavior::

- Text editors → entire document
- Spreadsheets → entire sheet  
- File managers → all files
- Browsers → full page
- Design tools → all objects on canvas

But this universality has a blind spot: it ignores how documents themselves have evolved from flat text to rich, structured content.

Smart Select reveals fundamental tensions in interface design:

**Convention vs. Intelligence**. Universal commands provide consistency, but context-aware behavior provides relevance.

**Simplicity vs. Capability**. Traditional select-all is cognitively simple; progressive selection adds power but requires understanding hierarchical state.

**Predictability vs. Optimization**. Users expect consistent behavior across applications, yet document structure offers opportunities for smarter interaction.

## Technical Implementation

Smart Select works through four key mechanisms:

1. **Context Detection**. Analyzes cursor position to identify structural context (paragraph, list item, table cell, etc.)
2. **Boundary Recognition**. Uses Markdown syntax to identify natural content boundaries
3. **Progressive Mapping**. Maps each `Ctrl+A` press to the next logical container in the hierarchy
4. **State Management**. Resets progression when cursor moves or content changes

## Configuration

The plugin replaces `Ctrl+A` by default but can be customized in **Settings → Hotkeys**. This creates a design trade-off: progressive selection requires multiple keystrokes to reach "select all," potentially breaking the original command's simplicity.

The solution preserves muscle memory through dual shortcuts:
- `Ctrl+A` → structure-aware, progressive selection
- `Ctrl+Shift+A` → classic "select all" behavior

Alternative implementations could use dedicated shortcuts or enhanced double-click behavior to avoid overriding universal conventions entirely.

## Research Insights

Interface design research suggests several key principles for smart selection:

**Progressive Enhancement** – Reveal complexity gradually rather than immediately. Smart Select's staged approach aligns with this principle while challenging command universality.

**Contextual Consistency** – Ensure similar structures behave consistently across different contexts. This consistency proves crucial for user adoption.

**Fallback Mechanisms** – Provide clear paths back to familiar behaviors when context detection fails or users prefer traditional interaction.

Research indicates structural awareness might better supplement rather than replace existing conventions, preserving cross-application consistency while enabling document-aware interaction.

## Future Vision

Smart Select serves as a **proof of concept**: Can structural awareness coexist with universal muscle memory?

Text has evolved from flat files to structured documents, but shortcuts remain unchanged.

This plugin explores whether progressive text selection can enhance productivity while respecting established interface conventions, pointing toward a future where commands evolve alongside the documents they operate on.

---

## References

[1] Shneiderman, B. (1987). *Designing the User Interface: Strategies for Effective Human-Computer Interaction*. Addison-Wesley.

[2] Nielsen, J. (1994). *Usability Engineering*. Morgan Kaufmann.

[3] Norman, D. A. (2013). *The Design of Everyday Things: Revised and Expanded Edition*. Basic Books.

[4] Nielsen, J. (2006). Progressive Disclosure. *Nielsen Norman Group*.

[5] Card, S. K., Moran, T. P., & Newell, A. (1983). *The Psychology of Human-Computer Interaction*. Lawrence Erlbaum Associates.

---

**[Repository](https://github.com/jpaulpoliquit/smart-select) · MIT License**