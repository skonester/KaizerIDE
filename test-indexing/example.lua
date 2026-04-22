-- Lua example
function greet(name)
    return "Hello, " .. name .. "!"
end

local Player = {}
Player.__index = Player

function Player:new(name, health)
    local instance = setmetatable({}, Player)
    instance.name = name
    instance.health = health or 100
    return instance
end

function Player:takeDamage(amount)
    self.health = self.health - amount
    if self.health <= 0 then
        self:die()
    end
end

function Player:die()
    print(self.name .. " has died!")
end

return Player
