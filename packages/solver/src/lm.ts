import { Matrix, CholeskyDecomposition, LuDecomposition } from "ml-matrix";
import type { Constraint, Model } from "./types";
import { createPacking } from "./packing";
import { residuals } from "./constraints";

export type SolveOptions = {
	maxIterations?: number;
	initialDamping?: number;
	gradientTolerance?: number;
	stepTolerance?: number;
};

export type SolveResult = {
	model: Model;
	iterations: number;
	cost: number;
	converged: boolean;
};

function numericJacobian(
	model: Model,
	constraints: Constraint[],
	x: Float64Array,
	f: (m: Model) => Float64Array,
	eps = 1e-6
): Matrix {
	const y0 = f(model);
	const m = y0.length;
	const n = x.length;
	const J = Matrix.zeros(m, n);
	for (let j = 0; j < n; j += 1) {
		const xpj = x.slice();
		const xmj = x.slice();
		const xpjVal = xpj[j] ?? 0;
		const xmjVal = xmj[j] ?? 0;
		xpj[j] = xpjVal + eps;
		xmj[j] = xmjVal - eps;
		const mp: Model = {
			...model,
			points: model.points.map((p, i) => {
				const isX = j % 2 === 0 && i === Math.floor(j / 2);
				const isY = j % 2 === 1 && i === Math.floor(j / 2);
				const val = xpj[j] ?? (isX ? p.x : p.y);
				return {
					...p,
					x: isX ? Number(val) : p.x,
					y: isY ? Number(val) : p.y
				};
			})
		};
		const mm: Model = {
			...model,
			points: model.points.map((p, i) => {
				const isX = j % 2 === 0 && i === Math.floor(j / 2);
				const isY = j % 2 === 1 && i === Math.floor(j / 2);
				const val = xmj[j] ?? (isX ? p.x : p.y);
				return {
					...p,
					x: isX ? Number(val) : p.x,
					y: isY ? Number(val) : p.y
				};
			})
		};
		const yp = residuals(mp, constraints).r;
		const ym = residuals(mm, constraints).r;
		for (let i = 0; i < m; i += 1) {
			const ypi = yp[i] ?? 0;
			const ymi = ym[i] ?? 0;
			J.set(i, j, (ypi - ymi) / (2 * eps));
		}
	}
	return J;
}

export function solve(model: Model, constraints: Constraint[], opts: SolveOptions = {}): SolveResult {
	const { maxIterations = 50, initialDamping = 1e-3, gradientTolerance = 1e-12, stepTolerance = 1e-12 } = opts;
	const packing = createPacking(model);
	let x = packing.toVector(model);
	let lambda = initialDamping;
	let costPrev = Infinity;

	const f = (m: Model) => residuals(m, constraints).r;

	let converged = false;
	let iterations = 0;
	for (iterations = 0; iterations < maxIterations; iterations += 1) {
		const r = f(model);
		const cost = 0.5 * Array.from(r).reduce((s, v) => s + v * v, 0);
		const J = numericJacobian(model, constraints, x, f);
		const JT = J.transpose();
		const g = JT.mmul(Matrix.columnVector(Array.from(r))).to1DArray();
		const gradInf = Math.max(...g.map((v) => Math.abs(v)));
		if (gradInf < gradientTolerance) {
			converged = true;
			break;
		}
		// Normal equations with damping: (J^T J + λI) δ = -J^T r
		const H = JT.mmul(J);
		for (let i = 0; i < H.rows; i += 1) {
			H.set(i, i, H.get(i, i) + lambda);
		}
		const b = Matrix.columnVector(g.map((v) => -v));
		let delta: Matrix;
		try {
			delta = new CholeskyDecomposition(H).solve(b);
		} catch {
			// fallback to LU if not SPD
			delta = new LuDecomposition(H).solve(b);
		}
		const dx = delta.to1DArray();
		const xNew = x.map((xi, i) => xi + (dx[i] ?? 0));
		const modelNew = packing.fromVector(model, Float64Array.from(xNew));
		const rNew = f(modelNew);
		const costNew = 0.5 * Array.from(rNew).reduce((s, v) => s + v * v, 0);
		const denom = dx.reduce((s, v, i) => {
			const vi = v ?? 0;
			const gi = g[i] ?? 0;
			return s + 0.5 * (H.get(i, i) * vi * vi + gi * vi);
		}, 0);
		const rho = (cost - costNew) / Math.max(1e-16, denom);
		if (costNew < cost) {
			model = modelNew;
			x = Float64Array.from(xNew);
			lambda = Math.max(1e-12, lambda / Math.max(2, 1 + 3 * (rho - 0.5)));
			if (Math.abs(costPrev - costNew) < stepTolerance) {
				converged = true;
				costPrev = costNew;
				break;
			}
			costPrev = costNew;
		} else {
			lambda = lambda * 2;
		}
	}
	const rFinal = residuals(model, constraints).r;
	const cost = 0.5 * Array.from(rFinal).reduce((s, v) => s + v * v, 0);
	return { model, iterations, cost, converged };
}


