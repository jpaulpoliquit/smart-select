// Smart Select Obsidian plugin
const { Plugin } = require('obsidian');

module.exports = class SmartSelectPlugin extends Plugin {
  onload() {
    console.log('Smart Select plugin loaded');
    
    // Add command without default hotkey first
    this.addCommand({
      id: 'smart-select-toggle',
      name: 'Smart Select (paragraph, then document)',
      editorCallback: (editor) => this.smartSelect(editor)
    });
    
    // Add escape hatch command
    this.addCommand({
      id: 'smart-select-classic-all',
      name: 'Smart Select: Classic Select All',
      editorCallback: (editor) => {
        console.log('Classic select all triggered via command');
        const lastLine = editor.lastLine();
        editor.setSelection({ line: 0, ch: 0 }, { line: lastLine, ch: (editor.getLine(lastLine) || '').length });
      }
    });
    
    // Register keymap for Ctrl/Cmd+A
    this.registerDomEvent(document, 'keydown', (evt) => {
      // Debug logging for all Ctrl+A combinations
      if ((evt.ctrlKey || evt.metaKey) && evt.key === 'a') {
        console.log('Ctrl+A detected:', {
          ctrlKey: evt.ctrlKey,
          metaKey: evt.metaKey,
          shiftKey: evt.shiftKey,
          altKey: evt.altKey,
          key: evt.key,
          target: evt.target.tagName
        });
      }
      
      // Escape hatch: Ctrl+Shift+A for classic "Select All" (check this FIRST)
      if ((evt.ctrlKey || evt.metaKey) && evt.key === 'a' && evt.shiftKey && !evt.altKey) {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (activeLeaf && activeLeaf.view.getViewType() === 'markdown') {
          console.log('Escape hatch triggered - classic select all');
          evt.preventDefault();
          evt.stopPropagation();
          // Perform classic select all directly
          const editor = activeLeaf.view.editor;
          const lastLine = editor.lastLine();
          const lastLineLength = (editor.getLine(lastLine) || '').length;
          
          // Get current cursor position before selection
          const currentCursor = editor.getCursor();
          
          // Set selection from start to end
          editor.setSelection({ line: 0, ch: 0 }, { line: lastLine, ch: lastLineLength });
          
          // Keep cursor at its original position for better UX
          editor.setCursor(currentCursor);
          
          return false;
        }
      }
      
      // Smart select: Ctrl+A (no shift) - check this SECOND
      if ((evt.ctrlKey || evt.metaKey) && evt.key === 'a' && !evt.shiftKey && !evt.altKey) {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (activeLeaf && activeLeaf.view.getViewType() === 'markdown') {
          console.log('Smart select triggered');
          evt.preventDefault();
          evt.stopPropagation();
          this.smartSelect(activeLeaf.view.editor);
          return false;
        }
      }
    });
  }

  smartSelect(editor) {
    console.log('Smart select triggered');
    console.log('Current cursor position:', editor.getCursor());
    
    const lastLine = editor.lastLine();
    const from = editor.getCursor('from');
    const to = editor.getCursor('to');
    const hasSelection = !(from.line === to.line && from.ch === to.ch);
    const cursorLine = editor.getCursor().line;

    // If entire doc already selected, keep it
    if (hasSelection && from.line === 0 && from.ch === 0 && to.line === lastLine) {
      console.log('Entire doc already selected');
      return;
    }

    // If no selection, select current line
    if (!hasSelection) {
      const currentLineText = editor.getLine(cursorLine) || '';
      console.log(`Selecting current line ${cursorLine}: "${currentLineText}"`);
      editor.setSelection({ line: cursorLine, ch: 0 }, { line: cursorLine, ch: currentLineText.length });
      return;
    }

         console.log('Current selection:', { from, to });
     console.log('Selection text:', editor.getRange(from, to));
     console.log('Current line content:', editor.getLine(from.line));
     console.log('Is bullet line?', /^(\s*)([-*+]|\d+\.)\s/.test(editor.getLine(from.line)) || /^(\s*)>\s+\S/.test(editor.getLine(from.line)));

         // If we have a selection, try to expand it intelligently
     const expandedSelection = this.getExpandedSelection(editor, from, to);
     
     if (expandedSelection) {
       console.log(`Expanding selection to lines ${expandedSelection.from.line}-${expandedSelection.to.line}`);
       console.log('Current selection text length:', editor.getRange(from, to).length);
       console.log('New selection text length:', editor.getRange(expandedSelection.from, expandedSelection.to).length);
       
       // For code blocks expanding to heading sections, ensure we include the entire code block
       const currentType = this.getSelectionType(editor, from, to);
       let finalSelection = expandedSelection;
       
       if (currentType === 'codeblock') {
         // Ensure the expanded selection includes the entire current code block
         finalSelection = {
           from: {
             line: Math.min(expandedSelection.from.line, from.line),
             ch: expandedSelection.from.line <= from.line ? expandedSelection.from.ch : 0
           },
           to: {
             line: Math.max(expandedSelection.to.line, to.line),
             ch: expandedSelection.to.line >= to.line ? expandedSelection.to.ch : (editor.getLine(Math.max(expandedSelection.to.line, to.line)) || '').length
           }
         };
         console.log(`Adjusted selection to include entire code block: lines ${finalSelection.from.line}-${finalSelection.to.line}`);
       }
       
       // Only expand if the new selection is actually larger
       if (editor.getRange(finalSelection.from, finalSelection.to).length > editor.getRange(from, to).length) {
         console.log('Expanding to larger selection');
         editor.setSelection(finalSelection.from, finalSelection.to);
       } else {
         // Try heading-section fallback, then whole document
         const heading = this.expandHeadingSection(editor, from, to);
         if (heading && this.isExpansion(from, to, heading.from, heading.to)) {
           console.log('No larger parent from primary strategy; expanding to heading section');
           editor.setSelection(heading.from, heading.to);
         } else {
           console.log('No larger parent anywhere; expanding to entire document');
           // Get current cursor position before selection
           const currentCursor = editor.getCursor();
           editor.setSelection({ line: 0, ch: 0 }, { line: lastLine, ch: (editor.getLine(lastLine) || '').length });
           // Keep cursor at its original position for better UX
           editor.setCursor(currentCursor);
         }
       }
     } else {
      // Attempt heading section; if not available, expand to entire document
      const heading = this.expandHeadingSection(editor, from, to);
      if (heading && this.isExpansion(from, to, heading.from, heading.to)) {
        console.log('Falling back to heading section');
        editor.setSelection(heading.from, heading.to);
      } else {
        console.log('No parent expansion available; expanding to entire document');
        // Get current cursor position before selection
        const currentCursor = editor.getCursor();
        editor.setSelection({ line: 0, ch: 0 }, { line: lastLine, ch: (editor.getLine(lastLine) || '').length });
        // Keep cursor at its original position for better UX
        editor.setCursor(currentCursor);
      }
    }
  }

  getExpandedSelection(editor, currentFrom, currentTo) {
    // Hierarchical expansion: always try to find the next parent level
    console.log('Looking for next parent level...');
    
    // Try expansion strategies in hierarchical order (smallest to largest)
    const strategies = [
      // Level 1: Immediate containers (code content, bullet item)
      () => this.expandCodeContent(editor, currentFrom, currentTo),
      () => this.expandBulletItem(editor, currentFrom, currentTo),
      
      // Level 2: Block containers (full code block, bullet list, quote block, paragraph)
      () => this.expandCodeBlock(editor, currentFrom, currentTo),
      () => this.expandBulletList(editor, currentFrom, currentTo),
      () => this.expandQuoteBlock(editor, currentFrom, currentTo),
      () => this.expandParagraph(editor, currentFrom, currentTo),
      
      // Level 3: Section containers (heading sections)
      () => this.expandHeadingSection(editor, currentFrom, currentTo)
    ];

    // Find the first expansion that's actually larger than current selection
    for (const strategy of strategies) {
      const result = strategy();
      if (result && this.isExpansion(currentFrom, currentTo, result.from, result.to)) {
        console.log('Found next parent level:', result);
        return result;
      }
    }

    // Special case: if current selection already equals the heading section,
    // the next parent is the entire document
    const headingRange = this.expandHeadingSection(editor, currentFrom, currentTo);
    if (
      headingRange &&
      this.isSameRange(currentFrom, currentTo, headingRange.from, headingRange.to)
    ) {
      console.log('Selection equals heading section; next parent is document');
      return this.expandDocument(editor);
    }

    console.log('No parent level found');
    return null;
  }

  getSelectionType(editor, from, to) {
    // Check if it's a single line
    if (from.line === to.line) {
      return 'line';
    }
    
    // Check if it's a code block
    const firstLine = editor.getLine(from.line) || '';
    const lastLine = editor.getLine(to.line) || '';
    if (firstLine.trim().startsWith('```') && lastLine.trim().startsWith('```')) {
      return 'codeblock';
    }
    
         // Check if it's a bullet list (including > bullets)
     const bulletRegex = /^(\s*)([-*+]|\d+\.)\s/;
     const arrowBulletRegex = /^(\s*)>\s+\S/; // > followed by space and content (not quote)
     if (bulletRegex.test(firstLine) || arrowBulletRegex.test(firstLine)) {
       return 'bulletlist';
     }
    
    // Check if it's a quote block (> at start, could be followed by space or content)
    if (firstLine.trim().startsWith('>') && !arrowBulletRegex.test(firstLine)) {
      return 'quote';
    }
    
    // Check if it starts with a heading
    if (firstLine.match(/^#{1,6}\s/)) {
      return 'heading';
    }
    
    // Default to paragraph
    return 'paragraph';
  }

  isExpansion(oldFrom, oldTo, newFrom, newTo) {
    return (newFrom.line < oldFrom.line || 
            (newFrom.line === oldFrom.line && newFrom.ch < oldFrom.ch)) ||
           (newTo.line > oldTo.line || 
            (newTo.line === oldTo.line && newTo.ch > oldTo.ch));
  }

  // Check if two ranges are exactly identical
  isSameRange(aFrom, aTo, bFrom, bTo) {
    return aFrom.line === bFrom.line && aFrom.ch === bFrom.ch &&
           aTo.line === bTo.line && aTo.ch === bTo.ch;
  }

  // Get entire document selection range
  expandDocument(editor) {
    const last = editor.lastLine();
    return {
      from: { line: 0, ch: 0 },
      to: { line: last, ch: (editor.getLine(last) || '').length }
    };
  }

  expandCodeContent(editor, from, to) {
    // If we're inside a code block, first select just the content (excluding backticks)
    const startLine = from.line;
    const endLine = to.line;
    
    console.log(`Looking for code content in lines ${startLine}-${endLine}`);
    
    // Find code block boundaries
    let codeStart = -1;
    let codeEnd = -1;
    
    // Search backwards for code block start
    for (let i = startLine; i >= 0; i--) {
      const line = editor.getLine(i) || '';
      if (line.trim().startsWith('```')) {
        codeStart = i;
        break;
      }
    }
    
    // Search forwards for code block end
    if (codeStart !== -1) {
      for (let i = codeStart + 1; i <= editor.lastLine(); i++) {
        const line = editor.getLine(i) || '';
        if (line.trim().startsWith('```')) {
          codeEnd = i;
          break;
        }
      }
    }
    
    if (codeStart !== -1 && codeEnd !== -1) {
      // Check if we're already selecting the full content
      const isSelectingFullContent = (from.line === codeStart + 1 && to.line === codeEnd - 1);
      
      if (!isSelectingFullContent && codeStart + 1 < codeEnd) {
        console.log(`Selecting code content: lines ${codeStart + 1}-${codeEnd - 1}`);
        return {
          from: { line: codeStart + 1, ch: 0 },
          to: { line: codeEnd - 1, ch: (editor.getLine(codeEnd - 1) || '').length }
        };
      }
    }
    
    return null;
  }

  expandBulletItem(editor, from, to) {
    // Select current bullet item and its immediate children
    const startLine = from.line;
    
    console.log(`Looking for bullet item at line ${startLine}`);
    
    // Find the bullet that contains this line
    let bulletLine = -1;
    let bulletIndent = -1;
    
    for (let i = startLine; i >= 0; i--) {
      const line = editor.getLine(i) || '';
      if (line.trim() === '') continue;
      
      const bulletRegex = /^(\s*)([-*+]|\d+\.)\s/;
      const arrowBulletRegex = /^(\s*)>\s+\S/;
      const match = line.match(bulletRegex) || line.match(arrowBulletRegex);
      
      if (match) {
        bulletLine = i;
        bulletIndent = match[1].length;
        break;
      }
    }
    
    if (bulletLine === -1) return null;
    
    // Find end of this bullet item (next bullet at same or higher level)
    let itemEnd = bulletLine;
    
    for (let i = bulletLine + 1; i <= editor.lastLine(); i++) {
      const line = editor.getLine(i) || '';
      
      if (line.trim() === '') {
        itemEnd = i;
        continue;
      }
      
      const bulletRegex = /^(\s*)([-*+]|\d+\.)\s/;
      const arrowBulletRegex = /^(\s*)>\s+\S/;
      const match = line.match(bulletRegex) || line.match(arrowBulletRegex);
      
      if (match) {
        const indent = match[1].length;
        if (indent <= bulletIndent) {
          // Found same or higher level bullet, stop here
          break;
        }
        itemEnd = i;
      } else {
        // Non-bullet content, could be part of bullet or end
        const lineIndent = line.match(/^(\s*)/)[1].length;
        if (lineIndent > bulletIndent) {
          itemEnd = i;
        } else {
          break;
        }
      }
    }
    
    // Only return if this is actually an expansion
    if (bulletLine !== startLine || itemEnd !== startLine) {
      console.log(`Bullet item found: lines ${bulletLine}-${itemEnd}`);
      return {
        from: { line: bulletLine, ch: 0 },
        to: { line: itemEnd, ch: (editor.getLine(itemEnd) || '').length }
      };
    }
    
    return null;
  }

     expandCodeBlock(editor, from, to) {
     const startLine = from.line;
     const endLine = to.line;
     
     console.log(`Looking for code block containing lines ${startLine}-${endLine}`);
     
     // Check if we're already selecting the entire code block (including backticks)
     const currentType = this.getSelectionType(editor, from, to);
     const isFullCodeBlock = currentType === 'codeblock';
     
     // Look for code block boundaries
     let codeStart = -1;
     let codeEnd = -1;
     
     // Search backwards for code block start (skip empty lines)
     for (let i = startLine; i >= 0; i--) {
       const line = editor.getLine(i) || '';
       console.log(`Checking line ${i} backwards: "${line}"`);
       
       // Skip empty lines and continue searching
       if (line.trim() === '') {
         console.log(`Skipping empty line ${i}`);
         continue;
       }
       
       if (line.trim().startsWith('```')) {
         codeStart = i;
         console.log(`Found code block start at line ${i}`);
         break;
       }
       
       // If we hit non-empty, non-code-block content, we're not in a code block
       if (!line.trim().startsWith('```') && line.trim() !== '') {
         // Check if this could be code block content (inside a block)
         // Continue searching backwards to see if there's a code block start
         continue;
       }
     }
     
     // Search forwards for code block end (only if we found a start)
     if (codeStart !== -1) {
       for (let i = codeStart + 1; i <= editor.lastLine(); i++) {
         const line = editor.getLine(i) || '';
         console.log(`Checking line ${i} forwards: "${line}"`);
         
         if (line.trim().startsWith('```')) {
           codeEnd = i;
           console.log(`Found code block end at line ${i}`);
           break;
         }
         
         // Continue searching through empty lines and code content
         // Don't break on empty lines or regular content inside code blocks
       }
       
       // If we didn't find a closing marker, the code block might be unclosed
       if (codeEnd === -1) {
         console.log('No closing ``` found, code block may be unclosed. Treating end of document as code block end.');
         codeEnd = editor.lastLine();
       }
     }
     
     if (codeStart !== -1 && codeEnd !== -1) {
       // If we already have the full code block selected (including backticks),
       // select only the content inside (excluding the backticks)
       if (isFullCodeBlock && from.line === codeStart && to.line === codeEnd) {
         console.log(`Selecting code block content only (excluding backticks): lines ${codeStart + 1}-${codeEnd - 1}`);
         
         // Make sure there's actually content inside the code block
         if (codeStart + 1 < codeEnd) {
           return {
             from: { line: codeStart + 1, ch: 0 },
             to: { line: codeEnd - 1, ch: (editor.getLine(codeEnd - 1) || '').length }
           };
         } else {
           // Empty code block, just select the opening line content after ```
           const startLineContent = editor.getLine(codeStart) || '';
           const afterBackticks = startLineContent.substring(3); // Skip the ```
           return {
             from: { line: codeStart, ch: 3 },
             to: { line: codeStart, ch: startLineContent.length }
           };
         }
       } else {
         // First selection: select entire code block including backticks
         console.log(`Code block found: lines ${codeStart}-${codeEnd}`);
         return {
           from: { line: codeStart, ch: 0 },
           to: { line: codeEnd, ch: (editor.getLine(codeEnd) || '').length }
         };
       }
     }
     
     console.log('No code block found');
     return null;
   }

  expandBulletList(editor, from, to) {
    const startLine = from.line;
    const endLine = to.line;
    
    console.log(`Looking for bullet list containing lines ${startLine}-${endLine}`);
    
    // First, find if we're inside a bullet list at all
    let currentBulletLine = -1;
    let currentIndent = -1;
    
    // Search backwards from current position to find a bullet line
    for (let i = startLine; i >= 0; i--) {
      const line = editor.getLine(i) || '';
      console.log(`Checking line ${i} for bullets: "${line}"`);
      
      // Skip empty lines
      if (line.trim() === '') {
        console.log(`Skipping empty line ${i}`);
        continue;
      }
      
      const bulletRegex = /^(\s*)([-*+]|\d+\.)\s/;
      const arrowBulletRegex = /^(\s*)>\s+\S/;
      const match = line.match(bulletRegex);
      const arrowMatch = line.match(arrowBulletRegex);
      
      if (match || arrowMatch) {
        currentBulletLine = i;
        currentIndent = (match ? match[1] : arrowMatch[1]).length;
        console.log(`Found bullet at line ${i}, indent level ${currentIndent}: "${line}"`);
        break;
      } else {
        // If we hit non-bullet, non-empty content, we might still be in a bullet's content
        // Continue searching backwards to see if there's a bullet that owns this content
        continue;
      }
    }
    
    if (currentBulletLine === -1) {
      console.log('No bullet list found');
      return null;
    }
    
    // Determine what level we want to select based on current selection
    let targetIndent = currentIndent;
    const currentType = this.getSelectionType(editor, from, to);
    
    if (currentType === 'bulletlist') {
      // If we already have a bullet list selected, try to expand to parent level
      const selectedFirstLine = editor.getLine(from.line) || '';
      const selectedMatch = selectedFirstLine.match(/^(\s*)([-*+]|\d+\.)\s/) || selectedFirstLine.match(/^(\s*)>\s+\S/);
      
      if (selectedMatch) {
        const selectedIndent = selectedMatch[1].length;
        console.log(`Currently selected bullet has indent ${selectedIndent}, looking for parent`);
        
        // Look for parent level (less indentation)
        for (let i = from.line - 1; i >= 0; i--) {
          const line = editor.getLine(i) || '';
          if (line.trim() === '') continue;
          
          const match = line.match(/^(\s*)([-*+]|\d+\.)\s/);
          if (match && match[1].length < selectedIndent) {
            targetIndent = match[1].length;
            console.log(`Found parent level at indent ${targetIndent}`);
            break;
          }
          
          // If we hit non-bullet content, stop looking
          if (!match) break;
        }
        
        // If no parent found, return null to go to next expansion strategy
        if (targetIndent === selectedIndent) {
          console.log('No parent level found');
          return null;
        }
      }
    }
    
    console.log(`Selecting bullet list at indent level ${targetIndent}`);
    
    // Find the boundaries of the list at the target indent level
    let listStart = currentBulletLine;
    let listEnd = currentBulletLine;
    
    // Find start of list at target level
    for (let i = currentBulletLine - 1; i >= 0; i--) {
      const line = editor.getLine(i) || '';
      
      if (line.trim() === '') continue; // Skip empty lines
      
      const bulletRegex = /^(\s*)([-*+>]|\d+\.)\s/;
      const match = line.match(bulletRegex);
      
      if (!match) {
        // Hit non-bullet content, stop
        break;
      }
      
      const indent = match[1].length;
      if (indent === targetIndent) {
        listStart = i;
      } else if (indent < targetIndent) {
        // Hit parent level, stop
        break;
      }
      // If indent > targetIndent, it's a child, continue looking
    }
    
    // Find end of list at target level (including all children)
    for (let i = currentBulletLine + 1; i <= editor.lastLine(); i++) {
      const line = editor.getLine(i) || '';
      
      if (line.trim() === '') {
        // Empty line - could be part of list or end of list
        // Look ahead to see if there's more list content
        let foundMoreList = false;
        for (let j = i + 1; j <= Math.min(i + 3, editor.lastLine()); j++) {
          const nextLine = editor.getLine(j) || '';
          if (nextLine.trim() === '') continue;
          
          const nextMatch = nextLine.match(/^(\s*)([-*+]|\d+\.)\s/);
          if (nextMatch && nextMatch[1].length >= targetIndent) {
            foundMoreList = true;
            break;
          } else {
            break;
          }
        }
        
        if (!foundMoreList) {
          break;
        }
        
        listEnd = i;
        continue;
      }
      
      const bulletRegex = /^(\s*)([-*+>]|\d+\.)\s/;
      const match = line.match(bulletRegex);
      
      if (!match) {
        // Hit non-bullet content, could be part of current bullet or end of list
        // If it's indented more than target, it's probably part of the list
        const lineIndent = line.match(/^(\s*)/)[1].length;
        if (lineIndent > targetIndent) {
          listEnd = i;
        } else {
          break;
        }
      } else {
        const indent = match[1].length;
        if (indent >= targetIndent) {
          listEnd = i;
        } else {
          // Hit parent level or same level different list, stop
          break;
        }
      }
    }
    
    console.log(`Bullet list found: lines ${listStart}-${listEnd} at indent level ${targetIndent}`);
    
    return {
      from: { line: listStart, ch: 0 },
      to: { line: listEnd, ch: (editor.getLine(listEnd) || '').length }
    };
  }

  expandQuoteBlock(editor, from, to) {
    const startLine = from.line;
    const endLine = to.line;
    
    let quoteStart = startLine;
    let quoteEnd = endLine;
    
    // Find start of quote block
    for (let i = startLine; i >= 0; i--) {
      const line = editor.getLine(i) || '';
      if (line.trim().startsWith('>')) {
        quoteStart = i;
      } else if (line.trim() !== '') {
        break;
      }
    }
    
    // Find end of quote block
    for (let i = endLine; i <= editor.lastLine(); i++) {
      const line = editor.getLine(i) || '';
      if (line.trim().startsWith('>')) {
        quoteEnd = i;
      } else if (line.trim() !== '') {
        break;
      }
    }
    
    if (quoteStart !== startLine || quoteEnd !== endLine) {
      return {
        from: { line: quoteStart, ch: 0 },
        to: { line: quoteEnd, ch: (editor.getLine(quoteEnd) || '').length }
      };
    }
    
    return null;
  }

     expandHeadingSection(editor, from, to) {
     const startLine = from.line;
     const endLine = to.line;
     
     console.log(`Looking for heading section containing lines ${startLine}-${endLine}`);
     
     // If current selection is a code block, we need to look outside the code block for headings
     const isCodeBlockSelection = this.getSelectionType(editor, from, to) === 'codeblock';
     
     // Find the heading that contains this selection (but not inside code blocks)
     let headingLine = -1;
     let headingLevel = 0;
     
     // When we have a code block selection, we need to start looking BEFORE the code block
     let searchStartLine = startLine;
     if (isCodeBlockSelection) {
       // Find the actual start of the code block and start searching before it
       for (let i = startLine; i >= 0; i--) {
         const line = editor.getLine(i) || '';
         if (line.trim().startsWith('```')) {
           searchStartLine = i - 1; // Start searching before the code block
           console.log(`Code block starts at line ${i}, will search for headings from line ${searchStartLine}`);
           break;
         }
       }
     }
     
     // Now search for headings, completely avoiding code blocks
     for (let i = searchStartLine; i >= 0; i--) {
       const line = editor.getLine(i) || '';
       
       // Skip any code block entirely
       if (line.trim().startsWith('```')) {
         // Found a code block end (going backwards), skip to its start
         for (let j = i - 1; j >= 0; j--) {
           const blockLine = editor.getLine(j) || '';
           if (blockLine.trim().startsWith('```')) {
             i = j; // Continue from before this code block
             console.log(`Skipping code block from line ${j} to ${i}`);
             break;
           }
         }
         continue;
       }
       
       // Look for headings (only outside code blocks now)
       const match = line.match(/^(#{1,6})\s/);
       console.log(`Line ${i}: "${line}" - heading match:`, match);
       if (match) {
         headingLine = i;
         headingLevel = match[1].length;
         console.log(`Found heading at line ${i}, level ${headingLevel}: "${line}"`);
         break;
       }
     }
     
     if (headingLine === -1) {
       console.log('No heading found outside code blocks');
       return null;
     }
     
     // Find the end of this section (next heading of same or higher level, outside code blocks)
     let sectionEnd = editor.lastLine();
     
     for (let i = headingLine + 1; i <= editor.lastLine(); i++) {
       const line = editor.getLine(i) || '';
       
       // Skip code blocks when looking for section end
       if (line.trim().startsWith('```')) {
         // Found a code block start, skip to its end
         for (let j = i + 1; j <= editor.lastLine(); j++) {
           const blockLine = editor.getLine(j) || '';
           if (blockLine.trim().startsWith('```')) {
             i = j; // Continue from after this code block
             console.log(`Skipping code block from line ${i - (j - i)} to ${j}`);
             break;
           }
         }
         continue;
       }
       
       // Look for next heading (only outside code blocks)
       const match = line.match(/^(#{1,6})\s/);
       if (match && match[1].length <= headingLevel) {
         sectionEnd = i - 1;
         console.log(`Found next heading at line ${i}, ending section at ${sectionEnd}`);
         break;
       }
     }
     
     console.log(`Heading section: lines ${headingLine}-${sectionEnd}`);
     
     return {
       from: { line: headingLine, ch: 0 },
       to: { line: sectionEnd, ch: (editor.getLine(sectionEnd) || '').length }
     };
   }

  expandParagraph(editor, from, to) {
    const startLine = from.line;
    const endLine = to.line;
    
    let paragraphStart = startLine;
    let paragraphEnd = endLine;
    
    // Find start of paragraph (non-empty line)
    for (let i = startLine - 1; i >= 0; i--) {
      const line = editor.getLine(i) || '';
      if (line.trim() === '') {
        break;
      }
      paragraphStart = i;
    }
    
    // Find end of paragraph (non-empty line)
    for (let i = endLine + 1; i <= editor.lastLine(); i++) {
      const line = editor.getLine(i) || '';
      if (line.trim() === '') {
        break;
      }
      paragraphEnd = i;
    }
    
    if (paragraphStart !== startLine || paragraphEnd !== endLine) {
      return {
        from: { line: paragraphStart, ch: 0 },
        to: { line: paragraphEnd, ch: (editor.getLine(paragraphEnd) || '').length }
      };
    }
    
    return null;
  }
};