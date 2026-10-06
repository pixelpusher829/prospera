#!/usr/bin/env node
// Generates the signing keys Convex Auth needs and stores them, along with
// SITE_URL, as environment variables on your Convex deployment.
//
//   node scripts/setup-auth.mjs                         # dev, http://localhost:3000
//   node scripts/setup-auth.mjs https://app.example.com --prod
//
// Re-running rotates the keys, which signs everyone out.
import { spawnSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [siteUrl = "http://localhost:3000", ...convexArgs] =
	process.argv.slice(2);

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
	modulusLength: 2048,
});
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const jwk = publicKey.export({ format: "jwk" });
const jwks = JSON.stringify({ keys: [{ use: "sig", alg: "RS256", ...jwk }] });

const file = join(tmpdir(), `convex-auth-${process.pid}.env`);
writeFileSync(
	file,
	[
		`JWT_PRIVATE_KEY="${pem.trimEnd().replace(/\n/g, " ")}"`,
		`JWKS='${jwks}'`,
		`SITE_URL=${siteUrl}`,
		"",
	].join("\n"),
	{ mode: 0o600 },
);

try {
	const result = spawnSync(
		"npx",
		["convex", "env", "set", "--force", "--from-file", file, ...convexArgs],
		{ stdio: "inherit", shell: process.platform === "win32" },
	);
	process.exitCode = result.status ?? 1;
} finally {
	rmSync(file, { force: true });
}
