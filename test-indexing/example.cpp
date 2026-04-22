// C++ example
#include <iostream>
#include <vector>
#include <string>

class GameEngine {
private:
    std::string name;
    int fps;

public:
    GameEngine(const std::string& engineName) : name(engineName), fps(60) {}
    
    void initialize() {
        std::cout << "Initializing " << name << std::endl;
    }
    
    void update(float deltaTime) {
        // Update game logic
    }
    
    void render() {
        // Render frame
    }
};

int main() {
    GameEngine engine("TestEngine");
    engine.initialize();
    return 0;
}
