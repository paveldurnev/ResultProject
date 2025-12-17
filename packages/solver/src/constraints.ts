import type { Constraint, Id, Model } from "./types";

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

export function residuals(model: Model, constraints: Constraint[]): { r: Float64Array; indexByConstraint: number[] } {
	// Upper bound size: coincident -> 2, distance -> 1, fix_point -> 2
	let total = 0;
	const indexByConstraint: number[] = [];
	for (const c of constraints) {
		indexByConstraint.push(total);
		switch (c.type) {
			case "coincident":
				total += 2;
				break;
			case "distance":
				total += 1;
				break;
			case "fix_point":
				total += 2;
				break;
			case "parallel":
			case "perpendicular":
			case "vertical":
			case "horizontal":
			case "angle":
			case "point_on_line":
				total += 1;
				break;
			default:
				break;
		}
	}

	const r: Float64Array = new Float64Array(total);
	for (let k = 0; k < constraints.length; k += 1) {
		const c = constraints[k];
		if (!c) continue;
		const base = indexByConstraint[k] ?? 0;
		switch (c.type) {
			case "coincident": {
				const [aId, bId] = c.refs as [Id, Id];
				const A = getPointCoords(model, aId);
				const B = getPointCoords(model, bId);
				setR(r, base + 0, A.x - B.x);
				setR(r, base + 1, A.y - B.y);
				break;
			}
			case "distance": {
				const [aId, bId] = c.refs as [Id, Id];
				const A = getPointCoords(model, aId);
				const B = getPointCoords(model, bId);
				const d = c.params?.distance ?? 0;
				const diff = sub(A, B);
				setR(r, base + 0, norm(diff) - d);
				break;
			}
			case "fix_point": {
				const [aId] = c.refs as [Id];
				const A = getPointCoords(model, aId);
				const x0 = c.params?.x ?? A.x;
				const y0 = c.params?.y ?? A.y;
				setR(r, base + 0, A.x - x0);
				setR(r, base + 1, A.y - y0);
				break;
			}
			case "parallel": {
				const [segA, segB] = c.refs as [Id, Id];
				const { u: uA } = getSegmentVector(model, segA);
				const { u: uB } = getSegmentVector(model, segB);
				const nu = norm(uA);
				const nv = norm(uB);
				const denom = Math.max(1e-12, nu * nv);
				setR(r, base + 0, cross(uA, uB) / denom);
				break;
			}
			case "perpendicular": {
				const [segA, segB] = c.refs as [Id, Id];
				const { u: uA } = getSegmentVector(model, segA);
				const { u: uB } = getSegmentVector(model, segB);
				const nu = norm(uA);
				const nv = norm(uB);
				const denom = Math.max(1e-12, nu * nv);
				setR(r, base + 0, dot(uA, uB) / denom);
				break;
			}
			case "vertical": {
				const [segId] = c.refs as [Id];
				const { a, b, u } = getSegmentVector(model, segId);
				const n = Math.max(1e-12, norm(u));
				setR(r, base + 0, (b.x - a.x) / n);
				break;
			}
			case "horizontal": {
				const [segId] = c.refs as [Id];
				const { a, b, u } = getSegmentVector(model, segId);
				const n = Math.max(1e-12, norm(u));
				setR(r, base + 0, (b.y - a.y) / n);
				break;
			}
			case "angle": {
				const [segA, segB] = c.refs as [Id, Id];
				const { u: uA } = getSegmentVector(model, segA);
				const { u: uB } = getSegmentVector(model, segB);
				const theta = c.params?.angle ?? 0;
				const ang = Math.atan2(cross(uA, uB), dot(uA, uB));
				setR(r, base + 0, wrapToPi(ang - theta));
				break;
			}
			case "point_on_line": {
				const [pId, segId] = c.refs as [Id, Id];
				const P = getPointCoords(model, pId);
				const { a: A, u } = getSegmentVector(model, segId);
				const n = Math.max(1e-12, norm(u));
				setR(r, base + 0, cross(u, sub(P, A)) / n);
				break;
			}
			default:
				break;
		}
		// weights (if provided)
		const weight = c?.weight ?? 1.0;
		if (weight !== 1.0) {
			const next = k + 1 < constraints.length ? (indexByConstraint[k + 1] ?? total) : total;
			for (let i = base; i < next; i += 1) {
				if (i >= 0 && i < r.length) {
					const ri = r[i] ?? 0;
					r[i] = ri * weight;
				}
			}
		}
	}
	return { r, indexByConstraint };
}


