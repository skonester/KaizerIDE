# Python example
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

class DataProcessor:
    def __init__(self, data):
        self.data = data
    
    def process(self):
        return [x * 2 for x in self.data]
    
    def filter_positive(self):
        return [x for x in self.data if x > 0]

if __name__ == "__main__":
    processor = DataProcessor([1, -2, 3, -4, 5])
    print(processor.filter_positive())
