// Example file to test code edit suggestions
// Ask the AI: "Can you refactor this code to use modern JavaScript?"

function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

function filterExpensive(items, threshold) {
  const result = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].price > threshold) {
      result.push(items[i]);
    }
  }
  return result;
}

class ShoppingCart {
  constructor() {
    this.items = [];
  }
  
  addItem(item) {
    this.items.push(item);
  }
  
  removeItem(itemId) {
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].id === itemId) {
        this.items.splice(i, 1);
        break;
      }
    }
  }
  
  getTotal() {
    return calculateTotal(this.items);
  }
}

// Example of code that could be improved
function processUserData(users) {
  const activeUsers = [];
  const inactiveUsers = [];
  
  for (let i = 0; i < users.length; i++) {
    if (users[i].active) {
      activeUsers.push(users[i]);
    } else {
      inactiveUsers.push(users[i]);
    }
  }
  
  return {
    active: activeUsers,
    inactive: inactiveUsers,
    total: users.length
  };
}

// Test the functions
const testItems = [
  { id: 1, name: "Item 1", price: 10 },
  { id: 2, name: "Item 2", price: 20 },
  { id: 3, name: "Item 3", price: 30 }
];

console.log("Total:", calculateTotal(testItems));
console.log("Expensive items:", filterExpensive(testItems, 15));

const cart = new ShoppingCart();
testItems.forEach(item => cart.addItem(item));
console.log("Cart total:", cart.getTotal());