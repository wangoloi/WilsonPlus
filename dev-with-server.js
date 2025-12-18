const { spawn } = require("child_process");
const path = require("path");

// This script is for development only - when you want to work on the frontend with hot reload
async function startDevMode() {
  console.log("🚀 Starting NyumbaTrack in Development Mode...\n");
  console.log("📝 This mode is for frontend development with hot reload");
  console.log("🔄 Frontend changes will be reflected immediately\n");

  // Start React dev server
  console.log("🔧 Starting React development server...");
  const reactProcess = spawn("npm", ["start"], {
    cwd: path.join(__dirname, "frontend"),
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  // Wait a bit for React server to start
  setTimeout(() => {
    console.log("🖥️  Starting Electron in development mode...");

    // Start Electron in development mode
    const electronProcess = spawn("npx", ["electron", "backend/src/main.js"], {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        NODE_ENV: "development",
      },
    });

    electronProcess.on("exit", (code) => {
      console.log("\n🏁 Electron closed, shutting down dev server...");
      reactProcess.kill();
      process.exit(code);
    });
  }, 5000); // Wait 5 seconds for React server to start

  // Handle process termination
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down development mode...");
    reactProcess.kill();
    process.exit(0);
  });
}

startDevMode().catch((error) => {
  console.error("❌ Failed to start development mode:", error);
  process.exit(1);
});
