#!/usr/bin/env node
import { config } from "@dotenvx/dotenvx";
// Configure dotenvx to be quiet (no stdout pollution in stdio mode)
config({ quiet: true });
// Import tool registration functions
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { name, version } from "../package.json";
import { registerFolderTools } from "./tools/folders.js";
import { registerRoutineTools } from "./tools/routines.js";
import { registerTemplateTools } from "./tools/templates.js";
import { registerWebhookTools } from "./tools/webhooks.js";
// Import tool registration functions
import { registerWorkoutTools } from "./tools/workouts.js";
import { assertApiKey, parseConfig } from "./utils/config.js";
import { createClient } from "./utils/hevyClient.js";
import { createHttpServer } from "./utils/httpServer.js";

const HEVY_API_BASEURL = "https://api.hevyapp.com";

// Parse config (CLI args + env)
const args = process.argv.slice(2);
const cfg = parseConfig(args, process.env);

// Create server instance
const server = new McpServer({
	name,
	version,
});

// Validate API key presence
assertApiKey(cfg.apiKey);

// Configure client
const apiKey = cfg.apiKey;
const hevyClient = createClient(apiKey, HEVY_API_BASEURL);

// Register all tools
registerWorkoutTools(server, hevyClient);
registerRoutineTools(server, hevyClient);
registerTemplateTools(server, hevyClient);
registerFolderTools(server, hevyClient);
registerWebhookTools(server, hevyClient);

// Start the server
async function runServer() {
	if (cfg.transportMode === "http") {
		console.log(
			`Starting MCP server in HTTP mode on ${cfg.httpHost}:${cfg.httpPort}`,
		);
		const httpServer = createHttpServer(server, {
			port: cfg.httpPort,
			host: cfg.httpHost,
			enableDnsRebindingProtection: cfg.enableDnsRebindingProtection,
			allowedHosts: cfg.allowedHosts,
		});
		await httpServer.startServer();
	} else {
		// Note: Cannot use console.log in stdio mode as it interferes with MCP protocol
		const transport = new StdioServerTransport();
		await server.connect(transport);
	}
}

runServer().catch((error) => {
	console.error("Fatal error in main():", error);
	process.exit(1);
});
