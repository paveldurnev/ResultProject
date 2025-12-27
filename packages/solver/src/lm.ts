import { Matrix, LuDecomposition } from "ml-matrix";
import type { Constraint, Model } from "./types";
import { createPacking } from "./packing";
import { residuals } from "./constraints";
import { analyticJacobian } from "./jacobian";

export type SolveOptions = {
	maxIterations?: number;
	epsilon?: number;
	regularizationTau?: number;
};

export type SolveResult = {
	model: Model;
	iterations: number;
	cost: number;
	converged: boolean;
};


export function solve(model: Model, constraints: Constraint[], opts: SolveOptions = {}): SolveResult {
	const { maxIterations = 50, epsilon = 1e-6, regularizationTau = 1e-12 } = opts;

	// Base model and packing; dx accumulates [lambda, params] increments relative to this base
	const packing = createPacking(model);
	const baseModel = model;
	const x0 = packing.toVector(baseModel);
	const n = x0.length;

	// Compute m (number of scalar constraint equations)
	const rowsFor = (type: Constraint["type"]): number => {
		switch (type) {
			case "coincident":
				return 2;
			case "fix_point":
				return 2;
			case "distance":
			case "parallel":
			case "perpendicular":
			case "vertical":
			case "horizontal":
			case "angle":
			case "point_on_line":
				return 1;
			default:
				return 0;
		}
	};
	let m = 0;
	for (const c of constraints) m += rowsFor(c.type);

	// Full unknown vector length m + n: [lambda_1..m, dx_params_1..n]
	let dx: Float64Array = new Float64Array(m + n);
	dx.fill(0);

	const residualVec = (): Float64Array => residuals(baseModel, constraints, dx).dF_dx;

	let converged = false;
	let iterations = 0;
	for (iterations = 0; iterations < maxIterations; iterations += 1) {
		const R = residualVec();
		let J = analyticJacobian(baseModel, constraints, dx);

		// console.log(J.to2DArray());

		// Optional tiny diagonal regularization for numerical stability
		if (regularizationTau > 0) {
			for (let i = 0; i < n; i += 1) {
				J.set(m + i, m + i, J.get(m + i, m + i) + regularizationTau);
			}
		}

		const b = Matrix.columnVector(Array.from(R, (v) => -v));
		let deltaMat: Matrix;
		try {
			deltaMat = new LuDecomposition(J).solve(b);
		} catch {
			// If LU fails, try a slightly stronger diagonal regularization and retry once
			for (let i = 0; i < J.rows; i += 1) J.set(i, i, J.get(i, i) + Math.max(regularizationTau, 1e-12));
			deltaMat = new LuDecomposition(J).solve(b);
		}
		const step = deltaMat.to1DArray();

		// Update dx
		for (let i = 0; i < dx.length; i += 1) {
			dx[i] = (dx[i] ?? 0) + (step[i] ?? 0);
		}

		// Check stopping criterion using the parameter subvector
		let stepNorm2 = 0;
		for (let i = 0; i < n; i += 1) {
			const si = step[m + i] ?? 0;
			stepNorm2 += si * si;
		}
		if (stepNorm2 < epsilon) {
			converged = true;
			break;
		}

		// Update visible model for the next iteration (from base + accumulated dx_params)
		const xNew: Float64Array = new Float64Array(n);
		for (let i = 0; i < n; i += 1) {
			xNew[i] = (x0[i] ?? 0) + (dx[m + i] ?? 0);
		}
		model = packing.fromVector(baseModel, xNew);
	}

	// Final model and cost
	const xFinal: Float64Array = new Float64Array(n);
	for (let i = 0; i < n; i += 1) xFinal[i] = (x0[i] ?? 0) + (dx[m + i] ?? 0);
	const finalModel = packing.fromVector(baseModel, xFinal);
	const Rfinal = residuals(baseModel, constraints, dx).dF_dx;
	const cost = 0.5 * Array.from(Rfinal).reduce((s, v) => s + v * v, 0);
	return { model: finalModel, iterations, cost, converged };
}


