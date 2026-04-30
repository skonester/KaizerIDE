// Test script to verify Monaco editor integration
// This simulates what the chat agent would do

console.log('=== Testing Monaco Editor Integration ===');

// Test 1: Check if window has Monaco editor reference
console.log('Test 1: Global editor reference');
console.log('window.monaco:', typeof window.monaco);
console.log('window.monacoEditor:', typeof window.monacoEditor);

// Test 2: Simulate code edit suggestion
const testSuggestion = {
  id: 'test-edit-1',
  filePath: 'example_code_edit_test.js',
  description: 'Test refactoring of calculateTotal function',
  oldCode: `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}`,
  newCode: `function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}`,
  language: 'javascript',
  createdAt: new Date().toISOString()
};

console.log('\nTest 2: Code edit suggestion object');
console.log('Suggestion:', JSON.stringify(testSuggestion, null, 2));

// Test 3: Dispatch test event
console.log('\nTest 3: Dispatching test event');
try {
  const event = new CustomEvent('kaizer:apply-code-edit', {
    detail: {
      suggestion: testSuggestion,
      workspacePath: 'C:\\test\\workspace'
    }
  });
  window.dispatchEvent(event);
  console.log('✅ Test event dispatched successfully');
} catch (error) {
  console.error('❌ Failed to dispatch event:', error);
}

// Test 4: Check event listener registration
console.log('\nTest 4: Event listener status');
const hasListener = window.__monacoEventListeners || 
  (() => {
    const listeners = [];
    const originalAdd = window.addEventListener;
    window.addEventListener = function(type, handler, options) {
      if (type === 'kaizer:apply-code-edit') {
        listeners.push({ type, handler: handler.toString().substring(0, 100) + '...' });
      }
      return originalAdd.call(this, type, handler, options);
    };
    window.__monacoEventListeners = listeners;
    return listeners;
  })();

console.log('Registered apply-code-edit listeners:', hasListener.length);

console.log('\n=== Test Complete ===');
console.log('Check browser console for EditorArea debug logs');