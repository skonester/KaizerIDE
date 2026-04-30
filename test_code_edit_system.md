# Code Edit Suggestion System - Test Documentation

## Overview
The code edit suggestion system allows the chat agent to suggest code edits that can be approved and applied directly to the Monaco editor, similar to Raptor/Antigravity IDE functionality.

## Components Created

### 1. `CodeEditSuggestion.jsx`
A React component that displays code edit suggestions with:
- Diff view showing old vs new code
- Approve/Deny buttons
- File path and line range information
- Status indicators (applied, pending, error)

### 2. `codeEditService.js`
Service utilities for:
- Parsing code edit suggestions from AI responses
- Applying edits to Monaco editor
- Creating diffs between old and new code
- Detecting code edit patterns in messages

### 3. Integration Updates
- **ChatPanel.jsx**: Added state management for code edit suggestions and integration with the chat flow
- **EditorArea.jsx**: Added event listener and function to apply code edits to Monaco editor
- **CSS files**: Added styling for the new components

## How It Works

### 1. AI Suggests Code Edits
When the AI responds with code edit suggestions (formatted with markers like `EDIT:`, `SUGGESTION:`, or `OLD CODE:`/`NEW CODE:`), the system automatically parses them.

Example AI response format:
```
I suggest changing the function to be more efficient:

EDIT:
Description: Optimize the calculateTotal function
Old:
```javascript
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}
```
New:
```javascript
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```
```

### 2. Suggestion Display
Parsed suggestions appear in the chat panel under "Code Edit Suggestions" with:
- File path (highlights if it's the active file)
- Line range (if specified)
- Diff view showing changes
- Approve/Deny buttons

### 3. Approval & Application
When a user clicks "Approve & Apply":
1. The suggestion is sent to the Monaco editor via a custom event
2. The editor applies the edit using precise line numbers or content matching
3. The suggestion is marked as "Applied"
4. User gets success notification

### 4. Integration Points

#### Chat Agent Integration
- The chat agent can now suggest code edits that users can approve
- Edits are parsed from AI responses automatically
- Suggestions are displayed inline in the chat

#### Monaco Editor Integration
- Editor listens for `kaizer:apply-code-edit` events
- Applies edits using Monaco's `executeEdits` API
- Supports line-based and content-based replacements
- Maintains cursor position and editor focus

## Testing the System

### Test 1: Basic Code Edit
1. Open a JavaScript file in the editor
2. Ask the AI: "Can you suggest a better way to write a sum function?"
3. The AI should respond with a code edit suggestion
4. Click "Approve & Apply" to apply the change

### Test 2: Multi-line Edit
1. Open a file with multiple lines
2. Ask: "Refactor this code to use arrow functions"
3. Review the diff in the suggestion component
4. Apply the edit

### Test 3: File Context
1. Have a file open in the editor
2. Ask about that specific file: "How can I improve the error handling in this file?"
3. The suggestion should show "Current File" badge
4. Apply the edit

## Event Flow
```
User asks AI for code improvement
    ↓
AI responds with formatted code edit
    ↓
ChatPanel parses suggestion
    ↓
CodeEditSuggestion component displays
    ↓
User clicks "Approve & Apply"
    ↓
Event dispatched to EditorArea
    ↓
Monaco editor applies the edit
    ↓
Success notification shown
```

## Customization Points

### 1. Suggestion Parsing
Edit `parseCodeEditFromMessage()` in `codeEditService.js` to support different AI response formats.

### 2. UI Styling
Modify `CodeEditSuggestion.css` and `ChatPanel.css` for different visual styles.

### 3. Editor Integration
Extend `applyCodeEditToEditor()` in `EditorArea.jsx` for more complex edit operations.

## Security Considerations
- All edits require explicit user approval (no auto-apply)
- Edits are applied to the editor buffer, not directly to files
- Users can review diffs before applying
- Undo/Redo functionality works with applied edits

## Future Enhancements
1. **Batch editing**: Apply multiple suggestions at once
2. **Preview mode**: Show edit preview without applying
3. **Edit history**: Track all applied edits with rollback capability
4. **Template suggestions**: Common refactoring patterns as templates
5. **Collaboration**: Share and discuss suggestions with team members

## Files Modified
- `src/components/AI/chat/CodeEditSuggestion.jsx` (new)
- `src/components/AI/chat/CodeEditSuggestion.css` (new)
- `src/lib/editor/codeEditService.js` (new)
- `src/components/AI/chat/ChatPanel.jsx` (updated)
- `src/components/Editor/EditorArea.jsx` (updated)
- `src/components/AI/chat/ChatPanel.css` (updated)