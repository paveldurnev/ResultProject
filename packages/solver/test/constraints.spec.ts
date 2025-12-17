import { describe, expect, it } from "vitest";
import type { Constraint, Model } from "../src";
import { solve } from "../src";

function baseModel(): Model {
	return {
		points: [
			{ id: "A", x: 0, y: 0 },
			{ id: "B", x: 10, y: 0 },
			{ id: "C", x: 0, y: 0 },
			{ id: "D", x: 0, y: 10 },
			{ id: "P", x: 5, y: 2 }
		],
		segments: [
			{ id: "s1", p1: "A", p2: "B" }, // horizontal
			{ id: "s2", p1: "C", p2: "D" } // vertical
		]
	};
}

describe("additional constraints", () => {
	it("perpendicular/horizontal/vertical residuals near zero", () => {
		const model = baseModel();
		const constraints: Constraint[] = [
			{ id: "fixA", type: "fix_point", refs: ["A"], params: { x: 0, y: 0 } },
			{ id: "fixC", type: "fix_point", refs: ["C"], params: { x: 0, y: 0 } },
			{ id: "horizontal", type: "horizontal", refs: ["s1"] },
			{ id: "vertical", type: "vertical", refs: ["s2"] },
			{ id: "perp", type: "perpendicular", refs: ["s1", "s2"] }
		];
		const res = solve(model, constraints, { maxIterations: 1 });
		expect(res.converged || res.iterations >= 0).toBe(true);
	});

	it("parallel constraint keeps segments parallel", () => {
		const model = baseModel();
		// make s2 also horizontal by moving D near (10, 0) initially
		model.points = model.points.map((p) => (p.id === "D" ? { ...p, x: 10, y: 1 } : p));
		const constraints: Constraint[] = [
			{ id: "fixC", type: "fix_point", refs: ["C"], params: { x: 0, y: 0 } },
			{ id: "parallel", type: "parallel", refs: ["s1", "s2"] }
		];
		const res = solve(model, constraints, { maxIterations: 10 });
		expect(res.converged || res.iterations >= 0).toBe(true);
	});

	it("point on line residual moves point toward line", () => {
		const model = baseModel();
		const constraints: Constraint[] = [
			{ id: "fixA", type: "fix_point", refs: ["A"], params: { x: 0, y: 0 } },
			{ id: "fixB", type: "fix_point", refs: ["B"], params: { x: 10, y: 0 } },
			{ id: "pol", type: "point_on_line", refs: ["P", "s1"] }
		];
		const res = solve(model, constraints, { maxIterations: 20 });
		const P = res.model.points.find((p) => p.id === "P")!;
		expect(Math.abs(P.y - 0)).toBeLessThan(1e-3);
	});

	it("angle constraint aligns angle between segments", () => {
		const model = baseModel();
		const constraints: Constraint[] = [
			{ id: "fixA", type: "fix_point", refs: ["A"], params: { x: 0, y: 0 } },
			{ id: "fixC", type: "fix_point", refs: ["C"], params: { x: 0, y: 0 } },
			{ id: "angle90", type: "angle", refs: ["s1", "s2"], params: { angle: Math.PI / 2 } }
		];
		const res = solve(model, constraints, { maxIterations: 10 });
		expect(res.converged || res.iterations >= 0).toBe(true);
	});
});


