import inspector from "node:inspector/promises";
import { parseArgs } from "node:util";
import { isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const COLORS = {
	GREEN: "\x1b[32m",
	RED: "\x1b[31m",
	END_LINE: "\x1b[0m",
};

const currentFileName = fileURLToPath(import.meta.url);

function filterCoverageResults(coverage) {
	return coverage.result.filter(({ url }) => {
		if (url.startsWith("file:///")) {
			const finalUrl = fileURLToPath(url);
			return isAbsolute(finalUrl) && finalUrl !== currentFileName;
		}

		return false;
	});
}

function generateCoverageReport(fileName, sourceCode, coverageFunctions) {
	const uncoveredLines = [];

	for (const coverage of coverageFunctions) {
		for (const range of coverage.ranges) {
			if (range.count !== 0) continue;

			const startLine = sourceCode
				.substring(0, range.startOffset)
				.split("\n").length;
			const endLine = sourceCode
				.substring(0, range.endOffset)
				.split("\n").length;

			for (let charIndex = startLine; charIndex <= endLine; charIndex++) {
				uncoveredLines.push(charIndex);
			}
		}
	}

	console.log("\n", COLORS.GREEN + fileName + COLORS.END_LINE);
	const lines = sourceCode.split("\n").entries();
	for (const [lineIndex, line] of lines) {
		if (
			uncoveredLines.includes(lineIndex + 1) &&
			!(
				line.trimStart().startsWith("}") &&
				!uncoveredLines.includes(lineIndex )
			)
		) {
			console.log(COLORS.RED + line + COLORS.END_LINE);
			continue;
		}

		console.log(line);
	}
}

const { positionals } = parseArgs({
	allowPositionals: true,
});

const entryPoint = positionals[0];

if (!entryPoint) {
	throw new Error("The path to entry point file must be specified.");
}

const session = new inspector.Session();
session.connect();

await session.post("Profiler.enable");
await session.post("Profiler.startPreciseCoverage", {
	callCount: true,
	detailed: true,
});

await import(`../${entryPoint}`);

const preciseCoverage = await session.post("Profiler.takePreciseCoverage");
await session.post("Profiler.stopPreciseCoverage");
const results = filterCoverageResults(preciseCoverage);

for (const coverage of results) {
	const fileName = fileURLToPath(coverage.url);
	const sourceCode = await readFile(fileName, "utf8");
	generateCoverageReport(fileName, sourceCode, coverage.functions);
}
