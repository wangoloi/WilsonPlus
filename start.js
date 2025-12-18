const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

async function startApp() {
  console.log("🚀 Starting WilsonPlus Electron App...\n");

  // Check if we're in development mode
  const isDev =
    process.env.NODE_ENV === "development" || process.argv.includes("--dev");
  console.log(`Environment: ${process.env.NODE_ENV || "production"}`);
  console.log(`Development mode: ${isDev}`);

  if (isDev) {
    console.log("🔧 Starting in development mode with hot reload...");

    // Start React dev server
    console.log("📦 Starting React development server...");
    const reactProcess = spawn("npm", ["start"], {
      cwd: path.join(__dirname, "frontend"),
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    // Wait a bit for React server to start
    await new Promise((resolve) => setTimeout(resolve, 8000));

    // Start Electron in development mode
    console.log("🖥️  Starting Electron in development mode...");
    const electronProcess = spawn("npx", ["electron", "backend/src/main.js"], {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, NODE_ENV: "development" },
    });

    electronProcess.on("exit", (code) => {
      console.log("\n🏁 Electron closed, shutting down dev server...");
      reactProcess.kill();
      process.exit(code);
    });

    process.on("SIGINT", () => {
      console.log("\n🛑 Shutting down development mode...");
      reactProcess.kill();
      electronProcess.kill();
      process.exit(0);
    });
  } else {
    // Production mode - use built files
    console.log("📦 Running in production mode...");

    const buildPath = path.join(__dirname, "frontend", "build");
    if (!fs.existsSync(buildPath)) {
      console.log("📦 Frontend not built yet, building now...");
      const buildProcess = spawn("npm", ["run", "build"], {
        cwd: path.join(__dirname, "frontend"),
        stdio: "inherit",
        shell: process.platform === "win32",
      });

      await new Promise((resolve, reject) => {
        buildProcess.on("exit", (code) => {
          if (code === 0) {
            console.log("✅ Frontend built successfully!");
            resolve();
          } else {
            console.error("❌ Failed to build frontend");
            reject(new Error(`Build failed with code ${code}`));
          }
        });
        buildProcess.on("error", (error) => {
          console.error("❌ Build process error:", error);
          reject(error);
        });
      });
    } else {
      console.log("✅ Frontend build found");
    }

    console.log("🖥️  Starting Electron...");
    const electronProcess = spawn("npx", ["electron", "backend/src/main.js"], {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, NODE_ENV: "production" },
    });

    electronProcess.on("error", (error) => {
      console.error("❌ Failed to start Electron:", error);
      process.exit(1);
    });

    electronProcess.on("exit", (code) => {
      console.log(`\n🏁 WilsonPlus closed with code ${code}`);
      process.exit(code);
    });

    process.on("SIGINT", () => {
      console.log("\n🛑 Shutting down WilsonPlus...");
      if (electronProcess && !electronProcess.killed) {
        electronProcess.kill();
      }
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("\n🛑 Shutting down WilsonPlus...");
      if (electronProcess && !electronProcess.killed) {
        electronProcess.kill();
      }
      process.exit(0);
    });
  }
}

startApp().catch((error) => {
  console.error("❌ Failed to start WilsonPlus:", error);
  process.exit(1);
});
