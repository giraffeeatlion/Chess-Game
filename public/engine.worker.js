// This line is crucial. It loads the compiled C++ engine code into the worker's scope.
// --- FIX: Corrected the path to match your folder structure. ---
self.importScripts('/engine/engine.js');

let engineModule = null;

// The worker listens for messages from the main thread.
self.onmessage = async (event) => {
    // The main thread will send an object with data
    const { type, fen, depth, source } = event.data;

    // Initialize the Wasm module if it hasn't been already.
    // This happens only once, on the first message.
    if (!engineModule) {
        console.log("[Worker] Initializing engine module...");
        
        // Add a check to ensure EngineModule was actually loaded by importScripts.
        if (!self.EngineModule) {
            console.error("[Worker] CRITICAL: EngineModule not found after importScripts. Check that the path '/engine/engine.js' is correct.");
            self.postMessage({ move: null, source: source, error: "EngineModule failed to load." });
            return;
        }

        // The EngineModule is now available globally in the worker
        // because of the importScripts call above.
        engineModule = await self.EngineModule();
        console.log("[Worker] Engine module initialized.");
    }

    if (type === 'findBestMove') {
        try {
            console.log(`[Worker] Received FEN for source: ${source}. Starting calculation:`, fen);
            // This is the blocking call, but it's happening on the worker thread,
            // so the main UI thread remains completely responsive.
            const bestMove = engineModule.findBestMove(fen, depth || 6);
            console.log("[Worker] Calculation finished. Sending move back:", bestMove);

            // Send the result back to the main thread, including the original source
            self.postMessage({ move: bestMove, source: source });

        } catch (error) {
            console.error("[Worker] Error during engine calculation:", error);
            self.postMessage({ move: null, source: source, error: error.message });
        }
    }
};
