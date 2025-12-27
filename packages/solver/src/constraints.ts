import type { Constraint, Id, Model } from "./types";
import { createPacking } from "./packing";

type Vec2 = { x: number; y: number };

function sub(a: Vec2, b: Vec2): Vec2 {
	return { x: a.x - b.x, y: a.y - b.y };
}

function norm(v: Vec2): number {
	return Math.hypot(v.x, v.y);
}

function dot(a: Vec2, b: Vec2): number { // scalar product
	return a.x * b.x + a.y * b.y;
}

function cross(a: Vec2, b: Vec2): number { // vector product
	return a.x * b.y - a.y * b.x;
}

function wrapToPi(angle: number): number {
	let a = angle;
	while (a > Math.PI) a -= 2 * Math.PI;
	while (a < -Math.PI) a += 2 * Math.PI;
	return a;
}

function getPointCoords(model: Model, id: Id): Vec2 {
	const p = model.points.find((pt) => pt.id === id);
	if (!p) {
		// Gracefully degrade: return origin so residuals contribute zero rather than breaking
		return { x: 0, y: 0 };
	}
	return { x: p.x, y: p.y };
}

function getPointsIdsFromSegment(model: Model, segId: Id): { iA: Id; iB: Id } {
	const seg = model.segments.find((s) => s.id === segId);
	if (!seg) return { iA: "", iB: "" };
	return { iA: seg.p1, iB: seg.p2 };
}

function getSegmentVector(model: Model, segId: Id): { a: Vec2; b: Vec2; u: Vec2 } {
	const seg = model.segments.find((s) => s.id === segId);
	if (!seg) return { a: { x: 0, y: 0 }, b: { x: 0, y: 0 }, u: { x: 0, y: 0 } };
	const A = getPointCoords(model, seg.p1);
	const B = getPointCoords(model, seg.p2);
	const u = sub(B, A);
	return { a: A, b: B, u };
}

function setR(r: Float64Array, idx: number, value: number): void {
	if (idx >= 0 && idx < r.length) r[idx] = value;
}

function setDFDx(dF_dx: Float64Array, idx: number, value: number): void {
	if (idx >= 0 && idx < dF_dx.length) dF_dx[idx] = value;
}

export function residuals(model: Model, constraints: Constraint[], dx: Float64Array): { lambdaIndexByConstraint: number[], dF_dx: Float64Array, lambdaTotal: number } {
	// Upper bound size: coincident -> 2, distance -> 1, fix_point -> 2
	let lambdaTotal = 0;
	const lambdaIndexByConstraint: number[] = [];
	const packing = createPacking(model);
	const pointIndexById = packing.pointIndexById;
	for (const c of constraints) {
		lambdaIndexByConstraint.push(lambdaTotal);
		switch (c.type) {
			case "coincident":
				lambdaTotal += 2;
				break;
			case "distance": {
				lambdaTotal += 1;
				break;
			}
			case "fix_point": {
				lambdaTotal += 2;
				break;
			}
			case "parallel":
			case "perpendicular":
			case "vertical":
			case "horizontal":
			case "angle":
			case "point_on_line":
				lambdaTotal += 1;
				break;
			default:
				break;
		}
	}

	const dF_dx: Float64Array = new Float64Array(lambdaTotal + model.points.length * 2);
	dF_dx.fill(0);

	const getPointIndex = (id: Id) => pointIndexById.get(id);
	const getPointParamIndices = (i: number) => {
		return { ix: i * 2 + 0, iy: i * 2 + 1 };
	};

	for (let k = 0; k < constraints.length; k += 1) {
		const c = constraints[k];
		if (!c) continue;
		const lambdaBase = lambdaIndexByConstraint[k] ?? 0;
		switch (c.type) {
			case "coincident": {
				const [aId, bId] = c.refs as [Id, Id];
				const A = getPointCoords(model, aId);
				const B = getPointCoords(model, bId);
				const ia = getPointIndex(aId);
				const ib = getPointIndex(bId);
				if (ia === undefined || ib === undefined) break;
				let { ix: ax, iy: ay } = getPointParamIndices(ia);
				let { ix: bx, iy: by } = getPointParamIndices(ib);
				ax += lambdaTotal;
				ay += lambdaTotal;
				bx += lambdaTotal;
				by += lambdaTotal;
				setDFDx(dF_dx, lambdaBase + 0, B.x + dx[bx]! - A.x - dx[ax]!);
				setDFDx(dF_dx, lambdaBase + 1, B.y + dx[by]! - A.y - dx[ay]!);
				setDFDx(dF_dx, ax, - dx[lambdaBase + 0]!);
				setDFDx(dF_dx, ay, - dx[lambdaBase + 1]!);
				setDFDx(dF_dx, bx, dx[lambdaBase + 0]!);
				setDFDx(dF_dx, by, dx[lambdaBase + 1]!);
				break;
			}
			case "distance": {
				const [aId, bId] = c.refs as [Id, Id];
				const A = getPointCoords(model, aId);
				const B = getPointCoords(model, bId);
				const d = c.params?.distance ?? 0;
				const ia = getPointIndex(aId);
				const ib = getPointIndex(bId);
				if (ia === undefined || ib === undefined) break;
				let { ix: ax, iy: ay } = getPointParamIndices(ia);
				let { ix: bx, iy: by } = getPointParamIndices(ib);
				ax += lambdaTotal;
				ay += lambdaTotal;
				bx += lambdaTotal;
				by += lambdaTotal;
				setDFDx(dF_dx, lambdaBase + 0, (B.x + dx[bx]! - A.x - dx[ax]!)*(B.x + dx[bx]! - A.x - dx[ax]!) + (B.y + dx[by]! - A.y - dx[ay]!)*(B.y + dx[by]! - A.y - dx[ay]!) - d*d);
				setDFDx(dF_dx, ax, - 2 * dx[lambdaBase + 0]! * (B.x + dx[bx]! - A.x - dx[ax]!));
				setDFDx(dF_dx, ay, - 2 * dx[lambdaBase + 0]! * (B.y + dx[by]! - A.y - dx[ay]!));
				setDFDx(dF_dx, bx, 2 * dx[lambdaBase + 0]! * (B.x + dx[bx]! - A.x - dx[ax]!));
				setDFDx(dF_dx, by, 2 * dx[lambdaBase + 0]! * (B.y + dx[by]! - A.y - dx[ay]!));
				break;
			}
			case "fix_point": {
				const [aId] = c.refs as [Id];
				const A = getPointCoords(model, aId);
				const x0 = c.params?.x ?? A.x;
				const y0 = c.params?.y ?? A.y;
				const ia = getPointIndex(aId);
				if (ia === undefined) break;
				let { ix: ax, iy: ay } = getPointParamIndices(ia);
				ax += lambdaTotal;
				ay += lambdaTotal;
				setDFDx(dF_dx, lambdaBase + 0, A.x + dx[ax]! - x0);
				setDFDx(dF_dx, lambdaBase + 1, A.y + dx[ay]! - y0);
				setDFDx(dF_dx, ax, dx[lambdaBase + 0]!);
				setDFDx(dF_dx, ay, dx[lambdaBase + 1]!);
				break;
			}
			case "parallel": {
				const [segA, segB] = c.refs as [Id, Id];
				const { u: uA, a: A, b: B } = getSegmentVector(model, segA);
				const { u: uB, a: C, b: D } = getSegmentVector(model, segB);
				const { iA, iB } = getPointsIdsFromSegment(model, segA);
				const { iA: iC, iB: iD } = getPointsIdsFromSegment(model, segB);
				const ia = getPointIndex(iA);
				const ib = getPointIndex(iB);
				const ic = getPointIndex(iC);
				const id = getPointIndex(iD);
				if (ia === undefined || ib === undefined || ic === undefined || id === undefined) break;
				let { ix: ax, iy: ay } = getPointParamIndices(ia);
				let { ix: bx, iy: by } = getPointParamIndices(ib);
				let { ix: cx, iy: cy } = getPointParamIndices(ic);
				let { ix: d_x, iy: d_y } = getPointParamIndices(id);
				ax += lambdaTotal;
				ay += lambdaTotal;
				bx += lambdaTotal;
				by += lambdaTotal;
				cx += lambdaTotal;
				cy += lambdaTotal;
				d_x += lambdaTotal;
				d_y += lambdaTotal;
				setDFDx(dF_dx, lambdaBase + 0, (B.x + dx[bx]! - A.x - dx[ax]!) * (D.y + dx[d_y]! - C.y - dx[cy]!) - (B.y + dx[by]! - A.y - dx[ay]!) * (D.x + dx[d_x]! - C.x - dx[cx]!) );
				setDFDx(dF_dx, ax, - dx[lambdaBase + 0]! * (D.y + dx[d_y]! - C.y - dx[cy]!));
				setDFDx(dF_dx, ay, dx[lambdaBase + 0]! * (D.x + dx[d_x]! - C.x - dx[cx]!));
				setDFDx(dF_dx, bx, dx[lambdaBase + 0]! * (D.y + dx[d_y]! - C.y - dx[cy]!));
				setDFDx(dF_dx, by, - dx[lambdaBase + 0]! * (D.x + dx[d_x]! - C.x - dx[cx]!));
				setDFDx(dF_dx, cx, dx[lambdaBase + 0]! * (B.y + dx[by]! - A.y - dx[ay]!));
				setDFDx(dF_dx, cy, - dx[lambdaBase + 0]! * (B.x + dx[bx]! - A.x - dx[ax]!));
				setDFDx(dF_dx, d_x, - dx[lambdaBase + 0]! * (B.y + dx[by]! - A.y - dx[ay]!));
				setDFDx(dF_dx, d_y, dx[lambdaBase + 0]! * (B.x + dx[bx]! - A.x - dx[ax]!));
				break;
			}
			case "perpendicular": {
				const [segA, segB] = c.refs as [Id, Id];
				const { u: uA, a: A, b: B } = getSegmentVector(model, segA);
				const { u: uB, a: C, b: D } = getSegmentVector(model, segB);
				const { iA, iB } = getPointsIdsFromSegment(model, segA);
				const { iA: iC, iB: iD } = getPointsIdsFromSegment(model, segB);
				const ia = getPointIndex(iA);
				const ib = getPointIndex(iB);
				const ic = getPointIndex(iC);
				const id = getPointIndex(iD);
				if (ia === undefined || ib === undefined || ic === undefined || id === undefined) break;
				let { ix: ax, iy: ay } = getPointParamIndices(ia);
				let { ix: bx, iy: by } = getPointParamIndices(ib);
				let { ix: cx, iy: cy } = getPointParamIndices(ic);
				let { ix: d_x, iy: d_y } = getPointParamIndices(id);
				ax += lambdaTotal;
				ay += lambdaTotal;
				bx += lambdaTotal;
				by += lambdaTotal;
				cx += lambdaTotal;
				cy += lambdaTotal;
				d_x += lambdaTotal;
				d_y += lambdaTotal;
				setDFDx(dF_dx, lambdaBase + 0, (B.x + dx[bx]! - A.x - dx[ax]!)*(D.x + dx[d_x]! - C.x - dx[cx]!) + (B.y + dx[by]! - A.y - dx[ay]!)*(D.y + dx[d_y]! - C.y - dx[cy]!) );
				setDFDx(dF_dx, ax, - dx[lambdaBase + 0]! * (D.x + dx[d_x]! - C.x - dx[cx]!));
				setDFDx(dF_dx, ay, - dx[lambdaBase + 0]! * (D.y + dx[d_y]! - C.y - dx[cy]!));
				setDFDx(dF_dx, bx, dx[lambdaBase + 0]! * (D.x + dx[d_x]! - C.x - dx[cx]!));
				setDFDx(dF_dx, by, dx[lambdaBase + 0]! * (D.y + dx[d_y]! - C.y - dx[cy]!));
				setDFDx(dF_dx, cx, - dx[lambdaBase + 0]! * (B.x + dx[bx]! - A.x - dx[ax]!));
				setDFDx(dF_dx, cy, - dx[lambdaBase + 0]! * (B.y + dx[by]! - A.y - dx[ay]!));
				setDFDx(dF_dx, d_x, dx[lambdaBase + 0]! * (B.x + dx[bx]! - A.x - dx[ax]!));
				setDFDx(dF_dx, d_y, dx[lambdaBase + 0]! * (B.y + dx[by]! - A.y - dx[ay]!));
				break;
			}
			case "vertical": {
				const [segId] = c.refs as [Id];
				const { a: A, b: B, u } = getSegmentVector(model, segId);
				const { iA, iB } = getPointsIdsFromSegment(model, segId);
				const ia = getPointIndex(iA);
				const ib = getPointIndex(iB);
				if (ia === undefined || ib === undefined) break;
				let { ix: ax } = getPointParamIndices(ia);
				let { ix: bx } = getPointParamIndices(ib);
				ax += lambdaTotal;
				bx += lambdaTotal;
			
				setDFDx(dF_dx, lambdaBase + 0, B.x + dx[bx]! - A.x - dx[ax]!);
				setDFDx(dF_dx, ax, - dx[lambdaBase + 0]!);
				setDFDx(dF_dx, bx, dx[lambdaBase + 0]!);
				break;
			}
			case "horizontal": {
				const [segId] = c.refs as [Id];
				const { a: A, b: B } = getSegmentVector(model, segId);
				const { iA, iB } = getPointsIdsFromSegment(model, segId);
				const ia = getPointIndex(iA);
				const ib = getPointIndex(iB);
				if (ia === undefined || ib === undefined) break;
				let { iy: ay } = getPointParamIndices(ia);
				let { iy: by } = getPointParamIndices(ib);
				ay += lambdaTotal;
				by += lambdaTotal;

				setDFDx(dF_dx, lambdaBase + 0, B.y + dx[by]! - A.y - dx[ay]!);
				setDFDx(dF_dx, ay, - dx[lambdaBase + 0]!);
				setDFDx(dF_dx, by, dx[lambdaBase + 0]!);
				break;
			}
			case "angle": {
				const [segA, segB] = c.refs as [Id, Id];
				const { a: A, b: B , u: uA} = getSegmentVector(model, segA);
				const { a: C, b: D , u: uB} = getSegmentVector(model, segB);
				const { iA, iB } = getPointsIdsFromSegment(model, segA);
				const { iA: iC, iB: iD } = getPointsIdsFromSegment(model, segB);
				
				const ia = getPointIndex(iA);
				const ib = getPointIndex(iB);
				const ic = getPointIndex(iC);
				const id = getPointIndex(iD);
				if (ia === undefined || ib === undefined || ic === undefined || id === undefined) break;
				let { ix: ax, iy: ay } = getPointParamIndices(ia);
				let { ix: bx, iy: by } = getPointParamIndices(ib);
				let { ix: cx, iy: cy } = getPointParamIndices(ic);
				let { ix: d_x, iy: d_y } = getPointParamIndices(id);

				ax += lambdaTotal;
				ay += lambdaTotal;
				bx += lambdaTotal;
				by += lambdaTotal;
				cx += lambdaTotal;
				cy += lambdaTotal;
				d_x += lambdaTotal;
				d_y += lambdaTotal;

				const v1x = B.x + dx[bx]! - A.x - dx[ax]!;
				const v1y = B.y + dx[by]! - A.y - dx[ay]!;
				const v2x = D.x + dx[d_x]! - C.x - dx[cx]!;
				const v2y = D.y + dx[d_y]! - C.y - dx[cy]!;
				const len1 = Math.hypot(v1x, v1y);
				const len2 = Math.hypot(v2x, v2y);
				const eps = 1e-12;
				const l1e = len1 > eps ? len1 : eps;
				const l2e = len2 > eps ? len2 : eps;
				const c0 = Math.cos(c.params?.angle ?? 0);

				// Residual g = v1·v2 - |v1||v2| cos(theta0)
				const g = v1x * v2x + v1y * v2y - len1 * len2 * c0;
				setDFDx(dF_dx, lambdaBase + 0, g);

				// Gradients wrt vectors
				const dg_dv1x = v2x - c0 * (l2e * (v1x / l1e));
				const dg_dv1y = v2y - c0 * (l2e * (v1y / l1e));
				const dg_dv2x = v1x - c0 * (l1e * (v2x / l2e));
				const dg_dv2y = v1y - c0 * (l1e * (v2y / l2e));

				// Chain rule to point increments
				setDFDx(dF_dx, ax, dx[lambdaBase + 0]! * (-dg_dv1x));
				setDFDx(dF_dx, ay, dx[lambdaBase + 0]! * (-dg_dv1y));
				setDFDx(dF_dx, bx, dx[lambdaBase + 0]! * (dg_dv1x));
				setDFDx(dF_dx, by, dx[lambdaBase + 0]! * (dg_dv1y));

				setDFDx(dF_dx, cx, dx[lambdaBase + 0]! * (-dg_dv2x));
				setDFDx(dF_dx, cy, dx[lambdaBase + 0]! * (-dg_dv2y));
				setDFDx(dF_dx, d_x, dx[lambdaBase + 0]! * (dg_dv2x));
				setDFDx(dF_dx, d_y, dx[lambdaBase + 0]! * (dg_dv2y));
				break;
			}
			case "point_on_line": {
				const [pId, segId] = c.refs as [Id, Id];
				const P = getPointCoords(model, pId);
				const { a: A, b: B } = getSegmentVector(model, segId);
				const { iA, iB } = getPointsIdsFromSegment(model, segId);
				const ia = getPointIndex(iA);
				const ib = getPointIndex(iB);
				const ip = getPointIndex(pId);
				if (ia === undefined || ib === undefined || ip === undefined) break;
				let { ix: ax, iy: ay } = getPointParamIndices(ia);
				let { ix: bx, iy: by } = getPointParamIndices(ib);
				let { ix: px, iy: py } = getPointParamIndices(ip);
				ax += lambdaTotal;
				ay += lambdaTotal;
				bx += lambdaTotal;
				by += lambdaTotal;
				px += lambdaTotal;
				py += lambdaTotal;

				setDFDx(dF_dx, lambdaBase + 0, (P.x + dx[px]! - A.x - dx[ax]!)*(B.y + dx[by]! - P.y - dx[py]!) - (B.x + dx[bx]! - P.x - dx[px]!)*(P.y + dx[py]! - A.y - dx[ay]!));
				setDFDx(dF_dx, ax, - dx[lambdaBase + 0]! * (B.y + dx[by]! - P.y - dx[py]!));
				setDFDx(dF_dx, ay, dx[lambdaBase + 0]! * (B.x + dx[bx]! - P.x - dx[px]!));
				setDFDx(dF_dx, bx, - dx[lambdaBase + 0]! * (P.y + dx[py]! - A.y - dx[ay]!));
				setDFDx(dF_dx, by, dx[lambdaBase + 0]! * (P.x + dx[px]! - A.x - dx[ax]!));
				setDFDx(dF_dx, px, dx[lambdaBase + 0]! * (B.y + dx[by]! - A.y - dx[ay]!));
				setDFDx(dF_dx, py, - dx[lambdaBase + 0]! * (B.x + dx[bx]! - A.x - dx[ax]!));
				break;
			}
			default:
				break;
		}
	}

	for (let i = lambdaTotal; i < dF_dx.length; i += 1) {
		if (dF_dx[i] === undefined) continue;
		setDFDx(dF_dx, i, dF_dx[i]! + dx[i]!);
	}
	return { lambdaIndexByConstraint, dF_dx, lambdaTotal };
}


