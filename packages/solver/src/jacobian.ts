import { Matrix } from "ml-matrix";
import type { Constraint, Model } from "./types";
import { createPacking } from "./packing";
import { residuals } from "./constraints";

function safeHypot(x: number, y: number): number {
	const n = Math.hypot(x, y);
	return n > 1e-12 ? n : 1e-12;
}

function getPointParamIndices(pointIndex: number): { ix: number; iy: number } {
	return { ix: pointIndex * 2 + 0, iy: pointIndex * 2 + 1 };
}

export function analyticJacobian(model: Model, constraints: Constraint[], dx: Float64Array): Matrix {
	const packing = createPacking(model);
	const { lambdaIndexByConstraint, dF_dx, lambdaTotal } = residuals(model, constraints, dx);
	const m = lambdaTotal;
	const n = model.points.length * 2;
	const J = Matrix.zeros(m + n, m + n);

	const pointIndexById = packing.pointIndexById;

	const getSeg = (segId: string) => model.segments.find((s) => s.id === segId);

	const getSegEndpoints = (segId: string) => {
		const seg = getSeg(segId);
		if (!seg) return null;
		const iA = pointIndexById.get(seg.p1);
		const iB = pointIndexById.get(seg.p2);
		if (iA === undefined || iB === undefined) return null;
		const A = model.points[iA]!;
		const B = model.points[iB]!;
		return { iA, iB, A, B };
	};

	for (let k = 0; k < constraints.length; k += 1) {
		const c = constraints[k];
		if (!c) continue;
		const lambdaBase = lambdaIndexByConstraint[k] ?? 0;
		// const weight = c?.weight ?? 1.0;
		switch (c.type) {
			case "coincident": {
				const [aId, bId] = c.refs as [string, string];
				const ia = pointIndexById.get(aId);
				const ib = pointIndexById.get(bId);
				if (ia === undefined || ib === undefined) break;
				let { ix: ax, iy: ay } = getPointParamIndices(ia);
				let { ix: bx, iy: by } = getPointParamIndices(ib);

				ax += lambdaTotal;
				ay += lambdaTotal;
				bx += lambdaTotal;
				by += lambdaTotal;

				// lambda_1
				J.set(ax, lambdaBase + 0, J.get(ax, lambdaBase + 0) - 1);
				J.set(ay, lambdaBase + 0, J.get(ay, lambdaBase + 0) + 0);
				J.set(lambdaBase + 0, ax, J.get(lambdaBase + 0, ax) - 1);
				J.set(lambdaBase + 0, ay, J.get(lambdaBase + 0, ay) + 0);
				J.set(bx, lambdaBase + 0, J.get(bx, lambdaBase + 0) + 1);
				J.set(by, lambdaBase + 0, J.get(by, lambdaBase + 0) + 0);
				J.set(lambdaBase + 0, bx, J.get(lambdaBase + 0, bx) + 1);
				J.set(lambdaBase + 0, by, J.get(lambdaBase + 0, by) + 0);

				// lambda_2
				J.set(ax, lambdaBase + 1, J.get(ax, lambdaBase + 1) + 0);
				J.set(ay, lambdaBase + 1, J.get(ay, lambdaBase + 1) - 1);
				J.set(lambdaBase + 1, ax, J.get(lambdaBase + 1, ax) + 0);
				J.set(lambdaBase + 1, ay, J.get(lambdaBase + 1, ay) - 1);
				J.set(bx, lambdaBase + 1, J.get(bx, lambdaBase + 1) + 0);
				J.set(by, lambdaBase + 1, J.get(by, lambdaBase + 1) + 1);
				J.set(lambdaBase + 1, bx, J.get(lambdaBase + 1, bx) + 0);
				J.set(lambdaBase + 1, by, J.get(lambdaBase + 1, by) + 1);

				// dx1
				// J.set(ay, ax, J.get(ay, ax) + 0);
				// J.set(bx, ax, J.get(bx, ax) + 0);
				// J.set(by, ax, J.get(by, ax) + 0);
				// J.set(ax, ay, J.get(ax, ay) + 0);
				// J.set(ax, by, J.get(ax, by) + 0);
				// J.set(ax, by, J.get(ax, by) + 0);

				// dy1
				// J.set(bx, ay, J.get(bx, ay) + 0);
				// J.set(by, ay, J.get(by, ay) + 0);
				// J.set(ay, bx, J.get(ay, bx) + 0);
				// J.set(ay, by, J.get(ay, by) + 0);

				// dx2
				// J.set(by, bx, J.get(by, bx) + 0);
				// J.set(bx, by, J.get(bx, by) + 0);

				break;
			}
			case "distance": {
				const [aId, bId] = c.refs as [string, string];
				const ia = pointIndexById.get(aId);
				const ib = pointIndexById.get(bId);
				if (ia === undefined || ib === undefined) break;
				const A = model.points[ia]!;
				const B = model.points[ib]!;
				let { ix: ax, iy: ay } = getPointParamIndices(ia);
				let { ix: bx, iy: by } = getPointParamIndices(ib);
				ax += lambdaTotal;
				ay += lambdaTotal;
				bx += lambdaTotal;
				by += lambdaTotal;
				
				// lambda_1
				J.set(ax, lambdaBase + 0, J.get(ax, lambdaBase + 0) - 2 * (B.x + dx[bx]! - A.x - dx[ax]!));
				J.set(ay, lambdaBase + 0, J.get(ay, lambdaBase + 0) - 2*(B.y + dx[by]! - A.y - dx[ay]!));
				J.set(lambdaBase + 0, ax, J.get(lambdaBase + 0, ax) - 2*(B.x + dx[bx]! - A.x - dx[ax]!));
				J.set(lambdaBase + 0, ay, J.get(lambdaBase + 0, ay) - 2*(B.y + dx[by]! - A.y - dx[ay]!));
				J.set(bx, lambdaBase + 0, J.get(bx, lambdaBase + 0) + 2*(B.x + dx[bx]! - A.x - dx[ax]!));
				J.set(by, lambdaBase + 0, J.get(by, lambdaBase + 0) + 2*(B.y + dx[by]! - A.y - dx[ay]!));
				J.set(lambdaBase + 0, bx, J.get(lambdaBase + 0, bx) + 2*(B.x + dx[bx]! - A.x - dx[ax]!));
				J.set(lambdaBase + 0, by, J.get(lambdaBase + 0, by) + 2*(B.y + dx[by]! - A.y - dx[ay]!));

				// dx1
				J.set(ax, ax, J.get(ax, ax) + 2 * dx[lambdaBase + 0]!);
				J.set(ay, ax, J.get(ay, ax) + 0);
				J.set(bx, ax, J.get(bx, ax) - 2 * dx[lambdaBase + 0]!);
				J.set(by, ax, J.get(by, ax) + 0);
				J.set(ax, ay, J.get(ax, ay) + 0);
				J.set(ax, bx, J.get(ax, bx) - 2 * dx[lambdaBase + 0]!);
				J.set(ax, by, J.get(ax, by) + 0);

				// dy1
				J.set(ay, ay, J.get(ay, ay) + 2 * dx[lambdaBase + 0]!);
				J.set(bx, ay, J.get(bx, ay) + 0);
				J.set(by, ay, J.get(by, ay) - 2 * dx[lambdaBase + 0]!);
				J.set(ay, bx, J.get(ay, bx) + 0);
				J.set(ay, by, J.get(ay, by) - 2 * dx[lambdaBase + 0]!);
				
				// dx2
				J.set(bx, bx, J.get(bx, bx) + 2 * dx[lambdaBase + 0]!);
				J.set(by, bx, J.get(by, bx) + 0);
				J.set(bx, by, J.get(bx, by) + 0);

				// dy2
				J.set(by, by, J.get(by, by) + 2 * dx[lambdaBase + 0]!);

				break;
			}
			case "fix_point": {
				const [aId] = c.refs as [string];
				const ia = pointIndexById.get(aId);
				if (ia === undefined) break;
				let { ix: ax, iy: ay } = getPointParamIndices(ia);
				ax += lambdaTotal;
				ay += lambdaTotal;

				// lambda_1
				J.set(ax, lambdaBase + 0, J.get(ax, lambdaBase + 0) + 1);
				J.set(ay, lambdaBase + 0, J.get(ay, lambdaBase + 0) + 0);
				J.set(lambdaBase + 0, ax, J.get(lambdaBase + 0, ax) + 1);
				J.set(lambdaBase + 0, ay, J.get(lambdaBase + 0, ay) + 0);

				// lambda_2
				J.set(ax, lambdaBase + 1, J.get(ax, lambdaBase + 1) + 0);
				J.set(ay, lambdaBase + 1, J.get(ay, lambdaBase + 1) + 1);
				J.set(lambdaBase + 1, ax, J.get(lambdaBase + 1, ax) + 0);
				J.set(lambdaBase + 1, ay, J.get(lambdaBase + 1, ay) + 1);


				// dx1
				J.set(ay, ax, J.get(ay, ax) + 0);
				J.set(ax, ay, J.get(ax, ay) + 0);

				break;
			}
			case "vertical": {
				const [segId] = c.refs as [string];
				const info = getSegEndpoints(segId);
				if (!info) break;
				const { iA, iB } = info;
				let { ix: ax } = getPointParamIndices(iA);
				let { ix: bx } = getPointParamIndices(iB);
				ax += lambdaTotal;
				bx += lambdaTotal;

				// lambda_1
				J.set(ax, lambdaBase + 0, J.get(ax, lambdaBase + 0) - 1);
				J.set(bx, lambdaBase + 0, J.get(bx, lambdaBase + 0) + 1);
				J.set(lambdaBase + 0, ax, J.get(lambdaBase + 0, ax) - 1);
				J.set(lambdaBase + 0, bx, J.get(lambdaBase + 0, bx) + 1);

				// dx1
				// J.set(bx, ax, J.get(bx, ax) + 0);
				// J.set(ax, bx, J.get(ax, bx) + 0);
				
				break;
			}
			case "horizontal": {
				const [segId] = c.refs as [string];
				const info = getSegEndpoints(segId);
				if (!info) break;
				const { iA, iB, A, B } = info;
				let { iy: ay } = getPointParamIndices(iA);
				let { iy: by } = getPointParamIndices(iB);
				ay += lambdaTotal;
				by += lambdaTotal;

				// lambda_1
				J.set(ay, lambdaBase + 0, J.get(ay, lambdaBase + 0) - 1);
				J.set(by, lambdaBase + 0, J.get(by, lambdaBase + 0) + 1);
				J.set(lambdaBase + 0, ay, J.get(lambdaBase + 0, ay) - 1);
				J.set(lambdaBase + 0, by, J.get(lambdaBase + 0, by) + 1);

				// dx1
				// J.set(by, ay, J.get(by, ay) + 0);
				// J.set(ay, by, J.get(ay, by) + 0);
				break;
			}
			case "parallel": {
				const [segA, segB] = c.refs as [string, string];
				const infoA = getSegEndpoints(segA);
				const infoB = getSegEndpoints(segB);
				if (!infoA || !infoB) break;
				const { iA: iA1, iB: iA2, A: A1, B: A2 } = infoA;
				const { iA: iB1, iB: iB2, A: B1, B: B2 } = infoB;				
				let { ix: ax1, iy: ay1 } = getPointParamIndices(iA1);
				let { ix: ax2, iy: ay2 } = getPointParamIndices(iA2);
				let { ix: bx1, iy: by1 } = getPointParamIndices(iB1);
				let { ix: bx2, iy: by2 } = getPointParamIndices(iB2);
				ax1 += lambdaTotal;
				ay1 += lambdaTotal;
				ax2 += lambdaTotal;
				ay2 += lambdaTotal;
				bx1 += lambdaTotal;
				by1 += lambdaTotal;
				bx2 += lambdaTotal;
				by2 += lambdaTotal;

				// lambda_1
				J.set(ax1, lambdaBase + 0, J.get(ax1, lambdaBase + 0) - (B2.y + dx[by2]! - B1.y - dx[by1]!));
				J.set(ay1, lambdaBase + 0, J.get(ay1, lambdaBase + 0) + (B2.x + dx[bx2]! - B1.x - dx[bx1]!));
				J.set(ax2, lambdaBase + 0, J.get(ax2, lambdaBase + 0) + (B2.y + dx[by2]! - B1.y - dx[by1]!));
				J.set(ay2, lambdaBase + 0, J.get(ay2, lambdaBase + 0) - (B2.x + dx[bx2]! - B1.x - dx[bx1]!));
				J.set(bx1, lambdaBase + 0, J.get(bx1, lambdaBase + 0) + (A2.y + dx[ay2]! - A1.y - dx[ay1]!));
				J.set(by1, lambdaBase + 0, J.get(by1, lambdaBase + 0) - (A2.x + dx[ax2]! - A1.x - dx[ax1]!));
				J.set(bx2, lambdaBase + 0, J.get(bx2, lambdaBase + 0) - (A2.y + dx[ay2]! - A1.y - dx[ay1]!));
				J.set(by2, lambdaBase + 0, J.get(by2, lambdaBase + 0) + (A2.x + dx[ax2]! - A1.x - dx[ax1]!));
				J.set(lambdaBase + 0, ax1, J.get(lambdaBase + 0, ax1) - (B2.y + dx[by2]! - B1.y - dx[by1]!));
				J.set(lambdaBase + 0, ay1, J.get(lambdaBase + 0, ay1) + (B2.x + dx[bx2]! - B1.x - dx[bx1]!));
				J.set(lambdaBase + 0, ax2, J.get(lambdaBase + 0, ax2) + (B2.y + dx[by2]! - B1.y - dx[by1]!));
				J.set(lambdaBase + 0, ay2, J.get(lambdaBase + 0, ay2) - (B2.x + dx[bx2]! - B1.x - dx[bx1]!));
				J.set(lambdaBase + 0, bx1, J.get(lambdaBase + 0, bx1) + (A2.y + dx[ay2]! - A1.y - dx[ay1]!));
				J.set(lambdaBase + 0, by1, J.get(lambdaBase + 0, by1) - (A2.x + dx[ax2]! - A1.x - dx[ax1]!));
				J.set(lambdaBase + 0, bx2, J.get(lambdaBase + 0, bx2) - (A2.y + dx[ay2]! - A1.y - dx[ay1]!));
				J.set(lambdaBase + 0, by2, J.get(lambdaBase + 0, by2) + (A2.x + dx[ax2]! - A1.x - dx[ax1]!));

				// dx1
				J.set(ay1, ax1, J.get(ay1, ax1) + 0);
				J.set(ax2, ax1, J.get(ax2, ax1) + 0);
				J.set(ay2, ax1, J.get(ay2, ax1) + 0);
				J.set(bx1, ax1, J.get(bx1, ax1) + 0);
				J.set(by1, ax1, J.get(by1, ax1) + dx[lambdaBase + 0]!);
				J.set(bx2, ax1, J.get(bx2, ax1) + 0);
				J.set(by2, ax1, J.get(by2, ax1) - dx[lambdaBase + 0]!);

				J.set(ax1,ay1, J.get(ax1, ay1) + 0);
				J.set(ax1, ax2, J.get(ax1, ax2) + 0);
				J.set(ax1, ay2, J.get(ax1, ay2) + 0);
				J.set(ax1, bx1, J.get(ax1, bx1) + 0);
				J.set(ax1, by1, J.get(ax1, by1) + dx[lambdaBase + 0]!);
				J.set(ax1, bx2, J.get(ax1, bx2) + 0);
				J.set(ax1, by2, J.get(ax1, by2) - dx[lambdaBase + 0]!);

				// dy1
				J.set(ax2, ay1, J.get(ax2, ay1) + 0);
				J.set(ay2, ay1, J.get(ay2, ay1) + 0);
				J.set(bx1, ay1, J.get(bx1, ay1) - dx[lambdaBase + 0]!);
				J.set(by1, ay1, J.get(by1, ay1) + 0);
				J.set(bx2, ay1, J.get(bx2, ay1) + dx[lambdaBase + 0]!);
				J.set(by2, ay1, J.get(by2, ay1) + 0);

				J.set(ay1, ax2, J.get(ay1, ax2) + 0);
				J.set(ay1, ay2, J.get(ay1, ay2) + 0);
				J.set(ay1, bx1, J.get(ay1, bx1) - dx[lambdaBase + 0]!);
				J.set(ay1, by1, J.get(ay1, by1) + 0);
				J.set(ay1, bx2, J.get(ay1, bx2) + dx[lambdaBase + 0]!);
				J.set(ay1, by2, J.get(ay1, by2) + 0);

				// dx2
				J.set(ay2, ax2, J.get(ay2, ax2) + 0);
				J.set(bx1, ax2, J.get(bx1, ax2) + 0);
				J.set(by1, ax2, J.get(by1, ax2) - dx[lambdaBase + 0]!);
				J.set(bx2, ax2, J.get(bx2, ax2) + 0);
				J.set(by2, ax2, J.get(by2, ax2) + dx[lambdaBase + 0]!);

				J.set(ax2, ay2, J.get(ax2, ay2) + 0);
				J.set(ax2, bx1, J.get(ax2, bx1) + 0);
				J.set(ax2, by1, J.get(ax2, by1) - dx[lambdaBase + 0]!);
				J.set(ax2, bx2, J.get(ax2, bx2) + 0);
				J.set(ax2, by2, J.get(ax2, by2) + dx[lambdaBase + 0]!);

				// dy2
				J.set(bx1, ay2, J.get(bx1, ay2) + dx[lambdaBase + 0]!);
				J.set(by1, ay2, J.get(by1, ay2) + 0);
				J.set(bx2, ay2, J.get(bx2, ay2) - dx[lambdaBase + 0]!);
				J.set(by2, ay2, J.get(by2, ay2) + 0);

				J.set(ay2, bx1, J.get(ay2, bx1) + dx[lambdaBase + 0]!);
				J.set(ay2, by1, J.get(ay2, by1) + 0);
				J.set(ay2, bx2, J.get(ay2, bx2) - dx[lambdaBase + 0]!);
				J.set(ay2, by2, J.get(ay2, by2) + 0);

				// dx3
				// zeros

				// dy3
				// zeros

				// dx4
				// zeros
				break;
			}
			case "perpendicular": {
				const [segA, segB] = c.refs as [string, string];
				const infoA = getSegEndpoints(segA);
				const infoB = getSegEndpoints(segB);
				if (!infoA || !infoB) break;
				const { iA: iA1, iB: iA2, A: A1, B: A2 } = infoA;
				const { iA: iB1, iB: iB2, A: B1, B: B2 } = infoB;				
				let { ix: ax1, iy: ay1 } = getPointParamIndices(iA1);
				let { ix: ax2, iy: ay2 } = getPointParamIndices(iA2);
				let { ix: bx1, iy: by1 } = getPointParamIndices(iB1);
				let { ix: bx2, iy: by2 } = getPointParamIndices(iB2);
				ax1 += lambdaTotal;
				ay1 += lambdaTotal;
				ax2 += lambdaTotal;
				ay2 += lambdaTotal;
				bx1 += lambdaTotal;
				by1 += lambdaTotal;
				bx2 += lambdaTotal;
				by2 += lambdaTotal;

				// lambda_1
				J.set(ax1, lambdaBase + 0, J.get(ax1, lambdaBase + 0) - (B2.x + dx[bx2]! - B1.x - dx[bx1]!));
				J.set(ay1, lambdaBase + 0, J.get(ay1, lambdaBase + 0) - (B2.y + dx[by2]! - B1.y - dx[by1]!));
				J.set(ax2, lambdaBase + 0, J.get(ax2, lambdaBase + 0) + (B2.x + dx[bx2]! - B1.x - dx[bx1]!));
				J.set(ay2, lambdaBase + 0, J.get(ay2, lambdaBase + 0) + (B2.y + dx[by2]! - B1.y - dx[by1]!));
				J.set(bx1, lambdaBase + 0, J.get(bx1, lambdaBase + 0) - (A2.x + dx[ax2]! - A1.x - dx[ax1]!));
				J.set(by1, lambdaBase + 0, J.get(by1, lambdaBase + 0) - (A2.y + dx[ay2]! - A1.y - dx[ay1]!));
				J.set(bx2, lambdaBase + 0, J.get(bx2, lambdaBase + 0) + (A2.x + dx[ax2]! - A1.x - dx[ax1]!));
				J.set(by2, lambdaBase + 0, J.get(by2, lambdaBase + 0) + (A2.y + dx[ay2]! - A1.y - dx[ay1]!));
				J.set(lambdaBase + 0, ax1, J.get(lambdaBase + 0, ax1) - (B2.x + dx[bx2]! - B1.x - dx[bx1]!));
				J.set(lambdaBase + 0, ay1, J.get(lambdaBase + 0, ay1) - (B2.y + dx[by2]! - B1.y - dx[by1]!));
				J.set(lambdaBase + 0, ax2, J.get(lambdaBase + 0, ax2) + (B2.x + dx[bx2]! - B1.x - dx[bx1]!));
				J.set(lambdaBase + 0, ay2, J.get(lambdaBase + 0, ay2) + (B2.y + dx[by2]! - B1.y - dx[by1]!));
				J.set(lambdaBase + 0, bx1, J.get(lambdaBase + 0, bx1) - (A2.x + dx[ax2]! - A1.x - dx[ax1]!));
				J.set(lambdaBase + 0, by1, J.get(lambdaBase + 0, by1) - (A2.y + dx[ay2]! - A1.y - dx[ay1]!));
				J.set(lambdaBase + 0, bx2, J.get(lambdaBase + 0, bx2) + (A2.x + dx[ax2]! - A1.x - dx[ax1]!));
				J.set(lambdaBase + 0, by2, J.get(lambdaBase + 0, by2) + (A2.y + dx[ay2]! - A1.y - dx[ay1]!));

				// dx1
				J.set(ay1, ax1, J.get(ay1, ax1) + 0);
				J.set(ax2, ax1, J.get(ax2, ax1) + 0);
				J.set(ay2, ax1, J.get(ay2, ax1) + 0);
				J.set(bx1, ax1, J.get(bx1, ax1) + dx[lambdaBase + 0]!);
				J.set(by1, ax1, J.get(by1, ax1) + 0);
				J.set(bx2, ax1, J.get(bx2, ax1) - dx[lambdaBase + 0]!);
				J.set(by2, ax1, J.get(by2, ax1) + 0);

				J.set(ax1,ay1, J.get(ax1, ay1) + 0);
				J.set(ax1, ax2, J.get(ax1, ax2) + 0);
				J.set(ax1, ay2, J.get(ax1, ay2) + 0);
				J.set(ax1, bx1, J.get(ax1, bx1) + dx[lambdaBase + 0]!);
				J.set(ax1, by1, J.get(ax1, by1) + 0);
				J.set(ax1, bx2, J.get(ax1, bx2) - dx[lambdaBase + 0]!);
				J.set(ax1, by2, J.get(ax1, by2) + 0);

				// dy1
				J.set(ax2, ay1, J.get(ax2, ay1) + 0);
				J.set(ay2, ay1, J.get(ay2, ay1) + 0);
				J.set(bx1, ay1, J.get(bx1, ay1) + 0);
				J.set(by1, ay1, J.get(by1, ay1) + dx[lambdaBase + 0]!);
				J.set(bx2, ay1, J.get(bx2, ay1) + 0);
				J.set(by2, ay1, J.get(by2, ay1) - dx[lambdaBase + 0]!);

				J.set(ay1, ax2, J.get(ay1, ax2) + 0);
				J.set(ay1, ay2, J.get(ay1, ay2) + 0);
				J.set(ay1, bx1, J.get(ay1, bx1) + 0);
				J.set(ay1, by1, J.get(ay1, by1) + dx[lambdaBase + 0]!);
				J.set(ay1, bx2, J.get(ay1, bx2) + 0);
				J.set(ay1, by2, J.get(ay1, by2) - dx[lambdaBase + 0]!);

				// dx2
				J.set(ay2, ax2, J.get(ay2, ax2) + 0);
				J.set(bx1, ax2, J.get(bx1, ax2) - dx[lambdaBase + 0]!);
				J.set(by1, ax2, J.get(by1, ax2) + 0);
				J.set(bx2, ax2, J.get(bx2, ax2) + dx[lambdaBase + 0]!);
				J.set(by2, ax2, J.get(by2, ax2) + 0);

				J.set(ax2, ay2, J.get(ax2, ay2) + 0);
				J.set(ax2, bx1, J.get(ax2, bx1) - dx[lambdaBase + 0]!);
				J.set(ax2, by1, J.get(ax2, by1) + 0);
				J.set(ax2, bx2, J.get(ax2, bx2) + dx[lambdaBase + 0]!);
				J.set(ax2, by2, J.get(ax2, by2) + 0);

				// dy2
				J.set(bx1, ay2, J.get(bx1, ay2) + 0);
				J.set(by1, ay2, J.get(by1, ay2) - dx[lambdaBase + 0]!);
				J.set(bx2, ay2, J.get(bx2, ay2) + 0);
				J.set(by2, ay2, J.get(by2, ay2) + dx[lambdaBase + 0]!);

				J.set(ay2, bx1, J.get(ay2, bx1) + 0);
				J.set(ay2, by1, J.get(ay2, by1) - dx[lambdaBase + 0]!);
				J.set(ay2, bx2, J.get(ay2, bx2) + 0);
				J.set(ay2, by2, J.get(ay2, by2) + dx[lambdaBase + 0]!);

				// dx3
				// zeros

				// dy3
				// zeros

				// dx4
				// zeros

				break;
			}
			case "angle": {
				const [segA, segB] = c.refs as [string, string];
				const infoA = getSegEndpoints(segA);
				const infoB = getSegEndpoints(segB);
				if (!infoA || !infoB) break;
				const { iA: iA1, iB: iA2, A: A1, B: A2 } = infoA;
				const { iA: iB1, iB: iB2, A: B1, B: B2 } = infoB;				
				let { ix: ax1, iy: ay1 } = getPointParamIndices(iA1);
				let { ix: ax2, iy: ay2 } = getPointParamIndices(iA2);
				let { ix: bx1, iy: by1 } = getPointParamIndices(iB1);
				let { ix: bx2, iy: by2 } = getPointParamIndices(iB2);
				ax1 += lambdaTotal;
				ay1 += lambdaTotal;
				ax2 += lambdaTotal;
				ay2 += lambdaTotal;
				bx1 += lambdaTotal;
				by1 += lambdaTotal;
				bx2 += lambdaTotal;
				by2 += lambdaTotal;

				const v1x = (A2.x + dx[ax2]!) - (A1.x + dx[ax1]!);
				const v1y = (A2.y + dx[ay2]!) - (A1.y + dx[ay1]!);
				const v2x = (B2.x + dx[bx2]!) - (B1.x + dx[bx1]!);
				const v2y = (B2.y + dx[by2]!) - (B1.y + dx[by1]!);

				const len1 = safeHypot(v1x, v1y);
				const len2 = safeHypot(v2x, v2y);
				const c0 = Math.cos(c.params?.angle ?? 0);

				const dg_dv1x = v2x - c0 * (len2 * (v1x / len1));
				const dg_dv1y = v2y - c0 * (len2 * (v1y / len1));
				const dg_dv2x = v1x - c0 * (len1 * (v2x / len2));
				const dg_dv2y = v1y - c0 * (len1 * (v2y / len2));

				J.set(ax1, lambdaBase + 0, J.get(ax1, lambdaBase + 0) - dg_dv1x);
				J.set(ay1, lambdaBase + 0, J.get(ay1, lambdaBase + 0) - dg_dv1y);
				J.set(ax2, lambdaBase + 0, J.get(ax2, lambdaBase + 0) + dg_dv1x);
				J.set(ay2, lambdaBase + 0, J.get(ay2, lambdaBase + 0) + dg_dv1y);

				J.set(bx1, lambdaBase + 0, J.get(bx1, lambdaBase + 0) - dg_dv2x);
				J.set(by1, lambdaBase + 0, J.get(by1, lambdaBase + 0) - dg_dv2y);
				J.set(bx2, lambdaBase + 0, J.get(bx2, lambdaBase + 0) + dg_dv2x);
				J.set(by2, lambdaBase + 0, J.get(by2, lambdaBase + 0) + dg_dv2y);

				J.set(lambdaBase + 0, ax1, J.get(lambdaBase + 0, ax1) - dg_dv1x);
				J.set(lambdaBase + 0, ay1, J.get(lambdaBase + 0, ay1) - dg_dv1y);
				J.set(lambdaBase + 0, ax2, J.get(lambdaBase + 0, ax2) + dg_dv1x);
				J.set(lambdaBase + 0, ay2, J.get(lambdaBase + 0, ay2) + dg_dv1y);

				J.set(lambdaBase + 0, bx1, J.get(lambdaBase + 0, bx1) - dg_dv2x);
				J.set(lambdaBase + 0, by1, J.get(lambdaBase + 0, by1) - dg_dv2y);
				J.set(lambdaBase + 0, bx2, J.get(lambdaBase + 0, bx2) + dg_dv2x);
				J.set(lambdaBase + 0, by2, J.get(lambdaBase + 0, by2) + dg_dv2y);

				break;
			}
			case "point_on_line": {
				const [pId, segId] = c.refs as [string, string];
				const ip = pointIndexById.get(pId);
				const info = getSegEndpoints(segId);
				if (ip === undefined || !info) break;
				const { iA, iB, A, B } = info;
				const P = model.points[ip]!;
				let { ix: ax, iy: ay } = getPointParamIndices(iA);
				let { ix: bx, iy: by } = getPointParamIndices(iB);
				let { ix: px, iy: py } = getPointParamIndices(ip);
				ax += lambdaTotal;
				ay += lambdaTotal;
				bx += lambdaTotal;
				by += lambdaTotal;
				px += lambdaTotal;
				py += lambdaTotal;

				// lambda_1
				J.set(ax, lambdaBase + 0, J.get(ax, lambdaBase + 0) - (B.y + dx[by]! - P.y - dx[py]!));
				J.set(ay, lambdaBase + 0, J.get(ay, lambdaBase + 0) + (B.x + dx[bx]! - P.x - dx[px]!));
				J.set(lambdaBase + 0, ax, J.get(lambdaBase + 0, ax) - (B.y + dx[by]! - P.y - dx[py]!));
				J.set(lambdaBase + 0, ay, J.get(lambdaBase + 0, ay) + (B.x + dx[bx]! - P.x - dx[px]!));
				J.set(bx, lambdaBase + 0, J.get(bx, lambdaBase + 0) - (P.y + dx[py]! - A.y - dx[ay]!));
				J.set(by, lambdaBase + 0, J.get(by, lambdaBase + 0) + (P.x + dx[px]! - A.x - dx[ax]!));
				J.set(lambdaBase + 0, bx, J.get(lambdaBase + 0, bx) - (P.y + dx[py]! - A.y - dx[ay]!));
				J.set(lambdaBase + 0, by, J.get(lambdaBase + 0, by) + (P.x + dx[px]! - A.x - dx[ax]!));
				J.set(px, lambdaBase + 0, J.get(px, lambdaBase + 0) + (B.y + dx[by]! - A.y - dx[ay]!));
				J.set(py, lambdaBase + 0, J.get(py, lambdaBase + 0) - (B.x + dx[bx]! - A.x - dx[ax]!));
				J.set( lambdaBase + 0, px, J.get(lambdaBase + 0, px) + (B.y + dx[by]! - A.y - dx[ay]!));
				J.set(lambdaBase + 0, py, J.get(lambdaBase + 0, py) - (B.x + dx[bx]! - A.x - dx[ax]!));

				// dx1
				J.set(ay, ax, J.get(ay, ax) + 0);
				J.set(bx, ax, J.get(bx, ax) + 0);
				J.set(by, ax, J.get(by, ax) - dx[lambdaBase + 0]!);
				J.set(px, ax, J.get(px, ax) + 0);
				J.set(py, ax, J.get(py, ax) + dx[lambdaBase + 0]!);
				J.set(ax, ay, J.get(ax, ay) + 0);
				J.set(ax, bx, J.get(ax, bx) + 0);
				J.set(ax, by, J.get(ax, by) - dx[lambdaBase + 0]!);
				J.set(ax, px, J.get(ax, px) + 0);
				J.set(ax, py, J.get(ax, py) + dx[lambdaBase + 0]!);

				// dy1
				J.set(bx, ay, J.get(bx, ay) + dx[lambdaBase + 0]!);
				J.set(by, ay, J.get(by, ay) + 0);
				J.set(px, ay, J.get(px, ay) - dx[lambdaBase + 0]!);
				J.set(py, ay, J.get(py, ay) + 0);
				J.set(ay, bx, J.get(ay, bx) + dx[lambdaBase + 0]!);
				J.set(ax, by, J.get(ax, by) + 0);
				J.set(ay, px, J.get(ay, px) - dx[lambdaBase + 0]!);
				J.set(ay, py, J.get(ay, py) + 0);

				// dx2
				J.set(by, bx, J.get(by, bx) + 0);
				J.set(px, bx, J.get(px, bx) + 0);
				J.set(py, bx, J.get(py, bx) - dx[lambdaBase + 0]!);
				J.set(bx, by, J.get(bx, by) + 0);
				J.set(bx, px, J.get(bx, px) + 0);
				J.set(bx, py, J.get(bx, py) - dx[lambdaBase + 0]!);

				// dy2
				J.set(px, by, J.get(px, by) + dx[lambdaBase + 0]!);
				J.set(py, by, J.get(py, by) + 0);
				J.set(by, px, J.get(by, px) + dx[lambdaBase + 0]!);
				J.set(by, py, J.get(by, py) + 0);

				break;
			}
			default:
				break;
		}
	}

	for (let i = 0; i < n; i++) {
		J.set(m + i, m + i, J.get(m + i, m + i) + 1);
	}

	return J;
}


