import test from "./new-module.js";

export default function calculate(a, b) {
	if (a >= 9 && a <= 10) {
		return a + b;
	}

	if (a === 3) {
		return a;
	}

	if (a === 4) {
		return a;
	}

	if (a === 6) {
		return a ** b;
	}

	return a + 1;
}
