-- Basic Lua test file

-- System Information
print("=== Lua Environment Info ===")
print("Lua Version: " .. _VERSION)
print("Operating System: " .. (package.config:sub(1,1) == '\\' and "Windows" or "Unix/Linux"))
print("Current Time: " .. os.date("%Y-%m-%d %H:%M:%S"))
print("Timestamp: " .. os.time())
print("")

-- Memory and Performance
print("=== Memory Info ===")
print("Memory used (KB): " .. collectgarbage("count"))
print("")

-- Path Information
print("=== Path Info ===")
print("Package Path: " .. package.path)
print("Package CPath: " .. package.cpath)
print("")

-- Environment Variables (if available)
print("=== Environment ===")
local home = os.getenv("HOME") or os.getenv("USERPROFILE")
if home then
    print("Home Directory: " .. home)
end
local user = os.getenv("USER") or os.getenv("USERNAME")
if user then
    print("Current User: " .. user)
end
local temp = os.getenv("TEMP") or os.getenv("TMP")
if temp then
    print("Temp Directory: " .. temp)
end
print("")

-- Lua Capabilities
print("=== Lua Capabilities ===")
print("String library: " .. (string and "Available" or "Not Available"))
print("Table library: " .. (table and "Available" or "Not Available"))
print("Math library: " .. (math and "Available" or "Not Available"))
print("IO library: " .. (io and "Available" or "Not Available"))
print("OS library: " .. (os and "Available" or "Not Available"))
print("Debug library: " .. (debug and "Available" or "Not Available"))
print("Coroutine support: " .. (coroutine and "Available" or "Not Available"))
print("UTF8 library: " .. (utf8 and "Available (Lua 5.3+)" or "Not Available"))
print("")

-- Global Environment Info
print("=== Global Environment ===")
local global_count = 0
for k, v in pairs(_G) do
    global_count = global_count + 1
end
print("Global variables count: " .. global_count)
print("Arg table: " .. (arg and "Available" or "Not Available"))
print("")

-- Simple function
function greet(name)
    return "Hello, " .. name .. "!"
end

-- Table example
local person = {
    name = "John",
    age = 25,
    city = "New York"
}

print("=== Basic Examples ===")

-- Loop example
local numbers = {1, 2, 3, 4, 5}
for i, num in ipairs(numbers) do
    print("Number " .. i .. ": " .. num)
end

-- Conditional example
local score = 85
if score >= 90 then
    print("Grade: A")
elseif score >= 80 then
    print("Grade: B")
else
    print("Grade: C")
end

-- Test the greet function
print(greet("World"))
print(greet(person.name))

-- Math capabilities
print("")
print("=== Math Info ===")
print("Max Integer: " .. (math.maxinteger or "N/A (Lua 5.2 or earlier)"))
print("Min Integer: " .. (math.mininteger or "N/A (Lua 5.2 or earlier)"))
print("Pi: " .. math.pi)
print("Huge (infinity): " .. math.huge)
print("Random number: " .. math.random(1, 100))
print("")

-- String capabilities
print("=== String Info ===")
local test_string = "Lua Programming"
print("Test string: " .. test_string)
print("Length: " .. #test_string)
print("Uppercase: " .. string.upper(test_string))
print("Lowercase: " .. string.lower(test_string))
print("Reversed: " .. string.reverse(test_string))
print("")

-- Table operations
print("=== Table Info ===")
local test_table = {10, 20, 30, 40, 50}
print("Table length: " .. #test_table)
print("Table concat: " .. table.concat(test_table, ", "))
table.insert(test_table, 60)
print("After insert: " .. table.concat(test_table, ", "))
print("")

-- Type information
print("=== Type System ===")
print("Type of 42: " .. type(42))
print("Type of 'hello': " .. type("hello"))
print("Type of true: " .. type(true))
print("Type of {}: " .. type({}))
print("Type of function: " .. type(function() end))
print("Type of nil: " .. type(nil))
print("")

-- Final memory check
print("=== Final Stats ===")
print("Memory after execution (KB): " .. collectgarbage("count"))
print("Script completed successfully!")
