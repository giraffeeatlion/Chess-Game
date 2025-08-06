// This script runs on a separate thread.

// First, import the Emscripten-generated JS file.
// '/engine/engine.js' is the path from the root of your public folder.
self.importScripts('/engine/engine.js');

let engineModule = null;

// Listen for messages from the main React app
self.onmessage = async (e) => {
    // The first message we receive will be to initialize the Wasm module
    if (e.data.type === 'init') {
        engineModule = await self.EngineModule();
        // Send a message back to confirm that the engine is loaded and ready.
        self.postMessage({ type: 'ready' });
    } 
    // Subsequent messages will be requests to find the best move
    else if (e.data.type === 'findBestMove' && engineModule) {
        const { fen, depth } = e.data;
        try {
            const bestMove = engineModule.findBestMove(fen, depth);
            // Once the calculation is done, send the result back to the main app
            self.postMessage({ type: 'result', bestMove: bestMove });
        } catch (error) {
            // If the engine crashes, send the error message back
            self.postMessage({ type: 'error', error: error.message });
        }
    }
};