import { describe, expect, it } from "vitest";
import { solve, type Model, type Constraint } from "../src";

describe("solver basic", () => {
	it("solves distance with one fixed point", () => {
		const model: Model = {
			points: [
				{ id: "A", x: 0, y: 0 },
				{ id: "B", x: 2, y: 0 }
			],
			segments: []
		};
		const constraints: Constraint[] = [
			{ id: "fixA", type: "fix_point", refs: ["A"], params: { x: 0, y: 0 } },
			{ id: "dist", type: "distance", refs: ["A", "B"], params: { distance: 1 } }
		];
		const res = solve(model, constraints, { maxIterations: 50 });
		expect(res.converged).toBe(true);
		const B = res.model.points.find((p) => p.id === "B")!;
		expect(Math.hypot(B.x - 0, B.y - 0)).toBeCloseTo(1, 3);
	});
});


